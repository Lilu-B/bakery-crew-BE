const request = require('supertest');
const app = require('../app');
const db = require('../db/connection');

beforeAll(() => {
    return db.query('DELETE FROM users;');
});

afterAll(() => {
  return db.end(); // закрываем соединение после тестов
});

describe('POST /api/register', () => {
    const newUser = {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'password123',
        phone: '0123456789',
        shift: '1st'
    };

    test('201: should create a new user and return expected fields', async () => {
        const res = await request(app)
          .post('/api/register')
          .send(newUser);
        
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('user');
        expect(res.body.user).toMatchObject({
          name: newUser.name,
          email: newUser.email,
          shift: newUser.shift,
          role: 'user', 
          isApproved: false 
        });
    
        expect(res.body.user.id).toEqual(expect.any(Number));
 //       expect(res.body.user.assignedManagerId).toBeNull();
    });
    test('201: should assign a manager if shift is provided', async () => {
    });
  
    test('409: responds with error if email already exists', async () => {
      const duplicate = {
        ...newUser,
        name: 'Duplicate Name',
        phone: '0777777777'
      };
  
      const res = await request(app)
        .post('/api/register')
        .send(duplicate);
  
      expect(res.statusCode).toBe(409);
      expect(res.body.msg).toBe('User with this email already exists.');
    });
  
    test('400: responds with error if required fields are missing', async () => {
      const badUser = {
        email: 'no-name@example.com',
        password: '123'
      };
  
      const res = await request(app)
        .post('/api/register')
        .send(badUser);
        
      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toBe('Name, email, and password are required.');
    });

    test('422: should return error if email format is invalid', async () => {
        const invalidUser = {
            ...newUser,
          email: 'not-an-email'
        };
      
        const res = await request(app)
          .post('/api/register')
          .send(invalidUser);
      
        expect(res.statusCode).toBe(422);
        expect(res.body.msg).toBe('Invalid email format.');
      });
  });

describe('POST /api/login', () => {
  beforeEach(async () => {
    // Чистим таблицу и добавляем одобренного пользователя
    await db.query('DELETE FROM users;');
    await db.query(`
      INSERT INTO users (name, email, password, role, is_approved)
      VALUES ('Approved User', 'approved@example.com', 'testpass', 'user', true);
    `);
  });

  test('200: logs in an approved user and returns a token', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({
        email: 'approved@example.com',
        password: 'testpass'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.msg).toBe('Login successful.');
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  test('401: returns error for unapproved user', async () => {
    // создаём нового пользователя без подтверждения
    await db.query(`
      INSERT INTO users (name, email, password, role, is_approved)
      VALUES ('Pending User', 'pending@example.com', 'testpass', 'user', false);
    `);

    const res = await request(app)
      .post('/api/login')
      .send({
        email: 'pending@example.com',
        password: 'testpass'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toBe('Invalid credentials or account not approved.');
  });

  test('400: returns error for missing fields', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'approved@example.com' }) // без пароля
      .expect(400);

    expect(res.body.msg).toBe('Email and password are required.');
  });

  test('401: returns error for invalid credentials/account not approved', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({
        email: 'approved@example.com',
        password: 'wrongpass'
      });
    
    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toBe('Invalid credentials or account not approved.');
  });
});