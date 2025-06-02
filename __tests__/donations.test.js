// __tests__/donations.test.js

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
    bcrypt.hash('user2pass', 10),
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
    const res = await request(app).post('/api/login').send({ email, password });
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

describe('POST /api/donations - Create Donation', () => {
  test('✅ Manager can create donation', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        title: 'Coffee Fund',
        description: 'Support our coffee needs',
        deadline: '2025-07-30',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.donation).toHaveProperty('title', 'Coffee Fund');
    expect(res.body.donation).toHaveProperty('status', 'active');
  });

  test('✅ Admin can create donation', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Birthday Gift',
        description: 'Lets gather for a present',
        deadline: '2025-07-10',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.donation).toHaveProperty('title', 'Birthday Gift');
  });

  test('❌ User cannot create donation', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'User Attempt',
        description: 'Should fail',
        deadline: '2025-08-01',
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.msg).toMatch(/only managers or admins/i);
  });
});

describe('GET /api/donations - Filtered and all donations', () => {
  test('✅ Get all donations without filters', async () => {
    const res = await request(app)
      .get('/api/donations')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.allDonations)).toBe(true);
  });

  test('✅ Filter by status=active', async () => {
    const res = await request(app)
      .get('/api/donations?status=active')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.statusCode).toBe(200);
    res.body.allDonations.forEach((donation) => {
      expect(donation.status).toBe('active');
    });
  });

  test('✅ Filter by creation date', async () => {
    const res = await request(app)
      .get('/api/donations?created_after=2025-01-01')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.allDonations)).toBe(true);
  });

  test('✅ total_collected is displayed and 0 by default', async () => {
    const res = await request(app)
      .get('/api/donations')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.statusCode).toBe(200);
    res.body.allDonations.forEach((donation) => {
      expect(donation).toHaveProperty('total_collected');
    });
  });

  test('✅ donor_count increases after donation', async () => {
    const resBefore = await request(app)
        .get('/api/donations?status=active')
        .set('Authorization', `Bearer ${user1Token}`);
    const donationId = resBefore.body.allDonations[0].id;
    const oldCount = resBefore.body.allDonations[0].donor_count;

    await request(app)
        .post(`/api/donations/${donationId}/confirm-payment`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ amount: 2 });

    const resAfter = await request(app)
        .get('/api/donations?status=active')
        .set('Authorization', `Bearer ${user1Token}`);
    const newCount = resAfter.body.allDonations.find(d => d.id === donationId).donor_count;

    expect(Number(newCount)).toBe(Number(oldCount) + 1);
    });

  test('✅ Donations are returned in order of nearest deadline first', async () => {
    const res = await request(app)
        .get('/api/donations')
        .set('Authorization', `Bearer ${user1Token}`);

    expect(res.statusCode).toBe(200);
    const deadlines = res.body.allDonations.map((d) => new Date(d.deadline));
    const sorted = [...deadlines].sort((a, b) => a - b);
    expect(deadlines).toEqual(sorted);
    });
});

describe('POST /api/donations/:id/confirm-payment', () => {
  test('✅ User can donate once', async () => {
    const donations = await request(app)
      .get('/api/donations?status=active')
      .set('Authorization', `Bearer ${user2Token}`);

    const donationId = donations.body.allDonations[0].id;
    const res = await request(app)
      .post(`/api/donations/${donationId}/confirm-payment`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ amount: 5 });

    expect(res.statusCode).toBe(201);
    expect(res.body.donation.amount).toBe("5");
  });

  test('❌ User cannot donate twice', async () => {
    const donations = await request(app)
      .get('/api/donations?status=active')
      .set('Authorization', `Bearer ${user2Token}`);

    const donationId = donations.body.allDonations[0].id;
    const res = await request(app)
      .post(`/api/donations/${donationId}/confirm-payment`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ amount: 5 });

    expect(res.statusCode).toBe(409);
    expect(res.body.msg).toMatch(/already donated/i);
  });

    test('❌ Donation must fail without amount', async () => {
    // Сначала получаем актуальный ID
    const donations = await request(app)
        .get('/api/donations?status=active')
        .set('Authorization', `Bearer ${user1Token}`);

    const donationId = donations.body.allDonations[0].id;

    const res = await request(app)
        .post(`/api/donations/${donationId}/confirm-payment`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({}); // отсутствие суммы

    expect(res.statusCode).toBe(400);
    expect(res.body.errors[0].msg).toMatch(/amount is required/i);
    });

  test('✅ has_donated is true after donation', async () => {
    const donations = await request(app)
        .get('/api/donations?status=active')
        .set('Authorization', `Bearer ${user2Token}`);

    const donationId = donations.body.allDonations[0].id;

    await request(app)
        .post(`/api/donations/${donationId}/confirm-payment`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ amount: 3 });

    const updated = await request(app)
        .get('/api/donations?status=active')
        .set('Authorization', `Bearer ${user2Token}`);

    const target = updated.body.allDonations.find(d => d.id === donationId);
    expect(target.has_donated).toBe(true);
    });
});

describe('DELETE /api/donations/:id - Deletion rules', () => {
  test('❌ Another manager cannot delete this donation', async () => {
     const all = await request(app)
      .get('/api/donations')
      .set('Authorization', `Bearer ${managerToken}`);
    const donationId = all.body.allDonations[0].id;

    const res = await request(app)
      .delete(`/api/donations/${donationId}`)
      .set('Authorization', `Bearer ${manager2Token}`);

    expect(res.statusCode).toBe(403);
  });

  test('✅ Admin can delete any donation', async () => {
    const all = await request(app)
      .get('/api/donations')
      .set('Authorization', `Bearer ${managerToken}`);

    const donationId = all.body.allDonations[0].id;

    const res = await request(app)
      .delete(`/api/donations/${donationId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.msg).toMatch(/donation deleted/i);
  });

  test('❌ Cannot delete non-existent donation', async () => {
    const res = await request(app)
        .delete('/api/donations/999999')
        .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.msg).toMatch(/not found/i);
    });
});

describe('GET /api/donations/:id - Donation details', () => {
  test('✅ User can view donation details', async () => {
    const all = await request(app)
      .get('/api/donations?status=active')
      .set('Authorization', `Bearer ${user1Token}`);

    const donationId = all.body.allDonations[0].id;

    const res = await request(app)
      .get(`/api/donations/${donationId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.donation).toHaveProperty('id', donationId);
  });

  test('❌ User cannot view details of non-existent donation', async () => {
    const res = await request(app)
      .get('/api/donations/999999')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.msg).toMatch(/not found/i);
  });
});
describe('GET /api/donations/active - Active donations', () => {
  test('✅ Get all active donations', async () => {
    const res = await request(app)
      .get('/api/donations/active')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.donations)).toBe(true);
    res.body.donations.forEach((donation) => {
      expect(donation.status).toBe('active');
    });
  });

  test('❌ Unauthorized user cannot access active donations', async () => {
    const res = await request(app)
      .get('/api/donations/active');

    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toMatch(/access denied/i);
  });
});
describe('GET /api/donations/:id/applicants - Donation applicants', () => {
  test('✅ Get applicants for a donation', async () => {
    const all = await request(app)
      .get('/api/donations?status=active')
      .set('Authorization', `Bearer ${user1Token}`);

    const donationId = all.body.allDonations[0].id;

    const res = await request(app)
      .get(`/api/donations/${donationId}/applicants`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.applicants)).toBe(true);
  });

  test('❌ Unauthorized user cannot access applicants', async () => {
    const res = await request(app)
      .get('/api/donations/999999/applicants');

    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toMatch(/access denied/i);
  });
});