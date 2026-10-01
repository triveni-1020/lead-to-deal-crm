const fs = require('fs');
const path = require('path');

const EVENTS_FILE = path.join(__dirname, 'events.json');

const VALID_EVENT_TYPES = [
  // Salesperson / CRM Events
  'Website Visit',
  'Email Sent',
  'Email Opened',
  'Email Replied',
  'Call',
  'Meeting',
  'Demo',
  'Content Download',
  'Pricing Page Visit',
  'Contact Form Submitted',

  // Customer Lifecycle & Navigation Events
  'LEAD_REGISTERED',
  'LOGIN',
  'LOGOUT',
  'DASHBOARD_VISIT',
  'PROFILE_UPDATED',

  // Product Catalog & Discovery Events
  'PRODUCTS_PAGE_VIEW',
  'PRODUCT_BROWSE',
  'SEARCH',
  'PRODUCT_FILTER_USED',
  'PRODUCT_SORT_USED',
  'PRODUCT_VIEW',
  'PRODUCT_DETAIL_VIEW',

  // E-Commerce & Buying Intent Events
  'WISHLIST_ADD',
  'WISHLIST_REMOVE',
  'CART_ADD',
  'CART_REMOVE',
  'BUY_NOW',
  'CHECKOUT_STARTED',
  'CHECKOUT_COMPLETED',
  'PURCHASE_COMPLETED',

  // Pricing & Resources
  'PRICING_PAGE_VIEW',
  'PRICING_PLAN_VIEW',
  'CONTACT_SALES_CLICK',
  'RESOURCES_PAGE_VIEW',
  'CONTENT_VIEW',
  'CONTENT_DOWNLOAD',

  // Direct Inquiries & Requests
  'DEMO_REQUESTED',
  'CONTACT_FORM_SUBMITTED',

  // Recommendation Feedback Events
  'RECOMMENDATION_CLICK',
  'RECOMMENDATION_INTEREST',
  'RECOMMENDATION_DISMISSED',
];

function loadEvents() {
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      const data = fs.readFileSync(EVENTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading events.json:', err.message);
  }
  return [];
}

function saveEvents(list) {
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving events.json:', err.message);
  }
}

let events = loadEvents();

function getAll() {
  return [...events];
}

function getByLeadId(leadId) {
  if (!leadId) return [];
  const normalizedLeadId = String(leadId).trim().toLowerCase();
  return events
    .filter((e) => String(e.leadId || '').trim().toLowerCase() === normalizedLeadId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getByCustomerId(customerId, leadId = null) {
  const normCId = customerId ? String(customerId).trim().toLowerCase() : null;
  const normLId = leadId ? String(leadId).trim().toLowerCase() : null;

  return events
    .filter((e) => {
      const matchCId = normCId && e.customerId && String(e.customerId).trim().toLowerCase() === normCId;
      const matchLId = normLId && e.leadId && String(e.leadId).trim().toLowerCase() === normLId;
      return matchCId || matchLId;
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getLatestByLeadId(leadId) {
  const leadEvents = getByLeadId(leadId);
  return leadEvents.length > 0 ? leadEvents[0] : null;
}

function generateEventId() {
  const maxNumber = events.reduce((max, e) => {
    const match = String(e.id).match(/^EVT-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      return Math.max(max, num);
    }
    return max;
  }, 1000);
  return `EVT-${maxNumber + 1}`;
}

function addEvent(data) {
  const eventId = data.eventId || generateEventId();
  const newEvent = {
    id: eventId,
    eventId,
    leadId: data.leadId || null,
    customerId: data.customerId ? String(data.customerId) : null,
    productId: data.productId || data.metadata?.productId || null,
    eventType: data.eventType,
    description: data.description || '',
    metadata: data.metadata || {},
    preferredDate: data.preferredDate || data.metadata?.preferredDate || null,
    preferredTime: data.preferredTime || data.metadata?.preferredTime || null,
    timestamp: data.timestamp || new Date().toISOString(),
    createdBy: {
      id: data.createdBy?.id || data.customerId || null,
      name: data.createdBy?.name || (data.customerId ? 'Customer' : 'Salesperson'),
      email: data.createdBy?.email || '',
    },
    createdAt: new Date().toISOString(),
  };

  events.unshift(newEvent);
  saveEvents(events);
  return newEvent;
}

module.exports = {
  VALID_EVENT_TYPES,
  getAll,
  getByLeadId,
  getByCustomerId,
  getLatestByLeadId,
  addEvent,
};
