import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { getDb } from '../src/db/connect.js';

describe('GET /api/trains', () => {
  test('returns a successful JSON response', async () => {
    const response = await request(app).get('/api/trains');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toHaveProperty('trains');
    expect(response.body.trains).toBeInstanceOf(Array);
  });

  test('returns the trains from the starter data', async () => {
    const response = await request(app).get('/api/trains');

    expect(response.status).toBe(200);
    expect(response.body.trains).toHaveLength(4);
    expect(response.body.trains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'series-e353',
          name: 'Series E353 Limited Express',
          powerSource: 'Electric'
        })
      ])
    );
  });

  test('returns a train added to the test database', async () => {
    await getDb().collection('trains').insertOne({
      id: 'test-express',
      name: 'Test Express',
      operator: 'Test Railway'
    });

    const response = await request(app).get('/api/trains');

    expect(response.status).toBe(200);
    expect(response.body.trains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'test-express',
          name: 'Test Express'
        })
      ])
    );
  });

    test('returns default pagination metadata', async () => {
    const response = await request(app).get('/api/trains');

    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({
      totalItems: 4,
      totalPages: 1,
      currentPage: 1,
      itemsPerPage: 10,
      hasNextPage: false,
      hasPreviousPage: false
    });
  });

  test('returns the requested number of trains per page', async () => {
    const response = await request(app)
      .get('/api/trains?page=1&limit=2');

    expect(response.status).toBe(200);
    expect(response.body.trains).toHaveLength(2);
    expect(response.body.pagination).toEqual({
      totalItems: 4,
      totalPages: 2,
      currentPage: 1,
      itemsPerPage: 2,
      hasNextPage: true,
      hasPreviousPage: false
    });
  });

  test.each([49, 50])(
    'accepts a valid pagination limit of %i',
    async (limit) => {
      const response = await request(app)
        .get(`/api/trains?limit=${limit}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.itemsPerPage).toBe(limit);
    }
  );

  test('returns the correct error message when the limit exceeds 50', async () => {
    const response = await request(app)
      .get('/api/trains?limit=51');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      'Page must be a positive integer and limit must be between 1 and 50.'
    );
  });

  test('returns different trains on consecutive pages', async () => {
    const firstPage = await request(app)
      .get('/api/trains?page=1&limit=2');

    const secondPage = await request(app)
      .get('/api/trains?page=2&limit=2');

    expect(firstPage.status).toBe(200);
    expect(secondPage.status).toBe(200);

    expect(firstPage.body.trains).toHaveLength(2);
    expect(secondPage.body.trains).toHaveLength(2);

    const firstPageIds = firstPage.body.trains.map(train => train.id);
    const secondPageIds = secondPage.body.trains.map(train => train.id);

    expect(
      firstPageIds.some(id => secondPageIds.includes(id))
    ).toBe(false);

    expect(secondPage.body.pagination).toEqual({
      totalItems: 4,
      totalPages: 2,
      currentPage: 2,
      itemsPerPage: 2,
      hasNextPage: false,
      hasPreviousPage: true
    });
  });

  test('returns an empty array when the requested page exceeds available pages', async () => {
    const response = await request(app)
      .get('/api/trains?page=3&limit=2');

    expect(response.status).toBe(200);
    expect(response.body.trains).toHaveLength(0);
    expect(response.body.pagination.currentPage).toBe(3);
    expect(response.body.pagination.totalItems).toBe(4);
    expect(response.body.pagination.hasNextPage).toBe(false);
  });

    test.each([
    'page=0',
    'page=-1',
    'page=1.5',
    'page=abc',
    'page=',
    'page=1e2',
    'page=0x10',
    'page=2.0',
    'page=1&page=2',
    'page=9007199254740992',
    'limit=0',
    'limit=-1',
    'limit=1.5',
    'limit=abc',
    'limit=51',
    'limit=100',
    'limit=101',
    'limit=',
    'limit=1e1',
    'limit=0xA',
    'limit=2.0',
    'limit=1&limit=2'
  ])
  ('rejects invalid pagination parameter: %s', async (query) => {
    const response = await request(app)
      .get(`/api/trains?${query}`);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

    test('returns default query metadata', async () => {
    const response = await request(app).get('/api/trains');

    expect(response.status).toBe(200);
    expect(response.body.query).toEqual({
      search: '',
      filters: {
        type: null,
        powerSource: null
      },
      sortBy: 'name',
      sortOrder: 'asc'
    });
  });

  test.each([
    ['E353', 'series-e353'],
    ['Hokkaido', 'kiha-261'],
    ['Steam Excursion', 'steam-c11'],
    ['panoramic', 'series-e353']
  ])('searches supported fields for %s', async (search, expectedId) => {
    const response = await request(app)
      .get('/api/trains')
      .query({ search });

    expect(response.status).toBe(200);
    expect(response.body.trains).toHaveLength(1);
    expect(response.body.trains[0].id).toBe(expectedId);
    expect(response.body.query.search).toBe(search);
  });

  test('performs case-insensitive keyword searches', async () => {
    const response = await request(app)
      .get('/api/trains?search=EXPRESS');

    expect(response.status).toBe(200);
    expect(response.body.trains).toHaveLength(3);
    expect(response.body.pagination.totalItems).toBe(3);
  });

    test('filters trains by exact type', async () => {
    const response = await request(app)
      .get('/api/trains')
      .query({ type: 'Limited Express' });

    expect(response.status).toBe(200);
    expect(response.body.trains).toHaveLength(2);
    expect(
      response.body.trains.every(train => train.type === 'Limited Express')
    ).toBe(true);
    expect(response.body.query.filters.type).toBe('Limited Express');
  });

  test('filters trains by power source', async () => {
    const response = await request(app)
      .get('/api/trains?powerSource=Electric');

    expect(response.status).toBe(200);
    expect(response.body.trains).toHaveLength(2);
    expect(
      response.body.trains.every(train => train.powerSource === 'Electric')
    ).toBe(true);
    expect(response.body.query.filters.powerSource).toBe('Electric');
  });

  test('performs case-insensitive categorical filtering', async () => {
    const response = await request(app)
      .get('/api/trains')
      .query({
        type: 'limited express',
        powerSource: 'electric'
      });

    expect(response.status).toBe(200);
    expect(response.body.trains).toHaveLength(2);
    expect(response.body.pagination.totalItems).toBe(2);
  });

    test.each([
    ['asc', [65, 120, 130, 130]],
    ['desc', [130, 130, 120, 65]]
  ])('sorts trains by maximum speed in %s order', async (sortOrder, expected) => {
    const response = await request(app)
      .get('/api/trains')
      .query({
        sortBy: 'maxSpeedKmh',
        sortOrder
      });

    expect(response.status).toBe(200);
    expect(
      response.body.trains.map(train => train.maxSpeedKmh)
    ).toEqual(expected);
  });

  test('sorts trains by passenger capacity', async () => {
    const response = await request(app)
      .get('/api/trains?sortBy=capacity&sortOrder=desc');

    expect(response.status).toBe(200);
    expect(
      response.body.trains.map(train => train.capacity)
    ).toEqual([360, 330, 290, 180]);
  });

  test('sorts trains by operator', async () => {
    const response = await request(app)
      .get('/api/trains?sortBy=operator&sortOrder=asc');

    expect(response.status).toBe(200);
    expect(
      response.body.trains.map(train => train.operator)
    ).toEqual([
      'Heritage Partnership',
      'JR East',
      'JR Hokkaido',
      'JR West'
    ]);
  });

    test('combines search, filtering, sorting, and pagination', async () => {
    const query = {
      search: 'express',
      type: 'Limited Express',
      powerSource: 'Electric',
      sortBy: 'capacity',
      sortOrder: 'desc',
      limit: 1
    };

    const firstPage = await request(app)
      .get('/api/trains')
      .query({ ...query, page: 1 });

    const secondPage = await request(app)
      .get('/api/trains')
      .query({ ...query, page: 2 });

    expect(firstPage.status).toBe(200);
    expect(secondPage.status).toBe(200);

    expect(firstPage.body.trains).toHaveLength(1);
    expect(secondPage.body.trains).toHaveLength(1);

    expect(firstPage.body.trains[0].id).toBe('series-e353');
    expect(secondPage.body.trains[0].id).toBe('series-287');

    expect(firstPage.body.pagination).toEqual({
      totalItems: 2,
      totalPages: 2,
      currentPage: 1,
      itemsPerPage: 1,
      hasNextPage: true,
      hasPreviousPage: false
    });

    expect(secondPage.body.pagination).toEqual({
      totalItems: 2,
      totalPages: 2,
      currentPage: 2,
      itemsPerPage: 1,
      hasNextPage: false,
      hasPreviousPage: true
    });

    expect(firstPage.body.query).toEqual({
      search: 'express',
      filters: {
        type: 'Limited Express',
        powerSource: 'Electric'
      },
      sortBy: 'capacity',
      sortOrder: 'desc'
    });

    expect(secondPage.body.query).toEqual(firstPage.body.query);
  });

    test('returns correct metadata when no trains match', async () => {
    const response = await request(app)
      .get('/api/trains?search=nonexistent-train');

    expect(response.status).toBe(200);
    expect(response.body.trains).toEqual([]);
    expect(response.body.pagination).toEqual({
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      itemsPerPage: 10,
      hasNextPage: false,
      hasPreviousPage: false
    });
  });

  test.each(['.*', '[', '$', '^', '('])
  ('treats regex characters as literal text: %s', async (search) => {
    const response = await request(app)
      .get('/api/trains')
      .query({ search });

    expect(response.status).toBe(200);
    expect(response.body.trains).toEqual([]);
    expect(response.body.pagination.totalItems).toBe(0);
  });

  test('trims whitespace from search and filter parameters', async () => {
    const response = await request(app)
      .get('/api/trains')
      .query({
        search: '  express  ',
        type: '  Limited Express  ',
        powerSource: '  Electric  '
      });

    expect(response.status).toBe(200);
    expect(response.body.trains).toHaveLength(2);
    expect(response.body.query.search).toBe('express');
    expect(response.body.query.filters).toEqual({
      type: 'Limited Express',
      powerSource: 'Electric'
    });
  });

    test.each([
    'sortBy=invalid',
    'sortBy=',
    'sortOrder=invalid',
    'sortOrder=',
    'sortBy=name&sortBy=capacity',
    'sortOrder=asc&sortOrder=desc',
    'search=express&search=steam',
    'type=express&type=steam',
    'powerSource=Electric&powerSource=Diesel'
  ])
  ('rejects invalid search or sorting parameter: %s', async (query) => {
    const response = await request(app)
      .get(`/api/trains?${query}`);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/trains/filters', () => {
  test('returns unique and sorted filter options', async () => {
    const response = await request(app)
      .get('/api/trains/filters');

    expect(response.status).toBe(200);
    expect(response.headers['content-type'])
      .toContain('application/json');

    expect(response.body).toEqual({
      types: [
        'Diesel Limited Express',
        'Limited Express',
        'Steam Excursion'
      ],
      powerSources: [
        'Diesel',
        'Electric',
        'Steam'
      ]
    });
  });

  test('includes filter options from newly added trains', async () => {
    await getDb().collection('trains').insertOne({
      id: 'test-hybrid',
      name: 'Test Hybrid Train',
      type: 'Regional Hybrid',
      powerSource: 'Hybrid'
    });

    const response = await request(app)
      .get('/api/trains/filters');

    expect(response.status).toBe(200);
    expect(response.body.types).toContain('Regional Hybrid');
    expect(response.body.powerSources).toContain('Hybrid');
  });

  test('excludes duplicate filter options', async () => {
    await getDb().collection('trains').insertOne({
      id: 'test-electric',
      name: 'Test Electric Train',
      type: 'Limited Express',
      powerSource: 'Electric'
    });

    const response = await request(app)
      .get('/api/trains/filters');

    expect(response.status).toBe(200);

    expect(response.body.types).toHaveLength(3);
    expect(response.body.powerSources).toHaveLength(3);
  });

  test('excludes missing and invalid filter values', async () => {
    await getDb().collection('trains').insertMany([
      {
        id: 'test-missing',
        name: 'Test Missing Fields'
      },
      {
        id: 'test-null',
        name: 'Test Null Fields',
        type: null,
        powerSource: null
      },
      {
        id: 'test-empty',
        name: 'Test Empty Fields',
        type: '',
        powerSource: '   '
      },
      {
        id: 'test-invalid',
        name: 'Test Invalid Fields',
        type: 123,
        powerSource: true
      }
    ]);

    const response = await request(app)
      .get('/api/trains/filters');

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      types: [
        'Diesel Limited Express',
        'Limited Express',
        'Steam Excursion'
      ],
      powerSources: [
        'Diesel',
        'Electric',
        'Steam'
      ]
    });
  });
});
