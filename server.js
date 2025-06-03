require('dotenv').config({
  path:
    process.env.NODE_ENV === 'test'
      ? '.env.test'
      : '.env.development'
});

const app = require('./app');
const http = require('http');

console.log('NODE_ENV at server.js start =', process.env.NODE_ENV);
console.log('DATABASE_URL =', process.env.DATABASE_URL);

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

process.on('SIGINT', () => {
  console.log('\n Gracefully shutting down from SIGINT (Ctrl+C)');
  server.close(() => {
    console.log('🧹 Server closed.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n Gracefully shutting down from SIGTERM');
  server.close(() => {
    console.log('🧹 Server closed.');
    process.exit(0);
  });
});