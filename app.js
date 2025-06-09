const db = require('./db/connection');
const express = require('express');
const cors = require('cors');
const camelToSnakeMiddleware = require('./middleware/camelToSnakeMiddleware');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const messageRoutes = require('./routes/messageRoutes');
const eventRoutes = require('./routes/eventRoutes');
const donationRoutes = require('./routes/donationRoutes');

const app = express();

app.use(cors({
  origin: 'https://bakery-crew-fe.vercel.app',
  credentials: true
}));
app.use(express.json());
app.use(camelToSnakeMiddleware);
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', messageRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/donations', donationRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the Bakery Crew backend! 🧁');
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).json({ msg: 'Something went wrong' });
});


module.exports = app;