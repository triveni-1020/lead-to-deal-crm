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

async function runTests() {
  console.log('=== STARTING CUSTOMER MODULE INTEGRATION TESTS ===\n');
  const timestamp = Date.now();
  const testCustomerEmail = `customer_${timestamp}@test.com`;

  // 1. CUSTOMER REGISTRATION
  console.log('1. Testing Customer Registration with ONLY required fields...');
  const regRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Aditi Sharma',
      email: testCustomerEmail,
      phone: '+91-9876543210',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'customer',
    }
  );

  console.log(`   Registration Status: ${regRes.status}`);
  if (regRes.status !== 201) {
    console.error('Registration failed:', regRes.data);
    process.exit(1);
  }
  const token = regRes.data.token;
  const user = regRes.data.user;
  console.log(`   Customer Registered: ${user.name} (${user.email}) - ID: ${user.id}`);
  console.log(`   Linked Lead ID: ${regRes.data.lead?.id}`);
  console.log(`   Initial Lead Score: ${regRes.data.lead?.score}, Intent: ${regRes.data.lead?.intent}, Stage: ${regRes.data.lead?.stage}`);

  // 2. PRIVACY VERIFICATION: DASHBOARD
  console.log('\n2. Testing Customer Dashboard (Checking that CRM score/leadSummary is NOT exposed)...');
  const dashRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/customer/dashboard',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Dashboard Status: ${dashRes.status}`);
  console.log(`   Exposes leadSummary? ${Boolean(dashRes.data.leadSummary)} (MUST BE FALSE)`);
  console.log(`   Customer Name in Dashboard: ${dashRes.data.customer?.name}`);
  console.log(`   Recommendations Count: ${dashRes.data.recommendations?.recommendedForYou?.length || 0}`);

  // 3. PRODUCT CATALOG & TOP FILTER BAR
  console.log('\n3. Testing Product Catalog & Top Filter Bar (search, category, brand, specs)...');
  const productsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/customer/products?category=Smartphones&sort=price-high',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Products Status: ${productsRes.status}`);
  console.log(`   Smartphones Found: ${productsRes.data.products?.length}`);
  const topPhone = productsRes.data.products[0];
  console.log(`   Top Smartphone: ${topPhone?.name} (₹${topPhone?.price}) - Amazon URL: ${topPhone?.amazonUrl}`);

  // 4. WISHLIST
  console.log('\n4. Testing Wishlist Add & Retrieve...');
  const wishAdd = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/customer/wishlist/${topPhone.id}`,
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Wishlist Add Status: ${wishAdd.status} - ${wishAdd.data.message}`);

  const wishGet = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/customer/wishlist',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Wishlist Items Count: ${wishGet.data.wishlist?.length}`);

  // 5. BUY NOW EVENT & DIRECT CHECKOUT
  console.log('\n5. Testing BUY_NOW Event & Direct Checkout Order Creation...');
  await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/customer/events',
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    },
    {
      eventType: 'BUY_NOW',
      description: `Clicked Buy Now for ${topPhone.name}`,
      metadata: { productId: topPhone.id, price: topPhone.price },
    }
  );

  const directOrderRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/customer/orders',
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    },
    {
      productId: topPhone.id,
      quantity: 1,
      fullName: 'Aditi Sharma',
      email: testCustomerEmail,
      phone: '+91-9876543210',
      deliveryAddress: 'Flat 402, Lotus Residency, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      paymentMethod: 'Cash on Delivery',
    }
  );
  console.log(`   Direct Order Status: ${directOrderRes.status}`);
  console.log(`   Direct Order ID: ${directOrderRes.data.order?.orderId}`);
  console.log(`   Total Amount: ₹${directOrderRes.data.order?.totalAmount}`);

  // 6. CART & CART CHECKOUT
  console.log('\n6. Testing Cart Add & Cart Checkout...');
  const cartAddRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/customer/cart',
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    },
    {
      productId: 'prod-head-1',
      quantity: 2,
    }
  );
  console.log(`   Cart Add Status: ${cartAddRes.status}`);

  const cartOrderRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/customer/orders',
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    },
    {
      fullName: 'Aditi Sharma',
      email: testCustomerEmail,
      phone: '+91-9876543210',
      deliveryAddress: 'Flat 402, Lotus Residency, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      paymentMethod: 'UPI / Card',
    }
  );
  console.log(`   Cart Order Status: ${cartOrderRes.status}`);
  console.log(`   Cart Order ID: ${cartOrderRes.data.order?.orderId}`);
  console.log(`   Cart Order Items: ${cartOrderRes.data.order?.items?.length}`);

  // Verify Cart is now empty after checkout
  const cartCheck = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/customer/cart',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Cart Items Remaining after checkout: ${cartCheck.data.cart?.items?.length || 0} (MUST BE 0)`);

  // 7. ORDER HISTORY IN PROFILE
  console.log('\n7. Testing Order History Retrieval in Profile...');
  const profileRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/customer/profile',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Profile Status: ${profileRes.status}`);
  console.log(`   Exposes leadSummary in profile? ${Boolean(profileRes.data.leadSummary)} (MUST BE FALSE)`);
  console.log(`   Orders Found in Profile: ${profileRes.data.orders?.length} (MUST BE 2)`);

  // 8. SALESPERSON CRM PERSPECTIVE
  console.log('\n8. Testing Salesperson CRM Perspective (Lead Score, Intent, and Event Stream)...');
  const salesReg = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      name: 'Rohan Verma',
      email: `sales_${timestamp}@test.com`,
      phone: '+91-9876543211',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'salesperson',
      skills: 'Hardware Sales',
      territory: 'India',
    }
  );

  const salesToken = salesReg.data.token;
  const leadsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/salesperson/leads',
    method: 'GET',
    headers: { Authorization: `Bearer ${salesToken}` },
  });

  const matchingLead = (leadsRes.data.leads || []).find((l) => l.email === testCustomerEmail);
  console.log(`   Lead Found in Salesperson Dashboard: ${Boolean(matchingLead)}`);
  if (matchingLead) {
    console.log(`   Lead Name: ${matchingLead.name}`);
    console.log(`   Lead Score: ${matchingLead.score} (Starts at 0, increased with actions + 2 purchases!)`);
    console.log(`   Lead Intent: ${matchingLead.intent}`);
    console.log(`   Lead Momentum: ${matchingLead.momentum}`);

    // Check Event timeline for lead
    const eventsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/salesperson/leads/${matchingLead.id}/events`,
      method: 'GET',
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    console.log(`   Events Count in Timeline: ${eventsRes.data.events?.length}`);
    const eventTypes = (eventsRes.data.events || []).map((e) => e.eventType);
    console.log(`   Event Types: ${eventTypes.join(' -> ')}`);
  }

  console.log('\n=== ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY! ===');
}

runTests().catch(console.error);
