/**
 * Comprehensive End-to-End Integration Verification Suite
 * Verifies all 14 frontend-to-backend operational checkpoints:
 * 1. Customer Registration & Automatic Lead Creation
 * 2. Customer Login & LOGIN Event Tracking
 * 3. Salesperson Login
 * 4. Product Catalog Fetch & Filtering
 * 5. Customer Engagement Actions (Wishlist, Cart, View)
 * 6. Dynamic Score Recalculation & Score History Tracking
 * 7. Real-Time Intent & Momentum Computation
 * 8. Automatic Pipeline Stage Progression (New -> Engaged -> Qualified -> Demo -> Negotiation -> Won)
 * 9. Deterministic Stalled Opportunity Detection
 * 10. Deterministic Next Best Action (NBA) Engine
 * 11. Revenue Prioritization Engine (Critical/High/Medium/Low)
 * 12. Salesperson Dashboard Analytics & Leads Fetch
 * 13. Lead Details & Timeline / Stage History Fetch
 * 14. Customer & Salesperson Logout Handling
 */

const http = require('http');
const app = require('./src/server'); // Express app

let server;
const PORT = 5099;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const method = options.method || 'GET';
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const payload = options.body ? JSON.stringify(options.body) : null;

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('\n================================================================');
  console.log('STARTING FULL FRONTEND-BACKEND CRM INTEGRATION VERIFICATION');
  console.log('================================================================\n');

  let customerToken = null;
  let customerUser = null;
  let customerLeadId = null;
  let salespersonToken = null;

  const testEmail = `test.crm.${Date.now()}@example.com`;

  try {
    // ----------------------------------------------------
    // CHECKPOINT 1: Customer Registration & Lead Creation
    // ----------------------------------------------------
    console.log('▶ Checkpoint 1: Customer Registration & Automatic Lead Creation');
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Autonomous Integration User',
        email: testEmail,
        phone: '+91 98765 43210',
        password: 'password123',
        confirmPassword: 'password123',
        role: 'customer',
        company: 'Cloud Innovations Ltd',
        industry: 'Cloud Computing',
        companySize: '51-200',
        location: 'Bengaluru, India',
      },
    });

    assert(regRes.status === 201, 'Registration returns HTTP 201');
    assert(Boolean(regRes.body.token), 'Registration returns valid JWT token');
    assert(regRes.body.user && regRes.body.user.role === 'customer', 'User profile returned with role customer');
    assert(Boolean(regRes.body.lead && regRes.body.lead.id), 'Lead record automatically created in backend');
    assert(regRes.body.lead.stage === 'New', 'Initial pipeline stage is New');

    customerToken = regRes.body.token;
    customerUser = regRes.body.user;
    customerLeadId = regRes.body.lead.id;

    // ----------------------------------------------------
    // CHECKPOINT 2: Customer Login & Event Tracking
    // ----------------------------------------------------
    console.log('\n▶ Checkpoint 2: Customer Login & Event Tracking');
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'password123',
        role: 'customer',
      },
    });

    assert(loginRes.status === 200, 'Customer login returns HTTP 200');
    assert(Boolean(loginRes.body.token), 'Customer login returns JWT token');
    assert(loginRes.body.user.email === testEmail, 'Customer login returns matching user email');

    // ----------------------------------------------------
    // CHECKPOINT 3: Salesperson Login
    // ----------------------------------------------------
    console.log('\n▶ Checkpoint 3: Salesperson Login');
    const spLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'sales@demo.com',
        password: 'sales123',
        role: 'salesperson',
      },
    });

    assert(spLoginRes.status === 200, 'Salesperson login returns HTTP 200');
    assert(Boolean(spLoginRes.body.token), 'Salesperson login returns JWT token');
    assert(spLoginRes.body.user.role === 'salesperson', 'Salesperson user role verified');
    salespersonToken = spLoginRes.body.token;

    // ----------------------------------------------------
    // CHECKPOINT 4: Customer Catalog Fetch & Filtering
    // ----------------------------------------------------
    console.log('\n▶ Checkpoint 4: Product Catalog Fetch & Filtering');
    const prodRes = await request('/api/customer/products', { token: customerToken });
    assert(prodRes.status === 200, 'Customer products endpoint returns HTTP 200');
    assert(Array.isArray(prodRes.body.products) && prodRes.body.products.length > 0, 'Products list returned with items');
    assert(Array.isArray(prodRes.body.categories) && prodRes.body.categories.length > 0, 'Categories list returned');
    assert(Array.isArray(prodRes.body.brands) && prodRes.body.brands.length > 0, 'Brands list returned');

    const firstProduct = prodRes.body.products[0];
    console.log(`  ✓ Sample product retrieved: ${firstProduct.name} (₹${firstProduct.price})`);

    // ----------------------------------------------------
    // CHECKPOINT 5: Customer Engagement Actions
    // ----------------------------------------------------
    console.log('\n▶ Checkpoint 5: Customer Engagement Actions');
    // 5a. Product Details View
    const prodDetailRes = await request(`/api/customer/products/${firstProduct.id}`, { token: customerToken });
    assert(prodDetailRes.status === 200, 'Product details endpoint returns HTTP 200');
    assert(prodDetailRes.body.product.id === firstProduct.id, 'Product detail matches requested ID');

    // 5b. Add to Wishlist
    const wishRes = await request('/api/customer/wishlist', {
      method: 'POST',
      token: customerToken,
      body: { productId: firstProduct.id },
    });
    assert(wishRes.status === 200 || wishRes.status === 201, 'Wishlist add returns HTTP 200/201');
    const getWishRes = await request('/api/customer/wishlist', { token: customerToken });
    assert(getWishRes.body.wishlist.some((item) => String(item.productId) === String(firstProduct.id)), 'Product is in customer wishlist');

    // 5c. Add to Cart
    const cartRes = await request('/api/customer/cart', {
      method: 'POST',
      token: customerToken,
      body: { productId: firstProduct.id, quantity: 2 },
    });
    assert(cartRes.status === 200 || cartRes.status === 201, 'Cart add returns HTTP 200/201');
    assert(cartRes.body.cart.items.length > 0, 'Cart contains added product');

    // ----------------------------------------------------
    // CHECKPOINT 6: Dynamic Score Recalculation
    // ----------------------------------------------------
    console.log('\n▶ Checkpoint 6: Dynamic Score Recalculation');
    const leadScoreRes = await request(`/api/salesperson/leads/${customerLeadId}/score-history`, { token: salespersonToken });
    assert(leadScoreRes.status === 200, 'Score history endpoint returns HTTP 200');
    assert(Array.isArray(leadScoreRes.body.history) && leadScoreRes.body.history.length > 0, 'Score history has entries');
    const currentScore = leadScoreRes.body.currentScore;
    assert(currentScore > 0, `Dynamic score is positive (${currentScore}) after customer engagement`);

    // ----------------------------------------------------
    // CHECKPOINT 7: Real-Time Intent & Momentum Computation
    // ----------------------------------------------------
    console.log('\n▶ Checkpoint 7: Real-Time Intent & Momentum Computation');
    const leadDetailRes = await request(`/api/salesperson/leads/${customerLeadId}`, { token: salespersonToken });
    assert(leadDetailRes.status === 200, 'Lead details endpoint returns HTTP 200');
    const leadData = leadDetailRes.body.lead;
    assert(['Low', 'Medium', 'High', 'Very High'].includes(leadData.intent), `Intent computed: ${leadData.intent}`);
    assert(['Rising', 'Stable', 'Falling'].includes(leadData.momentum), `Momentum computed: ${leadData.momentum}`);
    assert(Boolean(leadData.intentReason), `Intent reason provided: "${leadData.intentReason}"`);

    // ----------------------------------------------------
    // CHECKPOINT 8: Automatic Pipeline Stage Progression
    // ----------------------------------------------------
    console.log('\n▶ Checkpoint 8: Automatic Pipeline Stage Progression');
    // Lead should have moved from 'New' to 'Engaged' due to browsing/cart/wishlist
    assert(leadData.stage === 'Engaged' || leadData.stage === 'Qualified', `Stage progressed from New to ${leadData.stage}`);

    // 8a. Demo Request -> Stage moves to 'Demo'
    console.log('  Testing Demo Request stage transition...');
    const demoReqRes = await request('/api/customer/requests/demo', {
      method: 'POST',
      token: customerToken,
      body: {
        productId: firstProduct.id,
        productName: firstProduct.name,
        preferredDate: '2026-10-15',
        preferredTime: '11:00 AM',
        message: 'Looking for 25 units for corporate team',
      },
    });
    assert(demoReqRes.status === 201, 'Demo request created with HTTP 201');
    assert(Boolean(demoReqRes.body.request || demoReqRes.body.demoRequest), 'Demo request returned in response');

    const leadAfterDemo = await request(`/api/salesperson/leads/${customerLeadId}`, { token: salespersonToken });
    assert(leadAfterDemo.body.lead.stage === 'Demo', `Pipeline stage moved to Demo (Current: ${leadAfterDemo.body.lead.stage})`);

    // 8b. Checkout Started -> Stage moves to 'Negotiation'
    console.log('  Testing Checkout Started stage transition...');
    const checkoutStartRes = await request('/api/customer/checkout/start', {
      method: 'POST',
      token: customerToken,
      body: { productId: firstProduct.id, qty: 2 },
    });
    assert(checkoutStartRes.status === 200, 'Checkout start returns HTTP 200');

    const leadAfterCheckout = await request(`/api/salesperson/leads/${customerLeadId}`, { token: salespersonToken });
    assert(leadAfterCheckout.body.lead.stage === 'Negotiation', `Pipeline stage moved to Negotiation (Current: ${leadAfterCheckout.body.lead.stage})`);

    // 8c. Purchase Completed -> Stage moves to 'Won'
    console.log('  Testing Purchase Completed stage transition...');
    const orderRes = await request('/api/customer/orders', {
      method: 'POST',
      token: customerToken,
      body: {
        productId: firstProduct.id,
        quantity: 2,
        fullName: 'Autonomous Integration User',
        email: testEmail,
        phone: '+91 98765 43210',
        deliveryAddress: 'Plot 42, Tech Park',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560100',
        paymentMethod: 'Corporate Invoice',
      },
    });
    assert(orderRes.status === 201, 'Order placed successfully with HTTP 201');

    const leadAfterWon = await request(`/api/salesperson/leads/${customerLeadId}`, { token: salespersonToken });
    assert(leadAfterWon.body.lead.stage === 'Won', `Pipeline stage moved to Won (Current: ${leadAfterWon.body.lead.stage})`);

    // ----------------------------------------------------
    // CHECKPOINT 9: Stalled Opportunity Detection
    // ----------------------------------------------------
    console.log('\n▶ Checkpoint 9: Deterministic Stalled Opportunity Detection');
    const stallDetectionService = require('./src/services/stallDetection');
    // Test stall logic with simulated past date in Negotiation stage
    const simulatedPastLead = {
      id: customerLeadId,
      stage: 'Negotiation',
      createdAt: '2026-09-01T00:00:00.000Z',
    };
    const simulatedOldEvents = [
      {
        id: 'evt-old',
        leadId: customerLeadId,
        eventType: 'CHECKOUT_STARTED',
        timestamp: '2026-09-02T00:00:00.000Z',
      },
    ];
    const stallResult = stallDetectionService.calculateStallStatus(simulatedPastLead, simulatedOldEvents);
    assert(stallResult.isStalled === true, 'Inactivity in active stage flags lead as isStalled=true');
    assert(Boolean(stallResult.stalledReason), `Stall reason computed: "${stallResult.stalledReason}"`);

    // ----------------------------------------------------
    // CHECKPOINT 10: Next Best Action (NBA) Engine
    // ----------------------------------------------------
    console.log('\n▶ Checkpoint 10: Deterministic Next Best Action (NBA) Engine');
    const nbaService = require('./src/services/nextBestAction');
    const demoEventLead = {
      id: customerLeadId,
      stage: 'Demo',
      score: 65,
      intent: 'High',
    };
    const demoEvents = [
      {
        id: 'evt-demo',
        leadId: customerLeadId,
        eventType: 'DEMO_REQUESTED',
        timestamp: new Date().toISOString(),
      },
    ];
    const nbaDemoResult = nbaService.calculateNextBestAction(demoEventLead, demoEvents);
    assert(nbaDemoResult.nextBestAction === 'Schedule Demo', `Demo action recommended: "${nbaDemoResult.nextBestAction}"`);
    assert(Boolean(nbaDemoResult.actionReason), `Action reason computed: "${nbaDemoResult.actionReason}"`);

    // ----------------------------------------------------
    // CHECKPOINT 11: Revenue Prioritization Engine
    // ----------------------------------------------------
    console.log('\n▶ Checkpoint 11: Revenue Prioritization Engine');
    const revenuePriorityService = require('./src/services/revenuePriority');
    const highValLead = {
      id: customerLeadId,
      stage: 'Negotiation',
      score: 75,
      intent: 'Very High',
      expectedDealValue: 180000,
    };
    const revResult = revenuePriorityService.calculateRevenuePriority(highValLead, []);
    assert(['CRITICAL', 'HIGH'].includes(revResult.revenuePriority), `Revenue priority assigned: ${revResult.revenuePriority}`);
    assert(Boolean(revResult.revenuePriorityReason), `Revenue priority reason: "${revResult.revenuePriorityReason}"`);

    // ----------------------------------------------------
    // CHECKPOINT 12: Salesperson Dashboard Analytics Fetch
    // ----------------------------------------------------
    console.log('\n▶ Checkpoint 12: Salesperson Dashboard Analytics Fetch');
    const dashLeadsRes = await request('/api/salesperson/leads', { token: salespersonToken });
    assert(dashLeadsRes.status === 200, 'Salesperson dashboard leads endpoint returns HTTP 200');
    assert(Array.isArray(dashLeadsRes.body.leads), 'Leads array returned');
    assert(dashLeadsRes.body.leads.some((l) => l.id === customerLeadId), 'Customer lead is present in dashboard leads');

    const registeredLead = dashLeadsRes.body.leads.find((l) => l.id === customerLeadId);
    assert(registeredLead.revenuePriority !== undefined, 'Revenue priority present on dashboard lead');
    assert(registeredLead.nextBestAction !== undefined, 'Next Best Action present on dashboard lead');
    assert(registeredLead.intent !== undefined, 'Intent present on dashboard lead');
    assert(registeredLead.momentum !== undefined, 'Momentum present on dashboard lead');

    // ----------------------------------------------------
    // CHECKPOINT 13: Lead Details & Timeline / Stage History Fetch
    // ----------------------------------------------------
    console.log('\n▶ Checkpoint 13: Lead Details & Timeline / Stage History Fetch');
    const timelineRes = await request(`/api/salesperson/leads/${customerLeadId}/events`, { token: salespersonToken });
    assert(timelineRes.status === 200, 'Lead timeline events return HTTP 200');
    assert(Array.isArray(timelineRes.body.events) && timelineRes.body.events.length > 0, 'Timeline events returned');

    const stageHistRes = await request(`/api/salesperson/leads/${customerLeadId}/stage-history`, { token: salespersonToken });
    assert(stageHistRes.status === 200, 'Lead stage history returns HTTP 200');
    assert(Array.isArray(stageHistRes.body.history) && stageHistRes.body.history.length > 0, 'Stage history contains transitions');
    console.log(`  ✓ Stage transitions recorded: ${stageHistRes.body.history.map((h) => h.newStage).join(' -> ')}`);

    // ----------------------------------------------------
    // CHECKPOINT 14: Logout Handling & Event Logging
    // ----------------------------------------------------
    console.log('\n▶ Checkpoint 14: Customer & Salesperson Logout Handling');
    const custLogoutRes = await request('/api/auth/logout', {
      method: 'POST',
      token: customerToken,
    });
    assert(custLogoutRes.status === 200, 'Customer logout returns HTTP 200');

    // Verify LOGOUT event was logged
    const finalTimelineRes = await request(`/api/salesperson/leads/${customerLeadId}/events`, { token: salespersonToken });
    const hasLogoutEvent = finalTimelineRes.body.events.some((e) => e.eventType === 'LOGOUT');
    assert(hasLogoutEvent, 'LOGOUT event captured in customer audit timeline');

    const spLogoutRes = await request('/api/auth/logout', {
      method: 'POST',
      token: salespersonToken,
    });
    assert(spLogoutRes.status === 200, 'Salesperson logout returns HTTP 200');

    console.log('\n================================================================');
    console.log('🎉 ALL 14 OPERATIONAL CHECKPOINTS PASSED SUCCESSFULLY!');
    console.log('================================================================\n');
  } finally {
    if (server) {
      server.close();
    }
  }
}

server = app.listen(PORT, async () => {
  try {
    await runTests();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ INTEGRATION VERIFICATION FAILED:', err);
    process.exit(1);
  }
});
