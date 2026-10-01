const fs = require('fs');
const path = require('path');

const CARTS_FILE = path.join(__dirname, 'carts.json');

function loadCarts() {
  try {
    if (fs.existsSync(CARTS_FILE)) {
      const data = fs.readFileSync(CARTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading carts.json:', err.message);
  }
  return [];
}

function saveCarts(list) {
  try {
    fs.writeFileSync(CARTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving carts.json:', err.message);
  }
}

let carts = loadCarts();

function getCart(customerId) {
  const cId = String(customerId);
  let cart = carts.find((c) => String(c.customerId) === cId);
  if (!cart) {
    cart = {
      customerId: cId,
      items: [],
      updatedAt: new Date().toISOString(),
    };
    carts.push(cart);
    saveCarts(carts);
  }
  return cart;
}

function addItem(customerId, productId, quantity = 1) {
  const cart = getCart(customerId);
  const pId = String(productId).trim();
  const qty = Math.max(1, parseInt(quantity, 10) || 1);

  const existingItem = cart.items.find((item) => String(item.productId).toLowerCase() === pId.toLowerCase());
  if (existingItem) {
    existingItem.quantity += qty;
    existingItem.updatedAt = new Date().toISOString();
  } else {
    cart.items.push({
      productId: pId,
      quantity: qty,
      addedAt: new Date().toISOString(),
    });
  }

  cart.updatedAt = new Date().toISOString();
  saveCarts(carts);
  return cart;
}

function updateQuantity(customerId, productId, quantity) {
  const cart = getCart(customerId);
  const pId = String(productId).trim().toLowerCase();
  const qty = parseInt(quantity, 10);

  if (qty <= 0) {
    cart.items = cart.items.filter((item) => String(item.productId).toLowerCase() !== pId);
  } else {
    const existing = cart.items.find((item) => String(item.productId).toLowerCase() === pId);
    if (existing) {
      existing.quantity = qty;
      existing.updatedAt = new Date().toISOString();
    }
  }

  cart.updatedAt = new Date().toISOString();
  saveCarts(carts);
  return cart;
}

function removeItem(customerId, productId) {
  const cart = getCart(customerId);
  const pId = String(productId).trim().toLowerCase();
  cart.items = cart.items.filter((item) => String(item.productId).toLowerCase() !== pId);
  cart.updatedAt = new Date().toISOString();
  saveCarts(carts);
  return cart;
}

function clearCart(customerId) {
  const cart = getCart(customerId);
  cart.items = [];
  cart.updatedAt = new Date().toISOString();
  saveCarts(carts);
  return cart;
}

module.exports = {
  getCart,
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
};
