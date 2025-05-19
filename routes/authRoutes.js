const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');

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

module.exports = router;