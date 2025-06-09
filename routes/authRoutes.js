const express = require('express');
const { body } = require('express-validator');
const { 
  handleRegisterUser, 
  handleLoginUser, 
  handleUpdateUserProfile, 
  handleDeleteUser, 
  getProtectedUser
} = require('../controllers/authController');
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
    body('phone').optional({ nullable: true, checkFalsy: true }).isString(),
    body('shift').isIn(['1st', '2nd']).withMessage('Valid shift is required')
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

// PATCH /api/users/me
router.patch('/users/me', verifyToken, handleUpdateUserProfile);

// GET /api/protected
router.get('/protected', verifyToken, getProtectedUser);


module.exports = router;