const db = require('../db/connection');

// ✅ Создание нового сообщения
const createMessage = async ({
  sender_id,
  receiver_id,
  content,
  message_type = 'personal',
  related_entity_id = null,
  related_entity_type = null
}) => {
  const result = await db.query(
    `
    INSERT INTO messages (
      sender_id,
      receiver_id,
      content,
      message_type,
      related_entity_id,
      related_entity_type
    )
    VALUES ($1, $2, $3, $4::message_type, $5, $6::related_entity_type)
    RETURNING *;
    `,
    [
      sender_id,
      receiver_id,
      content,
      message_type,
      related_entity_id,
      related_entity_type
    ]
  );

  return result.rows[0];
};

// ✅ Получить входящие сообщения для пользователя
const getInboxMessages = async (userId) => {
  const result = await db.query(
    `
    SELECT * FROM messages
    WHERE receiver_id = $1
    ORDER BY sent_date DESC
    `,
    [userId]
  );
  return result.rows;
};

// ✅ Получить отправленные сообщения
const getSentMessages = async (userId) => {
  const result = await db.query(
    `
    SELECT * FROM messages
    WHERE sender_id = $1
    ORDER BY sent_date DESC
    `,
    [userId]
  );
  return result.rows;
};

module.exports = {
  createMessage,
  getInboxMessages,
  getSentMessages
};