const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { createUser, findUserByEmail, deleteUser } = require('../models/userModel');
const db = require('../db/connection');

const handleRegisterUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, shift } = req.body;

    try {
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ msg: 'User with this email already exists.' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      let managerId = null;
  
      if (shift) {
        const managerResult = await db.query(
          `SELECT id FROM users WHERE role = 'manager' AND shift = $1 LIMIT 1;`,
          [shift]
        );
        if (managerResult.rows.length > 0) {
          managerId = managerResult.rows[0].id;
        }
      }
  
      const newUser = await createUser({
        name,
        email,
        password: hashedPassword,
        phone,
        shift,
        managerId
      });
  
      res.status(201).json({
        msg: 'User registered successfully. Awaiting approval.',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          shift: newUser.shift,
          role: newUser.role,
          isApproved: newUser.is_approved,
          assignedManagerId: newUser.manager_id || null
        }
      });
  
    } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      msg: 'An error occurred while trying to register the user. Please try again later.',
      error: error.message  
    });
  }

};

const handleLoginUser = async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
  
  
    try {
      const result = await db.query(
        'SELECT id, email, password, name, role, shift, is_approved, manager_id FROM users WHERE email = $1',
        [email]
      );
      const user = result.rows[0];
 
      if (!user || !user.is_approved) {
        return res.status(401).json({ msg: 'Invalid credentials or account not approved.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ msg: 'Invalid credentials or account not approved.' });
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          shift: user.shift,
          manager_id: user.manager_id 
        },
        process.env.JWT_SECRET, 
        { expiresIn: '30d' }
      );
  
      res.status(200).json({
        msg: 'Login successful.',
        token
      });
  
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ msg: 'Internal server error' });
    }
  };

const handleUpdateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, shift } = req.body;

    const result = await db.query(
      `UPDATE users
       SET name = $1, phone = $2, shift = $3
       WHERE id = $4
       RETURNING id, name, email, role, shift, phone, is_approved, manager_id`,
      [name, phone, shift, userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      shift: user.shift,
      role: user.role,
      phone: user.phone,
      isApproved: user.is_approved,
      managerId: user.manager_id || null
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ msg: 'Failed to update profile' });
  }
};

const handleDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteUser(id, req.user);

    if (result === null) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (result === false) {
      return res.status(403).json({ msg: 'Access denied. You do not have permission to delete this user' });
    }

    res.status(200).json({
      msg: 'User deleted successfully',
      user: {
        id: result.id,
        name: result.name,
        email: result.email
      }
    });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
};

const getProtectedUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT id, name, email, phone, role, shift, is_approved, manager_id
       FROM users WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone, // ✅ теперь вернётся!
      role: user.role,
      shift: user.shift,
      isApproved: user.is_approved,
      managerId: user.manager_id
    });
  } catch (error) {
    console.error('Protected user fetch error:', error);
    res.status(500).json({ msg: 'Server error retrieving user profile.' });
  }
};

module.exports = { 
  handleRegisterUser, 
  handleLoginUser, 
  handleUpdateUserProfile,
  handleDeleteUser, 
  getProtectedUser 
};