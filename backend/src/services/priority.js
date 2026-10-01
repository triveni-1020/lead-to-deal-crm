/**
 * Module 8: Automatic Lead Priority Service
 * Deterministic rules based on lead score, intent, momentum, pipeline stage,
 * recent activity timeline, and key commercial buying signals.
 * No external AI APIs or manual salesperson selection.
 */

const leadsData = require('../data/leads');

const PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
  NONE: 'NONE', // Deal closed won (no longer an active sales outreach priority)
};

const PRIORITY_ORDER = ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'];
const PRIORITY_RANK = {
  'URGENT': 4,
  'HIGH': 3,
  'MEDIUM': 2,
  'LOW': 1,
  'NONE': 0,
};

/**
 * Calculates priority deterministically for a lead.
 * @param {Object} lead - The lead record
 * @param {Array} allEvents - Chronological events for this lead
 * @param {Object} latestEvent - The most recent event (optional)
 * @returns {Object} { priority, reason }
 */
function calculatePriority(lead, allEvents = [], latestEvent = null) {
  if (!lead) {
    return {
      priority: PRIORITIES.LOW,
      reason: 'Newly registered lead with low engagement and limited recent activity.',
    };
  }

  const stage = lead.stage || 'New';
  const score = Number(lead.score) || 0;
  const intent = lead.intent || 'Low';
  const momentum = lead.momentum || 'Stable';
  const eventTypes = allEvents.map((e) => e.eventType);
  const latestType = latestEvent ? latestEvent.eventType : (allEvents[0] ? allEvents[0].eventType : null);

  // -----------------------------------------------------------------
  // 1. RULE: PURCHASE COMPLETED / WON LEADS
  // Stage becomes WON: Customer should no longer appear as an active sales priority.
  // -----------------------------------------------------------------
  if (
    stage === 'Won' ||
    latestType === 'PURCHASE_COMPLETED' ||
    latestType === 'CHECKOUT_COMPLETED' ||
    eventTypes.some((t) => ['PURCHASE_COMPLETED', 'CHECKOUT_COMPLETED'].includes(t))
  ) {
    return {
      priority: PRIORITIES.NONE,
      reason: 'Deal closed won. Customer successfully completed purchase and is no longer an active sales priority.',
    };
  }

  // -----------------------------------------------------------------
  // 2. RULE: PROLONGED INACTIVITY (DECREASE PRIORITY TO LOW)
  // Check if momentum is Falling or lead has prolonged inactivity.
  // -----------------------------------------------------------------
  const isFallingMomentum = momentum === 'Falling';
  const isCheckoutStarted =
    stage === 'Negotiation' ||
    latestType === 'CHECKOUT_STARTED' ||
    latestType === 'BUY_NOW' ||
    eventTypes.some((t) => ['CHECKOUT_STARTED', 'BUY_NOW'].includes(t));

  // -----------------------------------------------------------------
  // 3. RULE: URGENT PRIORITY
  // - Customer started checkout
  // - Customer repeatedly visited pricing/checkout
  // - Customer requested demo while having high intent / high score / rising momentum
  // - Customer shows very strong recent buying activity
  // -----------------------------------------------------------------
  if (isCheckoutStarted) {
    const isDirectBuyNow = latestType === 'BUY_NOW' || allEvents.some((e) => e.eventType === 'BUY_NOW');
    const reason = isDirectBuyNow
      ? 'Customer started checkout and has high buying intent.'
      : 'Customer started checkout and has high engagement.';
    return {
      priority: PRIORITIES.URGENT,
      reason,
    };
  }

  // Repeated pricing / checkout touchpoints (3+ visits)
  const pricingCheckoutCount = allEvents.filter((e) =>
    ['PRICING_PAGE_VIEW', 'Pricing Page Visit', 'PRICING_PLAN_VIEW', 'CHECKOUT_STARTED'].includes(e.eventType)
  ).length;
  if (pricingCheckoutCount >= 3) {
    return {
      priority: PRIORITIES.URGENT,
      reason: 'Customer repeatedly visited pricing and checkout touchpoints showing urgent commercial intent.',
    };
  }

  // Demo requested while having High or Very High intent / score >= 50
  const hasDemo =
    latestType === 'DEMO_REQUESTED' ||
    latestType === 'Demo' ||
    stage === 'Demo' ||
    eventTypes.some((t) => ['DEMO_REQUESTED', 'Demo'].includes(t));

  if (hasDemo && (intent === 'High' || intent === 'Very High' || score >= 50 || momentum === 'Rising')) {
    return {
      priority: PRIORITIES.URGENT,
      reason: 'Customer requested demo while having high intent and active buying readiness.',
    };
  }

  // Very strong recent buying activity
  if (intent === 'Very High' && momentum === 'Rising' && score >= 70) {
    return {
      priority: PRIORITIES.URGENT,
      reason: 'Customer shows very strong recent buying activity and accelerating momentum.',
    };
  }

  // If momentum is Falling and not in checkout, decrease to LOW
  if (isFallingMomentum && score < 70) {
    return {
      priority: PRIORITIES.LOW,
      reason: 'Lead priority decreased to Low due to prolonged inactivity and declining engagement.',
    };
  }

  // -----------------------------------------------------------------
  // 4. RULE: HIGH PRIORITY
  // - High intent
  // - Score >= 50
  // - Repeated product views (3+)
  // - Pricing page viewed
  // - Contact form submitted
  // - Demo requested (standard)
  // - Strong recent activity
  // -----------------------------------------------------------------
  if (hasDemo) {
    return {
      priority: PRIORITIES.HIGH,
      reason: 'Customer requested a demo and has high recent engagement.',
    };
  }

  const hasContactForm =
    latestType === 'CONTACT_FORM_SUBMITTED' ||
    latestType === 'Contact Form Submitted' ||
    latestType === 'Contact Form' ||
    eventTypes.some((t) => ['CONTACT_FORM_SUBMITTED', 'Contact Form Submitted', 'Contact Form'].includes(t));

  if (hasContactForm) {
    return {
      priority: PRIORITIES.HIGH,
      reason: 'Contact form submitted by customer requiring prompt sales follow-up.',
    };
  }

  // Repeated pricing page views (2+)
  const pricingCount = allEvents.filter((e) =>
    ['PRICING_PAGE_VIEW', 'Pricing Page Visit', 'PRICING_PLAN_VIEW'].includes(e.eventType)
  ).length;
  if (pricingCount >= 2) {
    return {
      priority: PRIORITIES.HIGH,
      reason: 'High intent lead with recent pricing activity.',
    };
  }

  if (score >= 50) {
    return {
      priority: PRIORITIES.HIGH,
      reason: `Score reached ${score} with strong qualification signals.`,
    };
  }

  if (intent === 'High' || intent === 'Very High') {
    return {
      priority: PRIORITIES.HIGH,
      reason: 'High intent lead with strong product engagement.',
    };
  }

  // Repeated product views (3+)
  const productViewCount = allEvents.filter((e) =>
    ['PRODUCT_VIEW', 'PRODUCT_DETAIL_VIEW', 'PRODUCT_BROWSE', 'PRODUCTS_PAGE_VIEW'].includes(e.eventType)
  ).length;
  if (productViewCount >= 3) {
    return {
      priority: PRIORITIES.HIGH,
      reason: 'Customer repeatedly viewed products demonstrating deep commercial interest.',
    };
  }

  // Single pricing view with moderate score
  if (
    pricingCount >= 1 &&
    (score >= 20 || latestType === 'PRICING_PAGE_VIEW' || latestType === 'Pricing Page Visit')
  ) {
    return {
      priority: PRIORITIES.HIGH,
      reason: 'High intent lead with recent pricing activity.',
    };
  }

  // Strong recent activity (Rising momentum with 4+ total activities)
  if (momentum === 'Rising' && allEvents.length >= 4) {
    return {
      priority: PRIORITIES.HIGH,
      reason: 'Lead has strong recent activity and rising engagement momentum.',
    };
  }

  // -----------------------------------------------------------------
  // 5. RULE: MEDIUM PRIORITY
  // - Some meaningful activity
  // - Medium intent
  // - Regular product browsing & catalog search
  // - Moderate engagement (score >= 10)
  // -----------------------------------------------------------------
  const hasBrowsingActivity =
    productViewCount >= 1 ||
    eventTypes.some((t) =>
      ['SEARCH', 'PRODUCT_FILTER_USED', 'CART_ADD', 'WISHLIST_ADD', 'CONTENT_DOWNLOAD', 'Content Download', 'LOGIN'].includes(t)
    );

  if (intent === 'Medium' || (hasBrowsingActivity && score >= 5) || score >= 15) {
    const reason = hasBrowsingActivity
      ? 'Customer actively browsing products and searching catalog.'
      : 'Customer demonstrated meaningful activity with moderate engagement.';
    return {
      priority: PRIORITIES.MEDIUM,
      reason,
    };
  }

  // -----------------------------------------------------------------
  // 6. RULE: LOW PRIORITY
  // - Low score
  // - Low intent
  // - No recent meaningful activity
  // - Newly registered with little activity
  // -----------------------------------------------------------------
  return {
    priority: PRIORITIES.LOW,
    reason: 'Newly registered lead with low engagement and limited recent activity.',
  };
}

/**
 * Calculates priority, updates lead object, and persists change.
 * @param {Object} lead - The lead record
 * @param {Array} allEvents - Chronological events for this lead
 * @param {Object} latestEvent - The most recent event (optional)
 * @returns {Object} Updated priority record
 */
function computeAndApplyPriority(lead, allEvents = [], latestEvent = null) {
  if (!lead) return null;

  const result = calculatePriority(lead, allEvents, latestEvent);
  const now = new Date().toISOString();

  lead.priority = result.priority;
  lead.priorityReason = result.reason;
  lead.priorityUpdatedAt = now;

  leadsData.updatePriority(lead.id, result.priority, result.reason, now);

  return {
    priority: result.priority,
    priorityReason: result.reason,
    priorityUpdatedAt: now,
  };
}

module.exports = {
  PRIORITIES,
  PRIORITY_ORDER,
  PRIORITY_RANK,
  calculatePriority,
  computeAndApplyPriority,
};
