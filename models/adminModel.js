const db = require('../db/connection');

const approveUser = async (id) => {
  const result = await db.query(
    'UPDATE users SET is_approved = true WHERE id = $1 RETURNING id, name, email, is_approved;',
    [id]
  );

  return result.rows[0];
};

module.exports = {
  approveUser
};