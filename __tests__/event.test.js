const request = require('supertest');
const app = require('../app');
const db = require('../db/connection');
const bcrypt = require('bcrypt');
const { resetTestDB } = require('../utils/testUtils');

let adminToken, managerToken, manager2Token, user1Token, user2Token;

beforeAll(async () => {
  await resetTestDB(); 

  const [adminPass, managerPass, manager2Pass, user1Pass, user2Pass] = await Promise.all([
    bcrypt.hash('adminpass', 10),
    bcrypt.hash('managerpass', 10),
    bcrypt.hash('manager2pass', 10),
    bcrypt.hash('user1pass', 10),
    bcrypt.hash('user2pass', 10)
  ]);

  await db.query(
    `INSERT INTO users (name, email, password, role, shift, is_approved)
     VALUES
     ('Admin', 'admin@example.com', $1, 'developer', NULL, true),
     ('Manager One', 'manager1@example.com', $2, 'manager', '1st', true),
     ('Manager Two', 'manager2@example.com', $3, 'manager', '2nd', true),
     ('User One', 'user1@example.com', $4, 'user', '1st', true),
     ('User Two', 'user2@example.com', $5, 'user', '2nd', true);`,
    [adminPass, managerPass, manager2Pass, user1Pass, user2Pass]
  );

  const login = async (email, password) => {
    const res = await request(app)
      .post('/api/login')
      .send({ email, password });
    return res.body.token;
  };

  adminToken = await login('admin@example.com', 'adminpass');
  managerToken = await login('manager1@example.com', 'managerpass');
  manager2Token = await login('manager2@example.com', 'manager2pass');
  user1Token = await login('user1@example.com', 'user1pass');
  user2Token = await login('user2@example.com', 'user2pass');
});

afterAll(async () => {
  await db.end();
});

describe('POST /api/events - Creating an event', () => {
  test('Manager can successfully create an event', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        title: 'Team Meeting',
        description: 'Monthly team sync-up',
        date: '2025-07-01',
        shift: '1st'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.event).toMatchObject({
      title: 'Team Meeting',
      shift: '1st',
      status: 'active'
    });
  });

  test('Creating event fails without title', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        description: 'No title provided',
        date: '2025-07-01',
        shift: '1st'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].msg).toMatch(/title is required/i);
  });

  test('Creating event fails with invalid date', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        title: 'Invalid Date',
        date: 'invalid-date',
        shift: '1st'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].msg).toBe('Valid ISO date required');
  });

  test('Creating event fails with invalid shift', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        title: 'Wrong Shift',
        date: '2025-07-01',
        shift: 'evening'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].msg).toMatch(/invalid shift/i);
  });

  test('Unauthorized user cannot create event (no token)', async () => {
    const res = await request(app)
      .post('/api/events')
      .send({
        title: 'Unauthorized',
        date: '2025-07-01',
        shift: '1st'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toMatch(/access denied/i);
  });
});

describe('GET /api/events - Retrieving active events', () => {
  test('Should return an array of active events', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body.events.length).toBeGreaterThan(0);
    
    res.body.events.forEach((event) => {
      expect(event).toHaveProperty('title');
      expect(event).toHaveProperty('description');
      expect(event).toHaveProperty('shift');
      expect(event).toHaveProperty('status', 'active');
      expect(event).toHaveProperty('creator_name');
    });
  });

  test('Should return 401 if no token is provided', async () => {
    const res = await request(app).get('/api/events');
    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toMatch(/access denied/i);
  });
});

describe('POST /api/events/:eventId/apply - Applying to events', () => {
  const eventId = 1; 

  test('User can apply to an event of their shift', async () => {
    const res = await request(app)
      .post(`/api/events/${eventId}/apply`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.statusCode).toBe(201);
    expect(res.body.msg).toMatch(/application submitted/i);
  });

  test('User from another shift cannot apply', async () => {
    const res = await request(app)
        .post(`/api/events/${eventId}/apply`)
        .set('Authorization', `Bearer ${user2Token}`); 

    expect(res.statusCode).toBe(403);
    expect(res.body.msg).toMatch(/only apply to events from their shift/i);
    });

  test('Manager cannot apply to events', async () => {
    const res = await request(app)
      .post(`/api/events/${eventId}/apply`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.msg).toMatch(/only users can apply/i);
  });

  test('Cannot apply without a token', async () => {
    const res = await request(app)
      .post(`/api/events/${eventId}/apply`);

    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toMatch(/access denied/i);
  });
});


describe('GET /api/events/:eventId/applicants - Viewing applicants', () => {
  test('Manager can view applicants for their event', async () => {
    const res = await request(app)
      .get(`/api/events/1/applicants`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.applicants)).toBe(true);
    expect(res.body.applicants.length).toBeGreaterThanOrEqual(0);
  });

  test('Admin can view applicants for any event', async () => {
    const res = await request(app)
      .get(`/api/events/1/applicants`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.applicants)).toBe(true);
  });

  test('User who applied can view other applicants', async () => {
    const res = await request(app)
      .get(`/api/events/1/applicants`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.applicants)).toBe(true);
    expect(res.body.applicants.length).toBeGreaterThan(0);
    expect(res.body.applicants[0]).toHaveProperty('name');
    expect(res.body.applicants[0]).toHaveProperty('email');
  });
});


describe('DELETE /api/events/:eventId/cancel - Cancelling application', () => {
  const eventId = 1;

  test('User can cancel their own application', async () => {
    const res = await request(app)
      .delete(`/api/events/${eventId}/cancel`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.msg).toMatch(/cancelled/i);
  });

  test('Cannot cancel application twice', async () => {
    const res = await request(app)
      .delete(`/api/events/${eventId}/cancel`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.msg).toMatch(/no application found/i);
  });

  test('Cannot cancel application without token', async () => {
    const res = await request(app)
      .delete(`/api/events/${eventId}/cancel`);

    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toMatch(/access denied/i);
  });

  test('User cannot cancel application if none exists', async () => {
    const res = await request(app)
      .delete(`/api/events/1/cancel`) 
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.msg).toMatch(/no application found to cancel/i);
  });
});

describe('DELETE /api/events/:eventId - Deleting events', () => {
  const eventId = 1;
  const existingEventId = eventId;

  test('User cannot delete any event', async () => {
    const res = await request(app)
      .delete(`/api/events/${existingEventId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.msg).toMatch(/access denied/i);
  });

    test('Manager cannot delete another manager\'s event', async () => {
    const res = await request(app)
        .delete(`/api/events/${eventId}`) 
        .set('Authorization', `Bearer ${manager2Token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.msg).toMatch(/access denied/i);
    });

  test('Cannot delete non-existent event', async () => {
    const res = await request(app)
      .delete('/api/events/9999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.msg).toMatch(/event not found/i);
  });

  test('Manager can delete their own event', async () => {
    const newEvent = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        title: 'Manager Deletion Test',
        description: 'Event by manager',
        date: '2025-08-10',
        shift: '1st'
      });

    const managerEventId = newEvent.body.event.id;

    const res = await request(app)
      .delete(`/api/events/${managerEventId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.msg).toMatch(/event deleted/i);
  });

  test('Developer can delete any event', async () => {
    const res = await request(app)
      .delete(`/api/events/${existingEventId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.msg).toMatch(/event deleted/i);
  });
});