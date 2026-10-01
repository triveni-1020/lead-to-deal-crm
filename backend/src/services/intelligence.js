/**
 * Module 6: Centralized Unified Buying Intent Engine & Momentum Intelligence Service
 *
 * UNIFIED INTENT ARCHITECTURE:
 * Intent is calculated as ONE unified buying-intent result using BOTH:
 * 1. Customer engagement score (behavioral evidence)
 * 2. Product / Opportunity revenue value (commercial importance)
 *
 * The two inputs contribute to ONE final Intent result:
 * Low / Medium / High / Very High
 *
 * FORMULA:
 * normalizedScore = score (clamped 0 to 100)
 * normalizedRevenue = (opportunityValue / 200,000) * 100 (clamped 0 to 100)
 * combinedIntentSignal = Math.round(normalizedScore * 0.70 + normalizedRevenue * 0.30)
 *
 * COMBINED SIGNAL MAPPING:
 * 0–24   → Low
 * 25–49  → Medium
 * 50–74  → High
 * 75–100 → Very High
 *
 * BUSINESS RULES:
 * - Revenue value influences intent, but revenue value alone NEVER determines intent.
 * - Score 0 with ₹2,00,000 value yields Medium/Low intent, NEVER Very High (needs behavioral evidence).
 * - Score 90 with ₹20,000 value yields High intent (strong engagement, moderate value).
 * - Score 90 with ₹2,00,000 value yields Very High intent.
 * - When score decreases (inactivity/score decay), Intent recalculates immediately.
 * - When product/opportunity value changes, Intent recalculates immediately.
 */

const productsData = require('../data/products');

const RECENT_ACTIVITY_WINDOW_HOURS = parseInt(process.env.RECENT_ACTIVITY_WINDOW_HOURS, 10) || 48;
const MAX_REVENUE_BENCHMARK = parseInt(process.env.MAX_REVENUE_BENCHMARK, 10) || 200000; // ₹2,00,000 benchmark
const SCORE_WEIGHT = 0.70; // 70% weight on customer engagement score
const REVENUE_WEIGHT = 0.30; // 30% weight on commercial product / opportunity value

const EVENT_ACTION_DESCRIPTIONS = {
  // Salesperson / CRM Events
  'Website Visit': 'visited the website',
  'Pricing Page Visit': 'visited the pricing page',
  'Email Sent': 'was sent an email',
  'Email Opened': 'opened an email',
  'Email Replied': 'replied to an email',
  'Call': 'participated in a call',
  'Meeting': 'attended a meeting',
  'Demo': 'requested a demo',
  'Content Download': 'downloaded content',
  'Contact Form Submitted': 'submitted a contact form',
  'Contact Form': 'submitted a contact form',

  // Customer Events
  'DEMO_REQUESTED': 'requested a product demo',
  'CHECKOUT_STARTED': 'initiated checkout',
  'CHECKOUT_COMPLETED': 'completed a checkout order',
  'PRICING_PAGE_VIEW': 'explored product pricing',
  'PRICING_PLAN_VIEW': 'examined pricing plans',
  'PRODUCT_DETAIL_VIEW': 'reviewed product specifications',
  'PRODUCT_VIEW': 'viewed products',
  'CONTENT_DOWNLOAD': 'downloaded technical resources',
  'CART_ADD': 'added items to cart',
  'WISHLIST_ADD': 'saved items to wishlist',
  'SEARCH': 'searched the catalog',
  'PRODUCT_FILTER_USED': 'filtered catalog items',
  'CONTACT_SALES_CLICK': 'clicked contact sales',
};

/**
 * Normalizes lead engagement score to 0–100 scale
 */
function normalizeScore(score) {
  const s = Number(score) || 0;
  return Math.max(0, Math.min(100, s));
}

/**
 * Normalizes product/opportunity value to 0–100 scale against configured benchmark
 */
function normalizeRevenue(opportunityValue) {
  const val = Number(opportunityValue) || 0;
  if (val <= 0) return 0;
  return Math.min(100, Math.max(0, (val / MAX_REVENUE_BENCHMARK) * 100));
}

/**
 * Computes the ONE unified combined intent signal (0–100)
 */
function calculateCombinedIntentSignal(score, opportunityValue = 0) {
  const normScore = normalizeScore(score);
  const normRev = normalizeRevenue(opportunityValue);
  const combined = Math.round(normScore * SCORE_WEIGHT + normRev * REVENUE_WEIGHT);
  return Math.max(0, Math.min(100, combined));
}

/**
 * Maps the combined intent signal to standard CRM intent levels:
 * 0–24   → Low
 * 25–49  → Medium
 * 50–74  → High
 * 75–100 → Very High
 *
 * @param {number} score - Engagement score
 * @param {number} opportunityValue - Product or opportunity value in INR
 * @returns {string} 'Low' | 'Medium' | 'High' | 'Very High'
 */
