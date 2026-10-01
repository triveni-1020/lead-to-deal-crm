const fs = require('fs');
const path = require('path');
const usersData = require('./users');

const LEADS_FILE = path.join(__dirname, 'leads.json');

function loadLeads() {
  try {
    if (fs.existsSync(LEADS_FILE)) {
      const data = fs.readFileSync(LEADS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading leads.json:', err.message);
  }
  return [];
}

function saveLeads(list) {
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving leads.json:', err.message);
  }
}

// In-memory array initialized from disk
let leads = loadLeads();

function isValidCustomerLead(lead) {
  if (!lead) return false;

  // 1. If lead is linked to a customer or from customer registration:
  if (lead.customerId || lead.leadSource === 'Website/Registration') {
    if (!lead.customerId) return false; // Missing customerId is an orphan record
    const customer = usersData.findById ? usersData.findById(lead.customerId) : usersData.find((u) => u.id === lead.customerId);
    if (!customer || customer.role !== 'customer') return false; // Non-existent customer user
    if (customer.email === 'customer@demo.com') return false; // Isolate initial demo account from real customer leads
    return true;
  }

  // 2. If lead was manually created by a salesperson (Module 3 manual lead capture):
  if (lead.salespersonId && lead.leadSource !== 'Website/Registration') {
    // Isolate hardcoded sample names seeded in early development
    if (['LEAD-1001', 'LEAD-1002', 'LEAD-1003', 'LEAD-1004'].includes(lead.id)) {
      return false;
    }
    const sp = usersData.findById ? usersData.findById(lead.salespersonId) : usersData.find((u) => u.id === lead.salespersonId);
    return Boolean(sp);
  }

  return false;
}

function getAll(filterValidOnly = true) {
  if (filterValidOnly) {
    return leads.filter(isValidCustomerLead);
  }
  return [...leads];
}

function getBySalesperson(salespersonId) {
  // Returns valid registered customer leads and legitimate salesperson leads
  return leads.filter((l) => {
    if (!isValidCustomerLead(l)) return false;
    return (
      Number(l.salespersonId) === Number(salespersonId) ||
      !l.salespersonId ||
      l.customerId ||
      l.leadSource === 'Website/Registration'
    );
  });
}

function findById(id) {
  return leads.find((l) => String(l.id).toLowerCase() === String(id).toLowerCase()) || null;
}

function findByEmail(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return leads.find((l) => l.email && l.email.trim().toLowerCase() === normalized) || null;
}

function findByCustomerId(customerId) {
  if (!customerId) return null;
  return leads.find((l) => String(l.customerId) === String(customerId) || String(l.userId) === String(customerId)) || null;
}

function generateLeadId() {
  const maxNumber = leads.reduce((max, l) => {
    const match = String(l.id).match(/^LEAD-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      return Math.max(max, num);
    }
    return max;
  }, 1000);
  return `LEAD-${maxNumber + 1}`;
}

function createCustomerLead(customerData = {}) {
  const cleanEmail = customerData.email ? customerData.email.trim().toLowerCase() : '';

  // Duplicate check: if a lead with this email or customer ID already exists, reuse it
  const existing = (cleanEmail && findByEmail(cleanEmail)) ||
                   (customerData.id && findByCustomerId(customerData.id));

  if (existing) {
    if (customerData.id && !existing.customerId) {
      existing.customerId = customerData.id;
      existing.userId = customerData.id;
    }
    if (customerData.name && !existing.name) existing.name = customerData.name.trim();
    if (customerData.phone && !existing.phone) existing.phone = customerData.phone.trim();
    if (customerData.company && (!existing.company || existing.company === 'Not Specified')) {
      existing.company = customerData.company.trim();
    }
    if (customerData.industry && (!existing.industry || existing.industry === 'General')) {
      existing.industry = customerData.industry.trim();
    }
    if (customerData.companySize && (!existing.companySize || existing.companySize === '1-10')) {
      existing.companySize = customerData.companySize.trim();
    }
    if (customerData.location && (!existing.location || existing.location === 'Remote')) {
      existing.location = customerData.location.trim();
    }
    saveLeads(leads);
    return existing;
  }

  const newLead = {
    id: generateLeadId(),
    name: (customerData.name || '').trim(),
    email: cleanEmail,
    phone: (customerData.phone || '').trim(),
    company: (customerData.company || 'Not Specified').trim(),
    industry: (customerData.industry || 'General').trim(),
    companySize: (customerData.companySize || '1-10').trim(),
    location: (customerData.location || 'Remote').trim(),
    leadSource: 'Website/Registration',
    product: customerData.product ? customerData.product.trim() : 'General Inquiry',
    expectedDealValue: Number(customerData.expectedDealValue) || 0,
    score: 0,
    intent: 'Low',
    intentReason: 'Intent is low because there is limited recent engagement.',
    momentum: 'Stable',
    momentumReason: 'Engagement is stable because the lead has had consistent activity without a significant recent increase or decrease.',
    stage: 'New',
    status: 'Active',
    priority: 'LOW',
    priorityReason: 'Newly registered lead with low engagement and limited recent activity.',
    priorityUpdatedAt: new Date().toISOString(),
    isStalled: false,
    stalledSince: null,
    stalledReason: null,
    daysStalled: 0,
    lastMeaningfulActivityAt: new Date().toISOString(),
    nextBestAction: 'Introduce Relevant Products',
    actionReason: 'New customer has not shown strong product engagement yet.',
    triggerEvent: 'LEAD_REGISTERED',
    recommendationCreatedAt: new Date().toISOString(),
    revenuePriority: 'LOW',
    revenuePriorityReason: 'New lead with limited engagement and low commercial intent.',
    revenuePriorityUpdatedAt: new Date().toISOString(),
    opportunityValue: Number(customerData.expectedDealValue) || 0,
    customerId: customerData.id,
    userId: customerData.id,
    createdAt: new Date().toISOString(),
  };

  leads.unshift(newLead);
  saveLeads(leads);
  return newLead;
}

function addLead(data) {
  const newLead = {
    id: generateLeadId(),
    name: data.name,
    email: data.email,
    phone: data.phone,
    company: data.company,
    industry: data.industry,
    companySize: data.companySize,
    location: data.location,
    leadSource: data.leadSource,
    product: data.product,
    expectedDealValue: Number(data.expectedDealValue) || 0,
    score: 0,
    intent: 'Low',
    intentReason: 'Intent is low because there is limited recent engagement.',
    momentum: 'Stable',
    momentumReason: 'Engagement is stable because the lead has had consistent activity without a significant recent increase or decrease.',
    stage: 'New',
    status: 'Active',
    priority: 'LOW',
    priorityReason: 'Newly registered lead with low engagement and limited recent activity.',
    priorityUpdatedAt: new Date().toISOString(),
    isStalled: false,
    stalledSince: null,
    stalledReason: null,
    daysStalled: 0,
    lastMeaningfulActivityAt: new Date().toISOString(),
    nextBestAction: 'Introduce Relevant Products',
    actionReason: 'New customer has not shown strong product engagement yet.',
    triggerEvent: 'LEAD_REGISTERED',
    recommendationCreatedAt: new Date().toISOString(),
    revenuePriority: 'LOW',
    revenuePriorityReason: 'New lead with limited engagement and low commercial intent.',
    revenuePriorityUpdatedAt: new Date().toISOString(),
    opportunityValue: Number(data.expectedDealValue) || 0,
    createdAt: new Date().toISOString(),
    salespersonId: data.salespersonId,
    salespersonName: data.salespersonName,
    salespersonEmail: data.salespersonEmail,
  };

  leads.unshift(newLead); // Add to beginning of list
  saveLeads(leads);
  return newLead;
}

function updateScore(id, newScore) {
  const lead = findById(id);
  if (!lead) return null;
  const boundedScore = Math.max(0, Math.min(100, Number(newScore) || 0));
  lead.score = boundedScore;
  saveLeads(leads);
  return lead;
}

function updateIntelligence(id, intelData = {}) {
  const lead = findById(id);
  if (!lead) return null;

  if (intelData.score !== undefined) {
    lead.score = Math.max(0, Math.min(100, Number(intelData.score) || 0));
  }
  if (intelData.intent) {
    lead.intent = intelData.intent;
  }
  if (intelData.intentReason) {
    lead.intentReason = intelData.intentReason;
  }
  if (intelData.intentSignal !== undefined) {
    lead.intentSignal = intelData.intentSignal;
  }
  if (intelData.opportunityValue !== undefined) {
    lead.opportunityValue = Number(intelData.opportunityValue) || 0;
    lead.expectedDealValue = Number(intelData.opportunityValue) || 0;
  }
  if (intelData.productId !== undefined) {
    lead.productId = intelData.productId;
  }
  if (intelData.productName !== undefined) {
    lead.productName = intelData.productName;
    lead.product = intelData.productName;
  }
  if (intelData.productPrice !== undefined) {
    lead.productPrice = Number(intelData.productPrice) || 0;
  }
  if (intelData.product !== undefined && !lead.product) {
    lead.product = intelData.product;
  }
  if (intelData.momentum) {
    if (lead.momentum && lead.momentum !== intelData.momentum) {
      lead.previousMomentum = lead.momentum;
      lead.momentumChangedAt = new Date().toISOString();
    }
    lead.momentum = intelData.momentum;
  }
  if (intelData.momentumReason) {
    lead.momentumReason = intelData.momentumReason;
  }
  lead.lastCalculatedAt = new Date().toISOString();

  saveLeads(leads);
  return lead;
}

function updateStage(id, newStage, reason, timestamp = new Date().toISOString()) {
  const lead = findById(id);
  if (!lead) return null;
  const oldStage = lead.stage || 'New';
  lead.stage = newStage;
  lead.stageLastUpdatedAt = timestamp;
  if (!Array.isArray(lead.stageHistory)) {
    lead.stageHistory = [];
  }
  const historyEntry = {
    id: `STG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    leadId: lead.id,
    oldStage,
    newStage,
    reason: reason || 'Stage updated',
    timestamp,
  };
  lead.stageHistory.push(historyEntry);
  saveLeads(leads);
  return { lead, historyEntry };
}

function updatePriority(id, priority, priorityReason, priorityUpdatedAt = new Date().toISOString()) {
  const lead = findById(id);
  if (!lead) return null;
  lead.priority = priority;
  lead.priorityReason = priorityReason;
  lead.priorityUpdatedAt = priorityUpdatedAt;
  saveLeads(leads);
  return lead;
}

function updateStallStatus(id, stallData = {}) {
  const lead = findById(id);
  if (!lead) return null;
  if (stallData.isStalled !== undefined) lead.isStalled = stallData.isStalled;
  if (stallData.stalledSince !== undefined) lead.stalledSince = stallData.stalledSince;
  if (stallData.stalledReason !== undefined) lead.stalledReason = stallData.stalledReason;
  if (stallData.daysStalled !== undefined) lead.daysStalled = stallData.daysStalled;
  if (stallData.lastMeaningfulActivityAt !== undefined) lead.lastMeaningfulActivityAt = stallData.lastMeaningfulActivityAt;
  saveLeads(leads);
  return lead;
}

function updateNextBestAction(id, recommendation = {}) {
  const lead = findById(id);
  if (!lead) return null;
  lead.nextBestAction = recommendation.nextBestAction !== undefined ? recommendation.nextBestAction : lead.nextBestAction;
  lead.actionReason = recommendation.actionReason !== undefined ? recommendation.actionReason : lead.actionReason;
  lead.triggerEvent = recommendation.triggerEvent !== undefined ? recommendation.triggerEvent : lead.triggerEvent;
  lead.recommendationCreatedAt = recommendation.createdAt || new Date().toISOString();
  lead.recommendation = {
    nextBestAction: lead.nextBestAction,
    actionReason: lead.actionReason,
    triggerEvent: lead.triggerEvent,
    createdAt: lead.recommendationCreatedAt,
  };
  saveLeads(leads);
  return lead;
}

function updateRevenuePriority(id, revData = {}) {
  const lead = findById(id);
  if (!lead) return null;
  if (revData.revenuePriority !== undefined) lead.revenuePriority = revData.revenuePriority;
  if (revData.revenuePriorityReason !== undefined) lead.revenuePriorityReason = revData.revenuePriorityReason;
  if (revData.revenuePriorityUpdatedAt !== undefined) lead.revenuePriorityUpdatedAt = revData.revenuePriorityUpdatedAt;
  if (revData.opportunityValue !== undefined) {
    lead.opportunityValue = revData.opportunityValue;
    lead.expectedDealValue = revData.opportunityValue;
  }
  saveLeads(leads);
  return lead;
}

module.exports = {
  getAll,
  getBySalesperson,
  isValidCustomerLead,
  findById,
  findByEmail,
  findByCustomerId,
  createCustomerLead,
  addLead,
  updateScore,
  updateIntelligence,
  updateStage,
  updatePriority,
  updateStallStatus,
  updateNextBestAction,
  updateRevenuePriority,
};
