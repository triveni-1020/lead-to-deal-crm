const fs = require('fs');
const path = require('path');

const ORDERS_FILE = path.join(__dirname, 'orders.json');

function loadOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading orders.json:', err.message);
  }
  return [];
}

function saveOrders(list) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving orders.json:', err.message);
  }
}

let orders = loadOrders();

function getAll() {
  return [...orders];
}

function getByCustomerId(customerId) {
  const cId = String(customerId);
  return orders
    .filter((o) => String(o.customerId) === cId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getById(orderId) {
  return orders.find((o) => String(o.orderId).toLowerCase() === String(orderId).toLowerCase()) || null;
}

function createOrder(data) {
  const newOrder = {
    orderId: data.orderId || `ORD-${Date.now()}`,
    customerId: String(data.customerId),
    leadId: data.leadId || null,
    productId: data.productId || (data.items && data.items[0]?.productId) || null,
    items: data.items || [],
    quantity: data.quantity || 1,
    totalAmount: Number(data.totalAmount) || 0,
    fullName: (data.fullName || '').trim(),
    email: (data.email || '').trim().toLowerCase(),
    phone: (data.phone || '').trim(),
    deliveryAddress: (data.deliveryAddress || '').trim(),
    city: (data.city || '').trim(),
    state: (data.state || '').trim(),
    pincode: (data.pincode || '').trim(),
    orderStatus: 'Confirmed',
    timestamp: data.timestamp || new Date().toISOString(),
  };

  orders.unshift(newOrder);
  saveOrders(orders);
  return newOrder;
}

module.exports = {
  getAll,
  getByCustomerId,
  getById,
  createOrder,
};
