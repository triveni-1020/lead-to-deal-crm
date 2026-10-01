const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const leads = require('../data/leads');
const users = require('../data/users');
const events = require('../data/events');
const scoreHistory = require('../data/scoreHistory');
const intelligence = require('../services/intelligence');
const pipeline = require('../services/pipeline');
const stageHistory = require('../data/stageHistory');
const priorityService = require('../services/priority');
const stallDetectionService = require('../services/stallDetection');
const nextBestActionService = require('../services/nextBestAction');
const revenuePriorityService = require('../services/revenuePriority');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SOURCES = ['Website', 'Website/Registration', 'Campaign', 'Referral', 'Event', 'Partner', 'Cold Outreach'];

// Helper to enrich lead with real-time intelligence (Intent & Momentum), Priority, and Stall Status
function enrichLead(lead) {
  if (!lead) return lead;
  const leadEvents = events.getByLeadId(lead.id);

  // 1. Sync product data and resolve realistic opportunity value
  intelligence.syncLeadProductData(lead, leadEvents);
  const oppValue = intelligence.resolveOpportunityValue(lead, leadEvents);
  lead.opportunityValue = oppValue;
  lead.expectedDealValue = oppValue;
  if (!lead.productPrice) lead.productPrice = oppValue;

  // 2. Compute ONE unified buying intent using BOTH engagement score AND opportunity value
  const intel = intelligence.computeIntelligence(lead.score || 0, leadEvents, { opportunityValue: oppValue, lead });
  lead.intent = intel.intent;
  lead.intentReason = intel.intentReason;
  lead.intentSignal = intel.intentSignal;
  lead.momentum = intel.momentum;
  lead.momentumReason = intel.momentumReason;

  // Real-time deterministic priority calculation (Module 8)
  const priorityResult = priorityService.calculatePriority(lead, leadEvents);
  lead.priority = priorityResult.priority;
  lead.priorityReason = priorityResult.reason;
  lead.priorityUpdatedAt = lead.priorityUpdatedAt || new Date().toISOString();

  // Real-time deterministic stalled opportunity detection (Module 9)
  const stallResult = stallDetectionService.calculateStallStatus(lead, leadEvents);
  lead.isStalled = stallResult.isStalled;
  lead.stalledSince = stallResult.stalledSince;
  lead.stalledReason = stallResult.stalledReason;
  lead.daysStalled = stallResult.daysStalled;
  lead.lastMeaningfulActivityAt = stallResult.lastMeaningfulActivityAt;

  // Real-time deterministic Next Best Action recommendation (Module 10)
  const nbaResult = nextBestActionService.calculateNextBestAction(lead, leadEvents);
  lead.nextBestAction = nbaResult.nextBestAction;
  lead.actionReason = nbaResult.actionReason;
  lead.triggerEvent = nbaResult.triggerEvent;
  lead.recommendationCreatedAt = nbaResult.createdAt;
  lead.recommendation = nbaResult;

  // Real-time deterministic Revenue Prioritization (Module 11) - consumes existing intent
  const revPriorityResult = revenuePriorityService.calculateRevenuePriority(lead, leadEvents);
  lead.revenuePriority = revPriorityResult.revenuePriority;
  lead.revenuePriorityReason = revPriorityResult.revenuePriorityReason;
  lead.revenuePriorityUpdatedAt = revPriorityResult.revenuePriorityUpdatedAt;
  lead.opportunityValue = revPriorityResult.opportunityValue;
  lead.expectedDealValue = revPriorityResult.opportunityValue;

  // Activity signals
  const latest = leadEvents.length > 0 ? leadEvents[0] : null;
  lead.lastActivity = latest ? (latest.timestamp || latest.createdAt) : lead.createdAt;
  lead.lastActivityType = latest ? latest.eventType : 'Registration';

  return lead;
}

// Protect all salesperson endpoints
router.use(requireAuth, requireRole('salesperson'));

// Ping endpoint
router.get('/ping', (req, res) => res.json({ area: 'salesperson', ok: true }));

