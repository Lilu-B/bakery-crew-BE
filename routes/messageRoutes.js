const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  handleSendMessage,
  handleGetInbox,
  handleGetSent
} = require('../controllers/messageController');
const verifyToken = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validationMiddleware');

// POST /api/messages
router.post(
  '/messages',
  verifyToken,
  [
    body('recipientId').isInt().withMessage('Valid recipient ID is required'),
    body('content').notEmpty().withMessage('Message content is required')
  ],
  validateRequest,
  handleSendMessage
);

// GET /api/messages/inbox
router.get('/messages/inbox', verifyToken, handleGetInbox);
// GET /api/messages/sent
router.get('/messages/sent', verifyToken, handleGetSent);

module.exports = router;