const http = require('http');

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
  console.log('=== MODULE 8 VERIFICATION TEST SUITE ===\n');
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
    // -------------------------------------------------------------
    // Step 0: Login as Salesperson
    // -------------------------------------------------------------
    console.log('Test 0: Salesperson Login');
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

    // -------------------------------------------------------------
    // Test 1: Verify Orphan / Seed leads (LEAD-1001 to LEAD-1004) are excluded
    // -------------------------------------------------------------
    console.log('\nTest 1: Exclusion of Orphan / Seed Leads');
    const leadsRes = await request({
      ...BASE_OPT,
      path: '/api/salesperson/leads',
      method: 'GET',
      headers: { Authorization: `Bearer ${spToken}` },
    });
    assert(leadsRes.status === 200, 'Salesperson leads endpoint returned 200');
    const leadsList = leadsRes.body.leads || [];

    const hasSeedLeads = leadsList.some((l) =>
      ['LEAD-1001', 'LEAD-1002', 'LEAD-1003', 'LEAD-1004'].includes(l.id) ||
      ['Jane Cooper', 'Marcus Vance', 'Michael Scott', 'Eleanor Vance'].includes(l.name)
    );
    assert(!hasSeedLeads, 'Seed/fake leads (Jane Cooper, Marcus Vance, etc.) are strictly excluded');

    const hasDemoCustomer = leadsList.some((l) => l.email === 'customer@demo.com');
    assert(!hasDemoCustomer, 'Initial demo customer (customer@demo.com) is isolated from salesperson leads');

    // -------------------------------------------------------------
    // Test 2: Unauthenticated Visitor Does NOT Create a Lead
    // -------------------------------------------------------------
    console.log('\nTest 2: Unauthenticated Visitor Does NOT Create Lead');
    const unauthEvent = await request(
      {
        ...BASE_OPT,
        path: '/api/customer/events',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { eventType: 'PRODUCT_VIEW', metadata: { productName: 'CRM Pro' } }
    );
    assert(unauthEvent.status === 401, 'Unauthenticated visitor event rejected with 401 Unauthorized');

    // -------------------------------------------------------------
    // Test 3: New Customer Registration -> Priority LOW
    // -------------------------------------------------------------
    console.log('\nTest 3: Customer Registration -> Priority LOW');
    const timestamp = Date.now();
    const custEmail = `priority.test.${timestamp}@enterprise.org`;
    const regRes = await request(
      {
        ...BASE_OPT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'Sarah Connor',
        email: custEmail,
        phone: '+1 555-0199',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'customer',
      }
    );
    assert(regRes.status === 201 && regRes.body.token, 'Customer registered successfully');
    const custToken = regRes.body.token;

    // Check salesperson leads for newly registered lead
    const leadsAfterReg = await request({
      ...BASE_OPT,
      path: '/api/salesperson/leads',
      method: 'GET',
      headers: { Authorization: `Bearer ${spToken}` },
    });
    const newLead = leadsAfterReg.body.leads.find((l) => l.email === custEmail);
    assert(Boolean(newLead), 'Newly registered customer automatically appears in salesperson leads');
    assert(newLead && newLead.priority === 'LOW', `Initial lead priority is LOW (got ${newLead?.priority})`);
    assert(newLead && newLead.score === 0, `Initial score is 0 (got ${newLead?.score})`);
    assert(newLead && newLead.intent === 'Low', `Initial intent is Low (got ${newLead?.intent})`);
    assert(newLead && newLead.stage === 'New', `Initial stage is New (got ${newLead?.stage})`);

    // -------------------------------------------------------------
    // Test 4: Product Browsing & Search -> Priority MEDIUM
    // -------------------------------------------------------------
    console.log('\nTest 4: Product Browsing -> Priority MEDIUM');
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
        metadata: { productId: 'prod-phone-1', productName: 'Samsung Galaxy S25 Ultra' },
      }
    );

    const leadsAfterView = await request({
      ...BASE_OPT,
      path: '/api/salesperson/leads',
      method: 'GET',
      headers: { Authorization: `Bearer ${spToken}` },
    });
    const leadAfterView = leadsAfterView.body.leads.find((l) => l.email === custEmail);
    assert(
      leadAfterView && leadAfterView.priority === 'MEDIUM',
      `Lead priority advanced to MEDIUM after product browsing (got ${leadAfterView?.priority})`
    );
    assert(
      leadAfterView && leadAfterView.stage === 'Engaged',
      `Lead stage advanced to Engaged (got ${leadAfterView?.stage})`
    );

    // -------------------------------------------------------------
    // Test 5: Pricing Page Visit -> Priority HIGH
    // -------------------------------------------------------------
    console.log('\nTest 5: Pricing Page Visit -> Priority HIGH');
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
        eventType: 'PRICING_PAGE_VIEW',
        metadata: { plan: 'Enterprise Annual' },
      }
    );

    const leadsAfterPricing = await request({
      ...BASE_OPT,
      path: '/api/salesperson/leads',
      method: 'GET',
      headers: { Authorization: `Bearer ${spToken}` },
    });
    const leadAfterPricing = leadsAfterPricing.body.leads.find((l) => l.email === custEmail);
    assert(
      leadAfterPricing && leadAfterPricing.priority === 'HIGH',
      `Lead priority advanced to HIGH after pricing visit (got ${leadAfterPricing?.priority})`
    );

    // -------------------------------------------------------------
    // Test 6: Free Demo Requested -> Priority URGENT / HIGH
    // -------------------------------------------------------------
    console.log('\nTest 6: Free Demo Request -> Priority URGENT / HIGH');
    const demoRes = await request(
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
        productId: 'prod-phone-1',
        productName: 'Samsung Galaxy S25 Ultra',
        fullName: 'Sarah Connor',
        email: custEmail,
        phone: '+1 555-0199',
        preferredDate: '2026-10-15',
        preferredTime: '10:00 AM - 11:00 AM',
        message: 'Looking for a 100-seat deployment demo',
      }
    );
    assert(demoRes.status === 201, 'Free demo requested successfully');

    const leadsAfterDemo = await request({
      ...BASE_OPT,
      path: '/api/salesperson/leads',
      method: 'GET',
      headers: { Authorization: `Bearer ${spToken}` },
    });
    const leadAfterDemo = leadsAfterDemo.body.leads.find((l) => l.email === custEmail);
    assert(
      leadAfterDemo && (leadAfterDemo.priority === 'URGENT' || leadAfterDemo.priority === 'HIGH'),
      `Lead priority after demo is URGENT/HIGH (got ${leadAfterDemo?.priority})`
    );
    assert(
      leadAfterDemo && leadAfterDemo.stage === 'Demo',
      `Lead stage advanced to Demo (got ${leadAfterDemo?.stage})`
    );

    // -------------------------------------------------------------
    // Test 7: Checkout Started -> Priority URGENT
    // -------------------------------------------------------------
    console.log('\nTest 7: Checkout Started -> Priority URGENT');
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
        productId: 'prod-phone-1',
        itemsCount: 1,
      }
    );

    const leadsAfterCheckout = await request({
      ...BASE_OPT,
      path: '/api/salesperson/leads',
      method: 'GET',
      headers: { Authorization: `Bearer ${spToken}` },
    });
    const leadAfterCheckout = leadsAfterCheckout.body.leads.find((l) => l.email === custEmail);
    assert(
      leadAfterCheckout && leadAfterCheckout.priority === 'URGENT',
      `Lead priority advanced to URGENT on checkout started (got ${leadAfterCheckout?.priority})`
    );
    assert(
      leadAfterCheckout && leadAfterCheckout.stage === 'Negotiation',
      `Lead stage moved to Negotiation (got ${leadAfterCheckout?.stage})`
    );

    // -------------------------------------------------------------
    // Test 8: Purchase Completed -> Priority NONE (Deal Won)
    // -------------------------------------------------------------
    console.log('\nTest 8: Purchase Completed -> Priority NONE (Deal Won)');
    const orderRes = await request(
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
        productId: 'prod-phone-1',
        quantity: 1,
        fullName: 'Sarah Connor',
        deliveryAddress: 'Tech Park Tower 4, Whitefield',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560066',
        paymentMethod: 'Cash on Delivery',
      }
    );
    assert(orderRes.status === 201, 'Customer completed purchase');

    const leadsAfterWon = await request({
      ...BASE_OPT,
      path: '/api/salesperson/leads',
      method: 'GET',
      headers: { Authorization: `Bearer ${spToken}` },
    });
    const leadAfterWon = leadsAfterWon.body.leads.find((l) => l.email === custEmail);
    assert(
      leadAfterWon && leadAfterWon.priority === 'NONE',
      `Lead priority set to NONE after purchase completed (got ${leadAfterWon?.priority})`
    );
    assert(
      leadAfterWon && leadAfterWon.stage === 'Won',
      `Lead stage moved to Won (got ${leadAfterWon?.stage})`
    );

    // -------------------------------------------------------------
    // Test 9: Lead Details API returns Priority & Last Activity
    // -------------------------------------------------------------
    console.log('\nTest 9: Lead Details API verification');
    const leadDetailsRes = await request({
      ...BASE_OPT,
      path: `/api/salesperson/leads/${leadAfterWon.id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${spToken}` },
    });
    assert(leadDetailsRes.status === 200, 'Lead details returned 200');
    assert(
      leadDetailsRes.body.lead && leadDetailsRes.body.lead.priority === 'NONE',
      'Lead details contains accurate priority NONE for Won deal'
    );
    assert(
      Boolean(leadDetailsRes.body.lead.priorityReason),
      `Lead details contains priorityReason: "${leadDetailsRes.body.lead.priorityReason}"`
    );
    assert(
      Boolean(leadDetailsRes.body.lead.lastActivity),
      `Lead details contains lastActivity timestamp: ${leadDetailsRes.body.lead.lastActivity}`
    );

    console.log(`\n========================================`);
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
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
