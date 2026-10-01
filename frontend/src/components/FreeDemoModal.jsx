import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCustomer } from '../context/CustomerContext.jsx';
import { api } from '../api/client.js';

export default function FreeDemoModal() {
  const { user, token } = useAuth();
  const { demoProduct, closeDemoModal, showToast } = useCustomer();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('10:00 AM - 11:00 AM');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState(null);

  // Set minimum date to tomorrow
  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (demoProduct) {
      setFullName(user?.name || '');
      setEmail(user?.email || '');
      setPhone(user?.phone || '');
      setPreferredDate(getTomorrowDate());
      setPreferredTime('10:00 AM - 11:00 AM');
      setMessage('');
      setSubmittedMessage(null);
    }
  }, [demoProduct, user]);

  if (!demoProduct) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim() || !preferredDate) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api('/customer/requests/demo', {
        method: 'POST',
        token,
        body: {
          productId: demoProduct.id,
          productName: demoProduct.name,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          preferredDate,
          preferredTime,
          message: message.trim(),
        },
      });

      const successText = res.message || 'Your free demo request has been submitted successfully.\nOur sales team will contact you soon.';
      setSubmittedMessage(successText);
      showToast('Free demo request submitted successfully!', 'success');

      // Auto-close modal after user sees the confirmation
      setTimeout(() => {
        closeDemoModal();
      }, 2500);
    } catch (err) {
      console.error('Error submitting free demo:', err);
      showToast(err.message || 'Failed to submit demo request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeDemoModal}>
      <div className="free-demo-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Close Button */}
        <button
          type="button"
          className="modal-close-btn"
          onClick={closeDemoModal}
          aria-label="Close"
        >
          ✕
        </button>

        {submittedMessage ? (
          <div className="demo-success-content">
            <div className="demo-success-icon">🎉</div>
            <h2 className="demo-success-title">Demo Request Submitted!</h2>
            <div className="demo-success-text-box">
              <p>Your free demo request has been submitted successfully.</p>
              <p>Our sales team will contact you soon.</p>
            </div>
            <div className="demo-success-meta">
              <strong>Product:</strong> {demoProduct.name}<br />
              <strong>Scheduled Slot:</strong> {preferredDate} at {preferredTime}
            </div>
            <button
              type="button"
              className="btn btn-primary mt-3"
              onClick={closeDemoModal}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="demo-modal-inner">
            <div className="demo-modal-header">
              <div className="free-demo-badge">100% Free Guided Demonstration</div>
              <h2 className="modal-title">Request Free Demo</h2>
              <p className="modal-subtitle">
                Schedule a live, interactive 1-on-1 walkthrough with our specialist. No payment or obligation required.
              </p>
            </div>

            {/* Automatically Selected Product Preview (NO prices shown) */}
            <div className="demo-product-preview-card">
              <img
                src={demoProduct.image || `/products/${demoProduct.id}.svg`}
                alt={demoProduct.name}
                className="demo-product-thumb"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/products/prod-phone-1.svg';
                }}
              />
              <div className="demo-product-info">
                <span className="demo-prod-brand">{demoProduct.brand}</span>
                <h4 className="demo-prod-name">{demoProduct.name}</h4>
                <span className="demo-prod-category">{demoProduct.category}</span>
              </div>
              <div className="free-tag-badge">
                Free Demo
              </div>
            </div>

            <form onSubmit={handleSubmit} className="demo-form">
              {/* Full Name */}
              <div className="form-group">
                <label htmlFor="demo-name" className="form-label">Full Name *</label>
                <input
                  id="demo-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-control"
                  placeholder="Enter your name"
                  required
                />
              </div>

              {/* Email & Phone */}
              <div className="form-row-two">
                <div className="form-group">
                  <label htmlFor="demo-email" className="form-label">Email Address *</label>
                  <input
                    id="demo-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-control"
                    placeholder="name@example.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="demo-phone" className="form-label">Phone Number *</label>
                  <input
                    id="demo-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-control"
                    placeholder="+91-9876543210"
                    required
                  />
                </div>
              </div>

              {/* Automatically Selected Product Field */}
              <div className="form-group">
                <label className="form-label">Selected Product</label>
                <input
                  type="text"
                  value={`${demoProduct.name} (${demoProduct.brand})`}
                  disabled
                  className="form-control form-control-disabled"
                />
              </div>

              {/* Preferred Date & Time */}
              <div className="form-row-two">
                <div className="form-group">
                  <label htmlFor="demo-date" className="form-label">Preferred Date *</label>
                  <input
                    id="demo-date"
                    type="date"
                    min={getTomorrowDate()}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="demo-time" className="form-label">Preferred Time Slot *</label>
                  <select
                    id="demo-time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="form-control"
                    required
                  >
                    <option value="10:00 AM - 11:00 AM">Morning: 10:00 AM – 11:00 AM</option>
                    <option value="11:30 AM - 12:30 PM">Midday: 11:30 AM – 12:30 PM</option>
                    <option value="02:00 PM - 03:00 PM">Afternoon: 02:00 PM – 03:00 PM</option>
                    <option value="04:00 PM - 05:00 PM">Late Afternoon: 04:00 PM – 05:00 PM</option>
                    <option value="06:00 PM - 07:00 PM">Evening: 06:00 PM – 07:00 PM</option>
                  </select>
                </div>
              </div>

              {/* Message (Optional) */}
              <div className="form-group">
                <label htmlFor="demo-msg" className="form-label">
                  Message <span className="text-muted">(Optional)</span>
                </label>
                <textarea
                  id="demo-msg"
                  rows="3"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="form-control"
                  placeholder="Any specific questions, features, or deployment requirements you would like to discuss?"
                />
              </div>

              <div className="demo-form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeDemoModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-submit-demo"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting Request...' : 'Submit Free Demo Request'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
