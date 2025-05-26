const request = require('supertest');
const app = require('../app');
const db = require('../db/connection');
const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');

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

    beforeEach(async () => {
      await db.query('DELETE FROM users;');
    });

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

// Подтверждение регистрации пользователем !!!!!!!
    test('201: should assign a manager if shift is provided', async () => {
    });
 
    test('409: responds with error if email already exists', async () => {
      await request(app)
        .post('/api/register')
        .send(newUser); 

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
        email: 'not-an-email',
        password: '123'
      };
  
      const res = await request(app)
        .post('/api/register')
        .send(badUser);
        
      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Name is required' }),
          expect.objectContaining({ msg: 'Valid email is required' }),
          expect.objectContaining({ msg: 'Password must be at least 6 characters' })
        ])
      );
    });

    test('422: should return error if email format is invalid', async () => {
        const invalidUser = { ...newUser, email: 'not-an-email' };
      
        const res = await request(app)
          .post('/api/register')
          .send(invalidUser);
      
        expect(res.statusCode).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ msg: 'Valid email is required' })
          ])
        );
      });
  });

describe('POST /api/login', () => {
  // Чистим таблицу и добавляем одобренного пользователя
  beforeEach(async () => {
    await db.query('DELETE FROM users;');
    const hashedPassword = await bcrypt.hash('testpass', 10);
    await db.query(`
      INSERT INTO users (name, email, password, role, is_approved)
      VALUES ('Approved User', 'approved@example.com', $1, 'user', true);
    `, [hashedPassword]);
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
      .send({ }); // без пароля

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: 'Valid email is required' }),
        expect.objectContaining({ msg: 'Password is required' })
      ])
    );
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

describe('GET /api/protected', () => {
  let validToken;

  beforeEach(async () => {
    await db.query('DELETE FROM users;');
    const hashedPassword = await bcrypt.hash('testpass', 10);
    await db.query(`
      INSERT INTO users (name, email, password, role, is_approved)
      VALUES ('Approved User', 'auth@example.com', $1, 'user', true);
    `, [hashedPassword]);

    // Получаем токен для защищённого маршрута
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'auth@example.com', password: 'testpass' });

    validToken = res.body.token;
  });

  test('200: returns user info with valid token', async () => {
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('msg');
    expect(res.body).toHaveProperty('role');
  });

  test('401: returns error if no Authorization header is present', async () => {
    const res = await request(app).get('/api/protected');
    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toBe('Access denied. No token provided.');
  });

  test('403: returns error for invalid token', async () => {
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', 'Bearer this.is.not.a.real.token');

    expect(res.statusCode).toBe(403);
    expect(res.body.msg).toBe('Invalid or expired token.');
  });
});

describe('POST /api/logout', () => {
  test('200: logs out the user (client should delete token)', async () => {
    const res = await request(app).post('/api/logout');
    expect(res.statusCode).toBe(200);
    expect(res.body.msg).toBe('Logout successful.');
  });
});

describe('JWT token after logout', () => {
  let token;

  beforeEach(async () => {
    await db.query('DELETE FROM users;');
    const hashedPassword = await bcrypt.hash('logoutpass', 10);
    await db.query(`
      INSERT INTO users (name, email, password, role, is_approved)
      VALUES ('Logout User', 'logout@example.com', $1, 'user', true);
    `, [hashedPassword]);

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'logout@example.com', password: 'logoutpass' });

    token = res.body.token;
  });

  test('403: should not allow access to protected route after token is removed (client-side)', async () => {
    // Шаг 1: Проверим, что токен работает
    const firstRes = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(firstRes.statusCode).toBe(200);

    // Шаг 2: Симулируем logout: клиент удаляет токен — и не передаёт его
    const res = await request(app).get('/api/protected'); // без заголовка Authorization
    expect(res.statusCode).toBe(401);
    expect(res.body.msg).toBe('Access denied. No token provided.');
  });
});