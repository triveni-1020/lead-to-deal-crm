/**
 * Module 10 — Next Best Action Engine Comprehensive Verification Test
 */
const assert = require('assert');
const http = require('http');
const { calculateNextBestAction, computeAndApplyNextBestAction } = require('./src/services/nextBestAction');
const { getLeads, getLeadById, createCustomerLead } = require('./src/data/leads');

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
  console.log('=== [MODULE 10] NEXT BEST ACTION ENGINE TESTS ===\n');

  // TEST 1: Rule - Demo Requested
  console.log('Test 1: DEMO_REQUESTED rule...');
  const rec1 = calculateNextBestAction(
    { stage: 'Demo', isStalled: false },
    [{ eventType: 'DEMO_REQUESTED', timestamp: new Date().toISOString() }]
  );
  assert.strictEqual(rec1.nextBestAction, 'Schedule Demo');
  assert.strictEqual(rec1.actionReason, 'Customer requested a demo.');
  assert.strictEqual(rec1.triggerEvent, 'DEMO_REQUESTED');
  console.log('  PASS: Demo requested -> Schedule Demo\n');

  // TEST 2: Rule - Contact Sales Submitted
  console.log('Test 2: CONTACT_FORM_SUBMITTED rule...');
  const rec2 = calculateNextBestAction(
    { stage: 'Qualified', isStalled: false },
    [{ eventType: 'CONTACT_FORM_SUBMITTED', timestamp: new Date().toISOString() }]
  );
  assert.strictEqual(rec2.nextBestAction, 'Contact Customer');
  assert.strictEqual(rec2.actionReason, 'Customer submitted a contact request.');
  assert.strictEqual(rec2.triggerEvent, 'CONTACT_FORM_SUBMITTED');
  console.log('  PASS: Contact Sales -> Contact Customer\n');

  // TEST 3: Rule - Repeated Pricing Views (>= 2)
  console.log('Test 3: Repeated pricing views rule...');
  const rec3 = calculateNextBestAction(
    { stage: 'Engaged', isStalled: false },
    [
      { eventType: 'PRICING_VIEW', timestamp: new Date(Date.now() - 5000).toISOString() },
      { eventType: 'PRICING_VIEW', timestamp: new Date().toISOString() }
    ]
  );
  assert.strictEqual(rec3.nextBestAction, 'Follow Up About Pricing');
  assert.strictEqual(rec3.actionReason, 'Customer showed repeated pricing interest.');
  assert.strictEqual(rec3.triggerEvent, 'PRICING_VIEW');
  console.log('  PASS: Repeated pricing views -> Follow Up About Pricing\n');

  // TEST 4: Rule - Checkout Started (Negotiation/Engaged)
  console.log('Test 4: CHECKOUT_STARTED rule...');
  const rec4 = calculateNextBestAction(
    { stage: 'Negotiation', isStalled: false },
    [{ eventType: 'CHECKOUT_STARTED', timestamp: new Date().toISOString() }]
  );
  assert.strictEqual(rec4.nextBestAction, 'Follow Up Immediately');
  assert.strictEqual(rec4.actionReason, 'Customer started checkout but has not completed purchase.');
  assert.strictEqual(rec4.triggerEvent, 'CHECKOUT_STARTED');
  console.log('  PASS: Checkout started -> Follow Up Immediately\n');

  // TEST 5: Rule - Stalled Opportunity
  console.log('Test 5: Stalled opportunity rule...');
  const rec5 = calculateNextBestAction(
    { stage: 'Engaged', isStalled: true, score: 30 },
    [{ eventType: 'PRODUCT_VIEW', timestamp: new Date(Date.now() - 600000).toISOString() }]
  );
  assert.strictEqual(rec5.nextBestAction, 'Re-engage Customer');
  assert.strictEqual(rec5.actionReason, 'Opportunity has been stalled without meaningful activity.');
  assert.strictEqual(rec5.triggerEvent, 'STALLED_OPPORTUNITY');
  console.log('  PASS: Stalled opportunity -> Re-engage Customer\n');

  // TEST 6: Rule - Content Downloaded
  console.log('Test 6: Content downloaded rule...');
  const rec6 = calculateNextBestAction(
    { stage: 'Engaged', isStalled: false },
    [{ eventType: 'CONTENT_DOWNLOAD', timestamp: new Date().toISOString() }]
  );
  assert.strictEqual(rec6.nextBestAction, 'Send Relevant Information');
  assert.strictEqual(rec6.actionReason, 'Customer downloaded product information.');
  assert.strictEqual(rec6.triggerEvent, 'CONTENT_DOWNLOAD');
  console.log('  PASS: Content downloaded -> Send Relevant Information\n');

  // TEST 7: Rule - Repeated Same Product Views (>= 2)
  console.log('Test 7: Repeated same product views rule...');
  const rec7 = calculateNextBestAction(
    { stage: 'Engaged', isStalled: false },
    [
      { eventType: 'PRODUCT_VIEW', metadata: { productId: 'p1', productName: 'Cloud Suite' } },
      { eventType: 'PRODUCT_VIEW', metadata: { productId: 'p1', productName: 'Cloud Suite' } }
    ]
  );
  assert.strictEqual(rec7.nextBestAction, 'Understand Customer Requirements');
  assert.strictEqual(rec7.actionReason, 'Customer repeatedly viewed the same product.');
  assert.strictEqual(rec7.triggerEvent, 'REPEATED_PRODUCT_VIEW');
  console.log('  PASS: Repeated same product view -> Understand Customer Requirements\n');

  // TEST 8: Rule - Negotiation Stage fallback
  console.log('Test 8: Negotiation stage fallback rule...');
  const rec8 = calculateNextBestAction(
    { stage: 'Negotiation', isStalled: false },
    [{ eventType: 'CART_VIEW', timestamp: new Date().toISOString() }]
  );
  assert.strictEqual(rec8.nextBestAction, 'Follow Up on Purchase');
  assert.strictEqual(rec8.actionReason, 'Opportunity is currently in negotiation.');
  assert.strictEqual(rec8.triggerEvent, 'STAGE_NEGOTIATION');
  console.log('  PASS: Negotiation stage -> Follow Up on Purchase\n');

  // TEST 9: Rule - Newly registered / low activity
  console.log('Test 9: Newly registered / little activity rule...');
  const rec9 = calculateNextBestAction(
    { stage: 'New', score: 0, isStalled: false },
    [{ eventType: 'LEAD_REGISTERED', timestamp: new Date().toISOString() }]
  );
  assert.strictEqual(rec9.nextBestAction, 'Introduce Relevant Products');
  assert.strictEqual(rec9.actionReason, 'New customer has not shown strong product engagement yet.');
  assert.strictEqual(rec9.triggerEvent, 'LEAD_REGISTERED');
  console.log('  PASS: Newly registered -> Introduce Relevant Products\n');

  // TEST 10: Rule - Won Stage Terminal
  console.log('Test 10: Won stage terminal rule...');
  const rec10 = calculateNextBestAction(
    { stage: 'Won', isStalled: false },
    [{ eventType: 'ORDER_PLACED', timestamp: new Date().toISOString() }]
  );
  assert.strictEqual(rec10.nextBestAction, null);
  assert.strictEqual(rec10.actionReason, 'Customer has completed purchase.');
  assert.strictEqual(rec10.triggerEvent, 'DEAL_WON');
  console.log('  PASS: Won stage -> null nextBestAction\n');

  // TEST 11: API endpoints verification (GET /api/salesperson/leads and GET /api/salesperson/leads/:id)
  console.log('Test 11: API endpoints verification with Salesperson auth...');
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
  assert.ok(token, 'Salesperson login should return JWT token');

  const res = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/salesperson/leads?all=true',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  assert.strictEqual(res.status, 200);
  const leadsList = res.body.leads || res.body;
  assert.ok(Array.isArray(leadsList), 'Response should contain array of leads');
  console.log(`  Retrieved ${leadsList.length} leads.`);
  for (const lead of leadsList) {
    if (lead.stage !== 'Won') {
      assert.ok(lead.nextBestAction !== undefined, `Lead ${lead.id} must have nextBestAction defined`);
      assert.ok(lead.actionReason !== undefined, `Lead ${lead.id} must have actionReason defined`);
      assert.ok(lead.triggerEvent !== undefined, `Lead ${lead.id} must have triggerEvent defined`);
    }
  }
  console.log('  PASS: All active leads in API have nextBestAction, actionReason, and triggerEvent!\n');

  // TEST 12: Customer Event Real-Time NBA Update via API
  console.log('Test 12: Dynamic NBA update via customer demo request event...');
  // Register a fresh test customer
  const email = `nba_test_${Date.now()}@example.com`;
  const regRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'NBA Tester',
    email,
    phone: '9876543210',
    password: 'Password@123',
    confirmPassword: 'Password@123',
    role: 'customer'
  });

  assert.strictEqual(regRes.status, 201);
  const custToken = regRes.body.token;
  const custId = regRes.body.user.id || regRes.body.user.customerId;
  const leadId = regRes.body.lead?.id || regRes.body.user?.leadId;

  // Verify initial NBA recommendation
  const initialLeadRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/salesperson/leads/${leadId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(initialLeadRes.status, 200);
  const initialLead = initialLeadRes.body.lead || initialLeadRes.body;
  assert.strictEqual(initialLead.nextBestAction, 'Introduce Relevant Products');
  console.log('  Initial NBA verified: Introduce Relevant Products');

  // Submit Free Demo request for customer
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
    fullName: 'NBA Tester',
    email,
    phone: '9876543210',
    productId: 'crm-prod-001',
    productName: 'Enterprise CRM Suite',
    preferredDate: '2026-10-05',
    preferredTime: '14:00',
    message: 'Need full demo'
  });
  assert.strictEqual(demoRes.status, 201);

  // Check lead again: should now be "Schedule Demo"
  const updatedLeadRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/salesperson/leads/${leadId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(updatedLeadRes.status, 200);
  const updatedLead = updatedLeadRes.body.lead || updatedLeadRes.body;
  assert.strictEqual(updatedLead.nextBestAction, 'Schedule Demo');
  assert.strictEqual(updatedLead.actionReason, 'Customer requested a demo.');
  assert.strictEqual(updatedLead.triggerEvent, 'DEMO_REQUESTED');
  console.log('  Updated NBA verified: Schedule Demo (Reason: Customer requested a demo.)\n');

  console.log('ALL MODULE 10 NEXT BEST ACTION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
