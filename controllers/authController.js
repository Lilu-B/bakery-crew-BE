const bcrypt = require('bcrypt');
const { createUser, findUserByEmail } = require('../models/userModel');
const db = require('../db/connection');

// POST /register
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, shift } = req.body;

    // Проверка обязательных полей
    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'Name, email, and password are required.' });
    }

    // Проверка формата email
    // Используем библиотеку validator для проверки формата email
    const validator = require('validator');
    if (!validator.isEmail(email)) {
    return res.status(422).json({ msg: 'Invalid email format.' });
    }

    // Проверка существующего пользователя
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ msg: 'User with this email already exists.' });
    }

    // Хэширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    let managerId = null;

    // Если указана смена — назначить менеджера автоматически
    if (shift) {
      const managerResult = await db.query(
        `SELECT id FROM users WHERE role = 'manager' AND shift = $1 LIMIT 1;`,
        [shift]
      );
      if (managerResult.rows.length > 0) {
        managerId = managerResult.rows[0].id;
      }
    }

    // Создание пользователя
    const newUser = await createUser({
      name,
      email,
      password: hashedPassword,
      phone,
      shift,
      managerId
    });

    res.status(201).json({
      msg: 'User registered successfully. Awaiting approval.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        shift: newUser.shift,
        role: newUser.role,
        isApproved: newUser.is_approved,
        assignedManagerId: newUser.manager_id || null
      }
    });

  } 
//   catch (error) {
//     console.error('❌ Error during user registration:', error);

//     res.status(500).json({
//       msg: 'An error occurred while trying to register the user. Please try again later.'
//     });
//   }
catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      msg: 'An error occurred while trying to register the user. Please try again later.',
      error: error.message  // 👈 временно выводим для отладки
    });
  }

};

module.exports = { registerUser };