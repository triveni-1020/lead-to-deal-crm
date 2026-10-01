const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const usersData = require('../data/users');
const leadsData = require('../data/leads');
const eventsData = require('../data/events');
const scoreHistoryData = require('../data/scoreHistory');
const intelligenceService = require('../services/intelligence');
const productsData = require('../data/products');
const wishlistsData = require('../data/wishlists');
const cartsData = require('../data/carts');
const requestsData = require('../data/requests');
const resourcesData = require('../data/resources');
const feedbackData = require('../data/recommendationFeedback');
const recommendationsService = require('../services/recommendations');
const ordersData = require('../data/orders');
const pipelineService = require('../services/pipeline');
const stageHistoryData = require('../data/stageHistory');
const priorityService = require('../services/priority');
const stallDetectionService = require('../services/stallDetection');
const nextBestActionService = require('../services/nextBestAction');
const revenuePriorityService = require('../services/revenuePriority');

// Enforce Customer authentication on all customer routes
router.use(requireAuth, requireRole('customer'));

// Helper to get authenticated customer user
function getCustomer(req) {
  if (usersData.findById) {
    return usersData.findById(req.auth.id);
  }
  const all = typeof usersData.getAll === 'function' ? usersData.getAll() : usersData;
  return all.find((u) => u.id === req.auth.id) || null;
}

// Helper to find or create customer lead (validated against real registered customer)
function getOrCreateCustomerLead(customer) {
  if (!customer || !customer.id) return null;
  const user = usersData.findById ? usersData.findById(customer.id) : usersData.find((u) => u.id === customer.id);
  if (!user || user.role !== 'customer') return null;

  let lead = leadsData.findByCustomerId(customer.id);
  if (!lead && customer.email) {
    lead = leadsData.findByEmail(customer.email);
  }
  if (!lead) {
    lead = leadsData.createCustomerLead({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      company: customer.company,
      industry: customer.industry,
      companySize: customer.companySize,
      location: customer.location,
    });
  }
  return lead;
}

