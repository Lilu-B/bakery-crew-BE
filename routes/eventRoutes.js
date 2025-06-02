const express = require('express');
const router = express.Router();
const {
  handleCreateEvent,
  handleGetAllEvents,
  handleDeleteEvent,
  handleApplyToEvent,
  handleCancelApplication,
  handleGetEventApplicants
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
  handleCreateEvent
);

// Получить все события
router.get('/', handleGetAllEvents);

// Удалить событие (создатель или админ)
router.delete('/:eventId', handleDeleteEvent);

// Подать заявку на событие
router.post('/:eventId/apply', handleApplyToEvent);

// Отменить заявку
router.delete('/:eventId/cancel', handleCancelApplication);

// Получить всех заявившихся на событие
router.get('/:eventId/applicants', handleGetEventApplicants);

module.exports = router;