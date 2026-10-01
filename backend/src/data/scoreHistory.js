const fs = require('fs');
const path = require('path');

const SCORE_HISTORY_FILE = path.join(__dirname, 'scoreHistory.json');

const EVENT_SCORES = {
  // Salesperson / CRM Events
  'Website Visit': 5,
  'Email Sent': 2,
  'Email Opened': 5,
  'Email Replied': 15,
  'Call': 10,
  'Meeting': 15,
  'Demo': 20,
  'Content Download': 8,
  'Pricing Page Visit': 12,
  'Contact Form': 15,
  'Contact Form Submitted': 15,

  // Customer Lifecycle & Discovery
  'LEAD_REGISTERED': 0,
  'LOGIN': 2,
  'DASHBOARD_VISIT': 2,
  'PRODUCTS_PAGE_VIEW': 3,
  'PRODUCT_BROWSE': 3,
  'SEARCH': 5,
  'PRODUCT_FILTER_USED': 3,
  'PRODUCT_SORT_USED': 2,
  'PRODUCT_VIEW': 5,
  'PRODUCT_DETAIL_VIEW': 8,

  // High-Intent Customer Actions
  'WISHLIST_ADD': 5,
  'CART_ADD': 10,
  'BUY_NOW': 15,
  'CHECKOUT_STARTED': 25,
  'CHECKOUT_COMPLETED': 10,
  'PURCHASE_COMPLETED': 30,
  'PRICING_PAGE_VIEW': 12,
  'PRICING_PLAN_VIEW': 8,
  'CONTACT_SALES_CLICK': 5,
  'RESOURCES_PAGE_VIEW': 3,
  'CONTENT_VIEW': 4,
  'CONTENT_DOWNLOAD': 8,
  'DEMO_REQUESTED': 20,
  'CONTACT_FORM_SUBMITTED': 15,
  'PROFILE_UPDATED': 2,
};

function loadHistory() {
  try {
    if (fs.existsSync(SCORE_HISTORY_FILE)) {
      const data = fs.readFileSync(SCORE_HISTORY_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading scoreHistory.json:', err.message);
  }
  return [];
}

function saveHistory(list) {
  try {
    fs.writeFileSync(SCORE_HISTORY_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving scoreHistory.json:', err.message);
  }
}

let history = loadHistory();

function getScoreForEvent(eventType) {
  if (!eventType) return 0;
  return EVENT_SCORES[eventType.trim()] || 0;
}

function getByLeadId(leadId) {
  const normalized = String(leadId).trim().toLowerCase();
  return history.filter((h) => String(h.leadId).trim().toLowerCase() === normalized);
}

function generateHistoryId() {
  const maxNumber = history.reduce((max, h) => {
    const match = String(h.id).match(/^SH-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      return Math.max(max, num);
    }
    return max;
  }, 1000);
  return `SH-${maxNumber + 1}`;
}

function addRecord(data) {
  const newRecord = {
    id: generateHistoryId(),
    leadId: data.leadId,
    eventId: data.eventId,
    eventType: data.eventType,
    points: data.points,
    previousScore: data.previousScore,
    newScore: data.newScore,
    timestamp: data.timestamp || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  history.push(newRecord);
  saveHistory(history);
  return newRecord;
}

module.exports = {
  EVENT_SCORES,
  getScoreForEvent,
  getByLeadId,
  addRecord,
};