// Centralized event logging and dynamic lead scoring engine
function recordCustomerEvent(customer, eventType, description, metadata = {}, options = {}) {
  if (!customer) return null;
  const lead = getOrCreateCustomerLead(customer);
  const leadId = lead ? lead.id : null;

  // Prevent duplicate rapid submissions if requested
  if (options.dedupWindowMs) {
    const recent = eventsData.getByCustomerId(customer.id);
    const dup = recent.some(
      (e) =>
        e.eventType === eventType &&
        Math.abs(new Date(e.createdAt || e.timestamp).getTime() - Date.now()) < options.dedupWindowMs
    );
    if (dup) return null;
  }

  const newEvent = eventsData.addEvent({
    leadId,
    customerId: String(customer.id),
    productId: metadata.productId || null,
    preferredDate: metadata.preferredDate || null,
    preferredTime: metadata.preferredTime || null,
    eventType,
    description,
    metadata,
    createdBy: {
      id: customer.id,
      name: customer.name || 'Customer',
      email: customer.email || '',
    },
  });

  // Dynamic Lead Scoring & Unified Intelligence Cascade
  if (lead) {
    const points = scoreHistoryData.getScoreForEvent(eventType);
    const prevScore = Number(lead.score) || 0;
    const newScore = Math.max(0, Math.min(100, prevScore + points));

    if (points > 0) {
      lead.score = newScore;
      scoreHistoryData.addRecord({
        leadId: lead.id,
        eventId: newEvent.id,
        eventType,
        points,
        previousScore: prevScore,
        newScore,
      });
    }

    // Capture product info if present in metadata
    if (metadata.productId) lead.productId = metadata.productId;
    if (metadata.productName) {
      lead.productName = metadata.productName;
      lead.product = metadata.productName;
    }
    if (Number(metadata.price) > 0) {
      lead.productPrice = Number(metadata.price);
    }

    const allLeadEvents = eventsData.getByLeadId(lead.id);

    // 1. Sync product data & resolve opportunity value
    intelligenceService.syncLeadProductData(lead, allLeadEvents);
    const oppValue = intelligenceService.resolveOpportunityValue(lead, allLeadEvents);
    lead.opportunityValue = oppValue;
    lead.expectedDealValue = oppValue;
    if (!lead.productPrice) lead.productPrice = oppValue;

    // 2. Compute ONE unified buying intent using BOTH engagement score AND opportunity value
    const intel = intelligenceService.computeIntelligence(newScore, allLeadEvents, { opportunityValue: oppValue, lead });

    // 3. Update persistent intelligence
    leadsData.updateIntelligence(lead.id, {
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

    // Module 7: Automatic Pipeline Stage Movement
    pipelineService.evaluateAndTransition(lead, newEvent, allLeadEvents, newScore);

    // Module 8: Automatic Lead Priority Recalculation
    priorityService.computeAndApplyPriority(lead, allLeadEvents, newEvent);

    // Module 9: Stalled Opportunity Detection Recalculation
    stallDetectionService.computeAndApplyStallStatus(lead, allLeadEvents);

    // Module 10: Next Best Action Recommendation Recalculation
    nextBestActionService.computeAndApplyNextBestAction(lead, allLeadEvents);

    // Module 11: Revenue Prioritization Engine Recalculation
    revenuePriorityService.computeAndApplyRevenuePriority(lead, allLeadEvents);
  }

  return newEvent;
}

// ----------------------------------------------------
// 1. DASHBOARD
// ----------------------------------------------------
router.get('/dashboard', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const recs = recommendationsService.getRecommendations(customer);
    const wishlistItems = wishlistsData.getByCustomerId(customer.id);
    const cart = cartsData.getCart(customer.id);
    const orders = ordersData.getByCustomerId(customer.id);

    // Record DASHBOARD_VISIT (deduplicate within 30 seconds)
    recordCustomerEvent(
      customer,
      'DASHBOARD_VISIT',
      `Visited customer dashboard`,
      {},
      { dedupWindowMs: 30000 }
    );

    return res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      recommendations: recs,
      stats: {
        wishlistCount: wishlistItems.length,
        cartItemCount: (cart.items || []).reduce((sum, item) => sum + item.quantity, 0),
        ordersCount: orders.length,
      },
    });
  } catch (err) {
    console.error('Error fetching customer dashboard:', err);
    return res.status(500).json({ message: 'Server error retrieving dashboard' });
  }
});

// ----------------------------------------------------
// 2. PRODUCT CATALOG & SEARCH & FILTERS
// ----------------------------------------------------
router.get('/products', (req, res) => {
  try {
    const {
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      rating,
      inStock,
      ram,
      storage,
      fiveG,
      noiseCancelling,
      sort,
    } = req.query;

    const filtered = productsData.searchAndFilter({
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      rating,
      inStock,
      ram,
      storage,
      fiveG,
      noiseCancelling,
      sort,
    });

    const categories = productsData.getCategories();
    const brands = productsData.getBrands();

    return res.json({
      products: filtered,
      total: filtered.length,
      categories,
      brands,
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ message: 'Server error retrieving products' });
  }
});

