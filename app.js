const db = require('./db/connection');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const messageRoutes = require('./routes/messageRoutes');
const eventRoutes = require('./routes/eventRoutes');
const donationRoutes = require('./routes/donationRoutes');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', messageRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/donations', donationRoutes);

// Корневой маршрут
app.get('/', (req, res) => {
  res.send('Welcome to the Bakery Crew backend! 🧁');
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).json({ msg: 'Something went wrong' });
});



module.exports = app;