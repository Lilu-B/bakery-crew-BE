const db = require('../db/connection');

const approveUser = async (id) => {
  const result = await db.query(
    'UPDATE users SET is_approved = true WHERE id = $1 RETURNING id, name, email, is_approved;',
    [id]
  );

  return result.rows[0];
};

// ✅ Назначить пользователя менеджером
const assignManagerRole = async (userId) => {
  const result = await db.query(`
    UPDATE users
    SET role = 'manager'
    WHERE id = $1 AND role = 'user'
    RETURNING id, email, role;
  `, [userId]);

  return result.rows[0] || null;
};

// ✅ Снять роль менеджера
const revokeManagerRole = async (userId) => {
  const result = await db.query(`
    UPDATE users
    SET role = 'user'
    WHERE id = $1 AND role = 'manager'
    RETURNING id, email, role;
  `, [userId]);

  return result.rows[0] || null;
};





module.exports = {
  approveUser,
  assignManagerRole,
  revokeManagerRole
};