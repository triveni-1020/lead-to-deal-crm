import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api/client.js';

function formatDateTime(dateString) {
  if (!dateString) return 'Recently';
  const d = new Date(dateString);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function Activities() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    let isMounted = true;
    async function loadActivities() {
      try {
        setLoading(true);
        const res = await api('/salesperson/activities?limit=100', { token });
        if (isMounted) {
          setActivities(res.activities || []);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load activities');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadActivities();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const filtered = activities.filter((act) => {
    const matchesSearch =
      !search ||
      (act.customerName && act.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (act.productName && act.productName.toLowerCase().includes(search.toLowerCase())) ||
      (act.description && act.description.toLowerCase().includes(search.toLowerCase()));

    const matchesType =
      filterType === 'All' ||
      (filterType === 'Product' && act.eventType.includes('PRODUCT')) ||
      (filterType === 'Demo' && act.eventType.includes('DEMO')) ||
      (filterType === 'Pricing' && act.eventType.includes('PRICING')) ||
      (filterType === 'Checkout' && (act.eventType.includes('CHECKOUT') || act.eventType.includes('PURCHASE'))) ||
      (filterType === 'Cart' && (act.eventType.includes('CART') || act.eventType.includes('WISHLIST')));

    return matchesSearch && matchesType;
  });

  return (
    <DashboardLayout
      title="Customer Activities"
      subtitle="Complete chronological timeline of customer interactions across the digital catalog."
      roleLabel="Salesperson"
    >
      <div className="crm-page-header-row">
        <div>
          <h2 className="crm-page-title">Activity Stream</h2>
          <p className="crm-page-subtitle">
            Showing {filtered.length} of {activities.length} recorded customer actions
          </p>
        </div>
      </div>

      {error && <div className="crm-alert-box error">{error}</div>}

      {/* Filter and Search Bar */}
      <div className="crm-filters-card">
        <div className="crm-filters-row">
          <div className="crm-search-input-box">
            <span className="crm-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by customer, product, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="crm-filter-search-input"
            />
          </div>

          <div className="crm-filter-selects-group">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="crm-select-filter"
            >
              <option value="All">All Activities</option>
              <option value="Product">Product Views & Browsing</option>
              <option value="Demo">Demo Requests</option>
              <option value="Pricing">Pricing Inquiries</option>
              <option value="Checkout">Checkout & Orders</option>
              <option value="Cart">Cart & Wishlist</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Activities Feed Card */}
      <div className="crm-card crm-section-box">
        {loading ? (
          <div className="crm-loading-placeholder">Loading customer activity stream…</div>
        ) : filtered.length === 0 ? (
          <div className="crm-empty-placeholder">
            <p>No matching activities found.</p>
          </div>
        ) : (
          <div className="crm-activities-full-table-wrapper">
            <table className="crm-data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Activity Type</th>
                  <th>Product</th>
                  <th>Description</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Lead</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((act) => (
                  <tr
                    key={act.id}
                    className="crm-table-row-clickable"
                    onClick={() => act.leadId && navigate(`/sales/leads/${act.leadId}`)}
                  >
                    <td>
                      <strong>{act.customerName}</strong>
                    </td>
                    <td>
                      <span className="crm-activity-type-pill">
                        {act.eventType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className="crm-product-name">{act.productName || 'General'}</span>
                    </td>
                    <td>
                      <span className="muted" style={{ fontSize: '13px' }}>{act.description}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {formatDateTime(act.timestamp)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {act.leadId && (
                        <button
                          type="button"
                          className="crm-btn-table-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/sales/leads/${act.leadId}`);
                          }}
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
