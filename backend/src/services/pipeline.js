/**
 * Module 7: Automatic Pipeline Stage Movement Service
 * Deterministic backend rules based on customer actions, engagement events, and score.
 * Stages: New → Engaged → Qualified → Demo → Negotiation → Won
 */

const stageHistoryData = require('../data/stageHistory');
const leadsData = require('../data/leads');

const STAGES = {
  NEW: 'New',
  ENGAGED: 'Engaged',
  QUALIFIED: 'Qualified',
  DEMO: 'Demo',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
};

const STAGE_ORDER = ['New', 'Engaged', 'Qualified', 'Demo', 'Negotiation', 'Won'];

const STAGE_RANK = {
  'New': 0,
  'Engaged': 1,
  'Qualified': 2,
  'Demo': 3,
  'Negotiation': 4,
  'Won': 5,
};

// Event categories
const WON_EVENTS = ['PURCHASE_COMPLETED', 'CHECKOUT_COMPLETED'];
const NEGOTIATION_EVENTS = ['CHECKOUT_STARTED', 'BUY_NOW'];
const DEMO_EVENTS = ['DEMO_REQUESTED', 'Demo'];
const QUALIFIED_EVENTS = ['Contact Form Submitted', 'CONTACT_FORM_SUBMITTED', 'Contact Form'];
const ENGAGED_EVENTS = [
  'PRODUCT_VIEW',
  'PRODUCT_DETAIL_VIEW',
  'PRODUCT_BROWSE',
  'PRODUCTS_PAGE_VIEW',
  'SEARCH',
  'PRODUCT_FILTER_USED',
  'PRODUCT_SORT_USED',
  'LOGIN',
  'DASHBOARD_VISIT',
  'CONTENT_DOWNLOAD',
  'Content Download',
  'CONTENT_VIEW',
  'RESOURCES_PAGE_VIEW',
  'CART_ADD',
  'WISHLIST_ADD',
  'PRICING_PAGE_VIEW',
  'PRICING_PLAN_VIEW',
  'Website Visit',
  'Pricing Page Visit',
  'Email Opened',
  'Email Replied',
  'Call',
  'Meeting',
];

/**
 * Evaluates candidate pipeline stage and generates deterministic transition reason.
 */