// ----------------------------------------------------
// 3. PRODUCT DETAILS
// ----------------------------------------------------
router.get('/products/:id', (req, res) => {
  try {
    const customer = getCustomer(req);
    const product = productsData.getById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const related = productsData.getRelated(product.id, 4);
    const inWishlist = customer ? wishlistsData.hasItem(customer.id, product.id) : false;
    const cart = customer ? cartsData.getCart(customer.id) : { items: [] };
    const cartItem = (cart.items || []).find((i) => String(i.productId).toLowerCase() === String(product.id).toLowerCase());

    // Record PRODUCT_VIEW and PRODUCT_DETAIL_VIEW
    if (customer) {
      recordCustomerEvent(
        customer,
        'PRODUCT_VIEW',
        `Viewed product ${product.name}`,
        { productId: product.id, productName: product.name, brand: product.brand, category: product.category, price: product.price },
        { dedupWindowMs: 5000 }
      );

      recordCustomerEvent(
        customer,
        'PRODUCT_DETAIL_VIEW',
        `Explored full specifications for ${product.name}`,
        { productId: product.id, productName: product.name, brand: product.brand, category: product.category },
        { dedupWindowMs: 5000 }
      );
    }

    return res.json({
      product,
      relatedProducts: related,
      isInWishlist: inWishlist,
      inCartQuantity: cartItem ? cartItem.quantity : 0,
    });
  } catch (err) {
    console.error('Error fetching product details:', err);
    return res.status(500).json({ message: 'Server error retrieving product details' });
  }
});

// ----------------------------------------------------
// 4. WISHLIST
// ----------------------------------------------------
router.get('/wishlist', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const rawItems = wishlistsData.getByCustomerId(customer.id);
    const populated = rawItems
      .map((item) => {
        const product = productsData.getById(item.productId);
        return product ? { ...item, product } : null;
      })
      .filter(Boolean);

    return res.json({ wishlist: populated });
  } catch (err) {
    console.error('Error fetching wishlist:', err);
    return res.status(500).json({ message: 'Server error retrieving wishlist' });
  }
});

router.post('/wishlist', (req, res) => {
  const pId = req.body?.productId;
  if (!pId) return res.status(400).json({ message: 'productId is required' });
  req.url = `/wishlist/${pId}`;
  return router.handle(req, res);
});

router.post('/wishlist/:productId', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const product = productsData.getById(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const item = wishlistsData.addItem(customer.id, product.id);

    // Record WISHLIST_ADD
    recordCustomerEvent(customer, 'WISHLIST_ADD', `Added ${product.name} to wishlist`, {
      productId: product.id,
      productName: product.name,
      category: product.category,
      price: product.price,
    });

    return res.status(201).json({
      message: `${product.name} added to your wishlist`,
      item: { ...item, product },
    });
  } catch (err) {
    console.error('Error adding to wishlist:', err);
    return res.status(500).json({ message: 'Server error adding to wishlist' });
  }
});

router.delete('/wishlist/:productId', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const product = productsData.getById(req.params.productId);
    wishlistsData.removeItem(customer.id, req.params.productId);

    // Record WISHLIST_REMOVE
    recordCustomerEvent(
      customer,
      'WISHLIST_REMOVE',
      `Removed ${product ? product.name : req.params.productId} from wishlist`,
      { productId: req.params.productId }
    );

    return res.json({ message: 'Product removed from wishlist' });
  } catch (err) {
    console.error('Error removing from wishlist:', err);
    return res.status(500).json({ message: 'Server error removing from wishlist' });
  }
});

// ----------------------------------------------------
// 5. CART & SIMULATED CHECKOUT
// ----------------------------------------------------
router.get('/cart', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const cart = cartsData.getCart(customer.id);
    let subtotal = 0;
    const populatedItems = (cart.items || [])
      .map((item) => {
        const product = productsData.getById(item.productId);
        if (!product) return null;
        const lineTotal = product.price * item.quantity;
        subtotal += lineTotal;
        return {
          productId: item.productId,
          quantity: item.quantity,
          addedAt: item.addedAt,
          product,
          lineTotal,
        };
      })
      .filter(Boolean);

    const tax = Math.round(subtotal * 0.18); // 18% GST standard
    const total = subtotal + tax;

    return res.json({
      cart: {
        items: populatedItems,
        itemCount: populatedItems.reduce((acc, cur) => acc + cur.quantity, 0),
        subtotal,
        tax,
        total,
      },
    });
  } catch (err) {
    console.error('Error fetching cart:', err);
    return res.status(500).json({ message: 'Server error retrieving cart' });
  }
});

