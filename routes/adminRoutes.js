const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { handleApproveUser } = require('../controllers/adminController');

// ✅ PATCH /api/admin/users/:id/approve
router.patch('/users/:id/approve', verifyToken, handleApproveUser);

module.exports = router;