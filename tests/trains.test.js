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
});
