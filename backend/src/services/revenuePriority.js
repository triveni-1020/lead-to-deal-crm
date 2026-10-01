/**
 * Module 11: Revenue Prioritization Engine Service
 *
 * Deterministic calculation determining which active opportunities have the greatest business importance.
 * Considers BOTH Business Value (product/revenue value) and Current Buying Signals (score, intent, momentum, stage, lead priority, recent engagement, stalled status).
 *
 * CRITICAL ARCHITECTURAL CONSTRAINT:
 * Intent is ALREADY calculated by the existing Intent Engine (Module 6).
 * Module 11 ONLY CONSUMES the existing Intent value.
 * Do NOT recalculate or redefine Intent inside Module 11.
 */

const productsData = require('../data/products');
const leadsData = require('../data/leads');

/**
 * Resolves the realistic opportunity value based on catalog pricing and customer engagement.
 * Does NOT invent fake values. Safely handles missing values.
 *
 * @param {Object} lead - The lead record
 * @param {Array} events - Chronological events array
 * @returns {number} Opportunity value in INR
 */
function resolveOpportunityValue(lead, events = []) {
  const intelligence = require('./intelligence');
  return intelligence.resolveOpportunityValue(lead, events);
}

/**
 * Deterministically calculates the Revenue Priority and Reason for an opportunity.
 *
 * @param {Object} lead - The lead record
 * @param {Array} events - Chronological array of events
 * @returns {Object} { revenuePriority, revenuePriorityReason, revenuePriorityUpdatedAt, opportunityValue }
 */
function calculateRevenuePriority(lead, events = []) {
  const now = new Date().toISOString();
  if (!lead) {
    return {
      revenuePriority: 'LOW',
      revenuePriorityReason: 'New lead with limited engagement and low commercial intent.',
      revenuePriorityUpdatedAt: now,
      opportunityValue: 0,
    };
  }

  const opportunityValue = resolveOpportunityValue(lead, events);
  const stage = (lead.stage || 'New').trim();
  const stageLower = stage.toLowerCase();

  // RULE: Purchase completed -> Stage = Won
  // Terminal stage: Won opportunities are removed from active revenue opportunities and added to won revenue.
  if (stageLower === 'won') {
    return {
      revenuePriority: 'NONE',
      revenuePriorityReason: 'Customer completed purchase. Opportunity won and revenue realized.',
      revenuePriorityUpdatedAt: now,
      opportunityValue,
    };
  }

  // Consumes existing intelligence (NO RECALCULATION of Intent)
  const score = Math.max(0, Number(lead.score) || 0);
  const intent = (lead.intent || 'Low').trim(); // 'Low' | 'Medium' | 'High' | 'Very High'
  const momentum = (lead.momentum || 'Stable').trim(); // 'Rising' | 'Stable' | 'Falling'
  const isStalled = Boolean(lead.isStalled);

  // Evaluate Value Tier
  const isVeryHighValue = opportunityValue >= 100000;
  const isHighValue = opportunityValue >= 60000;
  const isModerateValue = opportunityValue >= 20000;

  // Evaluate Buying Signals
  const isVeryHighIntent = intent === 'Very High';
  const isHighIntent = intent === 'High';
  const isLowIntent = intent === 'Low';
  const isNegotiation = stageLower === 'negotiation';
  const isDemo = stageLower === 'demo';
  const isQualified = stageLower === 'qualified';
  const isRising = momentum === 'Rising';
  const isFalling = momentum === 'Falling';

  // ==========================================================
  // CASE 1: CRITICAL
  // Must have High/Very High Business Value AND Strong/Closing Buying Signals
  // ==========================================================
  // Example 1: Samsung Galaxy S25 (₹80,000), Score 82, Intent: Very High, Momentum: Rising, Stage: Negotiation, Lead Priority: High, Stalled: No -> CRITICAL
  if (
    !isStalled &&
    (
      (isHighValue && isVeryHighIntent && (isNegotiation || isDemo || isRising) && score >= 70) ||
      (isVeryHighValue && (isVeryHighIntent || isHighIntent) && isNegotiation && !isFalling) ||
      (isHighValue && score >= 80 && isNegotiation)
    )
  ) {
    let reason = 'High-value opportunity with very high intent, rising momentum and active negotiation.';
    if (!isNegotiation && isDemo) {
      reason = 'High-value opportunity with very high intent, active demo engagement and strong purchase momentum.';
    } else if (!isRising) {
      reason = 'High-value negotiation opportunity with very high buyer intent and close deal proximity.';
    }
    return {
      revenuePriority: 'CRITICAL',
      revenuePriorityReason: reason,
      revenuePriorityUpdatedAt: now,
      opportunityValue,
    };
  }

  // ==========================================================
  // CASE 2: HIGH
  // ==========================================================
  // Sub-case 2A: High-Value Opportunity At Risk (Prompt Stalled Example)
  // Value: ₹5,00,000, Score: 70, Intent: High, Momentum: Falling, Stage: Negotiation, Stalled: 4 days -> HIGH
  if (
    isStalled &&
    (isHighValue || isVeryHighValue) &&
    (isHighIntent || isVeryHighIntent || score >= 50) &&
    (isNegotiation || isDemo || isQualified)
  ) {
    const stageName = stage.charAt(0).toUpperCase() + stage.slice(1);
    return {
      revenuePriority: 'HIGH',
      revenuePriorityReason: `High-value ${stageName} opportunity with strong buying intent, but recent engagement has declined.`,
      revenuePriorityUpdatedAt: now,
      opportunityValue,
    };
  }

  // Sub-case 2B: Example 3: ₹50,000, Score 75, Intent Very High, Momentum Rising, Stage Demo, Stalled No -> HIGH
  if (
    (opportunityValue >= 40000 || isHighValue) &&
    (isVeryHighIntent || (isHighIntent && isRising)) &&
    (isDemo || isNegotiation || isQualified) &&
    !isStalled
  ) {
    return {
      revenuePriority: 'HIGH',
      revenuePriorityReason: 'Very high buying intent with rising engagement and an active demo opportunity.',
      revenuePriorityUpdatedAt: now,
      opportunityValue,
    };
  }

  // Sub-case 2C: High Value with High Intent (general)
  if (
    (isHighValue || isVeryHighValue) &&
    (isHighIntent || isVeryHighIntent) &&
    !isFalling &&
    score >= 50
  ) {
    return {
      revenuePriority: 'HIGH',
      revenuePriorityReason: 'High opportunity value backed by strong buyer intent and active pipeline engagement.',
      revenuePriorityUpdatedAt: now,
      opportunityValue,
    };
  }

  // ==========================================================
  // CASE 3: MEDIUM
  // ==========================================================
  // Sub-case 3A: Example 2: Premium Laptop (₹2,00,000), Score 25, Intent Low, Momentum Falling, Stage Qualified, Stalled Yes -> MEDIUM (or LOW)
  if (
    (isVeryHighValue || isHighValue) &&
    (isLowIntent || score < 30 || isFalling || isStalled)
  ) {
    return {
      revenuePriority: 'MEDIUM',
      revenuePriorityReason: 'High product value but current buying intent is low and engagement is declining.',
      revenuePriorityUpdatedAt: now,
      opportunityValue,
    };
  }

  // Sub-case 3B: Moderate value with moderate/good intent
  if (
    isModerateValue &&
    (intent === 'Medium' || isHighIntent || score >= 25)
  ) {
    return {
      revenuePriority: 'MEDIUM',
      revenuePriorityReason: 'Moderate product value with steady buyer engagement and active interest.',
      revenuePriorityUpdatedAt: now,
      opportunityValue,
    };
  }

  // Sub-case 3C: Lower value but very high intent
  if (
    opportunityValue > 0 &&
    (isVeryHighIntent || isHighIntent) &&
    (isNegotiation || isDemo)
  ) {
    return {
      revenuePriority: 'MEDIUM',
      revenuePriorityReason: 'High buyer intent with close pipeline progress for standard opportunity value.',
      revenuePriorityUpdatedAt: now,
      opportunityValue,
    };
  }

  // ==========================================================
  // CASE 4: LOW (Default)
  // Low value, low intent, early stage, inactive
  // ==========================================================
  return {
    revenuePriority: 'LOW',
    revenuePriorityReason: 'Low opportunity value or early discovery stage with limited commercial commitment.',
    revenuePriorityUpdatedAt: now,
    opportunityValue,
  };
}