// GET /api/salesperson/activities - Get recent customer activities across valid leads
router.get('/activities', (req, res) => {
  try {
    const validLeads = leads.getAll();
    const validLeadIds = new Set(validLeads.map((l) => String(l.id).toLowerCase()));
    const validLeadMap = new Map(validLeads.map((l) => [String(l.id).toLowerCase(), l]));

    const allEvents = events.getAll();
    const filtered = allEvents
      .filter((e) => e.leadId && validLeadIds.has(String(e.leadId).toLowerCase()))
      .map((e) => {
        const lead = validLeadMap.get(String(e.leadId).toLowerCase());
        return {
          id: e.id,
          leadId: lead?.id || e.leadId,
          customerId: e.customerId,
          eventType: e.eventType,
          description: e.description,
          customerName: lead?.name || e.createdBy?.name || 'Customer',
          customerEmail: lead?.email || e.createdBy?.email || '',
          productName: e.metadata?.productName || lead?.product || 'General Inquiry',
          company: lead?.company || 'Personal Account',
          stage: lead?.stage || 'New',
          score: lead?.score ?? 0,
          timestamp: e.timestamp || e.createdAt,
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const limit = parseInt(req.query.limit, 10) || 50;
    return res.json({ activities: filtered.slice(0, limit) });
  } catch (err) {
    console.error('Error fetching activities:', err);
    return res.status(500).json({ message: 'Server error retrieving activities' });
  }
});

// GET /api/salesperson/leads - Get leads for the logged-in salesperson
router.get('/leads', (req, res) => {
  try {
    const salespersonId = req.auth.id;
    const all = req.query.all === 'true';
    const list = all ? leads.getAll() : leads.getBySalesperson(salespersonId);
    const enrichedList = list.map(enrichLead);
    return res.json({ leads: enrichedList });
  } catch (err) {
    console.error('Error fetching leads:', err);
    return res.status(500).json({ message: 'Server error retrieving leads' });
  }
});

// GET /api/salesperson/leads/:id - Get a single lead by ID
router.get('/leads/:id', (req, res) => {
  try {
    const lead = leads.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    const enriched = enrichLead(lead);
    return res.json({ lead: enriched });
  } catch (err) {
    console.error('Error fetching lead details:', err);
    return res.status(500).json({ message: 'Server error retrieving lead details' });
  }
});

// POST /api/salesperson/leads - Create a new lead
router.post('/leads', (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      industry,
      companySize,
      location,
      leadSource,
      product,
      expectedDealValue,
    } = req.body || {};

    // 1. Full Name validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Full Name is required' });
    }

    // 2. Email validation
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // 3. Phone validation
    if (!phone || !phone.trim()) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // 4. Company validation
    if (!company || !company.trim()) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    // 5. Industry validation
    if (!industry || !industry.trim()) {
      return res.status(400).json({ message: 'Industry is required' });
    }

    // 6. Company Size validation
    if (!companySize || !companySize.trim()) {
      return res.status(400).json({ message: 'Company Size is required' });
    }

    // 7. Location validation
    if (!location || !location.trim()) {
      return res.status(400).json({ message: 'Location is required' });
    }

    // 8. Lead Source validation
    if (!leadSource || !VALID_SOURCES.includes(leadSource.trim())) {
      return res.status(400).json({
        message: `Lead Source must be one of: ${VALID_SOURCES.join(', ')}`,
      });
    }

    // 9. Product/Service validation
    if (!product || !product.trim()) {
      return res.status(400).json({ message: 'Interested Product/Service is required' });
    }

    // 10. Expected Deal Value validation
    const dealValueNumber = Number(expectedDealValue);
    if (expectedDealValue === undefined || expectedDealValue === null || isNaN(dealValueNumber) || dealValueNumber < 0) {
      return res.status(400).json({ message: 'Expected Deal Value must be a valid positive number' });
    }

    // Get current salesperson info
    const salesperson = users.findById ? users.findById(req.auth.id) : users.find((u) => u.id === req.auth.id);

    const newLead = leads.addLead({
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      company: company.trim(),
      industry: industry.trim(),
      companySize: companySize.trim(),
      location: location.trim(),
      leadSource: leadSource.trim(),
      product: product.trim(),
      expectedDealValue: dealValueNumber,
      salespersonId: req.auth.id,
      salespersonName: salesperson ? salesperson.name : 'Salesperson',
      salespersonEmail: salesperson ? salesperson.email : '',
    });

    return res.status(201).json({
      message: 'Lead created successfully',
      lead: newLead,
    });
  } catch (err) {
    console.error('Error creating lead:', err);
    return res.status(500).json({ message: 'Server error while creating lead' });
  }
});

