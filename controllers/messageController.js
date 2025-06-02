const { validationResult } = require('express-validator');
const { createMessage, getInboxMessages, getSentMessages } = require('../models/messageModel');
const db = require('../db/connection');

// ✅ Контроллер отправки сообщения
const handleSendMessage = async (req, res) => {
  // 1. Валидация данных
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const sender = req.user; // получаем отправителя из verifyToken
  const { recipientId, content } = req.body;

  try {
    // 2. Проверка, существует ли получатель
    const result = await db.query('SELECT * FROM users WHERE id = $1', [recipientId]);
    const recipient = result.rows[0];

    if (!recipient) {
      return res.status(404).json({ msg: 'Recipient not found.' });
    }

    // 3. Проверка ролевой логики общения
    if (sender.role === 'user') {

// console.log('recipient.id (type):', typeof recipient.id, recipient.id);
// console.log('sender.manager_id (type):', typeof sender.manager_id, sender.manager_id);

      if (Number(recipient.id) !== Number(sender.manager_id)) {
        return res.status(403).json({ msg: 'Users can only message their assigned manager.' });
      }
    }

    if (sender.role === 'manager') {
      if (recipient.role !== 'user' || recipient.shift !== sender.shift) {
        return res.status(403).json({ msg: 'Managers can only message users in their shift.' });
      }
    }

    // console.log('📤 sender:', sender);

    // 4. Создание сообщения
    const message = await createMessage({
      sender_id: sender.id,
      receiver_id: recipientId,
      content,
      message_type: req.body.message_type || 'personal'
    });

    // 5. Ответ клиенту
    res.status(201).json({
      msg: 'Message sent successfully.',
      message
    });

  } catch (err) {
    console.error('❌ Message sending error:', err);
    res.status(500).json({ msg: 'Failed to send message.', error: err.message });
  }
};

// 📥 Входящие
const handleGetInbox = async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await getInboxMessages(userId);
    res.status(200).json({ inbox: messages });
  } catch (err) {
    console.error('❌ Inbox error:', err);
    res.status(500).json({ msg: 'Failed to fetch inbox.' });
  }
};

// 📤 Отправленные
const handleGetSent = async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await getSentMessages(userId);
    res.status(200).json({ sent: messages });
  } catch (err) {
    console.error('❌ Sent error:', err);
    res.status(500).json({ msg: 'Failed to fetch sent messages.' });
  }
};

module.exports = {
  handleSendMessage,
  handleGetInbox,
  handleGetSent
};