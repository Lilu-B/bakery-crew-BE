const db = require('../db/connection');
const bcrypt = require('bcrypt');

const seedTestUsers = async () => {
  try {
    console.log('DATABASE_URL =', process.env.DATABASE_URL);
    console.log('ENV =', process.env.NODE_ENV);

    // Удалим всех, кроме главного админа
    await db.query(`DELETE FROM users WHERE email != 'admin@bakery.local';`);
    await db.query(`ALTER SEQUENCE users_id_seq RESTART WITH 2;`);

    // Хэшируем пароли
    const manager1Pass = await bcrypt.hash('manager1pass', 10);
    const manager2Pass = await bcrypt.hash('manager2pass', 10);
    const user1Pass = await bcrypt.hash('user1pass', 10);
    const user2Pass = await bcrypt.hash('user2pass', 10);

    // Создаём менеджеров и пользователей
    await db.query(
      `INSERT INTO users (name, email, password, role, shift, is_approved)
       VALUES 
       ('Manager One', 'manager1@example.com', $1, 'manager', '1st', true),
       ('Manager Two', 'manager2@example.com', $2, 'manager', '2nd', true),
       ('User One', 'user1@example.com', $3, 'user', '1st', true),
       ('User Two', 'user2@example.com', $4, 'user', '2nd', true);`,
      [manager1Pass, manager2Pass, user1Pass, user2Pass]
    );

    // Привязываем пользователей к менеджерам
    await db.query(`
      UPDATE users SET manager_id = (
        SELECT id FROM users WHERE email = 'manager1@example.com'
      ) WHERE email = 'user1@example.com';
    `);

    await db.query(`
      UPDATE users SET manager_id = (
        SELECT id FROM users WHERE email = 'manager2@example.com'
      ) WHERE email = 'user2@example.com';
    `);

    console.log('✅ Test users successfully added!');
    process.exit();
  } catch (err) {
    console.error('❌ Error seeding test users:', err);
    process.exit(1);
  } finally {
    db.end(); // Закрываем подключение
  }
};

seedTestUsers();