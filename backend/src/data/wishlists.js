const fs = require('fs');
const path = require('path');

const WISHLISTS_FILE = path.join(__dirname, 'wishlists.json');

function loadWishlists() {
  try {
    if (fs.existsSync(WISHLISTS_FILE)) {
      const data = fs.readFileSync(WISHLISTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading wishlists.json:', err.message);
  }
  return [];
}

function saveWishlists(list) {
  try {
    fs.writeFileSync(WISHLISTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving wishlists.json:', err.message);
  }
}

let wishlists = loadWishlists();

function getByCustomerId(customerId) {
  const cId = String(customerId);
  return wishlists.filter((w) => String(w.customerId) === cId);
}

function hasItem(customerId, productId) {
  const cId = String(customerId);
  const pId = String(productId).trim().toLowerCase();
  return wishlists.some((w) => String(w.customerId) === cId && String(w.productId).trim().toLowerCase() === pId);
}

function addItem(customerId, productId) {
  const cId = String(customerId);
  const pId = String(productId).trim();

  const existing = wishlists.find((w) => String(w.customerId) === cId && String(w.productId).trim().toLowerCase() === pId.toLowerCase());
  if (existing) return existing;

  const newItem = {
    id: `wl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    customerId: cId,
    productId: pId,
    addedAt: new Date().toISOString(),
  };

  wishlists.push(newItem);
  saveWishlists(wishlists);
  return newItem;
}

function removeItem(customerId, productId) {
  const cId = String(customerId);
  const pId = String(productId).trim().toLowerCase();

  const initialLen = wishlists.length;
  wishlists = wishlists.filter((w) => !(String(w.customerId) === cId && String(w.productId).trim().toLowerCase() === pId));
  const removed = wishlists.length < initialLen;
  if (removed) {
    saveWishlists(wishlists);
  }
  return removed;
}

module.exports = {
  getByCustomerId,
  hasItem,
  addItem,
  removeItem,
};
