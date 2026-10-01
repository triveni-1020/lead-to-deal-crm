/**
 * Module 9: Stalled Opportunity Detection Service
 * Deterministic rules based on active pipeline stages, meaningful engagement events,
 * and configurable inactivity thresholds.
 */

const STALL_CONFIG = require('../config/stallConfig');
const leadsData = require('../data/leads');

/**
 * Checks whether an event is considered meaningful for sales pipeline progress.
 * @param {Object} event - The event object
 * @returns {Boolean}
 */
function isMeaningfulEvent(event) {
  if (!event || !event.eventType) return false;
  const type = event.eventType.trim();
  return STALL_CONFIG.meaningfulEvents.includes(type);
}

/**
 * Gets the most recent meaningful event for a lead.
 * @param {Array} allEvents - Chronological list of events for the lead
 * @returns {Object|null}
 */
function getLastMeaningfulEvent(allEvents = []) {
  if (!Array.isArray(allEvents) || allEvents.length === 0) return null;
  // Events are typically sorted newest first; find the first meaningful event
  for (const evt of allEvents) {
    if (isMeaningfulEvent(evt)) {
      return evt;
    }
  }
  return null;
}

/**
 * Calculates whether an opportunity has stalled based on stage and inactivity.
 * @param {Object} lead - The lead record
 * @param {Array} allEvents - Chronological list of events
 * @param {Date|String} asOfDate - Optional evaluation reference time (defaults to now)
 * @returns {Object} Stall calculation result
 */
function calculateStallStatus(lead, allEvents = [], asOfDate = new Date()) {
  if (!lead) {
    return {
      isStalled: false,
      stalledSince: null,
      stalledReason: null,
      daysStalled: 0,
      lastMeaningfulActivityAt: null,
      daysInactive: 0,
      thresholdDays: null,
    };
  }

  const currentStage = (lead.stage || 'New').trim();
  const isEligibleStage = STALL_CONFIG.activeStages.some(
    (stg) => stg.toLowerCase() === currentStage.toLowerCase()
  );

  // 1. RULE: Only QUALIFIED, DEMO, and NEGOTIATION can become stalled.
  // 'New', 'Engaged', and 'Won' are NEVER marked as stalled.
  const latestMeaningful = getLastMeaningfulEvent(allEvents);
  const meaningfulTimestamp = latestMeaningful
    ? (latestMeaningful.timestamp || latestMeaningful.createdAt)
    : null;

  if (!isEligibleStage || currentStage.toLowerCase() === 'won' || currentStage.toLowerCase() === 'new' || currentStage.toLowerCase() === 'engaged') {
    return {
      isStalled: false,
      stalledSince: null,
      stalledReason: null,
      daysStalled: 0,
      lastMeaningfulActivityAt: meaningfulTimestamp || lead.createdAt,
      daysInactive: 0,
      thresholdDays: null,
    };
  }

  // 2. Find when the lead entered its current active stage (stage progress)
  let stageEnteredAt = lead.stageLastUpdatedAt || null;
  if (Array.isArray(lead.stageHistory) && lead.stageHistory.length > 0) {
    // Stage history might have multiple transitions; find the latest transition into this currentStage
    const stageRecords = lead.stageHistory.filter(
      (h) => h.newStage && h.newStage.toLowerCase() === currentStage.toLowerCase()
    );
    if (stageRecords.length > 0) {
      const latestRecord = stageRecords[stageRecords.length - 1];
      stageEnteredAt = latestRecord.timestamp || stageEnteredAt;
    }
  }

  // If no explicit stage transition record is found, fall back to lead.createdAt
  stageEnteredAt = stageEnteredAt || lead.createdAt || new Date().toISOString();

  // 3. Meaningful activity or stage progress reference point:
  // Use whichever is more recent: the latest meaningful customer event OR the stage progress timestamp
  let effectiveLastActivityAt = stageEnteredAt;
  if (meaningfulTimestamp) {
    if (new Date(meaningfulTimestamp).getTime() > new Date(stageEnteredAt).getTime()) {
      effectiveLastActivityAt = meaningfulTimestamp;
    }
  }

  // 4. Calculate elapsed days from reference time
  const refTime = new Date(asOfDate);
  const effectiveTime = new Date(effectiveLastActivityAt);
  const diffMs = Math.max(0, refTime.getTime() - effectiveTime.getTime());
  const daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // 5. Look up threshold for this stage
  const upperStage = currentStage.toUpperCase();
  const thresholdDays = STALL_CONFIG.thresholdsDays[upperStage] || 7;

  // 6. Check if inactivity threshold is met or exceeded
  if (daysInactive >= thresholdDays) {
    // Opportunity is STALLED
    const stallDate = new Date(effectiveTime.getTime() + thresholdDays * 24 * 60 * 60 * 1000);
    return {
      isStalled: true,
      stalledSince: stallDate.toISOString(),
      stalledReason: `No meaningful activity or stage progress for ${daysInactive} days.`,
      daysStalled: daysInactive,
      lastMeaningfulActivityAt: effectiveLastActivityAt,
      daysInactive,
      thresholdDays,
    };
  }

  // Not stalled
  return {
    isStalled: false,
    stalledSince: null,
    stalledReason: null,
    daysStalled: 0,
    lastMeaningfulActivityAt: effectiveLastActivityAt,
    daysInactive,
    thresholdDays,
  };
}

/**
 * Calculates stall status, updates the in-memory lead object, and persists change.
 * @param {Object} lead - The lead record
 * @param {Array} allEvents - Chronological list of events
 * @param {Date|String} asOfDate - Optional evaluation reference time
 * @returns {Object} Updated stall status
 */
function computeAndApplyStallStatus(lead, allEvents = [], asOfDate = new Date()) {
  if (!lead) return null;

  const result = calculateStallStatus(lead, allEvents, asOfDate);

  lead.isStalled = result.isStalled;
  lead.stalledSince = result.stalledSince;
  lead.stalledReason = result.stalledReason;
  lead.daysStalled = result.daysStalled;
  lead.lastMeaningfulActivityAt = result.lastMeaningfulActivityAt;

  if (leadsData.updateStallStatus) {
    leadsData.updateStallStatus(lead.id, result);
  }

  return result;
}

module.exports = {
  STALL_CONFIG,
  isMeaningfulEvent,
  getLastMeaningfulEvent,
  calculateStallStatus,
  computeAndApplyStallStatus,
};
