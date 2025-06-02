const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  handleCreateDonation,
  handleGetActiveDonations,
  handleGetAllDonations,
  handleGetDonationById,
  handleDonationPayment,
  handleGetDonationApplicants,
  handleDeleteDonation
} = require('../controllers/donationController');

const verifyToken = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validationMiddleware');

// 🔹 POST /api/donations - создать новый сбор
router.post(
  '/',
  verifyToken,
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('deadline').optional().isISO8601().withMessage('Invalid date'),
  validateRequest,
  handleCreateDonation
);

// 🔹 GET /api/donations/active - получить активные сборы
router.get('/active', verifyToken, handleGetActiveDonations);

// 🔹 GET /api/donations - получить все сборы (включая завершённые)
router.get('/', verifyToken, handleGetAllDonations);
router.get('/:donationId', verifyToken, handleGetDonationById);

// // 🔹 POST /api/donations/:donationId/apply - подать заявку
// router.post('/:donationId/apply', verifyToken, handleApplyToDonation);

// 🔹 POST /api/donations/:donationId/confirm-payment - подтвердить оплату
router.post(
  '/:donationId/confirm-payment',
  verifyToken,
  body('amount')
    .exists({ checkNull: true }).withMessage('Amount is required')
    .bail()
    .isNumeric().withMessage('Amount must be a number'),
  validateRequest,
  handleDonationPayment
);

// 🔹 GET /api/donations/:donationId/applicants - получить участников
router.get('/:donationId/applicants', verifyToken, handleGetDonationApplicants);

// 🔹 DELETE /api/donations/:donationId - удалить сбор
router.delete('/:donationId', verifyToken, handleDeleteDonation);

module.exports = router;