function calculateIntent(score, opportunityValue = 0) {
  const signal = calculateCombinedIntentSignal(score, opportunityValue);
  if (signal >= 75) return 'Very High';
  if (signal >= 50) return 'High';
  if (signal >= 25) return 'Medium';
  return 'Low';
}

/**
 * Formats a currency amount in Indian Rupees (INR)
 */
function formatCurrency(val) {
  const num = Math.round(Number(val) || 0);
  return `₹${num.toLocaleString('en-IN')}`;
}

/**
 * Generates an explainable human-readable reason for why the combined Intent was produced
 */
function generateIntentReason(intent, score, opportunityValue = 0, leadEvents = []) {
  const s = Math.round(normalizeScore(score));
  const oppVal = Math.round(Number(opportunityValue) || 0);
  const oppStr = formatCurrency(oppVal);

  const eventTypes = (leadEvents || []).map((e) => e.eventType);

  // Very High Intent (Combined signal 75–100)
  if (intent === 'Very High') {
    if (oppVal >= 80000) {
      return `High engagement score (${s}) combined with a high-value opportunity (${oppStr}).`;
    }
    return `Exceptional customer engagement (score ${s}) driving very high commercial readiness (${oppStr}).`;
  }

  // High Intent (Combined signal 50–74)
  if (intent === 'High') {
    if (s >= 70 && oppVal < 80000) {
      return `Strong customer engagement with a moderate-value opportunity (${oppStr}).`;
    }
    if (s < 70 && oppVal >= 80000) {
      return `High-value opportunity (${oppStr}) supported by solid customer engagement (score ${s}).`;
    }
    return `Strong buying signals with active product evaluation (score ${s}, ${oppStr}).`;
  }

  // Medium Intent (Combined signal 25–49)
  if (intent === 'Medium') {
    if (s < 25 && oppVal >= 60000) {
      return `High opportunity value but limited customer engagement.`;
    }
    const hasCart = eventTypes.includes('CART_ADD');
    const hasWishlist = eventTypes.includes('WISHLIST_ADD');
    if (hasCart || hasWishlist) {
      return `Intent is medium because the lead is actively evaluating options (added products to cart, saved items to wishlist).`;
    }
    if (oppVal >= 40000) {
      return `Moderate opportunity value (${oppStr}) with steady initial customer engagement (score ${s}).`;
    }
    return `Active customer evaluation with a standard opportunity value (${oppStr}).`;
  }

  // Low Intent (Combined signal 0–24)
  if (oppVal > 0 && s > 0) {
    return `Early discovery phase with limited behavioral activity (score ${s}, ${oppStr}).`;
  }
  if (oppVal > 0) {
    return `Early discovery phase with limited behavioral activity (score 0, ${oppStr}).`;
  }
  return `Intent is low because there is limited recent engagement.`;
}

/**
 * Calculates Momentum level (Rising, Stable, Falling)
 */
function calculateMomentum(leadEvents = [], options = {}) {
  const windowHours = options.windowHours || RECENT_ACTIVITY_WINDOW_HOURS;
  const now = options.now ? new Date(options.now).getTime() : Date.now();
  const windowThreshold = now - windowHours * 60 * 60 * 1000;

  if (!leadEvents || leadEvents.length === 0) {
    return 'Stable';
  }

  const recentEvents = leadEvents.filter((e) => {
    const eventTime = new Date(e.timestamp || e.createdAt).getTime();
    return eventTime >= windowThreshold;
  });

  const olderEvents = leadEvents.filter((e) => {
    const eventTime = new Date(e.timestamp || e.createdAt).getTime();
    return eventTime < windowThreshold;
  });

  if (recentEvents.length === 0) {
    if (olderEvents.length > 0) {
      return 'Falling';
    }
    return 'Stable';
  }

  if (recentEvents.length >= 2) {
    return 'Rising';
  }

  return 'Stable';
}

/**
 * Generates human-readable explanation for Momentum
 */
function generateMomentumReason(momentum, leadEvents = [], options = {}) {
  const windowHours = options.windowHours || RECENT_ACTIVITY_WINDOW_HOURS;
  const now = options.now ? new Date(options.now).getTime() : Date.now();
  const windowThreshold = now - windowHours * 60 * 60 * 1000;

  if (momentum === 'Falling') {
    return 'Engagement is falling because there has been no recent activity.';
  }

  if (momentum === 'Rising') {
    const recentEvents = (leadEvents || []).filter((e) => {
      const eventTime = new Date(e.timestamp || e.createdAt).getTime();
      return eventTime >= windowThreshold;
    });

    const actions = [];
    for (const e of recentEvents) {
      const phrase = EVENT_ACTION_DESCRIPTIONS[e.eventType];
      if (phrase && !actions.includes(phrase)) {
        actions.push(phrase);
      }
    }

    if (actions.length >= 2) {
      return `Engagement is increasing because the lead ${actions.slice(0, 3).join(', ')} recently.`;
    }
    return 'Engagement is increasing because of a recent surge in activity.';
  }

  return 'Engagement is stable because the lead has had consistent activity without a significant recent increase or decrease.';
}

