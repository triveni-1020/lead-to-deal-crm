import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { api } from '../../api/client.js';

export default function Wishlist() {
  const { token } = useAuth();
  const { toggleWishlist, addToCart, showToast } = useCustomer();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    try {
      const data = await api('/customer/wishlist', { token });
      setWishlistItems(data.wishlist || []);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      showToast('Failed to load wishlist items', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleRemove = async (productId, productName) => {
    await toggleWishlist(productId, productName);
    setWishlistItems((prev) => prev.filter((i) => String(i.productId) !== String(productId)));
  };

  const handleMoveToCart = async (product) => {
    await addToCart(product.id, 1, product.name);
  };

  if (loading) {
    return (
      <div className="customer-loading-state">
        <div className="spinner"></div>
        <p>Loading your saved wishlist...</p>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">My Wishlist</h1>
          <p className="page-subtitle">
            Keep track of products you are considering for future enterprise procurement.
          </p>
        </div>
        <span className="items-count-badge">
          {wishlistItems.length} {wishlistItems.length === 1 ? 'Item' : 'Items'} Saved
        </span>
      </div>

      {wishlistItems.length > 0 ? (
        <div className="wishlist-grid">
          {wishlistItems.map((item) => {
            const product = item.product;
            if (!product) return null;
            const formattedPrice = Number(product.price).toLocaleString('en-IN');

            return (
              <div key={item.id || item.productId} className="wishlist-card">
                <div className="wishlist-img-box">
                  <Link to={`/customer/products/${product.id}`}>
                    <img
                      src={product.image || `/products/${product.id}.svg`}
                      alt={product.name}
                      className="wishlist-img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/products/prod-phone-1.svg';
                      }}
                    />
                  </Link>
                </div>

                <div className="wishlist-info">
                  <span className="product-brand">{product.brand}</span>
                  <Link to={`/customer/products/${product.id}`} className="wishlist-title-link">
                    <h3>{product.name}</h3>
                  </Link>

                  <div className="wishlist-meta-row">
                    <div className="rating-pill">
                      <span>★</span> {product.rating || '4.8'}
                    </div>
                    {product.available && product.stock > 0 ? (
                      <span className="stock-tag in-stock">In Stock</span>
                    ) : (
                      <span className="stock-tag out-of-stock">Out of Stock</span>
                    )}
                  </div>

                  <div className="wishlist-price-tag">
                    <span className="curr">₹</span>
                    <span className="val">{formattedPrice}</span>
                  </div>

                  <div className="wishlist-card-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleMoveToCart(product)}
                      disabled={!product.available || product.stock <= 0}
                    >
                      🛒 Add to Cart
                    </button>
                    <Link
                      to={`/customer/checkout?productId=${product.id}&qty=1`}
                      className="btn btn-success btn-sm"
                    >
                      ⚡ Buy Now
                    </Link>
                    <Link
                      to={`/customer/products/${product.id}`}
                      className="btn btn-outline btn-sm"
                    >
                      Details
                    </Link>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm text-danger"
                      onClick={() => handleRemove(product.id, product.name)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-cart-wishlist-box">
          <div className="empty-icon">🤍</div>
          <h2>Your wishlist is currently empty</h2>
          <p>Explore our catalog to save enterprise smartphones, workstations, and audio gear for later review.</p>
          <Link to="/customer/shop" className="btn btn-primary btn-lg">
            Explore Product Catalog
          </Link>
        </div>
      )}
    </div>
  );
}
