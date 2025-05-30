const db = require('../db/connection');
const { validationResult } = require('express-validator');

// 1. Создать событие
const createEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, date, shift } = req.body;
  const userId = req.user.id;

  try {
    const result = await db.query(
      `INSERT INTO events (title, description, date, shift, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [title, description, date, shift, userId]
    );
    res.status(201).json({ msg: 'Event created', event: result.rows[0] });
  } catch (err) {
    res.status(500).json({ msg: 'Error creating event', error: err.message });
  }
};

// 2. Получить все активные события
const getAllEvents = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.*, u.name AS creator_name
       FROM events e
       JOIN users u ON e.created_by = u.id
       WHERE e.status = 'active'
       ORDER BY e.date ASC;`
    );
    res.status(200).json({ events: result.rows });
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching events', error: err.message });
  }
};

// 3. Удалить событие (только автор или админ)
const deleteEvent = async (req, res) => {
  const eventId = req.params.eventId;
  const user = req.user;

  try {
    const { rows } = await db.query('SELECT * FROM events WHERE id = $1', [eventId]);
    const event = rows[0];

    if (!event) return res.status(404).json({ msg: 'Event not found' });

    if (user.role !== 'developer' && user.id !== event.created_by)
      return res.status(403).json({ msg: 'Access denied' });

    await db.query('DELETE FROM events WHERE id = $1', [eventId]);
    res.status(200).json({ msg: 'Event deleted', eventId });
  } catch (err) {
    res.status(500).json({ msg: 'Error deleting event', error: err.message });
  }
};

// 4. Подать заявку на событие
const applyToEvent = async (req, res) => {
  const userId = req.user.id;
  const eventId = req.params.eventId;

  console.log('Applying to event:', eventId, 'by user:', userId);

  try {
        // Получаем данные события
    const eventRes = await db.query('SELECT * FROM events WHERE id = $1', [eventId]);
    const event = eventRes.rows[0];

    if (!event) return res.status(404).json({ msg: 'Event not found' });

    // Получаем данные пользователя
    const userRes = await db.query('SELECT shift, role FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    // Проверка роли
    if (user.role !== 'user') {
      return res.status(403).json({ msg: 'Only users can apply to events' });
    }

    // Проверка смены
    if (user.shift !== event.shift) {
      return res.status(403).json({ msg: 'Users can only apply to events from their shift' });
    }

    // Записываем заявку
    await db.query(
      `INSERT INTO event_applications (event_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (event_id, user_id) DO NOTHING;`,
      [eventId, userId]
    );
    res.status(201).json({ msg: 'Application submitted' });
  } catch (err) {
    res.status(500).json({ msg: 'Error applying to event', error: err.message });
  }
};

// 5. Отменить заявку
const cancelApplication = async (req, res) => {
  const userId = req.user.id;
  const eventId = req.params.eventId;

  try {
    const result = await db.query(
      `DELETE FROM event_applications
       WHERE event_id = $1 AND user_id = $2
       RETURNING *;`,
      [eventId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ msg: 'No application found to cancel' });
    }

    res.status(200).json({ msg: 'Application cancelled' });
  } catch (err) {
    res.status(500).json({ msg: 'Error cancelling application', error: err.message });
  }
};

// 6. Получить всех пользователей, подавших заявки
const getEventApplicants = async (req, res) => {
  const eventId = req.params.eventId;

  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.shift
       FROM event_applications ea
       JOIN users u ON ea.user_id = u.id
       WHERE ea.event_id = $1
       ORDER BY u.name ASC;`,
      [eventId]
    );
    res.status(200).json({ applicants: result.rows });
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching applicants', error: err.message });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  deleteEvent,
  applyToEvent,
  cancelApplication,
  getEventApplicants
};
