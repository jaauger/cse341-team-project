import { beforeAll, describe, expect, test } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { getDb } from '../src/db/connect.js';
import { createUser, hashPassword } from '../src/models/users.js';
import Role from '../src/models/schemas/roles.js';

const TEST_PASSWORD = 'TestPassword123!';
const CUSTOMER_EMAIL = 'customer.test@example.com';
const OTHER_EMAIL = 'other@example.com';

let passwordHash;

beforeAll(async () => {
  passwordHash = await hashPassword(TEST_PASSWORD);
});

// Create a temporary user and establish an authenticated session.
async function loginAs(roleName, email = `${roleName}@example.com`) {
  const role = await Role.findOne({ name: roleName });

  expect(role).not.toBeNull();

  await createUser({
    displayName: `Test ${roleName}`,
    username: email,
    email,
    passwordHash,
    role: role._id
  });

  const agent = request.agent(app);

  const response = await agent
    .post('/api/auth/login')
    .send({
      email,
      password: TEST_PASSWORD
    });

  expect(response.status).toBe(200);
  expect(response.body.user.role).toBe(roleName);

  return agent;
}

// Insert controlled booking records into the temporary database.
async function seedBookings(count = 12) {
  const bookings = Array.from({ length: count }, (_, index) => ({
    id: `TEST-${String(index + 1).padStart(3, '0')}`,
    scheduleId: 1,
    tripId: 'test-trip',
    ticketClass: 'standard',
    selectedDay: 'monday',
    passengers: [
      {
        firstName: 'Test',
        lastName: 'Passenger',
        email: index % 2 === 0 ? CUSTOMER_EMAIL : OTHER_EMAIL,
        phone: ''
      }
    ],
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)),
    updatedAt: new Date(Date.UTC(2026, 0, 1, 0, index))
  }));

  await getDb().collection('bookings').insertMany(bookings);

  return bookings;
}

