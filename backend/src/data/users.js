const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'users.json');

// Initial seed accounts for development/testing only.
// Passwords are pre-hashed with bcryptjs - never stored in plain text.
// customer123 -> $2b$10$fGebMYu4s.0K2cb5vyvH7e63HzIssT2T3F5MrovpwazE/V/2IxFSe
// sales123    -> $2b$10$tqwWdjQY2zq6OUnOQ.h8jOJwNYcwMAiga1O5mNsly99cMXdfW/Aj2
const seedUsers = [
  {
    id: 1,
    name: 'Casey Customer',
    email: 'customer@demo.com',
    phone: '+1-555-0101',
    password: '$2b$10$fGebMYu4s.0K2cb5vyvH7e63HzIssT2T3F5MrovpwazE/V/2IxFSe',
    role: 'customer',
  },
  {
    id: 2,
    name: 'Sam Salesperson',
    email: 'sales@demo.com',
    phone: '+1-555-0102',
    password: '$2b$10$tqwWdjQY2zq6OUnOQ.h8jOJwNYcwMAiga1O5mNsly99cMXdfW/Aj2',
    role: 'salesperson',
    skills: 'Enterprise SaaS, Negotiation',
    territory: 'North America',
  },
];

function loadUsers() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read users.json, falling back to seed:', err.message);
  }
  saveUsers(seedUsers);
  return [...seedUsers];
}

function saveUsers(list) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save users.json:', err.message);
  }
}

// In-memory array initialized from disk / seed
const rawUsers = loadUsers();

// Wrap in array proxy / methods so require('../data/users') remains an Array
const users = rawUsers;

users.addUser = function (newUser) {
  users.push(newUser);
  saveUsers(users);
  return newUser;
};

users.findByEmail = function (email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email && u.email.toLowerCase() === normalized) || null;
};

users.findById = function (id) {
  return users.find((u) => u.id === id) || null;
};

users.update = function (id, updated) {
  const index = users.findIndex((u) => u.id === id);
  if (index !== -1) {
    users[index] = { ...users[index], ...updated };
    users.save();
    return users[index];
  }
  return null;
};

users.save = function () {
  saveUsers(users);
};

module.exports = users;
