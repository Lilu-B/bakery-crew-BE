const express = require('express');
const { registerUser } = require('../controllers/authController');

const router = express.Router();

// POST /api/register
router.post('/register', registerUser);

module.exports = router;