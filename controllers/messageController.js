const { validationResult } = require('express-validator');
const { createMessage, getInboxMessages, getSentMessages } = require('../models/messageModel');
const db = require('../db/connection');

const handleSendMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const sender = req.user; 
  const { recipientId, content } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [recipientId]);
    const recipient = result.rows[0];

    if (!recipient) {
      return res.status(404).json({ msg: 'Recipient not found.' });
    }

    if (sender.role === 'user') {

      if (Number(recipient.id) !== Number(sender.manager_id)) {
        return res.status(403).json({ msg: 'Users can only message their assigned manager.' });
      }
    }

    if (sender.role === 'manager') {
      if (recipient.role !== 'user' || recipient.shift !== sender.shift) {
        return res.status(403).json({ msg: 'Managers can only message users in their shift.' });
      }
    }

    const message = await createMessage({
      sender_id: sender.id,
      receiver_id: recipientId,
      content,
      message_type: req.body.message_type || 'personal'
    });

    res.status(201).json({
      msg: 'Message sent successfully.',
      message
    });

  } catch (err) {
    console.error('Message sending error:', err);
    res.status(500).json({ msg: 'Failed to send message.', error: err.message });
  }
};

const handleGetInbox = async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await getInboxMessages(userId);
    res.status(200).json({ inbox: messages });
  } catch (err) {
    console.error('Inbox error:', err);
    res.status(500).json({ msg: 'Failed to fetch inbox.' });
  }
};

const handleGetSent = async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await getSentMessages(userId);
    res.status(200).json({ sent: messages });
  } catch (err) {
    console.error('Sent error:', err);
    res.status(500).json({ msg: 'Failed to fetch sent messages.' });
  }
};

module.exports = {
  handleSendMessage,
  handleGetInbox,
  handleGetSent
};