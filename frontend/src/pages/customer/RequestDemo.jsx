import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { api } from '../../api/client.js';

export default function RequestDemo() {
  const { user, token } = useAuth();
  const { showToast } = useCustomer();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(searchParams.get('productId') || '');
  const [productName, setProductName] = useState(searchParams.get('productName') || '');
  const [preferredDate, setPreferredDate] = useState(() => {
    // Tomorrow by default
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [preferredTime, setPreferredTime] = useState('10:00 AM');
  const [teamSize, setTeamSize] = useState(user?.companySize || '1-10');
  const [phone, setPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await api('/customer/products', { token });
        setProducts(data.products || []);
      } catch (err) {
        console.warn('Error loading products for dropdown:', err);
      }
    }
    loadProducts();
  }, [token]);

  const handleProductSelect = (pId) => {
    setSelectedProductId(pId);
    const found = products.find((p) => p.id === pId);
    if (found) setProductName(found.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await api('/customer/requests/demo', {
        method: 'POST',
        token,
        body: {
          productId: selectedProductId || null,
          productName: productName || 'Enterprise Device Fleet Consultation',
          preferredDate,
          preferredTime,
          teamSize,
          phone,
          notes,
        },
      });

      setSubmittedRequest(data.request || data.demoRequest);
      showToast('Demo request submitted successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to submit demo request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="request-demo-page">
      <div className="form-card-container">
        {submittedRequest ? (
          <div className="form-success-card">
            <div className="success-icon">🎉</div>
            <h2 className="success-title">Demo Request Submitted Successfully</h2>
            <p className="success-desc">
              Your request for <strong>{submittedRequest.productName}</strong> scheduled for{' '}
              <strong>{submittedRequest.preferredDate} at {submittedRequest.preferredTime}</strong> has been logged in our CRM system.
            </p>

            <div className="request-reference-box">
              <div className="ref-line">
                <span>Request ID:</span> <strong>{submittedRequest.id}</strong>
              </div>
              <div className="ref-line">
                <span>Status:</span> <span className="status-badge status-submitted">{submittedRequest.status}</span>
              </div>
              <div className="ref-line">
                <span>Assigned Account:</span> <span>{user?.name} ({user?.email})</span>
              </div>
            </div>

            <div className="success-actions-row">
              <Link to="/customer/requests" className="btn btn-primary">
                View All My Requests
              </Link>
              <Link to="/customer" className="btn btn-outline">
                Back to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="form-box-card">
            <div className="form-box-header">
              <span className="form-kicker">Interactive Product Walkthrough</span>
              <h1 className="form-title">Request a Guided Enterprise Demo</h1>
              <p className="form-subtitle">
                Schedule a 30-minute 1-on-1 virtual hardware demonstration and architectural fleet review with an Lead-to-Deal Solutions Specialist.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="standard-customer-form">
              {/* Pre-filled Customer Information Preview */}
              <div className="prefilled-info-banner">
                <div className="prefilled-item">
                  <span className="label">Customer Name:</span>
                  <span className="val">{user?.name || '---'}</span>
                </div>
                <div className="prefilled-item">
                  <span className="label">Work Email:</span>
                  <span className="val">{user?.email || '---'}</span>
                </div>
                <div className="prefilled-item">
                  <span className="label">Organization:</span>
                  <span className="val">{user?.company || 'Enterprise Account'}</span>
                </div>
              </div>

              {/* Product Selection Dropdown */}
              <div className="form-group">
                <label htmlFor="product-select" className="form-label">
                  Product / Solution of Interest *
                </label>
                <select
                  id="product-select"
                  className="form-control"
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  required
                >
                  <option value="">-- Select a product from catalog --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.brand} - {p.category})
                    </option>
                  ))}
                  <option value="custom">Enterprise Multi-Vendor Fleet Solution (General)</option>
                </select>
              </div>

              {/* Date & Time Row */}
              <div className="form-row-two-col">
                <div className="form-group">
                  <label htmlFor="pref-date" className="form-label">
                    Preferred Date *
                  </label>
                  <input
                    id="pref-date"
                    type="date"
                    className="form-control"
                    value={preferredDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="pref-time" className="form-label">
                    Preferred Time Slot *
                  </label>
                  <select
                    id="pref-time"
                    className="form-control"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                  >
                    <option value="10:00 AM">10:00 AM IST</option>
                    <option value="11:30 AM">11:30 AM IST</option>
                    <option value="02:00 PM">02:00 PM IST</option>
                    <option value="04:30 PM">04:30 PM IST</option>
                    <option value="06:00 PM">06:00 PM IST</option>
                  </select>
                </div>
              </div>

              {/* Phone & Team Size Row */}
              <div className="form-row-two-col">
                <div className="form-group">
                  <label htmlFor="phone-input" className="form-label">
                    Direct Contact Phone *
                  </label>
                  <input
                    id="phone-input"
                    type="tel"
                    className="form-control"
                    placeholder="+91-9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="team-size-select" className="form-label">
                    Estimated Fleet / Team Size
                  </label>
                  <select
                    id="team-size-select"
                    className="form-control"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                  >
                    <option value="1-10">1–10 devices</option>
                    <option value="11-50">11–50 devices</option>
                    <option value="51-200">51–200 devices</option>
                    <option value="200+">200+ enterprise devices</option>
                  </select>
                </div>
              </div>

              {/* Specific Requirements / Notes */}
              <div className="form-group">
                <label htmlFor="demo-notes" className="form-label">
                  Specific Requirements or Focus Areas
                </label>
                <textarea
                  id="demo-notes"
                  rows="3"
                  className="form-control"
                  placeholder="Tell us what you'd like to see (e.g. Knox MDM compatibility, battery benchmarks, bulk leasing rates)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={submitting}
              >
                {submitting ? 'Submitting Demo Booking...' : 'Confirm Demo Booking'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
