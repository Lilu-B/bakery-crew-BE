const express = require('express');
const router = express.Router();
const {
  createEvent,
  getAllEvents,
  deleteEvent,
  applyToEvent,
  cancelApplication,
  getEventApplicants
} = require('../controllers/eventController');
const { body } = require('express-validator');
const verifyToken = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validationMiddleware');

// Все маршруты требуют авторизацию
router.use(verifyToken);

// Создать событие (менеджер или админ)
// router.post(
//   '/',
//   [
//     body('title').notEmpty().withMessage('Title is required'),
//     body('date').isISO8601().toDate().withMessage('Date must be valid'),
//     body('shift').isIn(['1st', '2nd', 'night']).withMessage('Invalid shift')
//   ],
//   verifyToken, // Проверка и передача ошибок
//   createEvent
// );
router.post(
  '/',
  verifyToken, // авторизация
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('date').isDate().withMessage('Valid date required'),
    body('shift').isIn(['1st', '2nd', 'night']).withMessage('Invalid shift')
  ],
  validateRequest, // валидация
  createEvent
);

// Получить все события
router.get('/', getAllEvents);

// Удалить событие (создатель или админ)
router.delete('/:eventId', deleteEvent);

// Подать заявку на событие
router.post('/:eventId/apply', applyToEvent);

// Отменить заявку
router.delete('/:eventId/cancel', cancelApplication);

// Получить всех заявившихся на событие
router.get('/:eventId/applicants', getEventApplicants);

module.exports = router;