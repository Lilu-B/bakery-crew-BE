const express = require('express');
const { body } = require('express-validator');
const { handleRegisterUser, handleLoginUser, handleDeleteUser } = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validationMiddleware');
const router = express.Router();

// POST /api/register
// router.post('/register', registerUser);
router.post('/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['user', 'manager', 'developer']),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('shift').optional().isString()
  ],
  validateRequest,
  handleRegisterUser
);

// POST /api/login
// router.post('/login', loginUser);
router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  handleLoginUser
);


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


module.exports = router;