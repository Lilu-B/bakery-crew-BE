const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');
// const { checkUserRole } = require('../middleware/authMiddleware'); // Импортируем middleware для проверки роли
const router = express.Router();

// POST /api/register
router.post('/register', registerUser);
// POST /api/login
router.post('/login', loginUser);
// GET /api/logout
// router.get('/logout', (req, res) => {
//   // Логика выхода пользователя
//   req.session.destroy((err) => {
//     if (err) {
//       return res.status(500).json({ msg: 'Error logging out.' });
//     }
//     res.status(200).json({ msg: 'Logged out successfully.' });
//   });
// });

router.get('/protected', verifyToken, (req, res) => {
  res.status(200).json({ msg: `Hello, ${req.user.email}!`, role: req.user.role });
});
// router.get('/protected', verifyToken, checkUserRole('admin'), (req, res) => {
//   res.status(200).json({ msg: `Hello, ${req.user.email}!`, role: req.user.role });
// });

module.exports = router;