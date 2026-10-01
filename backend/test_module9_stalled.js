const http = require('http');
const stallDetection = require('./src/services/stallDetection');
const stallConfig = require('./src/config/stallConfig');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

const BASE_OPT = {
  hostname: 'localhost',
  port: 5000,
};

async function runTests() {
  console.log('=== MODULE 9: STALLED OPPORTUNITY DETECTION VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // =============================================================
    // SECTION A: DIRECT SERVICE UNIT TESTS FOR DETERMINISTIC LOGIC
    // =============================================================
    console.log('--- SECTION A: Direct Service & Threshold Rules ---');

    // Rule 1: Thresholds Configuration
    assert(stallConfig.thresholdsDays.QUALIFIED === 7, 'Config: QUALIFIED threshold is 7 days');
    assert(stallConfig.thresholdsDays.DEMO === 5, 'Config: DEMO threshold is 5 days');
    assert(stallConfig.thresholdsDays.NEGOTIATION === 3, 'Config: NEGOTIATION threshold is 3 days');
    assert(stallConfig.activeStages.includes('Qualified'), 'Config: activeStages includes Qualified');
    assert(stallConfig.activeStages.includes('Demo'), 'Config: activeStages includes Demo');
    assert(stallConfig.activeStages.includes('Negotiation'), 'Config: activeStages includes Negotiation');
    assert(!stallConfig.activeStages.includes('New'), 'Config: New is NOT an active stallable stage');
    assert(!stallConfig.activeStages.includes('Engaged'), 'Config: Engaged is NOT an active stallable stage');
    assert(!stallConfig.activeStages.includes('Won'), 'Config: Won is NOT an active stallable stage');

    // Rule 2: Meaningful vs Ignored Events
    assert(stallDetection.isMeaningfulEvent({ eventType: 'PRODUCT_VIEW' }), 'Meaningful event: PRODUCT_VIEW');
    assert(stallDetection.isMeaningfulEvent({ eventType: 'DEMO_REQUESTED' }), 'Meaningful event: DEMO_REQUESTED');
    assert(stallDetection.isMeaningfulEvent({ eventType: 'CHECKOUT_STARTED' }), 'Meaningful event: CHECKOUT_STARTED');
    assert(stallDetection.isMeaningfulEvent({ eventType: 'CONTACT_FORM_SUBMITTED' }), 'Meaningful event: CONTACT_FORM_SUBMITTED');
    assert(!stallDetection.isMeaningfulEvent({ eventType: 'DASHBOARD_VISIT' }), 'Ignored event: DASHBOARD_VISIT is not meaningful');
    assert(!stallDetection.isMeaningfulEvent({ eventType: 'PAGE_REFRESH' }), 'Ignored event: PAGE_REFRESH is not meaningful');

    const baseNow = new Date('2026-10-01T12:00:00Z');

    // Unit Test 1: New Stage lead with 30 days of inactivity is NEVER stalled
    const mockNewLead = {
      id: 'mock-1',
      stage: 'New',
      createdAt: '2026-09-01T12:00:00Z',
      stageLastUpdatedAt: '2026-09-01T12:00:00Z',
    };
    const resNew = stallDetection.calculateStallStatus(mockNewLead, [], baseNow);
    assert(resNew.isStalled === false, 'Unit Test 1: New stage is NEVER stalled even after 30 days');
    assert(resNew.daysStalled === 0, 'Unit Test 1: New stage daysStalled is 0');

    // Unit Test 2: Engaged Stage lead with 30 days of inactivity is NEVER stalled
    const mockEngagedLead = {
      id: 'mock-2',
      stage: 'Engaged',
      createdAt: '2026-09-01T12:00:00Z',
      stageLastUpdatedAt: '2026-09-01T12:00:00Z',
    };
    const resEngaged = stallDetection.calculateStallStatus(mockEngagedLead, [], baseNow);
    assert(resEngaged.isStalled === false, 'Unit Test 2: Engaged stage is NEVER stalled even after 30 days');

    // Unit Test 3: Qualified Stage at 6 days (not stalled) vs 7 days (stalled)
    const mockQualifiedLead = {
      id: 'mock-3',
      stage: 'Qualified',
      createdAt: '2026-09-24T12:00:00Z',
      stageLastUpdatedAt: '2026-09-24T12:00:00Z',
    };
    // At day 6 (2026-09-30T12:00:00Z)
    const resQualDay6 = stallDetection.calculateStallStatus(
      mockQualifiedLead,
      [],
      new Date('2026-09-30T12:00:00Z')
    );
    assert(resQualDay6.isStalled === false, 'Unit Test 3a: Qualified at 6 days inactivity is NOT stalled');

    // At day 7 (2026-10-01T12:00:00Z)
    const resQualDay7 = stallDetection.calculateStallStatus(
      mockQualifiedLead,
      [],
      new Date('2026-10-01T12:00:00Z')
    );
    assert(resQualDay7.isStalled === true, 'Unit Test 3b: Qualified at 7 days inactivity is STALLED');
    assert(resQualDay7.daysStalled === 7, 'Unit Test 3b: daysStalled is 7');
    assert(resQualDay7.stalledReason.includes('7 days'), 'Unit Test 3b: stalledReason cites 7 days');

    // Unit Test 4: Demo Stage at 4 days (not stalled) vs 5 days (stalled)
    const mockDemoLead = {
      id: 'mock-4',
      stage: 'Demo',
      createdAt: '2026-09-26T12:00:00Z',
      stageLastUpdatedAt: '2026-09-26T12:00:00Z',
    };
    const resDemoDay4 = stallDetection.calculateStallStatus(
      mockDemoLead,
      [],
      new Date('2026-09-30T12:00:00Z')
    );
    assert(resDemoDay4.isStalled === false, 'Unit Test 4a: Demo at 4 days inactivity is NOT stalled');

    const resDemoDay5 = stallDetection.calculateStallStatus(
      mockDemoLead,
      [],
      new Date('2026-10-01T12:00:00Z')
    );
    assert(resDemoDay5.isStalled === true, 'Unit Test 4b: Demo at 5 days inactivity is STALLED');
    assert(resDemoDay5.daysStalled === 5, 'Unit Test 4b: Demo daysStalled is 5');

    // Unit Test 5: Negotiation Stage at 2 days (not stalled) vs 3 days (stalled)
    const mockNegLead = {
      id: 'mock-5',
      stage: 'Negotiation',
      createdAt: '2026-09-28T12:00:00Z',
      stageLastUpdatedAt: '2026-09-28T12:00:00Z',
    };
    const resNegDay2 = stallDetection.calculateStallStatus(
      mockNegLead,
      [],
      new Date('2026-09-30T12:00:00Z')
    );
    assert(resNegDay2.isStalled === false, 'Unit Test 5a: Negotiation at 2 days inactivity is NOT stalled');

    const resNegDay3 = stallDetection.calculateStallStatus(
      mockNegLead,
      [],
      new Date('2026-10-01T12:00:00Z')
    );
    assert(resNegDay3.isStalled === true, 'Unit Test 5b: Negotiation at 3 days inactivity is STALLED');
    assert(resNegDay3.daysStalled === 3, 'Unit Test 5b: Negotiation daysStalled is 3');

    // Unit Test 6: Won Stage is NEVER stalled
    const mockWonLead = {
      id: 'mock-6',
      stage: 'Won',
      createdAt: '2026-09-01T12:00:00Z',
      stageLastUpdatedAt: '2026-09-05T12:00:00Z',
    };
    const resWon = stallDetection.calculateStallStatus(mockWonLead, [], baseNow);
    assert(resWon.isStalled === false, 'Unit Test 6: Won stage is NEVER stalled');

    // Unit Test 7: Meaningful activity resets stall timer, passive activity does NOT
    const staleLead = {
      id: 'mock-7',
      stage: 'Qualified',
      createdAt: '2026-09-20T12:00:00Z',
      stageLastUpdatedAt: '2026-09-20T12:00:00Z',
    };
    // With passive event at day 8
    const passiveEvents = [
      {
        eventType: 'DASHBOARD_VISIT',
        timestamp: '2026-09-28T12:00:00Z',
      },
    ];
    const resPassive = stallDetection.calculateStallStatus(staleLead, passiveEvents, baseNow);
    assert(resPassive.isStalled === true, 'Unit Test 7a: Passive DASHBOARD_VISIT does NOT reset stall timer');

    // With meaningful event at day 9 (2 days before baseNow)
    const meaningfulEvents = [
      {
        eventType: 'PRODUCT_VIEW',
        timestamp: '2026-09-29T12:00:00Z',
      },
    ];
    const resActive = stallDetection.calculateStallStatus(staleLead, meaningfulEvents, baseNow);
    assert(resActive.isStalled === false, 'Unit Test 7b: Meaningful PRODUCT_VIEW resets stall timer (now active)');
    assert(resActive.daysStalled === 0, 'Unit Test 7b: daysStalled is reset to 0');

    // Unit Test 8: Pipeline stage never moves backward when stalled
    const stageBefore = mockQualifiedLead.stage;
    stallDetection.calculateStallStatus(mockQualifiedLead, [], new Date('2026-10-01T12:00:00Z'));
    assert(mockQualifiedLead.stage === stageBefore, 'Unit Test 8: Lead stage is unchanged by stall evaluation (never moves backward)');

    // =============================================================
    // SECTION B: END-TO-END HTTP API AND PROGRESSION FLOW
    // =============================================================
    console.log('\n--- SECTION B: End-to-End API Integration & Salesperson Views ---');

    // 1. Salesperson Login
    const spLogin = await request(
      {
        ...BASE_OPT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'sales@demo.com', password: 'sales123', role: 'salesperson' }
    );
    assert(spLogin.status === 200 && spLogin.body.token, 'Salesperson logged in successfully');
    const spToken = spLogin.body.token;

    // 2. Register New Customer
    const testEmail = `stall.test.${Date.now()}@crmtest.org`;
    const regRes = await request(
      {
        ...BASE_OPT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'Maya Lin',
        email: testEmail,
        phone: '+1 555-8822',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'customer',
      }
    );
    assert(regRes.status === 201 && regRes.body.token, 'Customer Maya Lin registered');
    const custToken = regRes.body.token;

    // Check newly registered lead: stage 'New', isStalled: false
    const leadsAfterReg = await request({
      ...BASE_OPT,
      path: '/api/salesperson/leads',
      method: 'GET',
      headers: { Authorization: `Bearer ${spToken}` },
    });
    const mayaLead = leadsAfterReg.body.leads.find((l) => l.email === testEmail);
    assert(Boolean(mayaLead), 'Customer appears in salesperson leads');
    assert(mayaLead && mayaLead.stage === 'New', 'Maya is in New stage');
    assert(mayaLead && mayaLead.isStalled === false, 'New stage lead is NOT stalled');
    assert(mayaLead && mayaLead.daysStalled === 0, 'New stage lead daysStalled is 0');
    assert(mayaLead && typeof mayaLead.isStalled === 'boolean', 'Lead response has isStalled boolean');
    assert(mayaLead && 'daysStalled' in mayaLead, 'Lead response has daysStalled field');

    // 3. Move Maya to Engaged stage via product view
    await request(
      {
        ...BASE_OPT,
        path: '/api/customer/events',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${custToken}`,
        },
      },
      {
        eventType: 'PRODUCT_VIEW',
        metadata: { productId: 'prod-laptop-1', productName: 'MacBook Pro M3 Max' },
      }
    );

    const leadsAfterEngage = await request({
      ...BASE_OPT,
      path: '/api/salesperson/leads',
      method: 'GET',
      headers: { Authorization: `Bearer ${spToken}` },
    });
    const mayaEngaged = leadsAfterEngage.body.leads.find((l) => l.email === testEmail);
    assert(mayaEngaged && mayaEngaged.stage === 'Engaged', 'Maya progressed to Engaged stage');
    assert(mayaEngaged && mayaEngaged.isStalled === false, 'Engaged stage lead is NOT stalled');

    // 4. Move Maya to Demo stage via Free Demo Request
    const demoReq = await request(
      {
        ...BASE_OPT,
        path: '/api/customer/requests/demo',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${custToken}`,
        },
      },
      {
        productId: 'prod-laptop-1',
        productName: 'MacBook Pro M3 Max',
        fullName: 'Maya Lin',
        email: testEmail,
        phone: '+1 555-8822',
        preferredDate: '2026-10-20',
        preferredTime: '02:00 PM - 03:00 PM',
        message: 'Need enterprise demo for engineering team',
      }
    );
    assert(demoReq.status === 201, 'Demo requested successfully');

    const leadsAfterDemo = await request({
      ...BASE_OPT,
      path: '/api/salesperson/leads',
      method: 'GET',
      headers: { Authorization: `Bearer ${spToken}` },
    });
    const mayaDemo = leadsAfterDemo.body.leads.find((l) => l.email === testEmail);
    assert(mayaDemo && mayaDemo.stage === 'Demo', 'Maya progressed to Demo stage');
    assert(mayaDemo && mayaDemo.isStalled === false, 'Recent Demo lead is NOT stalled');

    // 5. Move Maya to Negotiation stage via Checkout Start
    await request(
      {
        ...BASE_OPT,
        path: '/api/customer/checkout/start',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${custToken}`,
        },
      },
      {
        productId: 'prod-laptop-1',
        itemsCount: 1,
      }
    );

    const leadsAfterCheckout = await request({
      ...BASE_OPT,
      path: '/api/salesperson/leads',
      method: 'GET',
      headers: { Authorization: `Bearer ${spToken}` },
    });
    const mayaNeg = leadsAfterCheckout.body.leads.find((l) => l.email === testEmail);
    assert(mayaNeg && mayaNeg.stage === 'Negotiation', 'Maya progressed to Negotiation stage');
    assert(mayaNeg && mayaNeg.isStalled === false, 'Recent Negotiation lead is NOT stalled');

    // 6. Complete purchase -> Maya moves to Won stage
    await request(
      {
        ...BASE_OPT,
        path: '/api/customer/orders',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${custToken}`,
        },
      },
      {
        productId: 'prod-laptop-1',
        quantity: 1,
        fullName: 'Maya Lin',
        deliveryAddress: '100 Innovation Way',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500081',
        paymentMethod: 'Credit Card',
      }
    );

    const leadsAfterWon = await request({
      ...BASE_OPT,
      path: '/api/salesperson/leads',
      method: 'GET',
      headers: { Authorization: `Bearer ${spToken}` },
    });
    const mayaWon = leadsAfterWon.body.leads.find((l) => l.email === testEmail);
    assert(mayaWon && mayaWon.stage === 'Won', 'Maya reached Won stage');
    assert(mayaWon && mayaWon.isStalled === false, 'Won opportunity is NEVER stalled');

    // 7. Verify Lead Details API returns complete stall schema
    const leadDetailRes = await request({
      ...BASE_OPT,
      path: `/api/salesperson/leads/${mayaWon.id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${spToken}` },
    });
    assert(leadDetailRes.status === 200, 'Lead details API returned 200 OK');
    const leadDetail = leadDetailRes.body.lead;
    assert('isStalled' in leadDetail, 'Lead detail schema contains isStalled');
    assert('stalledSince' in leadDetail, 'Lead detail schema contains stalledSince');
    assert('stalledReason' in leadDetail, 'Lead detail schema contains stalledReason');
    assert('daysStalled' in leadDetail, 'Lead detail schema contains daysStalled');
    assert('lastMeaningfulActivityAt' in leadDetail, 'Lead detail schema contains lastMeaningfulActivityAt');

    console.log(`\n========================================`);
    console.log(`MODULE 9 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
