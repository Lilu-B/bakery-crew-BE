DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_shift CASCADE;
DROP TYPE IF EXISTS message_type CASCADE;
DROP TYPE IF EXISTS related_entity_type CASCADE;

-- ENUMS
CREATE TYPE user_role AS ENUM ('developer', 'manager', 'user');
CREATE TYPE user_shift AS ENUM ('1st', '2nd', 'night');
CREATE TYPE message_type AS ENUM ('system', 'personal');
CREATE TYPE related_entity_type AS ENUM ('overtime', 'initiative', 'approval', 'payment');

-- USERS
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'user',
  shift user_shift,
  is_approved BOOLEAN DEFAULT FALSE,
  registration_date TIMESTAMP DEFAULT NOW(),
  manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- MESSAGES
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id),
  receiver_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  sent_date TIMESTAMP DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  message_type message_type NOT NULL,
  related_entity_id INTEGER,
  related_entity_type related_entity_type
);

-- SuperAdmin: email = admin@bakery.local, ****** = admin123 (bcrypt)
INSERT INTO users (email, password, name, role, is_approved)
VALUES (
  'admin@bakery.local',
  '$2b$10$O5KXrI7ZK0JjcS60UPYAZuKoXWq6Pf23GfOJmVprG.Dtc7FKF0t26',
  'Main Admin',
  'developer',
  true
);