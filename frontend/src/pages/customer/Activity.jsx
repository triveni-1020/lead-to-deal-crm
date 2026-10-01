import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { api } from '../../api/client.js';

export default function Activity() {
  const { token } = useAuth();
  const { showToast } = useCustomer();
  const [groupedEvents, setGroupedEvents] = useState({ today: [], yesterday: [], earlier: [] });
  const [totalCount, setTotalCount] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const filters = [
    'All',
    'Products',
    'Search',
    'Pricing',
    'Wishlist',
    'Cart',
    'Resources',
    'Requests',
    'Account',
  ];

  useEffect(() => {
    async function loadActivity() {
      setLoading(true);
      try {
        const query = selectedFilter !== 'All' ? `?category=${encodeURIComponent(selectedFilter)}` : '';
        const data = await api(`/customer/activity${query}`, { token });
        setGroupedEvents(data.grouped || { today: [], yesterday: [], earlier: [] });
        setTotalCount(data.total || 0);
      } catch (err) {
        console.error('Error fetching activity timeline:', err);
        showToast('Failed to load activity timeline', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadActivity();
  }, [token, selectedFilter, showToast]);

  const getEventIcon = (type = '') => {
    const t = type.toUpperCase();
    if (t.includes('CART') || t.includes('CHECKOUT')) return '🛒';
    if (t.includes('WISHLIST')) return '❤️';
    if (t.includes('SEARCH')) return '🔍';
    if (t.includes('DEMO')) return '📅';
    if (t.includes('CONTACT')) return '✉️';
    if (t.includes('PRICING')) return '🏷️';
    if (t.includes('CONTENT') || t.includes('RESOURCE')) return '📄';
    if (t.includes('LOGIN') || t.includes('REGISTER') || t.includes('PROFILE')) return '👤';
    if (t.includes('FILTER') || t.includes('SORT')) return '⚙️';
    return '📱';
  };

  const formatTime = (ts) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  const renderGroup = (title, items) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="activity-group-block">
        <h3 className="activity-group-title">
          <span>{title}</span>
          <span className="group-count">({items.length} {items.length === 1 ? 'event' : 'events'})</span>
        </h3>

        <div className="timeline-items-list">
          {items.map((e) => {
            const timeStr = formatTime(e.timestamp || e.createdAt);
            const icon = getEventIcon(e.eventType);

            return (
              <div key={e.id} className="timeline-item-row">
                <div className="timeline-time-col">{timeStr}</div>

                <div className="timeline-marker-col">
                  <div className="timeline-dot-icon">{icon}</div>
                  <div className="timeline-line"></div>
                </div>

                <div className="timeline-content-card">
                  <div className="timeline-content-top">
                    <span className="event-name-tag">
                      {e.eventType.replace(/_/g, ' ')}
                    </span>
                    <span className="event-id-sub">#{e.id}</span>
                  </div>

                  <p className="timeline-desc">{e.description}</p>

                  {e.metadata && Object.keys(e.metadata).length > 0 && (
                    <div className="timeline-meta-box">
                      {Object.entries(e.metadata)
                        .filter(([k]) => k !== 'items')
                        .slice(0, 3)
                        .map(([k, v]) => (
                          <span key={k} className="meta-pill">
                            <strong>{k}:</strong> {String(v)}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="activity-page">
      <div className="activity-header">
        <span className="section-kicker">Autonomous Engagement Stream</span>
        <h1 className="page-title">My Activity Timeline</h1>
        <p className="page-subtitle">
          Real-time record of all your product views, catalog searches, saved wishlists, downloads, and demo requests.
        </p>

        {/* Filter Pills */}
        <div className="category-pills-row">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              className={`cat-pill-btn ${selectedFilter === f ? 'active' : ''}`}
              onClick={() => setSelectedFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="customer-loading-state">
          <div className="spinner"></div>
          <p>Compiling activity stream...</p>
        </div>
      ) : totalCount > 0 ? (
        <div className="activity-timeline-container">
          {renderGroup('Today', groupedEvents.today)}
          {renderGroup('Yesterday', groupedEvents.yesterday)}
          {renderGroup('Earlier', groupedEvents.earlier)}
        </div>
      ) : (
        <div className="empty-cart-wishlist-box">
          <div className="empty-icon">⏱️</div>
          <h2>No Activity Recorded</h2>
          <p>No events found for the selected filter category.</p>
          <button className="btn btn-primary" onClick={() => setSelectedFilter('All')}>
            Reset Category Filter
          </button>
        </div>
      )}
    </div>
  );
}
