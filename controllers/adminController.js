const { approveUser, assignManagerRole, revokeManagerRole, getPendingUsers } = require('../models/adminModel');

const handleApproveUser = async (req, res) => {
  try {
    const { id } = req.params;

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
    console.error('Approve user error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
};

const handleAssignManager = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'developer') {
      return res.status(403).json({ msg: 'Access denied. Developer only.' });
    }

    const updatedUser = await assignManagerRole(id);

    if (!updatedUser) {
      return res.status(404).json({ msg: 'User not found or not eligible for promotion.' });
    }

    res.status(200).json({
      msg: 'User promoted to manager.',
      user: updatedUser
    });
  } catch (err) {
    console.error('Assign manager error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
};

const handleRevokeManager = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'developer') {
      return res.status(403).json({ msg: 'Access denied. Developer only.' });
    }

    const updatedUser = await revokeManagerRole(id);

    if (!updatedUser) {
      return res.status(404).json({ msg: 'User not found or not a manager.' });
    }

    res.status(200).json({
      msg: 'Manager demoted to user.',
      user: updatedUser
    });
  } catch (err) {
    console.error('Revoke manager error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
};

const handleGetPendingUsers = async (req, res) => {
  try {
    const pendingUsers = await getPendingUsers();

    // Если текущий пользователь — менеджер, показываем только неподтверждённых своей смены
    let filteredUsers;

    if (req.user.role === 'manager') {
      filteredUsers = pendingUsers.filter(user => user.shift === req.user.shift);
    } else if (req.user.role === 'developer') {
      // Админы видят всех неподтверждённых
      filteredUsers = pendingUsers;
    } else {
      return res.status(403).json({ msg: 'Access denied' });
    }

    res.status(200).json({ users: filteredUsers });

  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
};


module.exports = {
  handleApproveUser,
  handleAssignManager,
  handleRevokeManager,
  handleGetPendingUsers
};