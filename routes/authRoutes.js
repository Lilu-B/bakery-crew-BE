const express = require('express');
const { registerUser, loginUser, handleDeleteUser } = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');
// const { checkUserRole } = require('../middleware/authMiddleware'); // Импортируем middleware для проверки роли
const router = express.Router();

// POST /api/register
router.post('/register', registerUser);
// POST /api/login
router.post('/login', loginUser);
// POST /api/logout
router.post('/logout', (req, res) => {
    res.status(200).json({ msg: 'Logout successful.' });
});
// DELETE /api/users/:id
router.delete('/users/:id', verifyToken, handleDeleteUser);


// GET /api/protected
router.get('/protected', verifyToken, (req, res) => {
  res.status(200).json({ msg: `Hello, ${req.user.email}!`, role: req.user.role });
});
// router.get('/protected', verifyToken, checkUserRole('admin'), (req, res) => {
//   res.status(200).json({ msg: `Hello, ${req.user.email}!`, role: req.user.role });
// });

module.exports = router;