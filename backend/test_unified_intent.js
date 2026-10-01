/**
 * test_unified_intent.js
 * Verification test suite for ONE Unified Buying Intent Engine
 * Combines Customer Engagement Score + Product/Opportunity Revenue Value
 */

const assert = require('assert');
const intelligence = require('./src/services/intelligence');
const revenuePriorityService = require('./src/services/revenuePriority');
const priorityService = require('./src/services/priority');
const stallDetectionService = require('./src/services/stallDetection');
const nextBestActionService = require('./src/services/nextBestAction');
const leadsData = require('./src/data/leads');
const eventsData = require('./src/data/events');

console.log('====================================================');
console.log('STARTING UNIFIED BUYING INTENT ENGINE VERIFICATION');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err.message}\n`, err.stack);
  }
}

// --------------------------------------------------------------------------
// TEST 1: Score 0 + ₹2,00,000 Product (Commercial value alone NEVER determines high/very high intent)
// --------------------------------------------------------------------------
runTest('Test 1: Score 0 + ₹2,00,000 product cannot yield Very High Intent (needs behavioral evidence)', () => {
  const score = 0;
  const oppValue = 200000;
  const signal = intelligence.calculateCombinedIntentSignal(score, oppValue);
  const intent = intelligence.calculateIntent(score, oppValue);
  const intel = intelligence.computeIntelligence(score, [], { opportunityValue: oppValue });

  // 0 * 0.70 + 100 * 0.30 = 30 -> Medium
  assert.strictEqual(signal, 30, `Expected signal 30, got ${signal}`);
  assert.strictEqual(intent, 'Medium', `Expected Medium intent, got ${intent}`);
  assert.notStrictEqual(intent, 'Very High', 'Score 0 must NEVER be Very High intent');
  assert.notStrictEqual(intent, 'High', 'Score 0 with ₹2,00,000 should not be High intent without engagement');
  assert(intel.intentReason.includes('limited customer engagement') || intel.intentReason.includes('High opportunity value'), 
    `Reason must mention limited engagement: "${intel.intentReason}"`);
  console.log(`   Signal: ${signal}/100, Intent: ${intent}, Reason: "${intel.intentReason}"`);
});

// --------------------------------------------------------------------------
// TEST 2: Score 90 + ₹20,000 Product (Strong behavioral engagement, moderate opportunity value)
// --------------------------------------------------------------------------
runTest('Test 2: Score 90 + ₹20,000 product yields High Intent with explainable reason', () => {
  const score = 90;
  const oppValue = 20000;
  const signal = intelligence.calculateCombinedIntentSignal(score, oppValue);
  const intent = intelligence.calculateIntent(score, oppValue);
  const intel = intelligence.computeIntelligence(score, [], { opportunityValue: oppValue });

  // 90 * 0.70 = 63, (20000/200000)*100 = 10, 10 * 0.30 = 3 -> 63 + 3 = 66 -> High
  assert.strictEqual(signal, 66, `Expected signal 66, got ${signal}`);
  assert.strictEqual(intent, 'High', `Expected High intent, got ${intent}`);
  assert(intel.intentReason.includes('Strong customer engagement') || intel.intentReason.includes('score 90'),
    `Reason should reflect strong engagement: "${intel.intentReason}"`);
  console.log(`   Signal: ${signal}/100, Intent: ${intent}, Reason: "${intel.intentReason}"`);
});

// --------------------------------------------------------------------------
// TEST 3: Score 90 + ₹2,00,000 Product (High score + High opportunity value -> Very High Intent)
// --------------------------------------------------------------------------
runTest('Test 3: Score 90 + ₹2,00,000 product yields Very High Intent', () => {
  const score = 90;
  const oppValue = 200000;
  const signal = intelligence.calculateCombinedIntentSignal(score, oppValue);
  const intent = intelligence.calculateIntent(score, oppValue);
  const intel = intelligence.computeIntelligence(score, [], { opportunityValue: oppValue });

  // 90 * 0.70 = 63, 100 * 0.30 = 30 -> 63 + 30 = 93 -> Very High
  assert.strictEqual(signal, 93, `Expected signal 93, got ${signal}`);
  assert.strictEqual(intent, 'Very High', `Expected Very High intent, got ${intent}`);
  assert(intel.intentReason.includes('High engagement score (90)') || intel.intentReason.includes('high-value opportunity'),
    `Reason should reflect high engagement + high value: "${intel.intentReason}"`);
  console.log(`   Signal: ${signal}/100, Intent: ${intent}, Reason: "${intel.intentReason}"`);
});

// --------------------------------------------------------------------------
// TEST 4: Inactivity Score Decay Recalculates Intent & Downstream Intelligence Dynamically
// --------------------------------------------------------------------------
runTest('Test 4: Inactivity score decay reduces score and recalculates Intent immediately', () => {
  // Create a realistic lead
  const testLead = leadsData.addLead({
    name: 'Unified Decay Test Lead',
    email: `decay_test_${Date.now()}@example.com`,
    phone: '9876543210',
    company: 'Decay Corp',
    industry: 'Technology',
    companySize: '11-50',
    location: 'Bangalore',
    leadSource: 'Website',
    product: 'Enterprise Cloud Platform',
    expectedDealValue: 120000,
    salespersonId: 2,
    salespersonName: 'Priya Sharma',
    salespersonEmail: 'priya@dealflow.com',
  });

  // Set initial score to 85 (85 * 0.70 = 59.5, (120000/200000)*100 = 60, 60 * 0.30 = 18 -> Signal = 78 -> Very High)
  leadsData.updateScore(testLead.id, 85);
  intelligence.recalculateLead(testLead);

  assert.strictEqual(testLead.score, 85, 'Initial score should be 85');
  assert.strictEqual(testLead.intent, 'Very High', `Expected Very High intent initially, got ${testLead.intent}`);
  console.log(`   Initial State: Score=${testLead.score}, OppVal=₹${testLead.opportunityValue}, Intent=${testLead.intent}, Signal=${testLead.intentSignal}`);

  // Apply score decay of 40 points (due to inactivity) -> score drops to 45
  // Signal: 45 * 0.70 = 31.5, 60 * 0.30 = 18 -> Signal = 50 -> High
  const decayedLead = intelligence.applyScoreDecay(testLead.id, 40, 'Inactivity for 7 days');
  assert.strictEqual(decayedLead.score, 45, `Expected score 45 after decay, got ${decayedLead.score}`);
  assert.strictEqual(decayedLead.intent, 'High', `Expected intent to drop to High, got ${decayedLead.intent}`);
  assert.strictEqual(decayedLead.intentSignal, 50, `Expected intent signal 50, got ${decayedLead.intentSignal}`);
  console.log(`   After 40-pt Decay: Score=${decayedLead.score}, Intent=${decayedLead.intent}, Signal=${decayedLead.intentSignal}`);

  // Apply another decay of 30 points -> score drops to 15
  // Signal: 15 * 0.70 = 10.5, 60 * 0.30 = 18 -> Signal = 29 -> Medium
  const decayedFurther = intelligence.applyScoreDecay(testLead.id, 30, 'Continued inactivity');
  assert.strictEqual(decayedFurther.score, 15, `Expected score 15, got ${decayedFurther.score}`);
  assert.strictEqual(decayedFurther.intent, 'Medium', `Expected intent to drop to Medium, got ${decayedFurther.intent}`);
  console.log(`   After 30-pt Decay: Score=${decayedFurther.score}, Intent=${decayedFurther.intent}, Signal=${decayedFurther.intentSignal}`);
});

// --------------------------------------------------------------------------
// TEST 5: Product Change Dynamically Recalculates Opportunity Value & Intent
// --------------------------------------------------------------------------
runTest('Test 5: Product change dynamically updates opportunity value and recomputes unified intent', () => {
  const lead = leadsData.addLead({
    name: 'Product Change Lead',
    email: `prod_change_${Date.now()}@example.com`,
    phone: '9123456789',
    company: 'Upgrades Ltd',
    industry: 'Retail',
    companySize: '51-200',
    location: 'Mumbai',
    leadSource: 'Website',
    product: 'Starter Kit',
    expectedDealValue: 15000,
    salespersonId: 2,
    salespersonName: 'Priya Sharma',
  });

  // Score 70 with ₹15,000 product
  // 70 * 0.70 = 49, (15000/200000)*100 = 7.5, 7.5 * 0.30 = 2.25 -> Signal = 51 -> High
  leadsData.updateScore(lead.id, 70);
  intelligence.recalculateLead(lead);

  assert.strictEqual(lead.opportunityValue, 15000);
  assert.strictEqual(lead.intent, 'High');
  assert.strictEqual(lead.intentSignal, 51);
  console.log(`   Initial Product: Value=₹${lead.opportunityValue}, Score=${lead.score}, Intent=${lead.intent} (Signal ${lead.intentSignal})`);

  // Customer upgrades interest to Enterprise Suite (₹1,09,999)
  // New oppValue = 109999
  // normRev = (109999/200000)*100 = 55, 55 * 0.30 = 16.5
  // Score 70 * 0.70 = 49 -> Signal = 49 + 17 = 66 -> High
  lead.product = 'Enterprise Suite';
  lead.opportunityValue = 109999;
  lead.expectedDealValue = 109999;
  intelligence.recalculateLead(lead);

  assert.strictEqual(lead.opportunityValue, 109999);
  assert.strictEqual(lead.intent, 'High');
  assert.strictEqual(lead.intentSignal, 65);
  console.log(`   Updated Product: Value=₹${lead.opportunityValue}, Score=${lead.score}, Intent=${lead.intent} (Signal ${lead.intentSignal})`);

  // Score increases to 85 with Enterprise Suite
  // 85 * 0.70 = 59.5, 55 * 0.30 = 16.5 -> Signal = 76 -> Very High
  leadsData.updateScore(lead.id, 85);
  intelligence.recalculateLead(lead);

  assert.strictEqual(lead.intent, 'Very High');
  assert.strictEqual(lead.intentSignal, 76);
  console.log(`   Score increase with Enterprise Suite: Score=${lead.score}, Intent=${lead.intent} (Signal ${lead.intentSignal})`);
});

// --------------------------------------------------------------------------
// TEST 6: Complete Pipeline Flow & Downstream Integrity (Revenue Priority consumes existing Intent)
// --------------------------------------------------------------------------
runTest('Test 6: Full intelligence cascade integrity (Revenue Priority consumes existing Intent without recalculating)', () => {
  const lead = {
    id: 'LEAD-VERIFY-CASCADE',
    name: 'Pipeline Cascade Lead',
    email: 'cascade@example.com',
    company: 'Enterprise Corp',
    product: 'Enterprise Suite',
    opportunityValue: 109999,
    expectedDealValue: 109999,
    score: 85,
    stage: 'Negotiation',
    isStalled: false,
    createdAt: new Date().toISOString(),
  };

  const sampleEvents = [
    {
      id: 'EVT-1',
      leadId: lead.id,
      eventType: 'Meeting',
      timestamp: new Date().toISOString(),
      description: 'Negotiation meeting completed',
    },
    {
      id: 'EVT-2',
      leadId: lead.id,
      eventType: 'Email Replied',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      description: 'Proposal reviewed',
    },
  ];

  // 1. Unified Intent calculation
  const intel = intelligence.computeIntelligence(lead.score, sampleEvents, { opportunityValue: lead.opportunityValue, lead });
  lead.intent = intel.intent;
  lead.intentReason = intel.intentReason;
  lead.intentSignal = intel.intentSignal;
  lead.momentum = intel.momentum;
  lead.momentumReason = intel.momentumReason;

  assert.strictEqual(lead.intent, 'Very High');
  assert.strictEqual(lead.momentum, 'Rising');

  // 2. Priority calculation (Module 8)
  const priorityResult = priorityService.calculatePriority(lead, sampleEvents);
  lead.priority = priorityResult.priority;
  assert(['HIGH', 'URGENT'].includes(lead.priority), `Expected HIGH or URGENT priority, got ${lead.priority}`);

  // 3. Stalled detection (Module 9)
  const stallResult = stallDetectionService.calculateStallStatus(lead, sampleEvents);
  lead.isStalled = stallResult.isStalled;
  assert.strictEqual(lead.isStalled, false);

  // 4. Next Best Action (Module 10)
  const nbaResult = nextBestActionService.calculateNextBestAction(lead, sampleEvents);
  lead.nextBestAction = nbaResult.nextBestAction;
  assert(Boolean(lead.nextBestAction), 'Next Best Action must be generated');

  // 5. Revenue Prioritization (Module 11) - MUST consume existing intent (Very High)
  const revResult = revenuePriorityService.calculateRevenuePriority(lead, sampleEvents);
  assert.strictEqual(revResult.revenuePriority, 'CRITICAL', `Expected CRITICAL revenue priority, got ${revResult.revenuePriority}`);
  assert.strictEqual(lead.intent, 'Very High', 'Lead intent must remain unchanged as computed by unified intent engine');

  console.log(`   Cascade Results:`);
  console.log(`   - Score: ${lead.score}`);
  console.log(`   - Opportunity Value: ₹${lead.opportunityValue}`);
  console.log(`   - Intent: ${lead.intent} (Signal: ${lead.intentSignal})`);
  console.log(`   - Momentum: ${lead.momentum}`);
  console.log(`   - Stage: ${lead.stage}`);
  console.log(`   - Priority: ${lead.priority}`);
  console.log(`   - Stalled: ${lead.isStalled}`);
  console.log(`   - Next Best Action: ${lead.nextBestAction}`);
  console.log(`   - Revenue Priority: ${revResult.revenuePriority}`);
});

console.log('\n====================================================');
console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
