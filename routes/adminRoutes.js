const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { handleApproveUser,
      handleAssignManager,
      handleRevokeManager
 } = require('../controllers/adminController');

// PATCH /api/admin/users/:id/approve
router.patch('/users/:id/approve', verifyToken, handleApproveUser);
// PATCH /api/admin/users/:id/assign-manager
router.patch('/users/:id/assign-manager', verifyToken, handleAssignManager);
// PATCH /api/admin/users/:id/revoke-manager
router.patch('/users/:id/revoke-manager', verifyToken, handleRevokeManager);


module.exports = router;