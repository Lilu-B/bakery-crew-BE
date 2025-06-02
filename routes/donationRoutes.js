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

// POST /api/donations 
router.post(
  '/',
  verifyToken,
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('deadline').optional().isISO8601().withMessage('Invalid date'),
  validateRequest,
  handleCreateDonation
);

// GET /api/donations/active 
router.get('/active', verifyToken, handleGetActiveDonations);

// GET /api/donations 
router.get('/', verifyToken, handleGetAllDonations);
router.get('/:donationId', verifyToken, handleGetDonationById);

// POST /api/donations/:donationId/confirm-payment 
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

// GET /api/donations/:donationId/applicants 
router.get('/:donationId/applicants', verifyToken, handleGetDonationApplicants);

// DELETE /api/donations/:donationId
router.delete('/:donationId', verifyToken, handleDeleteDonation);

module.exports = router;