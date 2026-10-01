/**
 * Module 9: Configurable Stalled Opportunity Detection Thresholds
 * Centralized backend configuration for detecting stalled pipeline opportunities.
 */

const STALL_CONFIG = {
  // Configurable inactivity threshold (in days) per active stage
  thresholdsDays: {
    QUALIFIED: 7,
    DEMO: 5,
    NEGOTIATION: 3,
  },

  // Active stages eligible for stalled opportunity detection
  // NOTE: 'New', 'Engaged', and 'Won' are NEVER marked as stalled
  activeStages: ['Qualified', 'Demo', 'Negotiation'],

  // Events that represent meaningful customer engagement or commercial progress
  meaningfulEvents: [
    'PRODUCT_DETAIL_VIEW',
    'PRODUCT_VIEW',
    'PRICING_PAGE_VIEW',
    'Pricing Page Visit',
    'PRICING_PLAN_VIEW',
    'CONTACT_FORM_SUBMITTED',
    'Contact Form Submitted',
    'Contact Form',
    'DEMO_REQUESTED',
    'Demo',
    'CHECKOUT_STARTED',
    'BUY_NOW',
    'PURCHASE_COMPLETED',
    'CHECKOUT_COMPLETED',
    'CART_ADD',
    'WISHLIST_ADD',
    'CONTENT_DOWNLOAD',
    'Content Download',
    'Call',
    'Meeting',
    'Email Replied',
  ],

  // Passive events that do NOT count as meaningful progress (page reloads, passive sessions)
  ignoredEvents: [
    'DASHBOARD_VISIT',
    'SESSION_START',
    'PAGE_REFRESH',
    'HEARTBEAT',
  ],
};

module.exports = STALL_CONFIG;