// GET /api/salesperson/leads/:id/events - Get activity timeline events for a lead
router.get('/leads/:id/events', (req, res) => {
  try {
    const lead = leads.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const leadEvents = events.getByLeadId(lead.id);
    const latest = leadEvents.length > 0 ? leadEvents[0] : null;

    const summary = {
      totalActivities: leadEvents.length,
      lastActivity: latest ? latest.timestamp : null,
      lastActivityType: latest ? latest.eventType : null,
    };

    return res.json({ events: leadEvents, summary });
  } catch (err) {
    console.error('Error fetching lead events:', err);
    return res.status(500).json({ message: 'Server error retrieving lead events' });
  }
});

// GET /api/salesperson/leads/:id/events/latest - Get latest activity event for a lead
router.get('/leads/:id/events/latest', (req, res) => {
  try {
    const lead = leads.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const latest = events.getLatestByLeadId(lead.id);
    return res.json({ latestEvent: latest });
  } catch (err) {
    console.error('Error fetching latest lead event:', err);
    return res.status(500).json({ message: 'Server error retrieving latest lead event' });
  }
});

// GET /api/salesperson/leads/:id/score-history - Get score history for a lead
router.get('/leads/:id/score-history', (req, res) => {
  try {
    const lead = leads.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const history = scoreHistory.getByLeadId(lead.id);
    return res.json({ history, currentScore: lead.score || 0 });
  } catch (err) {
    console.error('Error fetching score history:', err);
    return res.status(500).json({ message: 'Server error retrieving score history' });
  }
});

// GET /api/salesperson/leads/:id/stage-history - Get pipeline stage history for a lead
router.get('/leads/:id/stage-history', (req, res) => {
  try {
    const lead = leads.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const history = stageHistory.getByLeadId(lead.id);
    return res.json({ history, currentStage: lead.stage || 'New' });
  } catch (err) {
    console.error('Error fetching stage history:', err);
    return res.status(500).json({ message: 'Server error retrieving stage history' });
  }
});

