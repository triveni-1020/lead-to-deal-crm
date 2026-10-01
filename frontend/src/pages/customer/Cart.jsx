import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { api } from '../../api/client.js';

export default function Cart() {
  const { token } = useAuth();
  const { refreshCart, showToast } = useCustomer();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], subtotal: 0, tax: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    try {
      const data = await api('/customer/cart', { token });
      setCart(data.cart || { items: [], subtotal: 0, tax: 0, total: 0 });
    } catch (err) {
      console.error('Error fetching cart:', err);
      showToast('Failed to load cart items', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleUpdateQty = async (productId, currentQty, delta) => {
    const newQty = currentQty + delta;
    try {
      if (newQty <= 0) {
        await api(`/customer/cart/${productId}`, { method: 'DELETE', token });
        showToast('Item removed from cart');
      } else {
        await api(`/customer/cart/${productId}`, {
          method: 'PUT',
          token,
          body: { quantity: newQty },
        });
      }
      await fetchCart();
      await refreshCart();
    } catch (err) {
      showToast(err.message || 'Error updating cart item', 'error');
    }
  };

  const handleRemove = async (productId) => {
    try {
      await api(`/customer/cart/${productId}`, { method: 'DELETE', token });
      showToast('Item removed from cart');
      await fetchCart();
      await refreshCart();
    } catch (err) {
      showToast(err.message || 'Error removing item', 'error');
    }
  };

  const handleProceedToCheckout = () => {
    navigate('/customer/checkout');
  };

  if (loading) {
    return (
      <div className="customer-loading-state">
        <div className="spinner"></div>
        <p>Loading your shopping cart...</p>
      </div>
    );
  }

  const items = cart.items || [];
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="cart-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Shopping Cart</h1>
          <p className="page-subtitle">
            Review your selected devices, update quantities, and proceed to checkout.
          </p>
        </div>
        <span className="items-count-badge">
          {totalUnits} {totalUnits === 1 ? 'Item' : 'Items'} in Cart
        </span>
      </div>

      {items.length > 0 ? (
        <div className="cart-layout-grid">
          {/* Cart Items List */}
          <div className="cart-items-column">
            {items.map((item) => {
              const product = item.product;
              if (!product) return null;
              const formattedPrice = Number(product.price).toLocaleString('en-IN');
              const formattedLineTotal = Number(item.lineTotal || product.price * item.quantity).toLocaleString('en-IN');

              return (
                <div key={item.productId} className="cart-item-card">
                  <div className="cart-item-img-box">
                    <Link to={`/customer/products/${product.id}`}>
                      <img
                        src={product.image || `/products/${product.id}.svg`}
                        alt={product.name}
                        className="cart-item-img"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/products/prod-phone-1.svg';
                        }}
                      />
                    </Link>
                  </div>

                  <div className="cart-item-details">
                    <div className="cart-item-main">
                      <span className="product-brand">{product.brand}</span>
                      <Link to={`/customer/products/${product.id}`} className="cart-item-title-link">
                        <h3>{product.name}</h3>
                      </Link>

                      <div className="cart-item-meta">
                        <span className="cat-tag">{product.category}</span>
                        {product.available && product.stock > 0 ? (
                          <span className="stock-tag in-stock">In Stock</span>
                        ) : (
                          <span className="stock-tag out-of-stock">Backordered</span>
                        )}
                      </div>
                    </div>

                    <div className="cart-item-pricing-row">
                      {/* Quantity Stepper */}
                      <div className="quantity-controls">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => handleUpdateQty(item.productId, item.quantity, -1)}
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="qty-val">{item.quantity}</span>
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => handleUpdateQty(item.productId, item.quantity, 1)}
                          title="Increase quantity"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="btn-remove-item"
                          onClick={() => handleRemove(item.productId)}
                          title="Remove from cart"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Price Calculation */}
                      <div className="cart-item-subtotal-box">
                        <div className="unit-price-sub">₹{formattedPrice} each</div>
                        <div className="total-line-price">₹{formattedLineTotal}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary Sidebar */}
          <div className="cart-summary-column">
            <div className="cart-summary-card">
              <h2 className="summary-title">Order Summary</h2>

              <div className="summary-lines">
                <div className="summary-line">
                  <span>Subtotal ({totalUnits} items):</span>
                  <span>₹{Number(cart.subtotal).toLocaleString('en-IN')}</span>
                </div>
                <div className="summary-line">
                  <span>GST (18% Included):</span>
                  <span>₹{Number(cart.tax).toLocaleString('en-IN')}</span>
                </div>
                <div className="summary-line">
                  <span>Standard Delivery:</span>
                  <span className="text-success font-medium">FREE</span>
                </div>
                <hr className="summary-divider" />
                <div className="summary-line total-line">
                  <strong>Estimated Total:</strong>
                  <strong>₹{Number(cart.total).toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-block btn-lg btn-checkout"
                onClick={handleProceedToCheckout}
                disabled={items.length === 0}
              >
                Proceed to Checkout →
              </button>

              <div className="checkout-trust-notes">
                <p>🔒 <strong>Secure Checkout</strong>: Full SSL encryption & data privacy.</p>
                <p>🛡️ 100% genuine retail units with authorized manufacturer warranty.</p>
                <p>🔄 7-day hassle-free replacement on all hardware items.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-cart-wishlist-box">
          <div className="empty-icon">🛒</div>
          <h2>Your shopping cart is empty</h2>
          <p>Browse our catalog to add flagship smartphones, workstations, audio systems, and accessories.</p>
          <Link to="/customer/shop" className="btn btn-primary btn-lg">
            Explore Product Catalog
          </Link>
        </div>
      )}
    </div>
  );
}
