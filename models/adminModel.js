const db = require('../db/connection');

const approveUser = async (id) => {
  const result = await db.query(
    'UPDATE users SET is_approved = true WHERE id = $1 RETURNING id, name, email, is_approved;',
    [id]
  );

  return result.rows[0];
};

const assignManagerRole = async (userId) => {
  const result = await db.query(`
    UPDATE users
    SET role = 'manager'
    WHERE id = $1 AND role = 'user'
    RETURNING id, email, role;
  `, [userId]);

  return result.rows[0] || null;
};

const revokeManagerRole = async (userId) => {
  const result = await db.query(`
    UPDATE users
    SET role = 'user'
    WHERE id = $1 AND role = 'manager'
    RETURNING id, email, role;
  `, [userId]);

  return result.rows[0] || null;
};

const getPendingUsers = async () => {
  const result = await db.query(`
    SELECT id, name, email, role, shift, phone, is_approved, manager_id
    FROM users
    WHERE is_approved = false
    ORDER BY registration_date DESC
  `);
  return result.rows;
};


module.exports = {
  approveUser,
  assignManagerRole,
  revokeManagerRole,
  getPendingUsers
};