const db = require('../db/connection');

const resetTestDB = async () => {
  await db.query('TRUNCATE donation_applications, donations, event_applications, events RESTART IDENTITY CASCADE;');
  await db.query('DELETE FROM messages;');
  await db.query("DELETE FROM users WHERE email != 'admin@bakery.local';");
};

module.exports = { resetTestDB };