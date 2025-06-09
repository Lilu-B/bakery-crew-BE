const db = require('../db/connection');
const { validationResult } = require('express-validator');
const {
  createDonation,
  getActiveDonations,
  getAllDonations,
  getDonationById,
  confirmDonationPayment,
  getDonationApplicants,
  deleteDonation
} = require('../models/donationModel');

const expireOldDonations = async () => {
  await db.query(`
    UPDATE donations
    SET status = 'expired'
    WHERE status = 'active' AND deadline < CURRENT_DATE;
  `);
};

const handleCreateDonation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  if (req.user.role !== 'manager' && req.user.role !== 'developer') {
    return res.status(403).json({ msg: 'Only managers or admins can create donations' });
  }

  try {
    const donation = await createDonation({
      title: req.body.title,
      description: req.body.description,
      deadline: req.body.deadline,
      created_by: req.user.id
    });
    res.status(201).json({ msg: 'Donation created', donation });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

const handleGetActiveDonations = async (req, res) => {
  try {
    const activeDonations = await getActiveDonations();
    res.status(200).json({ donations: activeDonations });
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching active donations', error: err.message });
  }
};

const handleGetAllDonations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, created_after } = req.query;

    await expireOldDonations();

    const allDonations = await getAllDonations(userId, { status, created_after });

    res.status(200).json({ allDonations });
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching donations', error: err.message });
  }
};

const handleGetDonationById = async (req, res) => {
  try {
    const donation = await getDonationById(req.params.donationId, req.user.id);
    if (!donation) return res.status(404).json({ msg: 'Donation not found' });
    res.status(200).json({ donation });
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching donation', error: err.message });
  }
};

const handleDonationPayment = async (req, res) => {
  const { donationId } = req.params;
  const { amount } = req.body;
  const userId = req.user.id;

  if (!amount || isNaN(amount)) {
    return res.status(400).json({ msg: 'Invalid amount' });
  }

  try {
    const result = await confirmDonationPayment(donationId, userId, amount);
    res.status(201).json({ msg: 'Donation recorded', donation: result });
  } catch (err) {

    if (err.message && err.message.includes('already donated')) {
      return res.status(409).json({ msg: 'You have already donated' });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

const handleGetDonationApplicants = async (req, res) => {
  try {
    const applicants = await getDonationApplicants(req.params.donationId);
    res.status(200).json({ applicants });
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching applicants', error: err.message });
  }
};

const handleDeleteDonation = async (req, res) => {
  const donationId = Number(req.params.donationId);
  const user = req.user;

  try {
    const deleted = await deleteDonation(donationId, user);
    if (!deleted) return res.status(404).json({ msg: 'Donation not found' });

    res.status(200).json({ msg: 'Donation deleted', donationId }); 
  } catch (err) {
    if (err.message === 'Unauthorized') {
      return res.status(403).json({ msg: 'Access denied' });
    }
    res.status(500).json({ msg: 'Error deleting donation', error: err.message });
  }
};

module.exports = {
  handleCreateDonation,
  handleGetActiveDonations,
  handleGetAllDonations,
  handleGetDonationById,
  handleDonationPayment,
  handleGetDonationApplicants,
  handleDeleteDonation
};