router.post('/cart', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { productId, quantity = 1 } = req.body || {};
    const product = productsData.getById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const updatedCart = cartsData.addItem(customer.id, product.id, quantity);

    // Record CART_ADD
    recordCustomerEvent(customer, 'CART_ADD', `Added ${quantity}x ${product.name} to cart`, {
      productId: product.id,
      productName: product.name,
      quantity,
      price: product.price,
    });

    return res.status(201).json({
      message: `${product.name} added to cart`,
      cart: updatedCart,
    });
  } catch (err) {
    console.error('Error adding to cart:', err);
    return res.status(500).json({ message: 'Server error adding to cart' });
  }
});

router.put('/cart/:productId', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { quantity } = req.body || {};
    const updated = cartsData.updateQuantity(customer.id, req.params.productId, quantity);

    return res.json({ message: 'Cart updated', cart: updated });
  } catch (err) {
    console.error('Error updating cart:', err);
    return res.status(500).json({ message: 'Server error updating cart' });
  }
});

router.delete('/cart/:productId', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const product = productsData.getById(req.params.productId);
    const updated = cartsData.removeItem(customer.id, req.params.productId);

    // Record CART_REMOVE
    recordCustomerEvent(
      customer,
      'CART_REMOVE',
      `Removed ${product ? product.name : req.params.productId} from cart`,
      { productId: req.params.productId }
    );

    return res.json({ message: 'Item removed from cart', cart: updated });
  } catch (err) {
    console.error('Error removing from cart:', err);
    return res.status(500).json({ message: 'Server error removing item from cart' });
  }
});

// ----------------------------------------------------
// 5. ORDERS & CHECKOUT
// ----------------------------------------------------
router.post('/orders', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const lead = getOrCreateCustomerLead(customer);
    const {
      productId,
      quantity = 1,
      items: providedItems,
      fullName,
      email,
      phone,
      deliveryAddress,
      city,
      state,
      pincode,
      paymentMethod = 'Cash on Delivery',
    } = req.body || {};

    if (!deliveryAddress || !deliveryAddress.trim()) {
      return res.status(400).json({ message: 'Delivery address is required' });
    }

    let orderItems = [];
    let isFromCart = false;

    if (productId) {
      // Direct single product buy ("Buy Now")
      const product = productsData.getById(productId);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      const qty = Math.max(1, parseInt(quantity, 10) || 1);
      orderItems = [
        {
          productId: product.id,
          name: product.name,
          brand: product.brand,
          category: product.category,
          price: product.price,
          quantity: qty,
          image: product.image,
          lineTotal: product.price * qty,
        },
      ];
    } else if (Array.isArray(providedItems) && providedItems.length > 0) {
      orderItems = providedItems.map((item) => {
        const product = productsData.getById(item.productId);
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const price = product ? product.price : Number(item.price) || 0;
        return {
          productId: item.productId,
          name: product ? product.name : item.name || 'Product',
          brand: product ? product.brand : '',
          category: product ? product.category : '',
          price,
          quantity: qty,
          image: product ? product.image : '',
          lineTotal: price * qty,
        };
      });
    } else {
      // Order from active cart
      const cart = cartsData.getCart(customer.id);
      if (!cart.items || cart.items.length === 0) {
        return res.status(400).json({ message: 'Cart is empty. Add products before checking out.' });
      }
      isFromCart = true;
      orderItems = cart.items.map((item) => {
        const product = productsData.getById(item.productId);
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const price = product ? product.price : 0;
        return {
          productId: item.productId,
          name: product ? product.name : 'Product',
          brand: product ? product.brand : '',
          category: product ? product.category : '',
          price,
          quantity: qty,
          image: product ? product.image : '',
          lineTotal: price * qty,
        };
      });
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const tax = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + tax;
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

    const order = ordersData.createOrder({
      orderId: `ORD-${Date.now()}`,
      customerId: customer.id,
      leadId: lead?.id,
      productId: orderItems[0]?.productId,
      items: orderItems,
      quantity: totalQuantity,
      subtotal,
      tax,
      totalAmount,
      fullName: fullName || customer.name || 'Valued Customer',
      email: email || customer.email || '',
      phone: phone || customer.phone || '',
      deliveryAddress: deliveryAddress.trim(),
      city: city || 'Bengaluru',
      state: state || 'Karnataka',
      pincode: pincode || '560001',
      paymentMethod,
      orderStatus: 'Confirmed',
      timestamp: new Date().toISOString(),
    });

    // Clear cart if order originated from cart
    if (isFromCart) {
      cartsData.clearCart(customer.id);
    }

    // Record PURCHASE_COMPLETED customer event
    recordCustomerEvent(
      customer,
      'PURCHASE_COMPLETED',
      `Completed purchase for Order #${order.orderId} (₹${totalAmount.toLocaleString('en-IN')})`,
      {
        orderId: order.orderId,
        productId: order.productId,
        itemsCount: orderItems.length,
        totalAmount,
        paymentMethod,
        items: orderItems.map((i) => `${i.quantity}x ${i.name}`),
      }
    );

    return res.status(201).json({
      message: 'Order placed successfully',
      order,
    });
  } catch (err) {
    console.error('Error creating order:', err);
    return res.status(500).json({ message: 'Server error processing order placement' });
  }
});

