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

// Пример корневого маршрута
app.get('/', (req, res) => {
  res.send('Welcome to the Bakery Crew backend! 🧁');
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}...`);
});