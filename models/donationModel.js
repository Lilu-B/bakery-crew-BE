const db = require('../db/connection');

const createDonation = async ({ title, description, deadline, created_by }) => {
  const result = await db.query(
    `INSERT INTO donations (title, description, deadline, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *;`,
    [title, description, deadline, created_by]
  );
  return result.rows[0];
};

const getActiveDonations = async () => {
  const result = await db.query(
    `SELECT d.*, u.name AS creator_name
     FROM donations d
     JOIN users u ON d.created_by = u.id
     WHERE d.status = 'active'
     ORDER BY d.deadline ASC NULLS LAST;`
  );
  return result.rows;
};

const getAllDonations = async (currentUserId, filters = {}) => {
  const conditions = [];
  const values = [];
  let i = 1;

  if (filters.status) {
    conditions.push(`d.status = $${i++}`);
    values.push(filters.status);
  }
  if (filters.created_after) {
    conditions.push(`d.created_at >= $${i++}`);
    values.push(filters.created_after);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT d.*, u.name AS creator_name,
      COALESCE(SUM(da.amount), 0) AS total_collected,
      COUNT(DISTINCT da.user_id) FILTER (WHERE da.amount > 0) AS donor_count,
      EXISTS (
        SELECT 1 FROM donation_applications da2
        WHERE da2.donation_id = d.id AND da2.user_id = $${i}
      ) AS has_donated
    FROM donations d
    LEFT JOIN donation_applications da ON d.id = da.donation_id
    JOIN users u ON d.created_by = u.id
    ${whereClause}
    GROUP BY d.id, u.name
    ORDER BY d.deadline ASC NULLS LAST;
  `;

  values.push(currentUserId);

  const result = await db.query(query, values);
  return result.rows;
};

// const getDonationById = async (donationId) => {
//   const result = await db.query(
//     `SELECT d.*, u.name AS creator_name,
//       COALESCE(SUM(da.amount), 0) AS total_collected,
//       COUNT(DISTINCT da.user_id) AS donor_count
//      FROM donations d
//      LEFT JOIN donation_applications da ON d.id = da.donation_id
//      JOIN users u ON d.created_by = u.id
//      WHERE d.id = $1
//      GROUP BY d.id, u.name;`,
//     [donationId]
//   );
//   return result.rows[0];
// };
const getDonationById = async (donationId, userId) => {
  const result = await db.query(
    `SELECT d.*, u.name AS creator_name,
      COALESCE(SUM(da.amount), 0) AS total_collected,
      COUNT(DISTINCT da.user_id) AS donor_count,
      EXISTS (
        SELECT 1 FROM donation_applications da2
        WHERE da2.donation_id = d.id AND da2.user_id = $2
      ) AS has_donated
     FROM donations d
     LEFT JOIN donation_applications da ON d.id = da.donation_id
     JOIN users u ON d.created_by = u.id
     WHERE d.id = $1
     GROUP BY d.id, u.name;`,
    [donationId, userId]
  );
  return result.rows[0];
};

const confirmDonationPayment = async (donationId, userId, amount) => {
  const existing = await db.query(
    `SELECT * FROM donation_applications WHERE donation_id = $1 AND user_id = $2`,
    [donationId, userId]
  );

  if (existing.rows.length > 0) {
    throw new Error('User has already donated to this donation');
  }

  const result = await db.query(
    `INSERT INTO donation_applications (donation_id, user_id, amount)
     VALUES ($1, $2, $3)
     RETURNING *;`,
    [donationId, userId, amount]
  );

  return result.rows[0];
};

const getDonationApplicants = async (donationId) => {
  const result = await db.query(
    `SELECT u.id, u.name, da.amount
     FROM donation_applications da
     JOIN users u ON da.user_id = u.id
     WHERE da.donation_id = $1 AND da.amount > 0`,
    [donationId]
  );
  return result.rows;
};

const deleteDonation = async (donationId, requester) => {
  const result = await db.query(`SELECT * FROM donations WHERE id = $1`, [donationId]);
  const donation = result.rows[0];
  if (!donation) return null;

  if (requester.role !== 'developer' && donation.created_by !== requester.id) {
    throw new Error('Unauthorized');
  }

  await db.query(`DELETE FROM donations WHERE id = $1`, [donationId]);
  return true;
};

module.exports = {
  createDonation,
  getActiveDonations,
  getAllDonations,
  getDonationById,
  confirmDonationPayment,
  getDonationApplicants,
  deleteDonation
};