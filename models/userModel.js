const db = require('../db/connection');

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
  
  const findUserByEmail = async (email) => {
    const result = await db.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0];
  };


  const deleteUser = async (userIdToDelete, requester) => {
    const { id: requesterId, role, shift: requesterShift } = requester;

    const result = await db.query('SELECT * FROM users WHERE id = $1;', [userIdToDelete]);
    const userToDelete = result.rows[0];

    if (!userToDelete) return null;

    if (role === 'developer') {
      await db.query('DELETE FROM users WHERE id = $1;', [userIdToDelete]);
      return userToDelete;
    }

    if (role === 'manager') {
      if (userToDelete.shift === requesterShift && userToDelete.role === 'user') {
        await db.query('DELETE FROM users WHERE id = $1;', [userIdToDelete]);
        return userToDelete;
      } else {
        return false; 
      }
    }

    if (role === 'user') {
      if (parseInt(userIdToDelete) === requesterId) {
        await db.query('DELETE FROM users WHERE id = $1;', [userIdToDelete]);
        return userToDelete;
      } else {
        return false;
      }
    }

    return false;
  };
  
  module.exports = {
    createUser,
    findUserByEmail,
    deleteUser
  };