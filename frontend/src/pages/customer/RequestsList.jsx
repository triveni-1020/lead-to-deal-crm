import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { api } from '../../api/client.js';

export default function RequestsList() {
  const { token } = useAuth();
  const { showToast } = useCustomer();
  const [requests, setRequests] = useState([]);
  const [filterType, setFilterType] = useState('All'); // 'All' | 'Demo' | 'Contact'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRequests() {
      try {
        const data = await api('/customer/requests', { token });
        setRequests(data.requests || []);
      } catch (err) {
        console.error('Error fetching customer requests:', err);
        showToast('Failed to load requests list', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadRequests();
  }, [token, showToast]);

  const filteredRequests = requests.filter((r) => {
    if (filterType === 'Demo') return r.type?.includes('Demo');
    if (filterType === 'Contact') return r.type?.includes('Contact');
    return true;
  });

  if (loading) {
    return (
      <div className="customer-loading-state">
        <div className="spinner"></div>
        <p>Loading your requests status...</p>
      </div>
    );
  }

  return (
    <div className="requests-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">My Enquiries & Requests</h1>
          <p className="page-subtitle">
            Track real-time status and communications for your scheduled product demos and sales consultation requests.
          </p>
        </div>

        <div className="requests-actions-right">
          <Link to="/customer/request-demo" className="btn btn-primary btn-sm">
            + Book New Demo
          </Link>
          <Link to="/customer/contact" className="btn btn-outline btn-sm">
            + Contact Sales
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="requests-filter-tabs">
        <button
          type="button"
          className={`tab-filter-btn ${filterType === 'All' ? 'active' : ''}`}
          onClick={() => setFilterType('All')}
        >
          All Requests ({requests.length})
        </button>
        <button
          type="button"
          className={`tab-filter-btn ${filterType === 'Demo' ? 'active' : ''}`}
          onClick={() => setFilterType('Demo')}
        >
          Product Demos ({requests.filter((r) => r.type?.includes('Demo')).length})
        </button>
        <button
          type="button"
          className={`tab-filter-btn ${filterType === 'Contact' ? 'active' : ''}`}
          onClick={() => setFilterType('Contact')}
        >
          Sales Inquiries ({requests.filter((r) => r.type?.includes('Contact')).length})
        </button>
      </div>

      {filteredRequests.length > 0 ? (
        <div className="requests-cards-stack">
          {filteredRequests.map((req) => {
            const isDemo = req.type?.includes('Demo');
            const statusKey = (req.status || 'submitted').toLowerCase().replace(' ', '-');

            return (
              <div key={req.id} className="request-full-card">
                <div className="request-card-header">
                  <div className="req-header-left">
                    <span className="req-icon-badge">{isDemo ? '📅' : '✉️'}</span>
                    <div>
                      <span className="req-type-title">{req.type}</span>
                      <h3 className="req-main-title">{req.productName || req.subject || 'General Enquiry'}</h3>
                    </div>
                  </div>

                  <div className="req-header-right">
                    <span className={`status-pill status-${statusKey}`}>
                      <span className="status-dot"></span> {req.status}
                    </span>
                    <span className="req-id-tag">#{req.id}</span>
                  </div>
                </div>

                <div className="request-card-body">
                  <div className="req-detail-grid">
                    {isDemo ? (
                      <>
                        <div className="req-detail-item">
                          <span className="dt-label">Scheduled Date:</span>
                          <span className="dt-val">📅 {req.preferredDate}</span>
                        </div>
                        <div className="req-detail-item">
                          <span className="dt-label">Time Window:</span>
                          <span className="dt-val">⏰ {req.preferredTime}</span>
                        </div>
                        <div className="req-detail-item">
                          <span className="dt-label">Target Team Size:</span>
                          <span className="dt-val">👥 {req.teamSize || '1-10'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="req-detail-item">
                          <span className="dt-label">Inquiry Category:</span>
                          <span className="dt-val">🏷️ {req.category || 'General'}</span>
                        </div>
                        <div className="req-detail-item">
                          <span className="dt-label">Urgency Priority:</span>
                          <span className="dt-val">⚡ {req.urgency || 'Normal'}</span>
                        </div>
                        <div className="req-detail-item">
                          <span className="dt-label">Preferred Contact:</span>
                          <span className="dt-val">📞 {req.preferredContactMethod || 'Email'}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {(req.notes || req.message) && (
                    <div className="req-message-box">
                      <span className="msg-label">Your Message / Focus Notes:</span>
                      <p className="msg-text">{req.notes || req.message}</p>
                    </div>
                  )}
                </div>

                <div className="request-card-footer">
                  <span className="req-created-time">
                    Submitted on {new Date(req.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span className="req-status-note">
                    {req.status === 'Submitted'
                      ? '✓ Logged into CRM — Sales rep notification dispatched'
                      : req.status === 'In Progress'
                      ? '⚡ In review by Solutions Engineering Team'
                      : '✓ Completed'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-cart-wishlist-box">
          <div className="empty-icon">📋</div>
          <h2>No {filterType !== 'All' ? filterType : ''} Requests Found</h2>
          <p>You can request interactive product demos or enterprise sales consultations anytime.</p>
          <div className="empty-cta-buttons">
            <Link to="/customer/request-demo" className="btn btn-primary">Book Demo</Link>
            <Link to="/customer/contact" className="btn btn-outline">Contact Sales</Link>
          </div>
        </div>
      )}
    </div>
  );
}