/**
 * Resolves the realistic opportunity value based on catalog pricing and customer engagement.
 * Does NOT invent fake values. Prioritizes recent product interest.
 *
 * @param {Object} lead - The lead record
 * @param {Array} events - Chronological events array (newest first)
 * @returns {number} Opportunity value in INR
 */
function resolveOpportunityValue(lead, events = []) {
  if (!lead && (!events || events.length === 0)) return 0;
  const allEvents = Array.isArray(events) ? events : [];

  // 1. Inspect most recent product-bearing customer events (latest active interest)
  for (const e of allEvents) {
    if (e && e.metadata) {
      const price = Number(e.metadata.price || e.metadata.totalPrice || e.metadata.totalAmount || e.metadata.unitPrice);
      if (price > 0) {
        return price;
      }
      if (e.metadata.productId) {
        const prod = productsData.getById(e.metadata.productId);
        if (prod && Number(prod.price) > 0) {
          return Number(prod.price);
        }
      }
      if (e.metadata.productName) {
        const catalog = productsData.getAll ? productsData.getAll() : [];
        const pName = e.metadata.productName.trim().toLowerCase();
        const prod = catalog.find((p) => p.name.toLowerCase() === pName || p.name.toLowerCase().includes(pName));
        if (prod && Number(prod.price) > 0) {
          return Number(prod.price);
        }
      }
    }
  }

  // 2. Direct opportunityValue / productPrice / expectedDealValue on lead
  if (lead) {
    if (Number(lead.opportunityValue) > 0) return Number(lead.opportunityValue);
    if (Number(lead.productPrice) > 0) return Number(lead.productPrice);
    if (Number(lead.expectedDealValue) > 0) return Number(lead.expectedDealValue);

    // 3. Match against catalog via lead.productId or lead.product
    const catalog = productsData.getAll ? productsData.getAll() : [];
    if (lead.productId) {
      const prod = productsData.getById(lead.productId);
      if (prod && Number(prod.price) > 0) return Number(prod.price);
    }
    if (lead.product && lead.product !== 'General Inquiry') {
      const pName = lead.product.trim().toLowerCase();
      const prod = catalog.find(
        (p) => p.name.toLowerCase() === pName || p.name.toLowerCase().includes(pName) || pName.includes(p.name.toLowerCase())
      );
      if (prod && Number(prod.price) > 0) return Number(prod.price);
    }
  }

  return 0;
}

/**
 * Synchronizes lead.productId, lead.productName, lead.productPrice with recent events & catalog
 */
function syncLeadProductData(lead, events = []) {
  if (!lead) return;
  const allEvents = Array.isArray(events) ? events : [];

  for (const e of allEvents) {
    if (e && e.metadata) {
      if (e.metadata.productId) {
        const prod = productsData.getById(e.metadata.productId);
        if (prod) {
          lead.productId = prod.id;
          lead.productName = prod.name;
          lead.product = prod.name;
          lead.productPrice = Number(prod.price) || 0;
          return;
        }
      }
      if (e.metadata.productName) {
        lead.productName = e.metadata.productName;
        lead.product = e.metadata.productName;
        if (Number(e.metadata.price) > 0) {
          lead.productPrice = Number(e.metadata.price);
        }
        return;
      }
    }
  }

  if (lead.productId && (!lead.productName || !lead.productPrice)) {
    const prod = productsData.getById(lead.productId);
    if (prod) {
      lead.productName = prod.name;
      if (!lead.product || lead.product === 'General Inquiry') lead.product = prod.name;
      lead.productPrice = Number(prod.price) || 0;
    }
  }
}

/**
 * Calculates complete unified intelligence payload for a lead
 * combining Engagement Score AND Product/Opportunity Revenue Value into ONE Intent.
 *
 * @param {number|Object} scoreOrLead - Score number or Lead object
 * @param {Array} leadEvents - Chronological events array
 * @param {Object|number} options - Options object or opportunityValue number
 * @returns {Object} { intent, intentReason, intentSignal, score, opportunityValue, momentum, momentumReason }
 */