router.get('/orders', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const orders = ordersData.getByCustomerId(customer.id);
    return res.json({ orders });
  } catch (err) {
    console.error('Error fetching customer orders:', err);
    return res.status(500).json({ message: 'Server error retrieving orders' });
  }
});

router.get('/orders/:orderId', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const order = ordersData.getById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (String(order.customerId) !== String(customer.id)) {
      return res.status(403).json({ message: 'Access denied to this order' });
    }

    return res.json({ order });
  } catch (err) {
    console.error('Error fetching order details:', err);
    return res.status(500).json({ message: 'Server error retrieving order details' });
  }
});

router.post('/cart/checkout', (req, res) => {
  // Forward to /orders logic for backwards compatibility
  req.body = req.body || {};
  return router.handle(req, res);
});

router.post('/checkout/start', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const { productId, itemsCount } = req.body || {};
    const event = recordCustomerEvent(
      customer,
      'CHECKOUT_STARTED',
      'Started checkout process',
      { productId, itemsCount },
      { dedupWindowMs: 4000 }
    );
    return res.json({ success: true, event });
  } catch (err) {
    console.error('Error recording checkout start:', err);
    return res.status(500).json({ message: 'Server error recording checkout' });
  }
});

// ----------------------------------------------------
// 6. PRICING
// ----------------------------------------------------
router.get('/pricing', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (customer) {
      recordCustomerEvent(
        customer,
        'PRICING_PAGE_VIEW',
        'Visited enterprise device fleet and subscription pricing page',
        {},
        { dedupWindowMs: 10000 }
      );
    }

    const plans = [
      {
        id: 'tier-starter',
        name: 'Professional Tier',
        priceMonthly: 0,
        priceYearly: 0,
        description: 'Ideal for independent professionals and small teams acquiring single units with standard warranty.',
        features: [
          'Full access to hardware catalog',
          'Standard manufacturer warranty (1 year)',
          'Direct customer service support',
          'Standard delivery across India',
          'Real-time shipment tracking',
        ],
        ctaText: 'Explore Catalog',
        highlighted: false,
      },
      {
        id: 'tier-business',
        name: 'Business Fleet Pro',
        priceMonthly: 4999,
        priceYearly: 49990,
        description: 'Comprehensive solution for growing organizations requiring 10-50 managed devices with priority SLA.',
        features: [
          'Dedicated enterprise account manager',
          'Volume discounts on bulk device procurement',
          'Next-business-day hardware replacement',
          'Pre-configured Zero-Touch MDM deployment',
          'Quarterly fleet health audits',
          'Extended 2-year accidental damage protection',
        ],
        ctaText: 'Request Fleet Demo',
        highlighted: true,
      },
      {
        id: 'tier-enterprise',
        name: 'Enterprise Global Suite',
        priceMonthly: 12999,
        priceYearly: 129990,
        description: 'Custom turnkey device provisioning, security compliance, and lifecycle trade-in for 50+ devices.',
        features: [
          'Custom volume procurement contracts & flexible leases',
          '24/7 dedicated tier-3 technical escalation desk',
          'Knox / Intune zero-trust security integration',
          'Annual refresh & trade-in valuation guarantee',
          'Custom laser asset tagging and etching',
          'On-site field engineer support nationwide',
        ],
        ctaText: 'Contact Enterprise Sales',
        highlighted: false,
      },
    ];

    return res.json({ plans });
  } catch (err) {
    console.error('Error fetching pricing:', err);
    return res.status(500).json({ message: 'Server error retrieving pricing' });
  }
});