/**
 * Computes and applies Revenue Priority directly to the lead in memory & storage.
 *
 * @param {Object} lead - The lead record
 * @param {Array} events - Chronological array of events
 * @returns {Object} Revenue priority result object
 */
function computeAndApplyRevenuePriority(lead, events = []) {
  if (!lead) return null;

  const result = calculateRevenuePriority(lead, events);

  lead.revenuePriority = result.revenuePriority;
  lead.revenuePriorityReason = result.revenuePriorityReason;
  lead.revenuePriorityUpdatedAt = result.revenuePriorityUpdatedAt;
  lead.opportunityValue = result.opportunityValue;
  lead.expectedDealValue = result.opportunityValue;

  if (leadsData.updateRevenuePriority) {
    leadsData.updateRevenuePriority(lead.id, result);
  }

  return result;
}

/**
 * Calculates aggregate revenue analytics for the salesperson dashboard and analytics pages.
 *
 * @param {Array} leads - Full array of leads
 * @returns {Object} Analytics summary
 */
function calculateRevenueAnalytics(leads = []) {
  const activeLeads = (leads || []).filter(
    (l) => (l.stage || 'New').toLowerCase() !== 'won'
  );
  const wonLeads = (leads || []).filter(
    (l) => (l.stage || 'New').toLowerCase() === 'won'
  );

  const totalOpportunityValue = activeLeads.reduce(
    (sum, l) => sum + (Number(l.opportunityValue || l.expectedDealValue) || 0),
    0
  );

  const wonRevenue = wonLeads.reduce(
    (sum, l) => sum + (Number(l.opportunityValue || l.expectedDealValue) || 0),
    0
  );

  // Pipeline stages: Qualified, Demo, Negotiation
  const pipelineStages = ['qualified', 'demo', 'negotiation'];
  const pipelineValue = activeLeads
    .filter((l) => pipelineStages.includes((l.stage || '').toLowerCase()))
    .reduce(
      (sum, l) => sum + (Number(l.opportunityValue || l.expectedDealValue) || 0),
      0
    );

  const highRevenueOpportunities = activeLeads.filter(
    (l) => l.revenuePriority === 'HIGH'
  ).length;

  const criticalRevenueOpportunities = activeLeads.filter(
    (l) => l.revenuePriority === 'CRITICAL'
  ).length;

  const distribution = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  for (const l of activeLeads) {
    const p = (l.revenuePriority || 'LOW').toUpperCase();
    if (distribution[p] !== undefined) {
      distribution[p]++;
    } else {
      distribution.LOW++;
    }
  }

  return {
    totalOpportunityValue,
    wonRevenue,
    pipelineValue,
    highRevenueOpportunities,
    criticalRevenueOpportunities,
    revenuePriorityDistribution: distribution,
  };
}

module.exports = {
  resolveOpportunityValue,
  calculateRevenuePriority,
  computeAndApplyRevenuePriority,
  calculateRevenueAnalytics,
};
