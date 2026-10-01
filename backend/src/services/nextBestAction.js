/**
 * Module 10: Next Best Action Engine
 * Deterministic rules that recommend the most appropriate sales action for each lead/opportunity.
 * Evaluated from latest events, pipeline stage, score, intent, momentum, and stall status.
 */

const leadsData = require('../data/leads');

/**
 * Evaluates lead data and event history to deterministically determine the Next Best Action.
 * @param {Object} lead - The lead record
 * @param {Array} events - Chronological array of events for the lead (newest first)
 * @returns {Object} Recommendation object: { nextBestAction, actionReason, triggerEvent, createdAt }
 */
function calculateNextBestAction(lead, events = []) {
  const now = new Date().toISOString();

  if (!lead) {
    return {
      nextBestAction: null,
      actionReason: null,
      triggerEvent: null,
      createdAt: now,
    };
  }

  const stage = (lead.stage || 'New').trim();
  const stageLower = stage.toLowerCase();

  // 1. RULE: Deal is Won -> No sales action required
  if (stageLower === 'won') {
    return {
      nextBestAction: null,
      actionReason: 'Customer has completed purchase.',
      triggerEvent: 'DEAL_WON',
      createdAt: now,
    };
  }

  // 2. RULE: Opportunity is Stalled -> Re-engage Customer
  if (Boolean(lead.isStalled)) {
    return {
      nextBestAction: 'Re-engage Customer',
      actionReason: 'Opportunity has been stalled without meaningful activity.',
      triggerEvent: 'STALLED_OPPORTUNITY',
      createdAt: now,
    };
  }

  const allEvents = Array.isArray(events) ? events : [];
  const latestEvent = allEvents.length > 0 ? allEvents[0] : null;
  const latestType = latestEvent ? (latestEvent.eventType || '').trim() : '';
  const latestTypeUpper = latestType.toUpperCase();

  // 3. RULE: Checkout Started -> Follow Up Immediately
  const checkoutStartedRecently = allEvents.some(
    (e, idx) => idx < 3 && (
      (e.eventType || '').toUpperCase() === 'CHECKOUT_STARTED' ||
      (e.eventType || '').toUpperCase() === 'BUY_NOW' ||
      (e.eventType || '').toUpperCase() === 'CART_CHECKOUT'
    )
  );
  if (
    latestTypeUpper === 'CHECKOUT_STARTED' ||
    latestTypeUpper === 'BUY_NOW' ||
    latestTypeUpper === 'CART_CHECKOUT' ||
    (stageLower === 'negotiation' && checkoutStartedRecently)
  ) {
    return {
      nextBestAction: 'Follow Up Immediately',
      actionReason: 'Customer started checkout but has not completed purchase.',
      triggerEvent: 'CHECKOUT_STARTED',
      createdAt: now,
    };
  }

  // 4. RULE: Free Demo Requested -> Schedule Demo
  const hasDemoRequest = allEvents.some(
    (e) => (e.eventType || '').toUpperCase().includes('DEMO')
  );
  if (latestTypeUpper.includes('DEMO') || (stageLower === 'demo' && hasDemoRequest)) {
    return {
      nextBestAction: 'Schedule Demo',
      actionReason: 'Customer requested a demo.',
      triggerEvent: 'DEMO_REQUESTED',
      createdAt: now,
    };
  }

  // 5. RULE: Contact Sales / Contact Form Submitted -> Contact Customer
  if (
    latestTypeUpper === 'CONTACT_FORM_SUBMITTED' ||
    latestTypeUpper === 'CONTACT_SALES' ||
    latestTypeUpper.includes('CONTACT')
  ) {
    return {
      nextBestAction: 'Contact Customer',
      actionReason: 'Customer submitted a contact request.',
      triggerEvent: 'CONTACT_FORM_SUBMITTED',
      createdAt: now,
    };
  }

  // 6. RULE: Repeated Pricing Views -> Follow Up About Pricing
  const pricingViews = allEvents.filter((e) => {
    const t = (e.eventType || '').trim().toUpperCase();
    return t === 'PRICING_VIEW' || t === 'PRICING_PAGE_VIEW' || t === 'PRICING_PLAN_VIEW' || t.includes('PRICING');
  });
  if (pricingViews.length >= 2) {
    return {
      nextBestAction: 'Follow Up About Pricing',
      actionReason: 'Customer showed repeated pricing interest.',
      triggerEvent: 'PRICING_VIEW',
      createdAt: now,
    };
  }

  // 7. RULE: Content Downloaded -> Send Relevant Information
  if (latestTypeUpper.includes('CONTENT_DOWNLOAD') || latestTypeUpper.includes('DOWNLOAD')) {
    return {
      nextBestAction: 'Send Relevant Information',
      actionReason: 'Customer downloaded product information.',
      triggerEvent: 'CONTENT_DOWNLOAD',
      createdAt: now,
    };
  }

  // 8. RULE: Repeated Same Product Views -> Understand Customer Requirements
  const productViews = allEvents.filter((e) => {
    const t = (e.eventType || '').trim().toUpperCase();
    return t === 'PRODUCT_VIEW' || t === 'PRODUCT_DETAIL_VIEW';
  });

  // Check frequency by productId or productName
  const productCounts = {};
  for (const pv of productViews) {
    const pid = pv.productId || (pv.metadata && pv.metadata.productId) || (pv.metadata && pv.metadata.productName);
    if (pid) {
      productCounts[pid] = (productCounts[pid] || 0) + 1;
    }
  }
  const hasRepeatedProduct = Object.values(productCounts).some((count) => count >= 2);
  if (hasRepeatedProduct || productViews.length >= 2) {
    return {
      nextBestAction: 'Understand Customer Requirements',
      actionReason: 'Customer repeatedly viewed the same product.',
      triggerEvent: hasRepeatedProduct ? 'REPEATED_PRODUCT_VIEW' : 'PRODUCT_VIEW',
      createdAt: now,
    };
  }

  // 9. RULE: Stage is Negotiation -> Follow Up on Purchase
  if (stageLower === 'negotiation') {
    return {
      nextBestAction: 'Follow Up on Purchase',
      actionReason: 'Opportunity is currently in negotiation.',
      triggerEvent: 'STAGE_NEGOTIATION',
      createdAt: now,
    };
  }

  // 10. RULE: Stage is Demo -> Schedule Demo
  if (stageLower === 'demo') {
    return {
      nextBestAction: 'Schedule Demo',
      actionReason: 'Customer requested a demo.',
      triggerEvent: 'DEMO_REQUESTED',
      createdAt: now,
    };
  }

  // 11. RULE: Newly registered with little activity -> Introduce Relevant Products
  if (stageLower === 'new' && (allEvents.length <= 1 || (Number(lead.score) || 0) <= 10)) {
    return {
      nextBestAction: 'Introduce Relevant Products',
      actionReason: 'New customer has not shown strong product engagement yet.',
      triggerEvent: 'LEAD_REGISTERED',
      createdAt: now,
    };
  }

  // 12. Fallback for Engaged or Qualified with browsing activity
  if (stageLower === 'engaged' || stageLower === 'qualified') {
    return {
      nextBestAction: 'Understand Customer Requirements',
      actionReason: 'Customer is actively engaging with product catalog.',
      triggerEvent: 'PRODUCT_VIEW',
      createdAt: now,
    };
  }

  // Default Fallback
  return {
    nextBestAction: 'Introduce Relevant Products',
    actionReason: 'New customer has not shown strong product engagement yet.',
    triggerEvent: 'LEAD_REGISTERED',
    createdAt: now,
  };
}

/**
 * Computes Next Best Action and persists it directly onto the lead object.
 * @param {Object} lead - The lead record
 * @param {Array} events - Chronological array of events
 * @returns {Object} Recommendation object
 */
function computeAndApplyNextBestAction(lead, events = []) {
  if (!lead) return null;

  const recommendation = calculateNextBestAction(lead, events);

  lead.nextBestAction = recommendation.nextBestAction;
  lead.actionReason = recommendation.actionReason;
  lead.triggerEvent = recommendation.triggerEvent;
  lead.recommendationCreatedAt = recommendation.createdAt;
  lead.recommendation = recommendation;

  if (leadsData.updateNextBestAction) {
    leadsData.updateNextBestAction(lead.id, recommendation);
  }

  return recommendation;
}

module.exports = {
  calculateNextBestAction,
  computeAndApplyNextBestAction,
};
