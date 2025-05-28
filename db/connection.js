const { Pool } = require('pg');
const ENV = process.env.NODE_ENV || 'development';

// Загружаем переменные окружения из соответствующего файла
require('dotenv').config({
  path: `${__dirname}/../.env.${ENV}`,
});

// console.log('ENV =', ENV);
// console.log('Loaded .env file for:', ENV);
// console.log('DATABASE_URL:', process.env.DATABASE_URL);
// console.log('PGDATABASE:', process.env.PGDATABASE);

console.log('DATABASE_URL =', process.env.DATABASE_URL);
console.log('ENV =', ENV);

if (!process.env.DATABASE_URL && !process.env.PGDATABASE) {
  throw new Error('PGDATABASE or DATABASE_URL not set in .env file');
}

const config = {
    connectionString: process.env.DATABASE_URL
  };
  
  if (ENV === 'production') {
    config.max = 2;
  }

module.exports = new Pool(config);