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


  // ✅ Логика удаления пользователя с проверкой прав
  const deleteUser = async (userIdToDelete, requester) => {
    const { id: requesterId, role, shift: requesterShift } = requester;

    // 1. Получаем данные пользователя, которого хотят удалить
    const result = await db.query('SELECT * FROM users WHERE id = $1;', [userIdToDelete]);
    const userToDelete = result.rows[0];

    if (!userToDelete) return null;

  // console.log('🧾 Trying to delete user:', {
  //   id: userToDelete.id,
  //   email: userToDelete.email,
  //   role: userToDelete.role,
  //   shift: userToDelete.shift
  // });
  // console.log('🔐 Request made by:', {
  //   id: requesterId,
  //   role,
  //   shift: requesterShift
  // });

    // 2. Developer может удалить любого
    if (role === 'developer') {
      await db.query('DELETE FROM users WHERE id = $1;', [userIdToDelete]);
      return userToDelete;
    }

    // 3. Manager может удалить только пользователей своей смены
    if (role === 'manager') {
      if (userToDelete.shift === requesterShift && userToDelete.role === 'user') {
        await db.query('DELETE FROM users WHERE id = $1;', [userIdToDelete]);
        return userToDelete;
      } else {
        return false; // Недостаточно прав
      }
    }

    // 4. User может удалить только себя
    if (role === 'user') {
      if (parseInt(userIdToDelete) === requesterId) {
        await db.query('DELETE FROM users WHERE id = $1;', [userIdToDelete]);
        return userToDelete;
      } else {
        return false; // Недостаточно прав
      }
    }

    // 5. Никакая другая роль не может удалить
    return false;
  };
  
  module.exports = {
    createUser,
    findUserByEmail,
    deleteUser
  };