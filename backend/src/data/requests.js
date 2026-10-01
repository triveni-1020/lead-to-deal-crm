const fs = require('fs');
const path = require('path');

const REQUESTS_FILE = path.join(__dirname, 'requests.json');

function loadRequests() {
  try {
    if (fs.existsSync(REQUESTS_FILE)) {
      const data = fs.readFileSync(REQUESTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading requests.json:', err.message);
  }
  return [];
}

function saveRequests(list) {
  try {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving requests.json:', err.message);
  }
}

let requests = loadRequests();

function getAll() {
  return [...requests];
}

function getByCustomerId(customerId) {
  const cId = String(customerId);
  return requests
    .filter((r) => String(r.customerId) === cId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getById(id) {
  const reqId = String(id).toLowerCase();
  return requests.find((r) => String(r.id).toLowerCase() === reqId) || null;
}

function addDemoRequest(data) {
  const demoRequestId = data.demoRequestId || `REQ-DEMO-${Date.now()}`;
  const newRequest = {
    id: demoRequestId,
    demoRequestId,
    type: 'Demo Request',
    customerId: String(data.customerId),
    leadId: data.leadId || null,
    productId: data.productId || null,
    productName: data.productName || 'Product Demo',
    fullName: (data.fullName || '').trim(),
    email: (data.email || '').trim().toLowerCase(),
    phone: (data.phone || '').trim(),
    preferredDate: data.preferredDate || new Date().toISOString().split('T')[0],
    preferredTime: data.preferredTime || '10:00 AM',
    message: (data.message || data.notes || '').trim(),
    status: 'REQUESTED',
    createdAt: data.createdAt || new Date().toISOString(),
  };

  requests.unshift(newRequest);
  saveRequests(requests);
  return newRequest;
}

function addContactRequest(data) {
  const newRequest = {
    id: `REQ-CNT-${Date.now()}`,
    type: 'Contact Sales',
    customerId: String(data.customerId),
    leadId: data.leadId || null,
    fullName: data.fullName || '',
    email: data.email || '',
    phone: data.phone || '',
    company: data.company || '',
    subject: data.subject || 'General Inquiry',
    category: data.category || 'General Inquiry',
    message: data.message || '',
    preferredContactMethod: data.preferredContactMethod || 'Email',
    urgency: data.urgency || 'Normal',
    status: 'Submitted', // 'Submitted' | 'In Progress' | 'Completed'
    createdAt: new Date().toISOString(),
  };

  requests.unshift(newRequest);
  saveRequests(requests);
  return newRequest;
}

module.exports = {
  getAll,
  getByCustomerId,
  getById,
  addDemoRequest,
  addContactRequest,
};
