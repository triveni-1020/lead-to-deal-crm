import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { api } from '../../api/client.js';
import ProductCard from '../../components/ProductCard.jsx';

export default function ProductDetails() {
  const { productId } = useParams();
  const { token } = useAuth();
  const { wishlistIds, toggleWishlist, addToCart, openDemoModal, showToast } = useCustomer();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('specs'); // 'specs' | 'features' | 'overview'

  useEffect(() => {
    async function loadDetails() {
      setLoading(true);
      try {
        const data = await api(`/customer/products/${productId}`, { token });
        setProduct(data.product);
        setRelatedProducts(data.relatedProducts || []);
      } catch (err) {
        showToast(err.message || 'Failed to load product details', 'error');
      } finally {
        setLoading(false);
      }
    }
    if (productId) {
      loadDetails();
      window.scrollTo(0, 0);
    }
  }, [productId, token, showToast]);

  if (loading) {
    return (
      <div className="product-details-loading">
        <div className="spinner"></div>
        <p>Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-details-not-found">
        <h2>Product Not Found</h2>
        <p>The product you requested does not exist or has been discontinued.</p>
        <Link to="/customer/shop" className="btn btn-primary">
          Back to Shop
        </Link>
      </div>
    );
  }

  const isSavedInWishlist = wishlistIds.has(String(product.id));
  const formattedPrice = Number(product.price).toLocaleString('en-IN');

  const handleAddToCart = async () => {
    await addToCart(product.id, quantity, product.name);
  };

  const handleBuyNow = async () => {
    // Record BUY_NOW event for salesperson CRM intelligence in background
    if (token) {
      api('/customer/events', {
        method: 'POST',
        token,
        body: {
          eventType: 'BUY_NOW',
          description: `Clicked Buy Now for ${product.name} (Qty: ${quantity})`,
          metadata: {
            productId: product.id,
            productName: product.name,
            price: product.price,
            quantity,
            brand: product.brand,
          },
        },
      }).catch(() => {});
    }
    navigate(`/customer/checkout?productId=${product.id}&qty=${quantity}`);
  };

  return (
    <div className="product-details-page">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs-nav">
        <Link to="/customer">Home</Link>
        <span className="crumb-sep">/</span>
        <Link to="/customer/shop">Shop</Link>
        <span className="crumb-sep">/</span>
        <Link to={`/customer/shop?category=${encodeURIComponent(product.category)}`}>
          {product.category}
        </Link>
        <span className="crumb-sep">/</span>
        <span className="crumb-current">{product.name}</span>
      </nav>

      {/* Main Product Showcase Header */}
      <div className="product-details-main-grid">
        {/* Left Column: Product Image */}
        <div className="product-gallery-wrap">
          <div className="product-main-image-box">
            <img
              src={product.image || `/products/${product.id}.svg`}
              alt={product.name}
              className="product-main-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/products/prod-phone-1.svg';
              }}
            />
            {product.tags && product.tags.length > 0 && (
              <div className="product-tag-badges">
                {product.tags.map((t) => (
                  <span key={t} className="tag-badge">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Title, Rating, Price, Actions */}
        <div className="product-info-panel">
          <div className="product-meta-header">
            <span className="brand-pill">{product.brand}</span>
            <span className="category-pill">{product.category}</span>
          </div>

          <h1 className="product-title">{product.name}</h1>

          {/* Rating & Review Count */}
          <div className="product-rating-row">
            <div className="stars-box">
              <span className="star-icon">★</span>
              <strong>{product.rating || '4.8'}</strong>
            </div>
            <span className="review-count">({product.reviewCount || 120} verified customer reviews)</span>
            <span className="divider">•</span>
            <span className="sku-tag">SKU: {product.id}</span>
          </div>

          {/* Price Box */}
          <div className="product-price-section">
            <div className="price-tag-large">
              <span className="currency-symbol">₹</span>
              <span className="price-val">{formattedPrice}</span>
              <span className="tax-inclusive-tag">(Inclusive of all taxes)</span>
            </div>
            <p className="free-delivery-badge">
              🚚 Free Express Delivery Available • Dispatched within 24 hours
            </p>
          </div>

          {/* Stock Availability */}
          <div className="product-stock-status">
            {product.available && product.stock > 0 ? (
              <div className="stock-alert in-stock">
                <span className="status-indicator"></span>
                <span><strong>In Stock</strong> — {product.stock} units available</span>
              </div>
            ) : (
              <div className="stock-alert out-of-stock">
                <span className="status-indicator"></span>
                <span><strong>Currently Backordered</strong> — Estimated dispatch in 5-7 days</span>
              </div>
            )}
          </div>

          {/* Short Description */}
          <p className="product-short-desc">{product.description}</p>

          {/* Quantity & Action Buttons */}
          <div className="product-actions-box">
            <div className="quantity-selector-row">
              <label htmlFor="qty-select">Quantity:</label>
              <div className="quantity-stepper">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="step-btn"
                >
                  -
                </button>
                <input
                  id="qty-select"
                  type="number"
                  min="1"
                  max={product.stock || 50}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="qty-number-input"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="step-btn"
                >
                  +
                </button>
              </div>
            </div>

            {/* Primary Action Buttons: Add to Cart, Buy Now, Request Free Demo */}
            <div className="primary-buttons-row">
              <button
                type="button"
                className="btn btn-primary btn-lg btn-add-to-cart"
                onClick={handleAddToCart}
                disabled={!product.available || product.stock <= 0}
              >
                🛒 Add to Cart
              </button>

              <button
                type="button"
                className="btn btn-success btn-lg btn-buy-now-large"
                onClick={handleBuyNow}
                disabled={!product.available || product.stock <= 0}
              >
                ⚡ Buy Now
              </button>

              <button
                type="button"
                className="btn btn-outline btn-lg btn-request-demo-large"
                onClick={() => openDemoModal(product)}
              >
                📅 Request Free Demo
              </button>
            </div>

            {/* Secondary Buttons: Wishlist & View on Amazon */}
            <div className="secondary-buttons-row">
              <button
                type="button"
                className={`btn btn-outline btn-wishlist-toggle ${isSavedInWishlist ? 'active' : ''}`}
                onClick={() => toggleWishlist(product.id, product.name)}
              >
                {isSavedInWishlist ? '❤️ In Wishlist' : '🤍 Save to Wishlist'}
              </button>

              {product.amazonUrl && (
                <a
                  href={product.amazonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-amazon-direct"
                >
                  <span className="amazon-icon">🛒</span> View on Amazon
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section: Specifications, Key Features, Overview */}
      <section className="product-details-tabs-section">
        <div className="details-tab-nav">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
            onClick={() => setActiveTab('specs')}
          >
            Technical Specifications
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            Key Highlights & Features
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Warranty & Support
          </button>
        </div>

        <div className="tab-content-container">
          {activeTab === 'specs' && product.specifications && (
            <div className="specs-table-wrap">
              <table className="specs-table">
                <tbody>
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <tr key={key}>
                      <td className="spec-label">{key}</td>
                      <td className="spec-value">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="features-list-wrap">
              <ul className="features-bullet-list">
                {(product.features || [
                  `Flagship hardware design engineered by ${product.brand}`,
                  'Industry-leading performance with next-generation processing unit',
                  'Comprehensive 1-year manufacturer guarantee with nationwide support centers',
                  'Certified IP water and dust resistance standards',
                  'High-speed fast charging and optimized energy efficiency',
                ]).map((f, idx) => (
                  <li key={idx} className="feature-item">
                    <span className="feature-check">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="overview-tab-content">
              <h3>Genuine Product & Warranty Assurance</h3>
              <p>
                All devices procured through ApexTech are 100% genuine retail units with authorized manufacturer
                warranties, authentic serial numbers, and invoice documentation for immediate warranty coverage.
              </p>
              <div className="warranty-badges-row">
                <div className="warranty-badge-box">
                  <span className="badge-icon">🛡️</span>
                  <strong>1 Year Warranty</strong>
                  <small>Full manufacturer repair or replacement</small>
                </div>
                <div className="warranty-badge-box">
                  <span className="badge-icon">🔄</span>
                  <strong>7-Day Replacement</strong>
                  <small>Hassle-free replacement for any defects</small>
                </div>
                <div className="warranty-badge-box">
                  <span className="badge-icon">🚚</span>
                  <strong>Secure Dispatch</strong>
                  <small>Insured transit with tamper-evident packaging</small>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Related Products Grid */}
      {relatedProducts.length > 0 && (
        <section className="related-products-section">
          <div className="section-header">
            <h2 className="section-title">Customers Also Viewed</h2>
            <Link to={`/customer/shop?category=${encodeURIComponent(product.category)}`} className="section-see-all">
              More in {product.category} →
            </Link>
          </div>
          <div className="product-grid">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