// ----------------------------------------------------
// 7. RESOURCES & DOWNLOADS
// ----------------------------------------------------
router.get('/resources', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (customer) {
      recordCustomerEvent(
        customer,
        'RESOURCES_PAGE_VIEW',
        'Visited technical documents and brochures library',
        {},
        { dedupWindowMs: 10000 }
      );
    }

    const category = req.query.category;
    const resources = resourcesData.getAll(category);
    return res.json({ resources });
  } catch (err) {
    console.error('Error fetching resources:', err);
    return res.status(500).json({ message: 'Server error retrieving resources' });
  }
});

router.post('/resources/:id/download', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const resource = resourcesData.getById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    resourcesData.incrementDownloads(resource.id);

    // Record CONTENT_DOWNLOAD
    recordCustomerEvent(customer, 'CONTENT_DOWNLOAD', `Downloaded ${resource.title} (${resource.category})`, {
      resourceId: resource.id,
      title: resource.title,
      category: resource.category,
      fileType: resource.fileType,
    });

    return res.json({
      message: `Download started for ${resource.title}`,
      downloadUrl: resource.downloadUrl,
      resource,
    });
  } catch (err) {
    console.error('Error downloading resource:', err);
    return res.status(500).json({ message: 'Server error initiating resource download' });
  }
});

// ----------------------------------------------------
// 8. FREE PRODUCT DEMO REQUEST & CONTACT SALES
// ----------------------------------------------------
router.post('/requests/demo', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const lead = getOrCreateCustomerLead(customer);
    const {
      productId,
      productName: customProductName,
      fullName,
      email,
      phone,
      preferredDate,
      preferredTime,
      message,
      notes,
    } = req.body || {};

    const product = productId ? productsData.getById(productId) : null;
    const resolvedProductName = product ? product.name : (customProductName || 'Product Demo');

    const demoReq = requestsData.addDemoRequest({
      customerId: customer.id,
      leadId: lead?.id,
      productId: productId || null,
      productName: resolvedProductName,
      fullName: (fullName || customer.name || '').trim(),
      email: (email || customer.email || '').trim(),
      phone: (phone || customer.phone || '').trim(),
      preferredDate: preferredDate || new Date().toISOString().split('T')[0],
      preferredTime: preferredTime || '10:00 AM',
      message: (message || notes || '').trim(),
      status: 'REQUESTED',
    });

    // Record DEMO_REQUESTED event and dynamic lead scoring (+20 points)
    const newEvent = recordCustomerEvent(
      customer,
      'DEMO_REQUESTED',
      `Requested free product demo for ${resolvedProductName} on ${demoReq.preferredDate} at ${demoReq.preferredTime}`,
      {
        demoRequestId: demoReq.demoRequestId,
        productId: demoReq.productId,
        productName: resolvedProductName,
        preferredDate: demoReq.preferredDate,
        preferredTime: demoReq.preferredTime,
        message: demoReq.message,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Your free demo request has been submitted successfully.\nOur sales team will contact you soon.",
      demoRequest: demoReq,
      request: demoReq,
      event: newEvent,
    });
  } catch (err) {
    console.error('Error creating free demo request:', err);
    return res.status(500).json({ message: 'Server error submitting free demo request' });
  }
});

