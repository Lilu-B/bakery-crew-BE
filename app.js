const db = require('./db/connection');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);

// Корневой маршрут
app.get('/', (req, res) => {
  res.send('Welcome to the Bakery Crew backend! 🧁');
});

module.exports = app;