describe('GET /api/bookings', () => {
  test('uses the isolated test database for Mongoose', () => {
    expect(mongoose.connection.readyState).toBe(1);
    expect(mongoose.connection.name).toBe('kizuna-rail-test');
    expect(getDb().databaseName).toBe('kizuna-rail-test');
    expect(mongoose.connection.host).toBe('127.0.0.1');
  });

  test('rejects unauthenticated requests', async () => {
    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Authentication required.');
  });

  test('returns default pagination metadata for an administrator', async () => {
    const agent = await loginAs('admin');

    await seedBookings();

    const response = await agent.get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body.bookings).toHaveLength(10);

    expect(response.body.pagination).toEqual({
      totalItems: 12,
      totalPages: 2,
      currentPage: 1,
      itemsPerPage: 10,
      hasNextPage: true,
      hasPreviousPage: false
    });
  });

  test('returns the remaining bookings on the second page', async () => {
    const agent = await loginAs('admin');

    await seedBookings();

    const response = await agent.get('/api/bookings?page=2');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toHaveLength(2);

    expect(response.body.pagination).toEqual({
      totalItems: 12,
      totalPages: 2,
      currentPage: 2,
      itemsPerPage: 10,
      hasNextPage: false,
      hasPreviousPage: true
    });
  });

  test('supports custom page sizes', async () => {
    const agent = await loginAs('admin');

    await seedBookings();

    const response = await agent.get('/api/bookings?page=2&limit=5');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toHaveLength(5);

    expect(response.body.pagination).toEqual({
      totalItems: 12,
      totalPages: 3,
      currentPage: 2,
      itemsPerPage: 5,
      hasNextPage: true,
      hasPreviousPage: true
    });
  });

  test('sorts bookings newest first', async () => {
    const agent = await loginAs('admin');

    await seedBookings(4);

    const response = await agent.get('/api/bookings');

    expect(response.status).toBe(200);

    expect(response.body.bookings.map(booking => booking.id)).toEqual([
      'TEST-004',
      'TEST-003',
      'TEST-002',
      'TEST-001'
    ]);
  });

  test('uses deterministic ordering when booking dates match', async () => {
    const agent = await loginAs('admin');

    await seedBookings(4);

    const collection = getDb().collection('bookings');

    await collection.updateMany({}, {
      $set: {
        createdAt: new Date('2026-01-01T00:00:00Z')
      }
    });

    const expected = await collection
      .find({})
      .sort({ _id: -1 })
      .toArray();

    const firstPage = await agent.get('/api/bookings?page=1&limit=2');
    const secondPage = await agent.get('/api/bookings?page=2&limit=2');

    expect(firstPage.status).toBe(200);
    expect(secondPage.status).toBe(200);

    const returnedIds = [
      ...firstPage.body.bookings,
      ...secondPage.body.bookings
    ].map(booking => booking.id);

    expect(returnedIds).toEqual(expected.map(booking => booking.id));
    expect(new Set(returnedIds).size).toBe(4);
  });

  test.each([49, 50])(
    'accepts a valid pagination limit of %i',
    async (limit) => {
      const agent = await loginAs('admin');

      await seedBookings(55);

      const response = await agent.get(`/api/bookings?limit=${limit}`);

      expect(response.status).toBe(200);
      expect(response.body.bookings).toHaveLength(limit);
      expect(response.body.pagination.itemsPerPage).toBe(limit);
      expect(response.body.pagination.totalItems).toBe(55);
    }
  );

  test('returns the correct error when the limit exceeds 50', async () => {
    const agent = await loginAs('admin');

    const response = await agent.get('/api/bookings?limit=51');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      'Page must be a positive integer and limit must be between 1 and 50.'
    );
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
    'page=9007199254740991&limit=50',
    'limit=0',
    'limit=-1',
    'limit=1.5',
    'limit=abc',
    'limit=51',
    'limit=100',
    'limit=',
    'limit=1e1',
    'limit=0xA',
    'limit=2.0',
    'limit=1&limit=2'
  ])('rejects invalid pagination parameter: %s', async (query) => {
    const agent = await loginAs('admin');

    const response = await agent.get(`/api/bookings?${query}`);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('returns correct metadata when no bookings exist', async () => {
    const agent = await loginAs('admin');

    const response = await agent.get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toEqual([]);

    expect(response.body.pagination).toEqual({
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      itemsPerPage: 10,
      hasNextPage: false,
      hasPreviousPage: false
    });
  });

  test('returns an empty array for an out-of-range page', async () => {
    const agent = await loginAs('admin');

    await seedBookings(12);

    const response = await agent.get('/api/bookings?page=3');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toEqual([]);

    expect(response.body.pagination).toEqual({
      totalItems: 12,
      totalPages: 2,
      currentPage: 3,
      itemsPerPage: 10,
      hasNextPage: false,
      hasPreviousPage: true
    });
  });

  test('returns only bookings belonging to the authenticated customer', async () => {
    const agent = await loginAs('customer', CUSTOMER_EMAIL);

    await seedBookings();

    const response = await agent.get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toHaveLength(6);
    expect(response.body.pagination.totalItems).toBe(6);

    expect(response.body.bookings.every(booking =>
      booking.passengers.some(passenger =>
        passenger.email === CUSTOMER_EMAIL
      )
    )).toBe(true);
  });

  test('restricts customer pagination counts to matching bookings', async () => {
    const agent = await loginAs('customer', CUSTOMER_EMAIL);

    await seedBookings();

    const firstPage = await agent.get('/api/bookings?page=1&limit=4');
    const secondPage = await agent.get('/api/bookings?page=2&limit=4');

    expect(firstPage.status).toBe(200);
    expect(secondPage.status).toBe(200);

    expect(firstPage.body.bookings).toHaveLength(4);
    expect(secondPage.body.bookings).toHaveLength(2);

    expect(firstPage.body.pagination).toEqual({
      totalItems: 6,
      totalPages: 2,
      currentPage: 1,
      itemsPerPage: 4,
      hasNextPage: true,
      hasPreviousPage: false
    });

    expect(secondPage.body.pagination).toEqual({
      totalItems: 6,
      totalPages: 2,
      currentPage: 2,
      itemsPerPage: 4,
      hasNextPage: false,
      hasPreviousPage: true
    });

    expect([
      ...firstPage.body.bookings,
      ...secondPage.body.bookings
    ].map(booking => booking.id)).toEqual([
      'TEST-011',
      'TEST-009',
      'TEST-007',
      'TEST-005',
      'TEST-003',
      'TEST-001'
    ]);
  });

  test('matches customer email addresses case-insensitively', async () => {
    const agent = await loginAs('customer', CUSTOMER_EMAIL);

    await seedBookings(2);

    await getDb().collection('bookings').updateOne(
      { id: 'TEST-001' },
      { $set: { 'passengers.0.email': CUSTOMER_EMAIL.toUpperCase() } }
    );

    const response = await agent.get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toHaveLength(1);
    expect(response.body.bookings[0].id).toBe('TEST-001');
    expect(response.body.pagination.totalItems).toBe(1);
  });

  test('matches email addresses exactly and treats regex characters literally', async () => {
    const agent = await loginAs('customer', CUSTOMER_EMAIL);

    await seedBookings(4);

    const collection = getDb().collection('bookings');

    await collection.updateOne(
      { id: 'TEST-002' },
      { $set: { 'passengers.0.email': 'customerXtest@example.com' } }
    );

    await collection.updateOne(
      { id: 'TEST-004' },
      { $set: { 'passengers.0.email': `other-${CUSTOMER_EMAIL}` } }
    );

    const response = await agent.get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.pagination.totalItems).toBe(2);

    expect(response.body.bookings.map(booking => booking.id)).toEqual([
      'TEST-003',
      'TEST-001'
    ]);
  });

  test('returns bookings when the customer is an additional passenger', async () => {
    const agent = await loginAs('customer', CUSTOMER_EMAIL);

    await seedBookings(2);

    await getDb().collection('bookings').updateOne(
      { id: 'TEST-002' },
      {
        $push: {
          passengers: {
            firstName: 'Additional',
            lastName: 'Passenger',
            email: CUSTOMER_EMAIL
          }
        }
      }
    );

    const response = await agent.get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toHaveLength(2);
    expect(response.body.pagination.totalItems).toBe(2);
  });

  test('returns empty results for a customer with no matching bookings', async () => {
    const agent = await loginAs('customer', 'no-bookings@example.com');

    await seedBookings();

    const response = await agent.get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toEqual([]);

    expect(response.body.pagination).toEqual({
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      itemsPerPage: 10,
      hasNextPage: false,
      hasPreviousPage: false
    });
  });
});