// Also alias /demo directly
router.post('/demo', (req, res) => {
  req.url = '/requests/demo';
  return router.handle(req, res);
});

router.post('/requests/contact', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const lead = getOrCreateCustomerLead(customer);
    const { subject, category, message, preferredContactMethod, urgency } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const newReq = requestsData.addContactRequest({
      customerId: customer.id,
      leadId: lead?.id,
      fullName: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      company: customer.company || '',
      subject: subject || 'General Sales Inquiry',
      category: category || 'Sales Consultation',
      message: message.trim(),
      preferredContactMethod: preferredContactMethod || 'Email',
      urgency: urgency || 'Normal',
    });

    // Record CONTACT_FORM_SUBMITTED
    recordCustomerEvent(customer, 'CONTACT_FORM_SUBMITTED', `Submitted contact enquiry: "${newReq.subject}"`, {
      requestId: newReq.id,
      subject: newReq.subject,
      category: newReq.category,
      urgency: newReq.urgency,
    });

    return res.status(201).json({
      message: 'Contact enquiry submitted successfully.',
      request: newReq,
    });
  } catch (err) {
    console.error('Error submitting contact form:', err);
    return res.status(500).json({ message: 'Server error submitting contact enquiry' });
  }
});

router.get('/requests', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const list = requestsData.getByCustomerId(customer.id);
    return res.json({ requests: list });
  } catch (err) {
    console.error('Error fetching requests:', err);
    return res.status(500).json({ message: 'Server error retrieving requests' });
  }
});

// ----------------------------------------------------
// 9. CUSTOMER PROFILE
// ----------------------------------------------------
router.get('/profile', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const orders = ordersData.getByCustomerId(customer.id);

    return res.json({
      profile: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        role: customer.role,
        createdAt: customer.createdAt,
      },
      orders,
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    return res.status(500).json({ message: 'Server error retrieving profile' });
  }
});

router.put('/profile', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { name, phone, company, industry, companySize, location } = req.body || {};

    if (name && name.trim()) customer.name = name.trim();
    if (phone !== undefined) customer.phone = phone.trim();
    if (company !== undefined) customer.company = company.trim();
    if (industry !== undefined) customer.industry = industry.trim();
    if (companySize !== undefined) customer.companySize = companySize.trim();
    if (location !== undefined) customer.location = location.trim();

    // Persist to users file
    if (usersData.update) {
      usersData.update(customer.id, customer);
    } else if (usersData.saveUsers) {
      usersData.saveUsers();
    }

    // Sync with linked lead
    const lead = leadsData.findByCustomerId(customer.id);
    if (lead) {
      if (name) lead.name = customer.name;
      if (phone) lead.phone = customer.phone;
      if (company) lead.company = customer.company;
      if (industry) lead.industry = customer.industry;
      if (companySize) lead.companySize = customer.companySize;
      if (location) lead.location = customer.location;
    }

    // Record PROFILE_UPDATED
    recordCustomerEvent(customer, 'PROFILE_UPDATED', `Updated personal and organizational profile details`, {
      name: customer.name,
      company: customer.company,
      industry: customer.industry,
    });

    return res.json({
      message: 'Profile updated successfully',
      profile: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        industry: customer.industry,
        companySize: customer.companySize,
        location: customer.location,
      },
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
});

