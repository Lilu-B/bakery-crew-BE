const db = require('../db/connection');

const createEvent = async ({ title, description, date, shift, created_by }) => {
  const result = await db.query(
    `INSERT INTO events (title, description, date, shift, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *;`,
    [title, description, date, shift, created_by]
  );
  return result.rows[0];
};

const getAllEvents = async () => {
  const result = await db.query(
    `SELECT e.*, u.name AS creator_name
     FROM events e
     JOIN users u ON e.created_by = u.id
     WHERE e.status = 'active'
     ORDER BY e.date ASC;`
  );
  return result.rows;
};

const deleteEvent = async (eventId, requester) => {
  const result = await db.query(`SELECT * FROM events WHERE id = $1`, [eventId]);
  const event = result.rows[0];
  if (!event) return null;

  if (requester.role !== 'developer' && event.created_by !== requester.id) {
    throw new Error('Unauthorized');
  }

  await db.query(`DELETE FROM events WHERE id = $1`, [eventId]);
  return true;
};

const applyToEvent = async (eventId, userId) => {
  const result = await db.query(
    `INSERT INTO event_applications (event_id, user_id)
     VALUES ($1, $2)
     RETURNING *;`,
    [eventId, userId]
  );
  return result.rows[0];
};

const cancelApplication = async (eventId, userId) => {
  const result = await db.query(
    `DELETE FROM event_applications
     WHERE event_id = $1 AND user_id = $2
     RETURNING *;`,
    [eventId, userId]
  );
  return result.rows[0];
};

const getEventApplicants = async (eventId) => {
  const result = await db.query(
    `SELECT u.id, u.name, u.email
     FROM event_applications ea
     JOIN users u ON ea.user_id = u.id
     WHERE ea.event_id = $1`,
    [eventId]
  );
  return result.rows;
};

module.exports = {
  createEvent,
  getAllEvents,
  deleteEvent,
  applyToEvent,
  cancelApplication,
  getEventApplicants
};
