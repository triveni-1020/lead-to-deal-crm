import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { api } from '../../api/client.js';

export default function ContactSales() {
  const { user, token } = useAuth();
  const { showToast } = useCustomer();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [subject, setSubject] = useState(searchParams.get('subject') || '');
  const [category, setCategory] = useState('Enterprise Volume Pricing');
  const [urgency, setUrgency] = useState('Normal');
  const [preferredContactMethod, setPreferredContactMethod] = useState('Email');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedInquiry, setSubmittedInquiry] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast('Please enter message details', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const data = await api('/customer/requests/contact', {
        method: 'POST',
        token,
        body: {
          subject: subject || 'Enterprise Hardware Consultation',
          category,
          message: message.trim(),
          preferredContactMethod,
          urgency,
        },
      });

      setSubmittedInquiry(data.request);
      showToast('Contact enquiry submitted successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to submit enquiry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-sales-page">
      <div className="form-card-container">
        {submittedInquiry ? (
          <div className="form-success-card">
            <div className="success-icon">✉️</div>
            <h2 className="success-title">Sales Enquiry Logged Successfully</h2>
            <p className="success-desc">
              Your inquiry regarding <strong>"{submittedInquiry.subject}"</strong> has been assigned to your dedicated CRM Account Representative.
            </p>

            <div className="request-reference-box">
              <div className="ref-line">
                <span>Inquiry Reference:</span> <strong>{submittedInquiry.id}</strong>
              </div>
              <div className="ref-line">
                <span>Category:</span> <span>{submittedInquiry.category}</span>
              </div>
              <div className="ref-line">
                <span>Status:</span> <span className="status-badge status-submitted">{submittedInquiry.status}</span>
              </div>
              <div className="ref-line">
                <span>CRM Score Impact:</span> <span className="badge-crm-updated">+15 Lead Engagement Score</span>
              </div>
            </div>

            <div className="success-actions-row">
              <Link to="/customer/requests" className="btn btn-primary">
                View Inquiries Status
              </Link>
              <Link to="/customer" className="btn btn-outline">
                Return to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="form-box-card">
            <div className="form-box-header">
              <span className="form-kicker">Dedicated Account Support</span>
              <h1 className="form-title">Consult with Enterprise Sales</h1>
              <p className="form-subtitle">
                Discuss volume discount schedules, customized leasing agreements, device asset tagging, or technical architecture integrations.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="standard-customer-form">
              {/* Pre-filled Account Banner */}
              <div className="prefilled-info-banner">
                <div className="prefilled-item">
                  <span className="label">Contact Name:</span>
                  <span className="val">{user?.name}</span>
                </div>
                <div className="prefilled-item">
                  <span className="label">Registered Email:</span>
                  <span className="val">{user?.email}</span>
                </div>
                <div className="prefilled-item">
                  <span className="label">Company:</span>
                  <span className="val">{user?.company || 'Enterprise Account'}</span>
                </div>
              </div>

              {/* Subject */}
              <div className="form-group">
                <label htmlFor="inquiry-subject" className="form-label">
                  Inquiry Subject *
                </label>
                <input
                  id="inquiry-subject"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Bulk pricing for 25 units of Galaxy S26 Ultra"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              {/* Category & Urgency */}
              <div className="form-row-two-col">
                <div className="form-group">
                  <label htmlFor="inquiry-category" className="form-label">
                    Category of Interest *
                  </label>
                  <select
                    id="inquiry-category"
                    className="form-control"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Enterprise Volume Pricing">Enterprise Volume Pricing</option>
                    <option value="Device Fleet Leasing & Subscriptions">Device Fleet Leasing & Subscriptions</option>
                    <option value="Zero-Touch MDM Integration">Zero-Touch MDM Integration</option>
                    <option value="Custom Asset Tagging & Laser Etching">Custom Asset Tagging & Laser Etching</option>
                    <option value="Technical Specifications Consultation">Technical Specifications Consultation</option>
                    <option value="Partnership / Procurement Reseller">Partnership / Procurement Reseller</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="inquiry-urgency" className="form-label">
                    Project Urgency
                  </label>
                  <select
                    id="inquiry-urgency"
                    className="form-control"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                  >
                    <option value="Normal">Normal (Response within 24h)</option>
                    <option value="High">High (Planning current quarter procurement)</option>
                    <option value="Urgent">Urgent (Immediate active RFP / Tender)</option>
                  </select>
                </div>
              </div>

              {/* Preferred Contact Method */}
              <div className="form-group">
                <label className="form-label">Preferred Response Method</label>
                <div className="contact-methods-row">
                  {['Email', 'Phone Call', 'Google Meet / Video Call'].map((m) => (
                    <label key={m} className="method-radio-label">
                      <input
                        type="radio"
                        name="prefMethod"
                        checked={preferredContactMethod === m}
                        onChange={() => setPreferredContactMethod(m)}
                      />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Detailed Message */}
              <div className="form-group">
                <label htmlFor="inquiry-msg" className="form-label">
                  Your Message or Specification Details *
                </label>
                <textarea
                  id="inquiry-msg"
                  rows="4"
                  className="form-control"
                  placeholder="Outline your estimated unit quantities, delivery timeline, or specific enterprise criteria..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={submitting}
              >
                {submitting ? 'Submitting Enquiry...' : 'Send Sales Consultation Request'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
