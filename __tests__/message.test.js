const request = require('supertest');
const app = require('../app');
const db = require('../db/connection');
const { resetTestDB } = require('../utils/testUtils');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let managerToken, userToken, userId, managerId, manager2Id;

beforeAll(async () => {
    await resetTestDB();

    const passwordUser = await bcrypt.hash('demo123', 10);
    const passwordManager1 = await bcrypt.hash('manager123', 10);
    const passwordManager2 = await bcrypt.hash('manager456', 10);

    // Создание пользователей
    const uRes = await db.query(`
        INSERT INTO users (name, email, password, role, shift, is_approved)
        VALUES ('Demo User', 'demo@example.com', $1, 'user', '1st', true)
        RETURNING id;
    `, [passwordUser]);
    userId = uRes.rows[0].id;

    const mRes = await db.query(`
        INSERT INTO users (name, email, password, role, shift, is_approved)
        VALUES ('Manager1', 'manager1@example.com', $1, 'manager', '1st', true)
        RETURNING id;
    `, [passwordManager1]);
    managerId = mRes.rows[0].id;

    const m2Res = await db.query(`
        INSERT INTO users (name, email, password, role, shift, is_approved)
        VALUES ('Manager2', 'manager2@example.com', $1, 'manager', '2nd', true)
        RETURNING id;
        `, [passwordManager2]);
    manager2Id = m2Res.rows[0].id;

    // Привязка менеджера
    await db.query(`
        UPDATE users SET manager_id = $1 WHERE id = $2
    `, [managerId, userId]);

    // Получение токенов
    const login = async (email, password) =>
        (await request(app).post('/api/login').send({ email, password })).body.token;

    userToken = await login('demo@example.com', 'demo123');
    managerToken = await login('manager1@example.com', 'manager123');

// console.log('🔐 !!!___Logged in user ID:', jwt.decode(userToken).id);
// console.log('🔐 !!!___Logged in manager ID:', jwt.decode(managerToken).id);

    // Отправляем тестовые сообщения
  await request(app)
    .post('/api/messages')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ recipientId: managerId, content: 'Hi manager!' });

  await request(app)
    .post('/api/messages')
    .set('Authorization', `Bearer ${managerToken}`)
    .send({ recipientId: userId, content: 'Hi user!' });
});
afterAll(() => db.end());

describe('/api/messages', () => {
    describe('POST /api/messages', () => {
        test('✅ User can message their assigned manager', async () => {
            const res = await request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ recipientId: managerId, content: 'Test message to manager!' });

            expect(res.statusCode).toBe(201);
            expect(res.body.msg).toMatch(/message sent/i);
            expect(res.body.message).toHaveProperty('id');
            expect(res.body.message.content).toBe('Test message to manager!');
            expect(res.body.message.sender_id).toBe(userId);
            expect(res.body.message.receiver_id).toBe(managerId);
        });

        test('✅ Manager can message their user in same shift', async () => {
            const res = await request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${managerToken}`)
            .send({ recipientId: userId, content: 'Hi user!' });

            expect(res.statusCode).toBe(201);
            expect(res.body.msg).toMatch(/message sent/i);
            expect(res.body.message).toHaveProperty('id');
            expect(res.body.message.content).toBe('Hi user!');
            expect(res.body.message.sender_id).toBe(managerId);
            expect(res.body.message.receiver_id).toBe(userId);
        });

        test('❌ User cannot message another manager', async () => {
            const res = await request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ recipientId: manager2Id, content: 'User try message wrong manager.' });

            expect(res.statusCode).toBe(403);
            expect(res.body.msg).toBe('Users can only message their assigned manager.');
        });

        test('❌ 404 if recipient does not exist', async () => {
            const res = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ recipientId: 99999, content: 'Hello ghost user' });

            expect(res.statusCode).toBe(404);
            expect(res.body.msg).toMatch('Recipient not found.');
            });

            test('❌ 400 if content or recipientId is missing', async () => {
            const res = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${userToken}`)
                .send({}); // Пустое тело

            expect(res.statusCode).toBe(400);
            expect(res.body.errors).toBeDefined();
            expect(Array.isArray(res.body.errors)).toBe(true);
            });
    });

    describe('GET /api/messages/inbox and /sent', () => {
        test('✅ User can see received messages', async () => {
            const res = await request(app)
            .get('/api/messages/inbox')
            .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body.inbox)).toBe(true);
            expect(res.body.inbox.some(msg => msg.sender_id === managerId)).toBe(true);
        });

        test('✅ Manager can see received messages', async () => {
            const res = await request(app)
            .get('/api/messages/inbox')
            .set('Authorization', `Bearer ${managerToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body.inbox)).toBe(true);
            expect(res.body.inbox.some(msg => msg.sender_id === userId)).toBe(true);
        });

        test('✅ User can see sent messages', async () => {
            const res = await request(app)
            .get('/api/messages/sent')
            .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body.sent)).toBe(true);
            expect(res.body.sent.some(msg => msg.receiver_id === managerId)).toBe(true);
        });

            test('✅ Manager can see sent messages', async () => {
            const res = await request(app)
            .get('/api/messages/sent')
            .set('Authorization', `Bearer ${managerToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body.sent)).toBe(true);
            expect(res.body.sent.some(msg => msg.receiver_id === userId)).toBe(true);
        });
        });
});