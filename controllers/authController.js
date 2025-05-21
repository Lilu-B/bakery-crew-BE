const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { createUser, findUserByEmail } = require('../models/userModel');
const db = require('../db/connection');

// POST /register
const registerUser = async (req, res) => {
    const { name, email, password, phone, shift } = req.body;
  
    // 1. Валидация обязательных полей
    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'Name, email, and password are required.' });
    }
  
    // 2. Валидация формата email
    if (!validator.isEmail(email)) {
      return res.status(422).json({ msg: 'Invalid email format.' });
    }
  
    try {
      // 3. Проверка на существующего пользователя
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ msg: 'User with this email already exists.' });
      }
  
      // 4. Хэширование пароля
      const hashedPassword = await bcrypt.hash(password, 10);
  
      let managerId = null;
  
      // 5. Назначение менеджера по смене (если передана shift)
      if (shift) {
        const managerResult = await db.query(
          `SELECT id FROM users WHERE role = 'manager' AND shift = $1 LIMIT 1;`,
          [shift]
        );
        if (managerResult.rows.length > 0) {
          managerId = managerResult.rows[0].id;
        }
      }
  
      // 6. Создание пользователя в БД
      const newUser = await createUser({
        name,
        email,
        password: hashedPassword,
        phone,
        shift,
        managerId
      });
  
      // 7. Ответ клиенту
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
  
    } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      msg: 'An error occurred while trying to register the user. Please try again later.',
      error: error.message  // 👈 временно выводим для отладки
    });
    //   catch (error) {
    //     console.error('❌ Error during user registration:', error);

    //     res.status(500).json({
    //       msg: 'An error occurred while trying to register the user. Please try again later.'
    //     });
    //   }
  }

};

// POST /api/login
// Асинхронная функция логина пользователя
const loginUser = async (req, res) => {
    const { email, password } = req.body; // получаем email и пароль из тела запроса
  
    // 1. Проверка: обязательные поля
    if (!email || !password)
      return res.status(400).json({ msg: 'Email and password are required.' });
  
    try {
      // 2. Запрос к базе: найти пользователя с такими email и password, который уже одобрен
      const result = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
  
      const user = result.rows[0]; // получаем первого найденного пользователя (если есть)
  
      // 3. Если пользователь не найден или не одобрен
      if (!user || !user.is_approved) {
        return res.status(401).json({ msg: 'Invalid credentials or account not approved.' });
      }

      // 4. Проверяем пароль
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ msg: 'Invalid credentials or account not approved.' });
      }
  
      // 5. Генерация JWT-токена
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET, // секретная строка из переменных окружения
        { expiresIn: '30d' } // токен действителен 30 дней
      );
  
      // 6. Отправка успешного ответа и токена
      res.status(200).json({
        msg: 'Login successful.',
        token // клиент сохранит токен и будет использовать для аутентификации
      });
  
    } catch (error) {
      // 7. Ловим и логируем любые непредвиденные ошибки
      console.error('Login error:', error);
      res.status(500).json({ msg: 'Internal server error' });
    }
  };
  

module.exports = { registerUser, loginUser };