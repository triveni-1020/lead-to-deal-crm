const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`\n❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`   ✓ ${message}`);
}

async function runPipelineTests() {
  console.log('===============================================================');
  console.log(' MODULE 7: AUTOMATIC PIPELINE STAGE MOVEMENT VERIFICATION');
  console.log(' Stages: New -> Engaged -> Qualified -> Demo -> Negotiation -> Won');
  console.log('===============================================================\n');

  const timestamp = Date.now();
  const testCustomerEmail = `pipelinetester_${timestamp}@enterprise.org`;

  // -------------------------------------------------------------
  // STEP 1: CUSTOMER REGISTRATION (STAGE: New)
  // -------------------------------------------------------------
  console.log('1. Customer Registration & Initial "New" Stage...');
  const regRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Rohan Verma',
      email: testCustomerEmail,
      phone: '+91-9988776655',
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
      role: 'customer',
    }
  );

  assert(regRes.status === 201, `Customer registered successfully with status 201 (got ${regRes.status})`);
  const token = regRes.data.token;
  const user = regRes.data.user;
  const leadId = regRes.data.lead?.id;
  assert(Boolean(leadId), `Linked Lead created: ${leadId}`);
  assert(regRes.data.lead?.stage === 'New', `Initial stage is "New" (got "${regRes.data.lead?.stage}")`);
  assert(regRes.data.lead?.score === 0, `Initial score is 0 (got ${regRes.data.lead?.score})`);

  // Log in as salesperson to inspect CRM perspectives
  const salesLoginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      email: 'sales@demo.com',
      password: 'sales123',
      role: 'salesperson',
    }
  );
  assert(salesLoginRes.status === 200, 'Salesperson authenticated');
  const salesToken = salesLoginRes.data.token;

  // Verify initial stage history from salesperson endpoint
  const stageHist0 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/salesperson/leads/${leadId}/stage-history`,
    method: 'GET',
    headers: { Authorization: `Bearer ${salesToken}` },
  });
  assert(stageHist0.status === 200, 'Fetched stage history endpoint');
  assert(stageHist0.data.currentStage === 'New', `Lead currentStage is "New"`);
  assert(stageHist0.data.history.length >= 1, `Stage history record created for initial stage`);
  assert(stageHist0.data.history[stageHist0.data.history.length - 1].newStage === 'New', `Initial record has newStage = "New"`);

  // -------------------------------------------------------------
  // STEP 2: MEANINGFUL ACTIVITY (TRANSITION: New -> Engaged)
  // -------------------------------------------------------------
  console.log('\n2. Triggering Meaningful Activity (Product View & Browse) -> Stage: Engaged...');
  const viewRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/customer/products/prod-phone-1',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(viewRes.status === 200, 'Customer viewed product prod-phone-1');

  // Also perform a catalog search
  await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/customer/events',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    },
    {
      eventType: 'SEARCH',
      description: 'Customer searched for Galaxy S25 Ultra',
      metadata: { query: 'Galaxy' },
    }
  );

  // Check stage transition in CRM
  const stageHist1 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/salesperson/leads/${leadId}/stage-history`,
    method: 'GET',
    headers: { Authorization: `Bearer ${salesToken}` },
  });
  assert(stageHist1.data.currentStage === 'Engaged', `Stage transitioned automatically to "Engaged" (got "${stageHist1.data.currentStage}")`);
  const engagedRecord = stageHist1.data.history.find((h) => h.newStage === 'Engaged');
  assert(Boolean(engagedRecord), 'Stage history contains New -> Engaged transition record');
  assert(engagedRecord.oldStage === 'New', `Transition oldStage was "New" (got "${engagedRecord.oldStage}")`);
  assert(Boolean(engagedRecord.reason), `Transition reason recorded: "${engagedRecord.reason}"`);
  assert(Boolean(engagedRecord.timestamp), `Transition timestamp recorded: "${engagedRecord.timestamp}"`);

  // -------------------------------------------------------------
  // STEP 3: CONTACT FORM SUBMISSION / SCORE >= 50 -> Stage: Qualified
  // -------------------------------------------------------------
  console.log('\n3. Triggering Contact Inquiry Form Submission -> Stage: Qualified...');
  const contactRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/customer/requests/contact',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    },
    {
      subject: 'Fleet Device Procurement for 40 Employees',
      category: 'Sales Consultation',
      message: 'We are expanding our regional engineering operations and need enterprise pricing.',
      preferredContactMethod: 'Email',
      urgency: 'High',
    }
  );
  assert(contactRes.status === 201, 'Contact inquiry submitted successfully');

  // Verify transition to Qualified
  const stageHist2 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/salesperson/leads/${leadId}/stage-history`,
    method: 'GET',
    headers: { Authorization: `Bearer ${salesToken}` },
  });
  assert(stageHist2.data.currentStage === 'Qualified', `Stage transitioned automatically to "Qualified" (got "${stageHist2.data.currentStage}")`);
  const qualifiedRecord = stageHist2.data.history.find((h) => h.newStage === 'Qualified');
  assert(Boolean(qualifiedRecord), 'Stage history contains Engaged -> Qualified record');
  assert(qualifiedRecord.oldStage === 'Engaged', `Transition oldStage was "Engaged"`);
  assert(Boolean(qualifiedRecord.reason), `Transition reason recorded: "${qualifiedRecord.reason}"`);

  // -------------------------------------------------------------
  // STEP 4: FREE PRODUCT DEMO REQUEST -> Stage: Demo
  // -------------------------------------------------------------
  console.log('\n4. Submitting Free Product Demo Request -> Stage: Demo...');
  const demoRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/customer/requests/demo',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    },
    {
      productId: 'prod-phone-1',
      productName: 'Samsung Galaxy S25 Ultra',
      preferredDate: '2026-10-10',
      preferredTime: '11:00 AM',
      message: 'Need full live demonstration of Knox hardware security & S-Pen stylus features.',
    }
  );
  assert(demoRes.status === 201, 'Free demo requested successfully');

  // Verify transition to Demo
  const stageHist3 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/salesperson/leads/${leadId}/stage-history`,
    method: 'GET',
    headers: { Authorization: `Bearer ${salesToken}` },
  });
  assert(stageHist3.data.currentStage === 'Demo', `Stage transitioned automatically to "Demo" (got "${stageHist3.data.currentStage}")`);
  const demoRecord = stageHist3.data.history.find((h) => h.newStage === 'Demo');
  assert(Boolean(demoRecord), 'Stage history contains Qualified -> Demo record');
  assert(demoRecord.oldStage === 'Qualified', `Transition oldStage was "Qualified"`);
  assert(demoRecord.reason.includes('Samsung Galaxy S25 Ultra') || demoRecord.reason.includes('demo'), `Demo reason recorded: "${demoRecord.reason}"`);

  // -------------------------------------------------------------
  // STEP 5: CHECKOUT STARTED -> Stage: Negotiation
  // -------------------------------------------------------------
  console.log('\n5. Starting Checkout Process -> Stage: Negotiation...');
  const checkoutStartRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/customer/checkout/start',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    },
    {
      productId: 'prod-phone-1',
      itemsCount: 1,
    }
  );
  assert(checkoutStartRes.status === 200, 'Checkout start logged successfully');

  // Verify transition to Negotiation
  const stageHist4 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/salesperson/leads/${leadId}/stage-history`,
    method: 'GET',
    headers: { Authorization: `Bearer ${salesToken}` },
  });
  assert(stageHist4.data.currentStage === 'Negotiation', `Stage transitioned automatically to "Negotiation" (got "${stageHist4.data.currentStage}")`);
  const negRecord = stageHist4.data.history.find((h) => h.newStage === 'Negotiation');
  assert(Boolean(negRecord), 'Stage history contains Demo -> Negotiation record');
  assert(negRecord.oldStage === 'Demo', `Transition oldStage was "Demo"`);
  assert(Boolean(negRecord.reason), `Negotiation reason recorded: "${negRecord.reason}"`);

  // -------------------------------------------------------------
  // STEP 6: PURCHASE COMPLETED -> Stage: Won
  // -------------------------------------------------------------
  console.log('\n6. Completing Order Placement -> Stage: Won...');
  const orderRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/customer/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    },
    {
      productId: 'prod-phone-1',
      quantity: 1,
      fullName: 'Rohan Verma',
      deliveryAddress: 'Tech Park Tower 4, Whitefield',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560066',
      paymentMethod: 'Cash on Delivery',
    }
  );
  assert(orderRes.status === 201, 'Order placed successfully');

  // Verify transition to Won
  const stageHist5 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/salesperson/leads/${leadId}/stage-history`,
    method: 'GET',
    headers: { Authorization: `Bearer ${salesToken}` },
  });
  assert(stageHist5.data.currentStage === 'Won', `Stage transitioned automatically to "Won" (got "${stageHist5.data.currentStage}")`);
  const wonRecord = stageHist5.data.history.find((h) => h.newStage === 'Won');
  assert(Boolean(wonRecord), 'Stage history contains Negotiation -> Won record');
  assert(wonRecord.oldStage === 'Negotiation', `Transition oldStage was "Negotiation"`);
  assert(Boolean(wonRecord.reason), `Won reason recorded: "${wonRecord.reason}"`);

  // -------------------------------------------------------------
  // STEP 7: MONOTONIC PROGRESSION (WON REMAINS WON)
  // -------------------------------------------------------------
  console.log('\n7. Verifying Monotonic Progression (Lower-level event should not regress Won stage)...');
  await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/customer/products/prod-laptop-1',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const stageHist6 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/salesperson/leads/${leadId}/stage-history`,
    method: 'GET',
    headers: { Authorization: `Bearer ${salesToken}` },
  });
  assert(stageHist6.data.currentStage === 'Won', `Stage strictly remained "Won" after subsequent browsing`);

  // -------------------------------------------------------------
  // STEP 8: VERIFY LEAD DETAILS FROM SALESPERSON ENDPOINT
  // -------------------------------------------------------------
  console.log('\n8. Verifying Salesperson Lead Details Endpoint & Table...');
  const leadRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/salesperson/leads/${leadId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${salesToken}` },
  });
  assert(leadRes.status === 200, 'Salesperson retrieved lead details');
  assert(leadRes.data.lead.stage === 'Won', `Lead stage in details is "Won"`);
  assert(leadRes.data.lead.score > 0, `Lead score was dynamically updated: ${leadRes.data.lead.score}`);
  assert(Array.isArray(leadRes.data.lead.stageHistory), 'Lead details contains stageHistory array');
  assert(leadRes.data.lead.stageHistory.length >= 5, `Complete chronological stage transitions stored on lead (${leadRes.data.lead.stageHistory.length} transitions)`);

  console.log('\n===============================================================');
  console.log(' ✅ ALL MODULE 7 PIPELINE STAGE TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================\n');
}

runPipelineTests().catch((err) => {
  console.error('\n❌ TEST RUNNER ERROR:', err);
  process.exit(1);
});
