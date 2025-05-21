const { approveUser } = require('../models/adminModel');

const handleApproveUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 👮‍♀️ Проверка роли администратора
    if (!req.user || (req.user.role !== 'developer' && req.user.role !== 'manager')) {
      return res.status(403).json({ msg: 'Access denied. Insufficient privileges.' });
    }

    const updatedUser = await approveUser(id);

    if (!updatedUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.status(200).json({
      msg: 'User approved successfully',
      user: updatedUser,
    });
  } catch (err) {
    console.error('❌ Approve user error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
};

module.exports = {
  handleApproveUser,
};