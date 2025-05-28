const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { sendMessage, getInbox, getSent } = require('../controllers/messageController');
const verifyToken = require('../middleware/authMiddleware');

// POST /api/messages — отправить сообщение
router.post(
  '/messages',
  [
    body('recipientId').isInt().withMessage('Valid recipient ID is required'),
    body('content').notEmpty().withMessage('Message content is required')
  ],
  verifyToken,
  sendMessage
);

// GET /api/messages/inbox
router.get('/messages/inbox', verifyToken, getInbox);
// GET /api/messages/sent
router.get('/messages/sent', verifyToken, getSent);

module.exports = router;