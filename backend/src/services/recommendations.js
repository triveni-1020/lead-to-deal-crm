const productsData = require('../data/products');
const eventsData = require('../data/events');
const wishlistsData = require('../data/wishlists');
const cartsData = require('../data/carts');
const feedbackData = require('../data/recommendationFeedback');

// Industry category affinity mapping
const INDUSTRY_AFFINITIES = {
  technology: ['Laptops', 'Smartphones', 'Headphones', 'Accessories'],
  finance: ['Laptops', 'Smartphones', 'Tablets'],
  healthcare: ['Smartwatches', 'Tablets', 'Accessories'],
  education: ['Tablets', 'Laptops', 'Headphones'],
  media: ['Headphones', 'Laptops', 'Tablets'],
  manufacturing: ['Smartphones', 'Smartwatches', 'Tablets'],
  retail: ['Smartphones', 'Tablets', 'Accessories'],
  consulting: ['Laptops', 'Smartphones', 'Headphones'],
};

function getRecommendations(customer) {
  const allProducts = productsData.getAll();
  const customerId = customer ? String(customer.id) : null;

  if (!customerId) {
    return {
      recommendedForYou: allProducts.slice(0, 4).map((p) => ({
        ...p,
        recommendationScore: 10,
        explanation: 'Popular choice for business professionals.',
      })),
      continueExploring: allProducts.slice(4, 8),
      popularForIndustry: allProducts.filter((p) => p.category === 'Smartphones' || p.category === 'Laptops').slice(0, 4),
    };
  }

  const customerEvents = eventsData.getByCustomerId(customerId);
  const wishlistItems = wishlistsData.getByCustomerId(customerId);
  const wishlistProductIds = new Set(wishlistItems.map((w) => String(w.productId).toLowerCase()));
  const cart = cartsData.getCart(customerId);
  const cartProductIds = new Set((cart.items || []).map((i) => String(i.productId).toLowerCase()));
  const feedbacks = feedbackData.getByCustomerId(customerId);

  const dismissedProductIds = new Set(
    feedbacks
      .filter((f) => f.action === 'RECOMMENDATION_DISMISSED')
      .map((f) => String(f.productId).toLowerCase())
  );
  const interestedProductIds = new Set(
    feedbacks
      .filter((f) => f.action === 'RECOMMENDATION_INTEREST')
      .map((f) => String(f.productId).toLowerCase())
  );
  const clickedProductIds = new Set(
    feedbacks
      .filter((f) => f.action === 'RECOMMENDATION_CLICK')
      .map((f) => String(f.productId).toLowerCase())
  );

  const industryClean = (customer.industry || 'technology').trim().toLowerCase();
  const preferredCategories = INDUSTRY_AFFINITIES[industryClean] || ['Smartphones', 'Laptops'];
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  // Track product interactions from event stream
  const productViewCounts = {};
  const productDetailCounts = {};
  const categoryInteractions = {};
  const brandInteractions = {};
  const recentProductIds = [];
  const searchQueries = [];

  for (const e of customerEvents) {
    const isRecent = new Date(e.timestamp || e.createdAt).getTime() >= dayAgo;
    const pId = e.metadata?.productId || (e.productId ? String(e.productId) : null);
    const pCat = e.metadata?.category;
    const pBrand = e.metadata?.brand;

    if (e.eventType === 'SEARCH' && e.metadata?.query) {
      searchQueries.push(String(e.metadata.query).toLowerCase());
    }

    if (pId) {
      const normId = pId.toLowerCase();
      if (e.eventType === 'PRODUCT_VIEW') {
        productViewCounts[normId] = (productViewCounts[normId] || 0) + 1;
        if (!recentProductIds.includes(normId)) recentProductIds.push(normId);
      } else if (e.eventType === 'PRODUCT_DETAIL_VIEW') {
        productDetailCounts[normId] = (productDetailCounts[normId] || 0) + 1;
        if (!recentProductIds.includes(normId)) recentProductIds.push(normId);
      }
    }

    if (pCat) {
      categoryInteractions[pCat] = (categoryInteractions[pCat] || 0) + 1;
    }
    if (pBrand) {
      brandInteractions[pBrand] = (brandInteractions[pBrand] || 0) + 1;
    }
  }

  // Score each product
  const scoredProducts = allProducts.map((product) => {
    const normId = String(product.id).toLowerCase();
    let score = 0;
    const explanationParts = [];

    // Feedback penalties / boosts
    if (dismissedProductIds.has(normId)) {
      score -= 100;
    }
    if (interestedProductIds.has(normId)) {
      score += 15;
      explanationParts.push('marked as interested in recommendations');
    }
    if (clickedProductIds.has(normId)) {
      score += 5;
    }

    // 1. Behavior Signals
    if (productViewCounts[normId]) {
      score += 5 * productViewCounts[normId];
      explanationParts.push(`you recently viewed ${product.brand} ${product.category}`);
    }
    if (productDetailCounts[normId]) {
      score += 8 * productDetailCounts[normId];
      explanationParts.push('you explored its full technical specifications');
    }

    // Searches
    for (const q of searchQueries) {
      if (
        product.name.toLowerCase().includes(q) ||
        product.brand.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q)
      ) {
        score += 5;
        explanationParts.push(`you searched for "${q}"`);
        break;
      }
    }

    // Pricing Views
    const hasPricingView = customerEvents.some((e) => e.eventType === 'PRICING_PAGE_VIEW' || e.eventType === 'PRICING_PLAN_VIEW');
    if (hasPricingView && (product.tags.includes('Enterprise') || product.tags.includes('Flagship'))) {
      score += 10;
      explanationParts.push('you checked enterprise pricing options');
    }

    // Wishlist
    if (wishlistProductIds.has(normId)) {
      score += 10;
      explanationParts.push('it is saved in your wishlist');
    } else {
      // Similar product in wishlist
      const sameCatInWishlist = wishlistItems.some((w) => {
        const itemP = productsData.getById(w.productId);
        return itemP && itemP.category === product.category;
      });
      if (sameCatInWishlist) {
        score += 8;
        explanationParts.push(`you added a similar ${product.category.toLowerCase()} to your wishlist`);
      }
    }

    // Cart
    if (cartProductIds.has(normId)) {
      score += 15;
      explanationParts.push('it is currently in your cart');
    } else {
      const sameCatInCart = (cart.items || []).some((i) => {
        const itemP = productsData.getById(i.productId);
        return itemP && itemP.category === product.category;
      });
      if (sameCatInCart) {
        score += 10;
        explanationParts.push(`you added products from this category to your cart`);
      }
    }

    // Content Download
    const downloadedResource = customerEvents.some((e) => e.eventType === 'CONTENT_DOWNLOAD');
    if (downloadedResource && (product.category === 'Laptops' || product.category === 'Smartphones')) {
      score += 8;
      explanationParts.push('you downloaded related technical guides');
    }

    // Demo requested
    const demoReq = customerEvents.some((e) => e.eventType === 'DEMO_REQUESTED');
    if (demoReq && product.tags.includes('Enterprise')) {
      score += 20;
      explanationParts.push('you requested a product demonstration');
    }

    // 2. Profile Signals
    // Industry match = +10
    if (preferredCategories.includes(product.category)) {
      score += 10;
      explanationParts.push(`it matches your ${customer.industry || 'Technology'} industry`);
    }

    // Company size match = +5
    const size = (customer.companySize || '1-10').trim();
    if (['51-200', '201-500', '500+'].includes(size) && (product.tags.includes('Enterprise') || product.tags.includes('Flagship'))) {
      score += 5;
      explanationParts.push(`tailored for organizations of size ${size}`);
    } else if (['1-10', '11-50'].includes(size) && product.price < 100000) {
      score += 5;
    }

    // Recent activity bonus = +5
    if (recentProductIds.includes(normId)) {
      score += 5;
    }

    // Base popularity fallback weight
    score += Math.round((product.rating || 4.5) * 2 + (product.reviewCount || 0) / 100);

    // Build friendly explanation string
    let explanation = '';
    if (explanationParts.length > 0) {
      // Pick top 1 or 2 distinct reasons
      const uniqueReasons = Array.from(new Set(explanationParts));
      explanation = `Recommended because ${uniqueReasons.slice(0, 2).join(' and ')}.`;
    } else if (preferredCategories.includes(product.category)) {
      explanation = `Recommended because it matches your ${customer.industry || 'Technology'} industry.`;
    } else {
      explanation = `Highly rated in ${product.category} with exceptional customer reviews.`;
    }

    return {
      ...product,
      recommendationScore: score,
      explanation,
    };
  });

  // Sort by recommendation score descending
  scoredProducts.sort((a, b) => b.recommendationScore - a.recommendationScore);

  // 1. Recommended For You (Top 4-6, excluding dismissed)
  const recommendedForYou = scoredProducts.filter((p) => !dismissedProductIds.has(String(p.id).toLowerCase())).slice(0, 5);

  // 2. Continue Exploring (Recently viewed, up to 4)
  const continueExploring = [];
  for (const rId of recentProductIds) {
    const p = allProducts.find((item) => String(item.id).toLowerCase() === rId);
    if (p && !continueExploring.some((item) => item.id === p.id)) {
      continueExploring.push(p);
    }
    if (continueExploring.length >= 4) break;
  }
  // Fallback if none viewed yet
  if (continueExploring.length === 0) {
    continueExploring.push(...allProducts.slice(0, 4));
  }

  // 3. Popular For Your Industry
  const popularForIndustry = allProducts
    .filter((p) => preferredCategories.includes(p.category))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 4)
    .map((p) => ({
      ...p,
      explanation: `Popular among organizations in the ${customer.industry || 'Technology'} sector.`,
    }));

  return {
    recommendedForYou,
    continueExploring,
    popularForIndustry,
  };
}

module.exports = {
  getRecommendations,
};
