import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { api } from '../../api/client.js';

export default function Checkout() {
  const { user, token } = useAuth();
  const { refreshCart, showToast } = useCustomer();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const productId = searchParams.get('productId');
  const qtyParam = parseInt(searchParams.get('qty'), 10) || 1;

  // Checkout items state
  const [singleProduct, setSingleProduct] = useState(null);
  const [cartData, setCartData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Address form fields
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState('560001');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');

  // Submission & Confirmed Order State
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  useEffect(() => {
    async function loadCheckoutData() {
      setLoading(true);
      try {
        if (productId) {
          // Direct single-product checkout ("Buy Now")
          const data = await api(`/customer/products/${productId}`, { token });
          setSingleProduct(data.product);
        } else {
          // Regular cart checkout
          const data = await api('/customer/cart', { token });
          setCartData(data.cart);
        }

        // Also fetch customer profile for pre-filling if needed
        const profData = await api('/customer/profile', { token });
        if (profData?.profile) {
          if (!fullName && profData.profile.name) setFullName(profData.profile.name);
          if (!email && profData.profile.email) setEmail(profData.profile.email);
          if (!phone && profData.profile.phone) setPhone(profData.profile.phone);
        }

        // Record CHECKOUT_STARTED event to automatically move stage to Negotiation (Module 7)
        api('/customer/checkout/start', {
          method: 'POST',
          token,
          body: { productId, qty: qtyParam },
        }).catch(() => {});
      } catch (err) {
        console.error('Error preparing checkout:', err);
        showToast('Error loading checkout items', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadCheckoutData();
  }, [productId, token, showToast]);

  // Calculate order items & totals
  let checkoutItems = [];
  if (singleProduct) {
    checkoutItems = [
      {
        productId: singleProduct.id,
        name: singleProduct.name,
        brand: singleProduct.brand,
        price: singleProduct.price,
        quantity: qtyParam,
        image: singleProduct.image,
        lineTotal: singleProduct.price * qtyParam,
      },
    ];
  } else if (cartData?.items) {
    checkoutItems = cartData.items;
  }

  const subtotal = checkoutItems.reduce((acc, cur) => acc + (cur.lineTotal || cur.price * cur.quantity), 0);
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax;

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!deliveryAddress.trim()) {
      showToast('Please enter your full delivery address', 'error');
      return;
    }
    if (!phone.trim()) {
      showToast('Please provide a contact phone number', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        paymentMethod,
      };

      if (singleProduct) {
        payload.productId = singleProduct.id;
        payload.quantity = qtyParam;
      } else {
        payload.items = checkoutItems;
      }

      const res = await api('/customer/orders', {
        method: 'POST',
        token,
        body: payload,
      });

      setConfirmedOrder(res.order);
      await refreshCart();
      showToast('Order confirmed successfully!', 'success');
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Order placement failed:', err);
      showToast(err.message || 'Failed to place order. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="customer-loading-state">
        <div className="spinner"></div>
        <p>Preparing your checkout order...</p>
      </div>
    );
  }

  // Order Confirmed Screen
  if (confirmedOrder) {
    const estDelivery = new Date();
    estDelivery.setDate(estDelivery.getDate() + 3);

    return (
      <div className="checkout-confirmed-page">
        <div className="confirmed-card">
          <div className="confirmed-icon">🎉</div>
          <h1 className="confirmed-title">Order Confirmed!</h1>
          <p className="confirmed-subtitle">
            Thank you for shopping with ApexTech Store. Your order has been placed successfully and is being prepared for dispatch.
          </p>

          <div className="confirmed-details-box">
            <div className="confirmed-row">
              <span className="row-label">Order Reference ID:</span>
              <strong className="order-id-badge">{confirmedOrder.orderId}</strong>
            </div>

            <div className="confirmed-row">
              <span className="row-label">Estimated Delivery:</span>
              <span><strong>{estDelivery.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
            </div>

            <div className="confirmed-row">
              <span className="row-label">Delivery Address:</span>
              <span>
                {confirmedOrder.fullName}<br />
                {confirmedOrder.deliveryAddress}, {confirmedOrder.city}, {confirmedOrder.state} - {confirmedOrder.pincode}<br />
                Phone: {confirmedOrder.phone}
              </span>
            </div>

            <div className="confirmed-row">
              <span className="row-label">Payment Method:</span>
              <span>{confirmedOrder.paymentMethod} (Confirmed)</span>
            </div>

            <div className="confirmed-row total-row">
              <span className="row-label">Total Amount Paid / Payable:</span>
              <strong className="total-amount-val">₹{Number(confirmedOrder.totalAmount).toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div className="confirmed-items-list">
            <h4>Ordered Items ({confirmedOrder.items?.length || 1})</h4>
            {(confirmedOrder.items || []).map((item, idx) => (
              <div key={idx} className="confirmed-item-line">
                <span className="item-name">{item.name} × {item.quantity}</span>
                <span className="item-val">₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>

          <div className="confirmed-actions-row">
            <Link to="/customer/shop" className="btn btn-primary btn-lg">
              Continue Shopping
            </Link>
            <Link to="/customer/profile" className="btn btn-outline btn-lg">
              View Order in Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Empty checkout state
  if (checkoutItems.length === 0) {
    return (
      <div className="checkout-empty-state">
        <div className="empty-icon">🛒</div>
        <h2>Your checkout order is empty</h2>
        <p>Add products to your cart or click "Buy Now" on any product to proceed with direct checkout.</p>
        <Link to="/customer/shop" className="btn btn-primary btn-lg">
          Explore Product Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-header-banner">
        <h1 className="checkout-page-title">Secure Checkout</h1>
        <p className="checkout-subtitle">Enter your delivery details to complete your order with genuine warranty.</p>
      </div>

      <div className="checkout-grid-layout">
        {/* Left Column: Delivery Address & Payment Form */}
        <div className="checkout-form-panel">
          <form onSubmit={handleSubmitOrder} className="checkout-form">
            <h2 className="section-title">1. Contact & Delivery Address</h2>

            <div className="form-group">
              <label htmlFor="chk-name" className="form-label">Full Name *</label>
              <input
                id="chk-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="form-control"
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="form-row-two">
              <div className="form-group">
                <label htmlFor="chk-email" className="form-label">Email Address *</label>
                <input
                  id="chk-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-control"
                  placeholder="name@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="chk-phone" className="form-label">Contact Phone Number *</label>
                <input
                  id="chk-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="form-control"
                  placeholder="+91-9876543210"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="chk-address" className="form-label">Street Address & Flat / House No. *</label>
              <textarea
                id="chk-address"
                rows="3"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
                className="form-control"
                placeholder="Flat / House No., Building Name, Street / Road, Landmark"
              />
            </div>

            <div className="form-row-three">
              <div className="form-group">
                <label htmlFor="chk-city" className="form-label">City *</label>
                <input
                  id="chk-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="chk-state" className="form-label">State *</label>
                <input
                  id="chk-state"
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="chk-pin" className="form-label">Postal Pincode *</label>
                <input
                  id="chk-pin"
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  required
                  className="form-control"
                  placeholder="560001"
                />
              </div>
            </div>

            <h2 className="section-title mt-4">2. Select Payment Method</h2>

            <div className="payment-options-grid">
              <label className={`payment-option-card ${paymentMethod === 'Cash on Delivery' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Cash on Delivery"
                  checked={paymentMethod === 'Cash on Delivery'}
                  onChange={() => setPaymentMethod('Cash on Delivery')}
                />
                <div className="payment-option-info">
                  <strong>💵 Cash on Delivery</strong>
                  <small>Pay with cash or UPI upon package handover</small>
                </div>
              </label>

              <label className={`payment-option-card ${paymentMethod === 'UPI / Card' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="UPI / Card"
                  checked={paymentMethod === 'UPI / Card'}
                  onChange={() => setPaymentMethod('UPI / Card')}
                />
                <div className="payment-option-info">
                  <strong>💳 UPI / Debit / Credit Card (Simulated)</strong>
                  <small>Instant simulated digital payment gateway</small>
                </div>
              </label>

              <label className={`payment-option-card ${paymentMethod === 'Net Banking' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Net Banking"
                  checked={paymentMethod === 'Net Banking'}
                  onChange={() => setPaymentMethod('Net Banking')}
                />
                <div className="payment-option-info">
                  <strong>🏦 Net Banking & Corporate Wire</strong>
                  <small>Direct instant settlement via bank authorization</small>
                </div>
              </label>
            </div>

            <div className="checkout-submit-row">
              <button
                type="submit"
                className="btn btn-success btn-block btn-lg btn-place-order"
                disabled={submitting}
              >
                {submitting ? 'Placing Order...' : `Place Order (₹${total.toLocaleString('en-IN')})`}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Order Summary */}
        <div className="checkout-summary-panel">
          <div className="summary-sticky-card">
            <h3 className="summary-card-title">Order Summary ({checkoutItems.length} {checkoutItems.length === 1 ? 'item' : 'items'})</h3>

            <div className="checkout-items-preview">
              {checkoutItems.map((item, idx) => (
                <div key={idx} className="preview-item-row">
                  <img
                    src={item.image || (item.product && item.product.image) || `/products/${item.productId}.svg`}
                    alt={item.name}
                    className="preview-item-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/products/prod-phone-1.svg';
                    }}
                  />
                  <div className="preview-item-info">
                    <strong className="item-title">{item.name}</strong>
                    <span className="item-qty-price">
                      Qty: {item.quantity} × ₹{Number(item.price).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span className="preview-item-subtotal">
                    ₹{((Number(item.price) || 0) * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-calc-box">
              <div className="calc-row">
                <span>Subtotal:</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="calc-row">
                <span>GST (18% Included):</span>
                <span>₹{tax.toLocaleString('en-IN')}</span>
              </div>
              <div className="calc-row">
                <span>Shipping:</span>
                <span className="free-shipping-text">FREE</span>
              </div>
              <hr className="summary-divider" />
              <div className="calc-row grand-total-row">
                <span>Total Amount:</span>
                <strong className="grand-total-val">₹{total.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="security-badges-box">
              <div className="badge-item">🔒 256-Bit SSL Encrypted Checkout</div>
              <div className="badge-item">🛡️ 100% Genuine Retail Guarantee</div>
              <div className="badge-item">🔄 7-Day Replacement Protection</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
