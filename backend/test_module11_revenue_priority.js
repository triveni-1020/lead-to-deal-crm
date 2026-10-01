/**
 * Module 11: Revenue Prioritization Engine Comprehensive Verification Test Suite
 */
const assert = require('assert');
const http = require('http');
const {
  resolveOpportunityValue,
  calculateRevenuePriority,
  calculateRevenueAnalytics,
} = require('./src/services/revenuePriority');

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, rawBody: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== [MODULE 11] REVENUE PRIORITIZATION ENGINE TESTS ===\n');

  // TEST 1: Example 1 from Specification (CRITICAL)
  console.log('Test 1: Example 1 — High-value active negotiation (CRITICAL)...');
  const lead1 = {
    product: 'Samsung Galaxy S25',
    expectedDealValue: 80000,
    score: 82,
    intent: 'Very High',
    momentum: 'Rising',
    stage: 'Negotiation',
    priority: 'HIGH',
    isStalled: false,
  };
  const rec1 = calculateRevenuePriority(lead1);
  assert.strictEqual(rec1.revenuePriority, 'CRITICAL', 'Should be CRITICAL');
  assert.strictEqual(rec1.opportunityValue, 80000, 'Opportunity value should be 80000');
  assert.strictEqual(
    rec1.revenuePriorityReason,
    'High-value opportunity with very high intent, rising momentum and active negotiation.'
  );
  console.log('  PASS: CRITICAL Priority & Reason match Example 1 specification!\n');

  // TEST 2: Example 2 from Specification (MEDIUM/LOW with High Value but Low Intent)
  console.log('Test 2: Example 2 — High product value with low intent / declining engagement (MEDIUM)...');
  const lead2 = {
    product: 'Premium Laptop',
    expectedDealValue: 200000,
    score: 25,
    intent: 'Low',
    momentum: 'Falling',
    stage: 'Qualified',
    priority: 'LOW',
    isStalled: true,
  };
  const rec2 = calculateRevenuePriority(lead2);
  assert.ok(
    rec2.revenuePriority === 'MEDIUM' || rec2.revenuePriority === 'LOW',
    `Expected MEDIUM or LOW, got ${rec2.revenuePriority}`
  );
  assert.strictEqual(rec2.opportunityValue, 200000);
  assert.strictEqual(
    rec2.revenuePriorityReason,
    'High product value but current buying intent is low and engagement is declining.'
  );
  console.log('  PASS: High value with low intent correctly degraded to MEDIUM/LOW!\n');

  // TEST 3: Example 3 from Specification (HIGH)
  console.log('Test 3: Example 3 — Moderate value with very high intent and demo stage (HIGH)...');
  const lead3 = {
    product: 'Enterprise Software',
    expectedDealValue: 50000,
    score: 75,
    intent: 'Very High',
    momentum: 'Rising',
    stage: 'Demo',
    priority: 'HIGH',
    isStalled: false,
  };
  const rec3 = calculateRevenuePriority(lead3);
  assert.strictEqual(rec3.revenuePriority, 'HIGH');
  assert.strictEqual(rec3.opportunityValue, 50000);
  assert.strictEqual(
    rec3.revenuePriorityReason,
    'Very high buying intent with rising engagement and an active demo opportunity.'
  );
  console.log('  PASS: HIGH Priority & Reason match Example 3 specification!\n');

  // TEST 4: Stalled High-Value Opportunity At Risk (HIGH)
  console.log('Test 4: Stalled High-Value Opportunity At Risk (HIGH)...');
  const leadStalled = {
    product: 'Custom ERP',
    expectedDealValue: 500000,
    score: 70,
    intent: 'High',
    momentum: 'Falling',
    stage: 'Negotiation',
    priority: 'HIGH',
    isStalled: true,
    daysStalled: 4,
  };
  const recStalled = calculateRevenuePriority(leadStalled);
  assert.strictEqual(recStalled.revenuePriority, 'HIGH', 'Stalled high-value deal must remain HIGH at-risk');
  assert.strictEqual(recStalled.opportunityValue, 500000);
  assert.strictEqual(
    recStalled.revenuePriorityReason,
    'High-value Negotiation opportunity with strong buying intent, but recent engagement has declined.'
  );
  console.log('  PASS: High-value opportunity at risk correctly identified as HIGH!\n');

  // TEST 5: Purchase Completed -> Stage = Won
  console.log('Test 5: Purchase Completed (Stage = Won)...');
  const leadWon = {
    product: 'Cloud Suite',
    expectedDealValue: 75000,
    score: 95,
    intent: 'Very High',
    momentum: 'Rising',
    stage: 'Won',
    priority: 'NONE',
    isStalled: false,
  };
  const recWon = calculateRevenuePriority(leadWon);
  assert.strictEqual(recWon.revenuePriority, 'NONE');
  assert.strictEqual(
    recWon.revenuePriorityReason,
    'Customer completed purchase. Opportunity won and revenue realized.'
  );
  console.log('  PASS: Won stage opportunity removed from active priority!\n');

  // TEST 6: Analytics Aggregations
  console.log('Test 6: calculateRevenueAnalytics calculation verification...');
  const sampleLeads = [
    { stage: 'Negotiation', opportunityValue: 80000, revenuePriority: 'CRITICAL' },
    { stage: 'Demo', opportunityValue: 50000, revenuePriority: 'HIGH' },
    { stage: 'Qualified', opportunityValue: 25000, revenuePriority: 'MEDIUM' },
    { stage: 'New', opportunityValue: 10000, revenuePriority: 'LOW' },
    { stage: 'Won', opportunityValue: 120000, revenuePriority: 'NONE' },
  ];
  const analytics = calculateRevenueAnalytics(sampleLeads);
  assert.strictEqual(analytics.totalOpportunityValue, 165000, 'Total active opportunity value should sum non-Won');
  assert.strictEqual(analytics.wonRevenue, 120000, 'Won revenue should sum Won leads');
  assert.strictEqual(analytics.pipelineValue, 155000, 'Pipeline value should sum Qualified, Demo, Negotiation');
  assert.strictEqual(analytics.criticalRevenueOpportunities, 1);
  assert.strictEqual(analytics.highRevenueOpportunities, 1);
  assert.strictEqual(analytics.revenuePriorityDistribution.CRITICAL, 1);
  assert.strictEqual(analytics.revenuePriorityDistribution.HIGH, 1);
  assert.strictEqual(analytics.revenuePriorityDistribution.MEDIUM, 1);
  assert.strictEqual(analytics.revenuePriorityDistribution.LOW, 1);
  console.log('  PASS: Analytics aggregations calculated accurately!\n');

  // TEST 7: End-to-End API Test with Salesperson Auth
  console.log('Test 7: Salesperson API endpoints verification...');
  const spLogin = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'sales@demo.com',
    password: 'sales123',
    role: 'salesperson'
  });
  assert.strictEqual(spLogin.status, 200);
  const token = spLogin.body.token;

  // Verify GET /api/salesperson/revenue-analytics
  const revAnalyticsRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/salesperson/revenue-analytics',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  assert.strictEqual(revAnalyticsRes.status, 200);
  const revData = revAnalyticsRes.body.analytics;
  assert.ok(revData !== undefined, 'Should return analytics object');
  assert.ok(typeof revData.totalOpportunityValue === 'number');
  assert.ok(typeof revData.wonRevenue === 'number');
  assert.ok(typeof revData.pipelineValue === 'number');
  assert.ok(revData.revenuePriorityDistribution !== undefined);
  console.log('  Revenue Analytics endpoint verified:');
  console.log(`    - Total Opportunity Value: ₹${revData.totalOpportunityValue}`);
  console.log(`    - Won Revenue: ₹${revData.wonRevenue}`);
  console.log(`    - Pipeline Value: ₹${revData.pipelineValue}`);
  console.log(`    - Critical Deals: ${revData.criticalRevenueOpportunities}`);
  console.log(`    - High Deals: ${revData.highRevenueOpportunities}`);
  console.log(`    - Distribution:`, revData.revenuePriorityDistribution);
  console.log('  PASS: GET /api/salesperson/revenue-analytics returned verified live data!\n');

  // TEST 8: Dynamic Revenue Priority Update on Customer Event Flow
  console.log('Test 8: Dynamic update on real customer registration and engagement...');
  // 1. Register customer
  const testEmail = `rev_tester_${Date.now()}@crmtest.org`;
  const regRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Rev Tester',
    email: testEmail,
    phone: '9876543210',
    password: 'Password@123',
    confirmPassword: 'Password@123',
    role: 'customer'
  });
  assert.strictEqual(regRes.status, 201);
  const custToken = regRes.body.token;
  const leadId = regRes.body.lead?.id || regRes.body.user?.leadId;
  const custId = regRes.body.user?.id;

  // Check initial lead: Priority LOW
  const initialLeadRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/salesperson/leads/${leadId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(initialLeadRes.status, 200);
  const initLead = initialLeadRes.body.lead || initialLeadRes.body;
  assert.strictEqual(initLead.revenuePriority, 'LOW');
  console.log('  Initial customer lead revenuePriority: LOW');

  // Customer requests demo for high-value product (iPhone 16 / ₹1,44,900)
  const demoRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/customer/requests/demo',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${custToken}`,
      'Content-Type': 'application/json'
    }
  }, {
    customerId: custId,
    leadId: leadId,
    fullName: 'Rev Tester',
    email: testEmail,
    phone: '9876543210',
    productId: 'prod-phone-2',
    productName: 'Apple iPhone 16 Pro Max',
    preferredDate: '2026-10-06',
    preferredTime: '11:00 AM',
    message: 'Need high-volume enterprise pricing'
  });
  assert.strictEqual(demoRes.status, 201);

  // Check updated lead: should now be elevated revenuePriority!
  const updatedLeadRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/salesperson/leads/${leadId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(updatedLeadRes.status, 200);
  const updatedLead = updatedLeadRes.body.lead || updatedLeadRes.body;
  assert.ok(
    updatedLead.revenuePriority === 'HIGH' || updatedLead.revenuePriority === 'CRITICAL' || updatedLead.revenuePriority === 'MEDIUM',
    `Expected elevated priority, got ${updatedLead.revenuePriority}`
  );
  assert.ok(updatedLead.opportunityValue > 0, `Opportunity value should be > 0, got ${updatedLead.opportunityValue}`);
  console.log(`  Elevated customer lead revenuePriority: ${updatedLead.revenuePriority} (Value: ₹${updatedLead.opportunityValue})`);
  console.log(`  Reason: "${updatedLead.revenuePriorityReason}"\n`);

  console.log('ALL MODULE 11 REVENUE PRIORITIZATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
