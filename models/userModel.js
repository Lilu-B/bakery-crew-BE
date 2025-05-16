const db = require('../db/connection');

// ✅ Создание нового пользователя
const createUser = async ({ name, email, password, phone, shift, managerId }) => {
    const result = await db.query(
      `
      INSERT INTO users (name, email, password, phone, shift, manager_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
      `,
      [name, email, password, phone, shift || null, managerId || null]
    );
    return result.rows[0];
  };
  
  // 🔍 Поиск пользователя по email
  const findUserByEmail = async (email) => {
    const result = await db.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0];
  };
  
  module.exports = {
    createUser,
    findUserByEmail
  };