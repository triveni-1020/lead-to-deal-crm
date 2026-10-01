import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { api } from '../../api/client.js';

export default function Profile() {
  const { user, token, updateUser } = useAuth();
  const { showToast } = useCustomer();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function loadProfileAndOrders() {
      try {
        const [profileData, ordersData] = await Promise.all([
          api('/customer/profile', { token }),
          api('/customer/orders', { token }),
        ]);

        const p = profileData.profile || user || {};
        setName(p.name || '');
        setEmail(p.email || '');
        setPhone(p.phone || '');
        setOrders(ordersData.orders || profileData.orders || []);
      } catch (err) {
        console.error('Error fetching profile or orders:', err);
        showToast('Failed to load profile details', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadProfileAndOrders();
  }, [token, user, showToast]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api('/customer/profile', {
        method: 'PUT',
        token,
        body: {
          name: name.trim(),
          phone: phone.trim(),
        },
      });

      if (updateUser) {
        updateUser(data.profile);
      }
      setIsEditing(false);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Error updating profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="customer-loading-state">
        <div className="spinner"></div>
        <p>Loading your profile and orders...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Profile Header Card */}
      <div className="profile-container-card">
        <div className="profile-header-banner">
          <div className="profile-avatar-large">
            {name ? name.charAt(0).toUpperCase() : 'C'}
          </div>
          <div className="profile-header-meta">
            <h1 className="profile-name">{name || 'Customer Account'}</h1>
            <p className="profile-role-sub">
              ApexTech Verified Customer Account • {email}
            </p>
          </div>

          <div className="profile-header-actions">
            {!isEditing ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setIsEditing(true)}
              >
                ✏️ Edit Profile
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Profile Info / Edit Form */}
        <div className="profile-body-section">
          {isEditing ? (
            <form onSubmit={handleSave} className="profile-form-grid">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-control"
                  placeholder="+91-9876543210"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="form-control form-control-disabled"
                />
                <small className="form-hint">Email is linked to account authentication.</small>
              </div>

              <div className="form-footer-row">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-details-display">
              <div className="detail-item">
                <span className="detail-label">Full Name:</span>
                <strong className="detail-value">{name || 'Not provided'}</strong>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email Address:</span>
                <strong className="detail-value">{email}</strong>
              </div>
              <div className="detail-item">
                <span className="detail-label">Contact Phone:</span>
                <strong className="detail-value">{phone || 'Not provided'}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer Order History Section */}
      <section id="orders" className="orders-history-section">
        <div className="section-header">
          <div>
            <div className="section-kicker">Purchases</div>
            <h2 className="section-title">My Order History ({orders.length})</h2>
          </div>
          <Link to="/customer/shop" className="section-see-all">
            Browse Store →
          </Link>
        </div>

        {orders.length > 0 ? (
          <div className="orders-cards-list">
            {orders.map((order) => {
              const orderDate = new Date(order.timestamp).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={order.orderId} className="order-history-card">
                  <div className="order-card-header">
                    <div className="order-main-meta">
                      <span className="order-id-label">Order Reference:</span>
                      <strong className="order-id-val">{order.orderId}</strong>
                      <span className="order-date-text">• Placed on {orderDate}</span>
                    </div>

                    <div className="order-status-badge confirmed">
                      <span className="status-indicator"></span>
                      <span>{order.orderStatus || 'Confirmed'}</span>
                    </div>
                  </div>

                  <div className="order-card-body">
                    {/* Items List */}
                    <div className="order-items-column">
                      <h4>Items ({order.items?.length || 1})</h4>
                      <div className="order-items-sublist">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="order-item-row">
                            <span className="item-name-qty">
                              <strong>{item.quantity}x</strong> {item.name}
                            </span>
                            <span className="item-price">
                              ₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery & Amount Column */}
                    <div className="order-delivery-column">
                      <h4>Delivery Information</h4>
                      <p className="delivery-address-text">
                        <strong>{order.fullName}</strong><br />
                        {order.deliveryAddress}, {order.city}, {order.state} - {order.pincode}<br />
                        Phone: {order.phone}
                      </p>
                      <div className="payment-meta-line">
                        <span>Payment: {order.paymentMethod || 'Cash on Delivery'}</span>
                      </div>
                    </div>

                    {/* Total Amount Summary */}
                    <div className="order-amount-column">
                      <span className="amount-label">Total Amount</span>
                      <strong className="amount-val">₹{Number(order.totalAmount).toLocaleString('en-IN')}</strong>
                      <span className="tax-inclusive-note">GST Included</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-orders-box">
            <div className="empty-icon">📦</div>
            <h3>No past orders found</h3>
            <p>You haven't placed any device orders yet. Explore our product catalog and try our quick checkout.</p>
            <Link to="/customer/shop" className="btn btn-primary">
              Explore Products
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