// POST /api/salesperson/leads/:id/events - Create an event and dynamically update lead score
router.post('/leads/:id/events', (req, res) => {
  try {
    const lead = leads.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Cannot create event: Lead not found' });
    }

    const { eventType, description, timestamp } = req.body || {};

    if (!eventType || !events.VALID_EVENT_TYPES.includes(eventType.trim())) {
      return res.status(400).json({
        message: `Invalid event type. Must be one of: ${events.VALID_EVENT_TYPES.join(', ')}`,
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Event description is required' });
    }

    let parsedTimestamp = new Date().toISOString();
    if (timestamp) {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ message: 'Invalid timestamp format' });
      }
      parsedTimestamp = d.toISOString();
    }

    // Duplicate check (prevent rapid double-click submissions within 600ms)
    const recentEvents = events.getByLeadId(lead.id);
    const isDuplicate = recentEvents.some(
      (e) =>
        e.eventType === eventType.trim() &&
        e.description === description.trim() &&
        Math.abs(new Date(e.createdAt).getTime() - Date.now()) < 600
    );
    if (isDuplicate) {
      return res.status(409).json({ message: 'Duplicate event submission detected' });
    }

    const salesperson = users.findById ? users.findById(req.auth.id) : users.find((u) => u.id === req.auth.id);

    // 1. Create and store event
    const newEvent = events.addEvent({
      leadId: lead.id,
      eventType: eventType.trim(),
      description: description.trim(),
      timestamp: parsedTimestamp,
      createdBy: {
        id: req.auth.id,
        name: salesperson ? salesperson.name : 'Salesperson',
        email: salesperson ? salesperson.email : '',
      },
    });

    // 2. Identify scoring value & calculate new score (bounded [0, 100])
    const points = scoreHistory.getScoreForEvent(newEvent.eventType);
    const previousScore = Number(lead.score) || 0;
    const newScore = Math.max(0, Math.min(100, previousScore + points));

    // 3. Get all lead events including newly added event
    const allLeadEvents = events.getByLeadId(lead.id);

    // 4. Sync product and resolve opportunity value
    intelligence.syncLeadProductData(lead, allLeadEvents);
    const oppValue = intelligence.resolveOpportunityValue(lead, allLeadEvents);
    lead.opportunityValue = oppValue;
    lead.expectedDealValue = oppValue;
    if (!lead.productPrice) lead.productPrice = oppValue;

    // 5. Calculate ONE unified Intent, Momentum, and deterministic Reasons
    const intel = intelligence.computeIntelligence(newScore, allLeadEvents, { opportunityValue: oppValue, lead });

    // 6. Update lead score and intelligence in persistent storage
    const updatedLead = leads.updateIntelligence(lead.id, {
      score: newScore,
      intent: intel.intent,
      intentReason: intel.intentReason,
      intentSignal: intel.intentSignal,
      opportunityValue: oppValue,
      productId: lead.productId,
      productName: lead.productName,
      product: lead.product,
      productPrice: lead.productPrice,
      momentum: intel.momentum,
      momentumReason: intel.momentumReason,
    });

    // 7. Create score history record in persistent storage
    const scoreRecord = scoreHistory.addRecord({
      leadId: lead.id,
      eventId: newEvent.id,
      eventType: newEvent.eventType,
      points,
      previousScore,
      newScore,
      timestamp: newEvent.timestamp,
    });

    // 8. Evaluate and execute automatic pipeline stage transition (Module 7)
    const stageTransition = pipeline.evaluateAndTransition(updatedLead, newEvent, allLeadEvents, newScore);

    // 9. Evaluate and update automatic lead priority (Module 8)
    const priorityResult = priorityService.computeAndApplyPriority(updatedLead, allLeadEvents, newEvent);

    // 10. Evaluate and update stalled opportunity status (Module 9)
    const stallResult = stallDetectionService.computeAndApplyStallStatus(updatedLead, allLeadEvents);

    // 11. Evaluate and update Next Best Action (Module 10)
    const nbaResult = nextBestActionService.computeAndApplyNextBestAction(updatedLead, allLeadEvents);

    // 12. Evaluate and update Revenue Prioritization (Module 11) - consumes existing intent
    const revResult = revenuePriorityService.computeAndApplyRevenuePriority(updatedLead, allLeadEvents);

    return res.status(201).json({
      message: 'Event recorded and lead intelligence updated successfully',
      event: newEvent,
      lead: updatedLead,
      scoreRecord,
      stageRecord: stageTransition.historyRecord || null,
      stageChanged: stageTransition.stageChanged || false,
      priority: priorityResult.priority,
      priorityReason: priorityResult.priorityReason,
      isStalled: stallResult.isStalled,
      stalledReason: stallResult.stalledReason,
      daysStalled: stallResult.daysStalled,
      lastMeaningfulActivityAt: stallResult.lastMeaningfulActivityAt,
      nextBestAction: nbaResult.nextBestAction,
      actionReason: nbaResult.actionReason,
      triggerEvent: nbaResult.triggerEvent,
      revenuePriority: revResult.revenuePriority,
      revenuePriorityReason: revResult.revenuePriorityReason,
      revenuePriorityUpdatedAt: revResult.revenuePriorityUpdatedAt,
      opportunityValue: revResult.opportunityValue,
    });
  } catch (err) {
    console.error('Error creating event and scoring:', err);
    return res.status(500).json({ message: 'Server error creating event' });
  }
});

// GET /api/salesperson/revenue-analytics - Aggregate revenue priority and pipeline metrics
router.get('/revenue-analytics', (req, res) => {
  try {
    const list = leads.getAll();
    const enrichedList = list.map(enrichLead);
    const analytics = revenuePriorityService.calculateRevenueAnalytics(enrichedList);
    return res.json({ analytics });
  } catch (err) {
    console.error('Error fetching revenue analytics:', err);
    return res.status(500).json({ message: 'Server error retrieving revenue analytics' });
  }
});

// POST /api/salesperson/leads/:id/decay - Trigger score decay (inactivity) and recalculate unified intelligence
router.post('/leads/:id/decay', (req, res) => {
  try {
    const lead = leads.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    const points = Number(req.body?.points) || 10;
    const reason = req.body?.reason || 'Inactivity score decay';
    const updatedLead = intelligence.applyScoreDecay(lead.id, points, reason);
    return res.json({
      message: `Score decayed by ${points} points successfully`,
      lead: updatedLead ? enrichLead(updatedLead) : null,
    });
  } catch (err) {
    console.error('Error applying score decay:', err);
    return res.status(500).json({ message: 'Server error applying score decay' });
  }
});

module.exports = router;
