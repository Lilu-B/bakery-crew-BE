process.env.NODE_ENV = 'test';

const app = require('./app');
const http = require('http');

console.log('NODE_ENV at server.js start =', process.env.NODE_ENV);

let PORT = process.env.PORT || 3001;

const tryStartServer = () => {
  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}...`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} is in use, trying ${PORT + 1}...`);
      PORT++;
      tryStartServer(); 
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  const shutdown = () => {
    console.log('\n Gracefully shutting down...');
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

tryStartServer();