function evaluateCandidateStage(currentStage = 'New', score = 0, allEvents = [], latestEvent = null) {
  const currentRank = STAGE_RANK[currentStage] !== undefined ? STAGE_RANK[currentStage] : 0;
  const currentScore = Number(score) || 0;

  const eventTypes = allEvents.map((e) => e.eventType);
  const latestType = latestEvent ? latestEvent.eventType : null;

  // 1. Won (Rank 5): Customer completes purchase
  if (
    (latestType && WON_EVENTS.includes(latestType)) ||
    eventTypes.some((t) => WON_EVENTS.includes(t))
  ) {
    let reason = 'Customer completed purchase.';
    if (latestEvent?.metadata?.orderId) {
      reason = `Customer completed purchase for Order #${latestEvent.metadata.orderId}.`;
    }
    return {
      candidateStage: STAGES.WON,
      candidateRank: STAGE_RANK[STAGES.WON],
      reason,
    };
  }

  // 2. Negotiation (Rank 4): Customer starts checkout or sales negotiation
  if (
    (latestType && NEGOTIATION_EVENTS.includes(latestType)) ||
    eventTypes.some((t) => NEGOTIATION_EVENTS.includes(t))
  ) {
    let reason = 'Customer started checkout process.';
    if (latestType === 'BUY_NOW') {
      const prodName = latestEvent?.metadata?.productName;
      reason = prodName
        ? `Customer initiated direct purchase checkout for ${prodName}.`
        : 'Customer initiated direct purchase checkout.';
    }
    return {
      candidateStage: STAGES.NEGOTIATION,
      candidateRank: STAGE_RANK[STAGES.NEGOTIATION],
      reason,
    };
  }

  // 3. Demo (Rank 3): Customer requests demo or completes demo action
  if (
    (latestType && DEMO_EVENTS.includes(latestType)) ||
    eventTypes.some((t) => DEMO_EVENTS.includes(t))
  ) {
    const prodName =
      latestEvent?.metadata?.productName ||
      latestEvent?.productName ||
      allEvents.find((e) => DEMO_EVENTS.includes(e.eventType))?.metadata?.productName ||
      '';
    const reason = prodName
      ? `Customer requested demo for ${prodName}.`
      : 'Customer requested product demo.';
    return {
      candidateStage: STAGES.DEMO,
      candidateRank: STAGE_RANK[STAGES.DEMO],
      reason,
    };
  }

  // 4. Qualified (Rank 2): Score >= 50 OR contact form submitted
  const hasContactForm =
    (latestType && QUALIFIED_EVENTS.includes(latestType)) ||
    eventTypes.some((t) => QUALIFIED_EVENTS.includes(t));

  if (currentScore >= 50 || hasContactForm) {
    let reason;
    if (currentScore >= 50) {
      reason = `Lead score reached ${currentScore}.`;
    } else {
      reason = 'Customer submitted contact inquiry form.';
    }
    return {
      candidateStage: STAGES.QUALIFIED,
      candidateRank: STAGE_RANK[STAGES.QUALIFIED],
      reason,
    };
  }

  // 5. Engaged (Rank 1): Meaningful product activity (view, search, login, download, cart, etc.)
  const hasEngagedActivity =
    (latestType && ENGAGED_EVENTS.includes(latestType)) ||
    eventTypes.some((t) => ENGAGED_EVENTS.includes(t));

  if (hasEngagedActivity) {
    const viewCount = allEvents.filter((e) =>
      ['PRODUCT_VIEW', 'PRODUCT_DETAIL_VIEW', 'PRODUCT_BROWSE', 'PRODUCTS_PAGE_VIEW'].includes(e.eventType)
    ).length;

    let reason = 'Customer engaged with product catalog.';

    if (
      latestType &&
      ['PRODUCT_VIEW', 'PRODUCT_DETAIL_VIEW', 'PRODUCT_BROWSE', 'PRODUCTS_PAGE_VIEW'].includes(latestType)
    ) {
      if (viewCount >= 2) {
        reason = `Customer viewed product ${viewCount} times.`;
      } else {
        const pName = latestEvent?.metadata?.productName;
        reason = pName ? `Customer viewed product (${pName}).` : 'Customer viewed product.';
      }
    } else if (latestType === 'SEARCH') {
      reason = 'Customer searched product catalog.';
    } else if (latestType && ['CONTENT_DOWNLOAD', 'Content Download'].includes(latestType)) {
      reason = 'Customer downloaded technical content.';
    } else if (latestType === 'CART_ADD') {
      reason = 'Customer added product to shopping cart.';
    } else if (latestType === 'WISHLIST_ADD') {
      reason = 'Customer added product to wishlist.';
    } else if (latestType === 'LOGIN') {
      reason = 'Customer logged in to access product catalog.';
    } else if (latestType === 'DASHBOARD_VISIT') {
      reason = 'Customer visited dashboard and recommendations.';
    }

    return {
      candidateStage: STAGES.ENGAGED,
      candidateRank: STAGE_RANK[STAGES.ENGAGED],
      reason,
    };
  }

  // 6. New (Rank 0): Newly registered lead with little or no activity
  return {
    candidateStage: STAGES.NEW,
    candidateRank: STAGE_RANK[STAGES.NEW],
    reason: 'Newly registered lead with initial activity.',
  };
}

/**
 * Evaluates whether lead should transition to a new stage.
 * Persists stage change and creates stage history record if transition occurs.
 */
function evaluateAndTransition(lead, latestEvent = null, allLeadEvents = [], score = null) {
  if (!lead) return { stageChanged: false };

  const currentStage = lead.stage || STAGES.NEW;
  const currentRank = STAGE_RANK[currentStage] !== undefined ? STAGE_RANK[currentStage] : 0;
  const effectiveScore = score !== null ? Number(score) : Number(lead.score) || 0;

  const evaluation = evaluateCandidateStage(currentStage, effectiveScore, allLeadEvents, latestEvent);

  // Stage changes only on forward advancement (monotonic progression)
  if (evaluation.candidateRank > currentRank) {
    const oldStage = currentStage;
    const newStage = evaluation.candidateStage;
    const reason = evaluation.reason;
    const timestamp = latestEvent?.timestamp || latestEvent?.createdAt || new Date().toISOString();

    // 1. Update lead in memory and in leads.json
    leadsData.updateStage(lead.id, newStage, reason, timestamp);

    // 2. Add record to global stage history store
    const historyRecord = stageHistoryData.addRecord({
      leadId: lead.id,
      oldStage,
      newStage,
      reason,
      timestamp,
    });

    return {
      stageChanged: true,
      oldStage,
      newStage,
      reason,
      historyRecord,
      lead,
    };
  }

  return {
    stageChanged: false,
    currentStage,
    lead,
  };
}

module.exports = {
  STAGES,
  STAGE_ORDER,
  STAGE_RANK,
  evaluateCandidateStage,
  evaluateAndTransition,
};