function computeIntelligence(scoreOrLead, leadEvents = [], options = {}) {
  let score = 0;
  let opportunityValue = 0;
  let lead = null;

  if (typeof scoreOrLead === 'object' && scoreOrLead !== null) {
    lead = scoreOrLead;
    score = Number(lead.score) || 0;
    opportunityValue = Number(lead.opportunityValue || lead.expectedDealValue || lead.productPrice) || 0;
  } else {
    score = Number(scoreOrLead) || 0;
    if (typeof options === 'object' && options !== null) {
      if (options.opportunityValue !== undefined) {
        opportunityValue = Number(options.opportunityValue) || 0;
      }
      if (options.lead) {
        lead = options.lead;
        if (!opportunityValue) {
          opportunityValue = Number(lead.opportunityValue || lead.expectedDealValue || lead.productPrice) || 0;
        }
      }
    } else if (typeof options === 'number') {
      opportunityValue = options;
    }
  }

  if (opportunityValue === 0 && (lead || leadEvents.length > 0)) {
    opportunityValue = resolveOpportunityValue(lead, leadEvents);
  }

  const intentSignal = calculateCombinedIntentSignal(score, opportunityValue);
  const intent = calculateIntent(score, opportunityValue);
  const intentReason = generateIntentReason(intent, score, opportunityValue, leadEvents);
  const momentum = calculateMomentum(leadEvents, typeof options === 'object' ? options : {});
  const momentumReason = generateMomentumReason(momentum, leadEvents, typeof options === 'object' ? options : {});

  return {
    intent,
    intentReason,
    intentSignal,
    score: normalizeScore(score),
    opportunityValue,
    momentum,
    momentumReason,
  };
}

/**
 * Centralized dynamic orchestrator:
 * Updates Score + Opportunity Value -> ONE Combined Intent -> Momentum
 * -> Pipeline -> Priority -> Stalled -> NBA -> Revenue Priority
 */
function recalculateLead(lead, allEvents = null) {
  if (!lead) return lead;
  const eventsData = require('../data/events');
  const leadsData = require('../data/leads');
  const priorityService = require('./priority');
  const stallDetectionService = require('./stallDetection');
  const nextBestActionService = require('./nextBestAction');
  const revenuePriorityService = require('./revenuePriority');

  const leadEvents = allEvents || eventsData.getByLeadId(lead.id);

  syncLeadProductData(lead, leadEvents);
  const opportunityValue = resolveOpportunityValue(lead, leadEvents);
  lead.opportunityValue = opportunityValue;
  lead.expectedDealValue = opportunityValue;
  if (!lead.productPrice) lead.productPrice = opportunityValue;

  const intel = computeIntelligence(lead.score || 0, leadEvents, { opportunityValue, lead });
  lead.intent = intel.intent;
  lead.intentReason = intel.intentReason;
  lead.intentSignal = intel.intentSignal;
  lead.momentum = intel.momentum;
  lead.momentumReason = intel.momentumReason;

  leadsData.updateIntelligence(lead.id, {
    score: lead.score,
    intent: intel.intent,
    intentReason: intel.intentReason,
    intentSignal: intel.intentSignal,
    momentum: intel.momentum,
    momentumReason: intel.momentumReason,
    opportunityValue,
    productId: lead.productId,
    productName: lead.productName,
    product: lead.product,
    productPrice: lead.productPrice,
  });

  // Downstream intelligence recalculations
  priorityService.computeAndApplyPriority(lead, leadEvents);
  stallDetectionService.computeAndApplyStallStatus(lead, leadEvents);
  nextBestActionService.computeAndApplyNextBestAction(lead, leadEvents);
  revenuePriorityService.computeAndApplyRevenuePriority(lead, leadEvents);

  return lead;
}

/**
 * Applies score decay (e.g. from inactivity) and immediately recalculates
 * combined intent and all downstream intelligence.
 */
function applyScoreDecay(leadId, pointsToDeduct = 5, reason = 'Inactivity decay') {
  const leadsData = require('../data/leads');
  const scoreHistoryData = require('../data/scoreHistory');

  const lead = leadsData.findById(leadId);
  if (!lead) return null;

  const prevScore = Number(lead.score) || 0;
  const newScore = Math.max(0, prevScore - Math.abs(pointsToDeduct));

  lead.score = newScore;
  leadsData.updateScore(lead.id, newScore);

  scoreHistoryData.addRecord({
    leadId: lead.id,
    eventId: null,
    eventType: 'SCORE_DECAY',
    points: -Math.abs(pointsToDeduct),
    previousScore: prevScore,
    newScore,
    reason,
    timestamp: new Date().toISOString(),
  });

  return recalculateLead(lead);
}

module.exports = {
  RECENT_ACTIVITY_WINDOW_HOURS,
  MAX_REVENUE_BENCHMARK,
  SCORE_WEIGHT,
  REVENUE_WEIGHT,
  normalizeScore,
  normalizeRevenue,
  calculateCombinedIntentSignal,
  calculateIntent,
  generateIntentReason,
  calculateMomentum,
  generateMomentumReason,
  resolveOpportunityValue,
  syncLeadProductData,
  computeIntelligence,
  recalculateLead,
  applyScoreDecay,
};