// ----------------------------------------------------
// 10. CUSTOMER ACTIVITY TIMELINE
// ----------------------------------------------------
router.get('/activity', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const lead = getOrCreateCustomerLead(customer);
    const rawEvents = eventsData.getByCustomerId(customer.id, lead?.id);
    const { category } = req.query;

    let filtered = rawEvents;
    if (category && category !== 'All') {
      const catLower = category.toLowerCase();
      filtered = rawEvents.filter((e) => {
        const type = (e.eventType || '').toLowerCase();
        if (catLower === 'products') return type.includes('product');
        if (catLower === 'search') return type.includes('search');
        if (catLower === 'pricing') return type.includes('pricing');
        if (catLower === 'wishlist') return type.includes('wishlist');
        if (catLower === 'cart') return type.includes('cart') || type.includes('checkout');
        if (catLower === 'resources') return type.includes('content') || type.includes('resource');
        if (catLower === 'requests') return type.includes('demo') || type.includes('contact');
        if (catLower === 'account') return type.includes('login') || type.includes('register') || type.includes('profile');
        return true;
      });
    }

    // Group by Today, Yesterday, Earlier
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayMidnight = todayMidnight - 24 * 60 * 60 * 1000;

    const grouped = {
      today: [],
      yesterday: [],
      earlier: [],
    };

    filtered.forEach((e) => {
      const eTime = new Date(e.timestamp || e.createdAt).getTime();
      if (eTime >= todayMidnight) {
        grouped.today.push(e);
      } else if (eTime >= yesterdayMidnight) {
        grouped.yesterday.push(e);
      } else {
        grouped.earlier.push(e);
      }
    });

    return res.json({
      events: filtered,
      grouped,
      total: filtered.length,
    });
  } catch (err) {
    console.error('Error fetching customer activity:', err);
    return res.status(500).json({ message: 'Server error retrieving activity timeline' });
  }
});

// ----------------------------------------------------
// 11. GENERIC EVENT CAPTURE (SEARCH, FILTERS, SORTS, CTA)
// ----------------------------------------------------
router.post('/events', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { eventType, description, metadata = {} } = req.body || {};

    if (!eventType || !eventsData.VALID_EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({ message: 'Invalid or unsupported eventType' });
    }

    const recorded = recordCustomerEvent(
      customer,
      eventType,
      description || `Performed action: ${eventType}`,
      metadata,
      { dedupWindowMs: 3000 }
    );

    return res.status(201).json({
      message: 'Event logged successfully',
      event: recorded,
    });
  } catch (err) {
    console.error('Error logging customer event:', err);
    return res.status(500).json({ message: 'Server error recording event' });
  }
});

// ----------------------------------------------------
// 12. RECOMMENDATION FEEDBACK
// ----------------------------------------------------
router.post('/recommendations/feedback', (req, res) => {
  try {
    const customer = getCustomer(req);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { productId, action, reason, recommendationId } = req.body || {};
    if (!productId || !action) {
      return res.status(400).json({ message: 'productId and action are required' });
    }

    const lead = getOrCreateCustomerLead(customer);
    const feedbackItem = feedbackData.recordFeedback({
      customerId: customer.id,
      leadId: lead?.id,
      productId,
      action,
      reason,
      recommendationId,
    });

    // Also record as a customer timeline event
    recordCustomerEvent(
      customer,
      action, // 'RECOMMENDATION_CLICK' | 'RECOMMENDATION_INTEREST' | 'RECOMMENDATION_DISMISSED'
      `Feedback: ${action.replace('RECOMMENDATION_', '').toLowerCase()} for product ${productId}`,
      { productId, reason, recommendationId }
    );

    return res.status(201).json({ success: true, feedback: feedbackItem });
  } catch (err) {
    console.error('Error recording recommendation feedback:', err);
    return res.status(500).json({ message: 'Server error saving recommendation feedback' });
  }
});

module.exports = router;
