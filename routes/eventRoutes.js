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

router.use(verifyToken);

router.post(
  '/',
  verifyToken, 
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('date').isDate().withMessage('Valid date required'),
    body('shift').isIn(['1st', '2nd', 'night']).withMessage('Invalid shift')
  ],
  validateRequest, 
  handleCreateEvent
);

router.get('/', handleGetAllEvents);

router.delete('/:eventId', handleDeleteEvent);

router.post('/:eventId/apply', handleApplyToEvent);

router.delete('/:eventId/cancel', handleCancelApplication);

router.get('/:eventId/applicants', handleGetEventApplicants);

module.exports = router;