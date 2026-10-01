import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { api } from '../../api/client.js';
import ProductCard from '../../components/ProductCard.jsx';

export default function CustomerDashboard() {
  const { user, token } = useAuth();
  const { showToast } = useCustomer();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [heroSearch, setHeroSearch] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      const [dash, prodData] = await Promise.all([
        api('/customer/dashboard', { token }),
        api('/customer/products', { token }),
      ]);
      setDashboardData(dash);
      setAllProducts(prodData.products || []);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      navigate(`/customer/shop?q=${encodeURIComponent(heroSearch.trim())}`);
    }
  };

  const handleRecommendationFeedback = async (productId, action, reason) => {
    try {
      await api('/customer/recommendations/feedback', {
        method: 'POST',
        token,
        body: { productId, action, reason },
      });
      showToast(action === 'RECOMMENDATION_DISMISSED' ? 'Recommendation dismissed' : 'Preference saved!');
      fetchDashboard();
    } catch (err) {
      showToast(err.message || 'Feedback error', 'error');
    }
  };

  if (loading) {
    return (
      <div className="customer-loading-state">
        <div className="spinner"></div>
        <p>Loading the store...</p>
      </div>
    );
  }

  const customer = dashboardData?.customer || user;
  const recs = dashboardData?.recommendations || {};
  const recommendedForYou = recs.recommendedForYou || allProducts.slice(0, 4);
  const continueExploring = recs.continueExploring || allProducts.slice(4, 8);
  const popularProducts = allProducts.filter((p) => (p.rating || 0) >= 4.8).slice(0, 4);
  const stats = dashboardData?.stats || { wishlistCount: 0, cartItemCount: 0, ordersCount: 0 };

  const categories = [
    { name: 'Smartphones', icon: '📱', color: '#e0f2fe' },
    { name: 'Laptops', icon: '💻', color: '#fef3c7' },
    { name: 'Audio', icon: '🎧', color: '#f3e8ff' },
    { name: 'Tablets', icon: '📋', color: '#dcfce7' },
    { name: 'Smartwatches', icon: '⌚', color: '#ffe4e6' },
    { name: 'Accessories', icon: '🔌', color: '#e0e7ff' },
  ];

  return (
    <div className="customer-dashboard-page">
      {/* 1. Hero Welcome & Search Banner */}
      <section className="customer-hero-card">
        <div className="hero-content">
          <div className="hero-tag">Official Store</div>
          <h1 className="hero-title">Welcome back, {customer?.name || 'Valued Customer'}!</h1>
          <p className="hero-subtitle">
            Explore authentic flagship electronics, high-speed workstations, audio gear, and accessories.
          </p>

          {/* Integrated Hero Search Form */}
          <form className="hero-search-form" onSubmit={handleHeroSearch}>
            <input
              type="text"
              placeholder="Search Samsung Galaxy, iPhone 16, MacBook, Sony ANC..."
              value={heroSearch}
              onChange={(e) => setHeroSearch(e.target.value)}
              className="hero-search-input"
            />
            <button type="submit" className="btn btn-primary hero-search-submit">
              Search Products
            </button>
          </form>
        </div>

        {/* Quick Customer Stats */}
        <div className="hero-stats-row">
          <Link to="/customer/wishlist" className="hero-stat-box">
            <span className="stat-num">{stats.wishlistCount}</span>
            <span className="stat-label">Saved in Wishlist</span>
          </Link>
          <Link to="/customer/cart" className="hero-stat-box">
            <span className="stat-num">{stats.cartItemCount}</span>
            <span className="stat-label">Items in Cart</span>
          </Link>
          <Link to="/customer/profile#orders" className="hero-stat-box">
            <span className="stat-num">{stats.ordersCount}</span>
            <span className="stat-label">Past Orders</span>
          </Link>
        </div>
      </section>

      {/* 2. Shop By Category Quick Bar */}
      <section className="dashboard-section category-browse-section">
        <div className="section-header">
          <div>
            <div className="section-kicker">Explore Hardware</div>
            <h2 className="section-title">Shop by Category</h2>
          </div>
          <Link to="/customer/categories" className="section-see-all">
            All Categories →
          </Link>
        </div>

        <div className="home-categories-grid">
          {categories.map((c) => (
            <Link
              key={c.name}
              to={`/customer/shop?category=${encodeURIComponent(c.name)}`}
              className="home-category-card"
            >
              <div className="home-category-icon" style={{ backgroundColor: c.color }}>
                {c.icon}
              </div>
              <span className="home-category-title">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Recommended For You */}
      <section className="dashboard-section">
        <div className="section-header">
          <div>
            <div className="section-kicker">Tailored For You</div>
            <h2 className="section-title">Recommended For You</h2>
          </div>
          <Link to="/customer/shop" className="section-see-all">
            View All Products →
          </Link>
        </div>

        {recommendedForYou.length > 0 ? (
          <div className="product-grid">
            {recommendedForYou.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                showExplanation={true}
                onFeedback={handleRecommendationFeedback}
              />
            ))}
          </div>
        ) : (
          <p className="empty-state-notice">Browse our catalog to receive personalized product recommendations.</p>
        )}
      </section>

      {/* 4. Continue Exploring */}
      {continueExploring.length > 0 && (
        <section className="dashboard-section">
          <div className="section-header">
            <div>
              <div className="section-kicker">Discovery Feed</div>
              <h2 className="section-title">Continue Exploring</h2>
            </div>
            <Link to="/customer/shop" className="section-see-all">
              Browse More →
            </Link>
          </div>

          <div className="product-grid">
            {continueExploring.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 5. Popular Products / Bestsellers */}
      {popularProducts.length > 0 && (
        <section className="dashboard-section">
          <div className="section-header">
            <div>
              <div className="section-kicker">Highest Rated</div>
              <h2 className="section-title">Popular Bestsellers</h2>
            </div>
            <Link to="/customer/shop?sort=rating" className="section-see-all">
              Top Rated Products →
            </Link>
          </div>

          <div className="product-grid">
            {popularProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 6. Promotional Store Trust Banner */}
      <section className="store-trust-banner">
        <div className="trust-card">
          <span className="trust-icon">🚚</span>
          <div>
            <strong>Free Express Delivery</strong>
            <small>Dispatched safely across India within 24 hours</small>
          </div>
        </div>
        <div className="trust-card">
          <span className="trust-icon">🛡️</span>
          <div>
            <strong>100% Genuine Units</strong>
            <small>Authorized manufacturer warranty included</small>
          </div>
        </div>
        <div className="trust-card">
          <span className="trust-icon">🔄</span>
          <div>
            <strong>7-Day Easy Replacement</strong>
            <small>Hassle-free replacement for any transit defects</small>
          </div>
        </div>
      </section>
    </div>
  );
}
