const db = require('../db/connection');

const resetTestDB = async () => {
  // await db.query('TRUNCATE messages, users RESTART IDENTITY CASCADE;');
  await db.query('DELETE FROM messages;');
  await db.query("DELETE FROM users WHERE email != 'admin@bakery.local';");
  // await db.query("ALTER SEQUENCE users_id_seq RESTART WITH 2;"); // ID для нового юзера
  // await db.query("ALTER SEQUENCE messages_id_seq RESTART WITH 1;");
};

module.exports = { resetTestDB };