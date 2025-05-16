const { Pool } = require('pg');
const ENV = process.env.NODE_ENV || 'development';


require('dotenv').config({
  path: `${__dirname}/../.env.${ENV}`,
});

// console.log('ENV =', ENV);
// console.log('Trying to load .env from:', `${__dirname}/../.env.${ENV}`);
// console.log('DATABASE_URL from env:', process.env.DATABASE_URL);


// require('dotenv').config(); // ⚠️ Просто загружаем .env из корня проекта

console.log('DATABASE_URL =', process.env.DATABASE_URL);
console.log('PGDATABASE =', process.env.PGDATABASE);
console.log(require('fs').existsSync('.env'))


if (!process.env.PGDATABASE && !process.env.DATABASE_URL) {
  throw new Error('PGDATABASE or DATABASE_URL not set');
}

const config = {
    connectionString: process.env.DATABASE_URL
  };
  
  if (ENV === 'production') {
    config.max = 2;
  }

module.exports = new Pool(config);