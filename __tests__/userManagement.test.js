const request = require('supertest');
const app = require('../app');
const db = require('../db/connection');
const { resetTestDB } = require('../utils/testUtils');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let adminToken, manager1Token, manager2Token, user1Token, user2Token;
let user1Id, user2Id, manager2Id;

beforeAll(async () => {
  await resetTestDB();  // основная очистка БД перед тестами

  // Создаём пользователей с ролями и сменами
  const users = [
    { name: 'Admin', email: 'admin@example.com', password: 'adminpass', role: 'developer', shift: null },
    { name: 'Manager One', email: 'manager1@example.com', password: 'manager1pass', role: 'manager', shift: '1st' },
    { name: 'Manager Two', email: 'manager2@example.com', password: 'manager2pass', role: 'manager', shift: '2nd' },
    { name: 'User One', email: 'user1@example.com', password: 'user1pass', role: 'user', shift: '1st' },
    { name: 'User Two', email: 'user2@example.com', password: 'user2pass', role: 'user', shift: '2nd' },
    { name: 'User Three', email: 'user3@example.com', password: 'user3pass', role: 'user', shift: '1st' }
  ];

  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10);
    await db.query(
      `INSERT INTO users (name, email, password, role, shift, is_approved)
       VALUES ($1, $2, $3, $4, $5, true);`,
      [u.name, u.email, hashed, u.role, u.shift]
    );
  }

  // Получаем ID нужных пользователей
  const user1 = await db.query(`SELECT id FROM users WHERE email = 'user1@example.com'`);
  const user2 = await db.query(`SELECT id FROM users WHERE email = 'user2@example.com'`);
  const user3 = await db.query(`SELECT id FROM users WHERE email = 'user3@example.com'`);
  const mgr2 = await db.query(`SELECT id FROM users WHERE email = 'manager2@example.com'`);
  user1Id = user1.rows[0].id;
  user2Id = user2.rows[0].id;
  user3Id = user3.rows[0].id;
  manager2Id = mgr2.rows[0].id;

  // Логинимся и сохраняем токены
  const login = async (email, password) =>
    (await request(app).post('/api/login').send({ email, password })).body.token;

  adminToken    = await login('admin@example.com', 'adminpass');
  manager1Token = await login('manager1@example.com', 'manager1pass');
  manager2Token = await login('manager2@example.com', 'manager2pass');
  user1Token    = await login('user1@example.com', 'user1pass');
  user2Token    = await login('user2@example.com', 'user2pass');
  user3Token = await login('user3@example.com', 'user3pass');
});

afterAll(() => db.end());

describe('DELETE /api/users/:id', () => {
    test('✅ User can delete themselves', async () => {
        const res = await request(app)
        .delete(`/api/users/${user2Id}`)
        .set('Authorization', `Bearer ${user2Token}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.user.email).toBe('user2@example.com');
    });
    
    test('❌ User cannot delete another user', async () => {
        const res = await request(app)
        .delete(`/api/users/${user1Id}`)
        .set('Authorization', `Bearer ${user2Token}`);
        
        expect(res.statusCode).toBe(403);
        expect(res.body.msg).toMatch(/access denied/i);
    });
    
    test('✅ Manager can delete user from their shift', async () => {
        const res = await request(app)
        .delete(`/api/users/${user1Id}`)
        .set('Authorization', `Bearer ${manager1Token}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.user.email).toBe('user1@example.com');
    });
    
    test('❌ Manager cannot delete user from another shift', async () => {
        const res = await request(app)
        .delete(`/api/users/${manager2Id}`)
        .set('Authorization', `Bearer ${manager1Token}`);
        
        expect(res.statusCode).toBe(403);
        expect(res.body.msg).toMatch(/access denied/i);
    });
    
    test('❌ Manager cannot delete another manager', async () => {
        const res = await request(app)
        .delete(`/api/users/${manager2Id}`)
        .set('Authorization', `Bearer ${manager1Token}`);
        
        expect(res.statusCode).toBe(403);
        expect(res.body.msg).toMatch(/access denied/i);
    });
    
    test('✅ Admin can delete any user', async () => {
        const res = await request(app)
        .delete(`/api/users/${manager2Id}`)
        .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.user.email).toBe('manager2@example.com');
    });
    
    test('❌ Admin gets 404 when trying to delete a non-existent user', async () => {
        const nonExistentId = 999999; // ID, заведомо несуществующий
        
        const res = await request(app)
        .delete(`/api/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toBe(404);
        expect(res.body.msg).toBe("User not found");
    });
    
    test('❌ Request without token returns 401 Unauthorized', async () => {
        const res = await request(app)
        .delete(`/api/users/${user1Id}`); // без .set('Authorization', ...)
        
        expect(res.statusCode).toBe(401);
        expect(res.body.msg).toMatch("Access denied. No token provided."); // поддерживает любую реализацию текста
    });
    
    test('✅ Deleted user is removed from the database', async () => {
        // Создаём временного пользователя
        const email = 'temp-delete@example.com';
        const password = 'deleteMe123';
        const hashed = await bcrypt.hash(password, 10);
        
        const insert = await db.query(
            `INSERT INTO users (name, email, password, role, shift, is_approved)
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING id;`,
            ['Temp Delete', email, hashed, 'user', '2nd']
        );
        
        const tempUserId = insert.rows[0].id;
        
        // Логинимся как этот пользователь
        const tempToken = (await request(app)
        .post('/api/login')
        .send({ email, password })).body.token;
        
        // Удаляем
        const res = await request(app)
        .delete(`/api/users/${tempUserId}`)
        .set('Authorization', `Bearer ${tempToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.user.id).toBe(tempUserId);
        
        // Проверяем, что его действительно больше нет
        const check = await db.query('SELECT * FROM users WHERE id = $1', [tempUserId]);
        expect(check.rows.length).toBe(0);
    });
});

describe('PATCH /api/admin/users/:id/assign-manager', () => {
    test('✅ Admin can promote a user to manager', async () => {
        const res = await request(app)
        .patch(`/api/admin/users/${user3Id}/assign-manager`)
        .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.user.role).toBe('manager');
        expect(res.body.msg).toBe('User promoted to manager.');
    });
    
    test('❌ Non-admin cannot promote to manager', async () => {
        const res = await request(app)
        .patch(`/api/admin/users/${user2Id}/assign-manager`)
        .set('Authorization', `Bearer ${manager1Token}`); // simulate manager trying
        
        expect(res.statusCode).toBe(403);
        expect(res.body.msg).toMatch(/access denied/i);
    });

    test('❌ Cannot promote non-existent user', async () => {
        const res = await request(app)
            .patch(`/api/admin/users/99999/assign-manager`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(404);
        expect(res.body.msg).toBe('User not found or not eligible for promotion.');});
});

describe('PATCH /api/admin/users/:id/revoke-manager', () => {
    test('✅ Admin can demote a manager to user', async () => {
        const res = await request(app)
        .patch(`/api/admin/users/${user3Id}/revoke-manager`)
        .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.user.role).toBe('user');
        expect(res.body.msg).toBe('Manager demoted to user.');
    });
    
    test('❌ Non-admin cannot demote a manager', async () => {
        const res = await request(app)
        .patch(`/api/admin/users/${user3Id}/revoke-manager`)
        .set('Authorization', `Bearer ${user1Token}`);
        
        expect(res.statusCode).toBe(403);
        expect(res.body.msg).toMatch(/access denied/i);
    });
});
