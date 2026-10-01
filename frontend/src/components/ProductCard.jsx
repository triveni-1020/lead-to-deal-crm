import { Link, useNavigate } from 'react-router-dom';
import { useCustomer } from '../context/CustomerContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function ProductCard({ product, showExplanation = false, onFeedback = null }) {
  const { wishlistIds, toggleWishlist, addToCart, openDemoModal } = useCustomer();
  const { token } = useAuth();
  const navigate = useNavigate();
  const isSaved = wishlistIds.has(String(product.id));

  // Extract up to 3 key specs to display cleanly
  const renderSpecPills = () => {
    if (!product.specifications) return null;
    const entries = Object.entries(product.specifications).slice(0, 3);
    return (
      <div className="product-spec-pills">
        {entries.map(([key, val]) => (
          <span key={key} className="spec-pill" title={`${key}: ${val}`}>
            {val}
          </span>
        ))}
      </div>
    );
  };

  const formattedPrice = Number(product.price).toLocaleString('en-IN');

  const handleBuyNow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Record BUY_NOW event for salesperson CRM intelligence in background
    if (token) {
      api('/customer/events', {
        method: 'POST',
        token,
        body: {
          eventType: 'BUY_NOW',
          description: `Clicked Buy Now for ${product.name}`,
          metadata: {
            productId: product.id,
            productName: product.name,
            price: product.price,
            brand: product.brand,
          },
        },
      }).catch(() => {});
    }
    navigate(`/customer/checkout?productId=${product.id}&qty=1`);
  };

  return (
    <div className="product-card">
      {/* Recommendation reason banner */}
      {showExplanation && product.explanation && (
        <div className="recommendation-badge">
          <span className="badge-sparkle">✨</span>
          <span className="badge-text">{product.explanation}</span>
          {onFeedback && (
            <div className="recommendation-feedback-btns">
              <button
                type="button"
                className="feedback-mini-btn btn-like"
                title="I like this recommendation"
                onClick={(e) => {
                  e.stopPropagation();
                  onFeedback(product.id, 'RECOMMENDATION_INTEREST', product.explanation);
                }}
              >
                👍
              </button>
              <button
                type="button"
                className="feedback-mini-btn btn-dismiss"
                title="Dismiss recommendation"
                onClick={(e) => {
                  e.stopPropagation();
                  onFeedback(product.id, 'RECOMMENDATION_DISMISSED', product.explanation);
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* Image container & Wishlist heart toggle */}
      <div className="product-card-img-wrap">
        <Link to={`/customer/products/${product.id}`} className="img-link">
          <img
            src={product.image || `/products/${product.id}.svg`}
            alt={product.name}
            className="product-card-img"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/products/prod-phone-1.svg';
            }}
          />
        </Link>

        {/* Wishlist Button */}
        <button
          type="button"
          className={`wishlist-heart-btn ${isSaved ? 'saved' : ''}`}
          onClick={() => toggleWishlist(product.id, product.name)}
          title={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-label="Wishlist"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isSaved ? '#ef4444' : 'none'} stroke={isSaved ? '#ef4444' : 'currentColor'} strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>

        {/* Category Pill */}
        <span className="product-category-tag">{product.category}</span>
      </div>

      {/* Product Content Body */}
      <div className="product-card-body">
        <div className="product-brand-line">
          <span className="product-brand">{product.brand}</span>
          <div className="product-rating-box">
            <span className="star-icon">★</span>
            <span className="rating-score">{product.rating || '4.8'}</span>
            <span className="rating-count">({product.reviewCount || 120})</span>
          </div>
        </div>

        <Link to={`/customer/products/${product.id}`} className="product-card-title-link">
          <h3 className="product-card-title">{product.name}</h3>
        </Link>

        {/* Important Specifications */}
        {renderSpecPills()}

        {/* Stock Status */}
        <div className="product-stock-line">
          {product.available && product.stock > 0 ? (
            <span className="stock-tag in-stock">
              <span className="stock-dot"></span> In Stock ({product.stock} units)
            </span>
          ) : (
            <span className="stock-tag out-of-stock">
              <span className="stock-dot"></span> Out of Stock
            </span>
          )}
        </div>

        {/* Price Box */}
        <div className="product-card-price-row">
          <div className="product-price-box">
            <span className="price-currency">₹</span>
            <span className="price-amount">{formattedPrice}</span>
          </div>

          {product.amazonUrl && (
            <a
              href={product.amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-amazon-link"
              title="View on Amazon"
            >
              <span className="amazon-logo-icon">🛒</span> Amazon
            </a>
          )}
        </div>

        {/* Action Buttons: Add to Cart, Buy Now, and Request Free Demo */}
        <div className="product-card-btns-grid">
          <button
            type="button"
            className="btn btn-outline btn-sm btn-add-cart"
            onClick={() => addToCart(product.id, 1, product.name)}
            disabled={!product.available || product.stock <= 0}
          >
            Add to Cart
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm btn-buy-now"
            onClick={handleBuyNow}
            disabled={!product.available || product.stock <= 0}
          >
            ⚡ Buy Now
          </button>
        </div>

        {/* Request Free Demo & Details */}
        <div className="product-card-demo-row">
          <button
            type="button"
            className="btn-demo-card"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openDemoModal(product);
            }}
            title="Schedule a 100% free live product demonstration"
          >
            📅 Request Free Demo
          </button>
          <Link
            to={`/customer/products/${product.id}`}
            className="card-details-text-link"
          >
            Details →
          </Link>
        </div>
      </div>
    </div>
  );
}
