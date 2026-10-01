import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api/client.js';

const PIPELINE_COLUMNS = [
  { key: 'New', title: 'NEW', desc: 'Newly registered' },
  { key: 'Engaged', title: 'ENGAGED', desc: 'Active browsing' },
  { key: 'Qualified', title: 'QUALIFIED', desc: 'High engagement' },
  { key: 'Demo', title: 'DEMO', desc: 'Demo requested' },
  { key: 'Negotiation', title: 'NEGOTIATION', desc: 'Checkout initiated' },
  { key: 'Won', title: 'WON', desc: 'Purchase completed' },
];

export default function Pipeline() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stalledOnly, setStalledOnly] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchLeads() {
      try {
        setLoading(true);
        const res = await api('/salesperson/leads', { token });
        if (isMounted) {
          setLeads(res.leads || []);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load pipeline leads');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchLeads();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const displayedLeads = stalledOnly ? leads.filter((l) => Boolean(l.isStalled)) : leads;
  const stalledCount = leads.filter((l) => Boolean(l.isStalled)).length;

  return (
    <DashboardLayout
      title="Sales Pipeline Board"
      subtitle="Autonomous pipeline stage progression &bull; Movement is driven by customer behavior (Module 7)"
      roleLabel="Salesperson"
    >
      <div className="crm-page-header-row">
        <div>
          <h2 className="crm-page-title">Autonomous Kanban Pipeline</h2>
          <p className="crm-page-subtitle">
            Autonomous engine manages all stage transitions &bull; Drag-and-drop is disabled
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className={`crm-btn-ghost ${stalledOnly ? 'active-filter' : ''}`}
            onClick={() => setStalledOnly(!stalledOnly)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>⚠️</span>
            <span>{stalledOnly ? 'Showing Stalled Only' : `Filter Stalled (${stalledCount})`}</span>
          </button>
          <Link to="/sales/leads" className="crm-btn-ghost">
            Table View &rarr;
          </Link>
        </div>
      </div>

      {error && <div className="crm-alert-box error">{error}</div>}

      {loading ? (
        <div className="crm-loading-placeholder">Loading autonomous pipeline board…</div>
      ) : (
        <div className="crm-pipeline-board-container">
          <div className="crm-pipeline-board-columns">
            {PIPELINE_COLUMNS.map((col) => {
              const colLeads = displayedLeads.filter(
                (l) => (l.stage || 'New').toLowerCase() === col.key.toLowerCase()
              );
              const colStalledCount = colLeads.filter((l) => Boolean(l.isStalled)).length;

              return (
                <div key={col.key} className="crm-pipeline-col">
                  {/* Column Header */}
                  <div className="crm-pipeline-col-header">
                    <div>
                      <h4 className="crm-col-title-text">{col.title}</h4>
                      <span className="crm-col-subtitle-text">{col.desc}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {colStalledCount > 0 && (
                        <span className="crm-stalled-mini-badge" title="Stalled opportunities in this column">
                          {colStalledCount} stalled
                        </span>
                      )}
                      <span className="crm-col-count-badge">{colLeads.length}</span>
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="crm-pipeline-cards-stack">
                    {colLeads.length === 0 ? (
                      <div className="crm-pipeline-empty-col">
                        <span>No opportunities</span>
                      </div>
                    ) : (
                      colLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className={`crm-pipeline-card ${lead.isStalled ? 'is-stalled' : ''}`}
                          onClick={() => navigate(`/sales/leads/${lead.id}`)}
                        >
                          {/* Stalled Badge if applicable */}
                          {lead.isStalled && (
                            <div className="crm-pipeline-card-stalled-badge">
                              <span>⚠️ STALLED — {lead.daysStalled || 0} days</span>
                            </div>
                          )}

                          {/* Customer & Product */}
                          <div className="crm-card-title-block">
                            <h5 className="crm-card-lead-name">{lead.name}</h5>
                            <span className="crm-card-product-tag">
                              {lead.product || 'General Inquiry'}
                            </span>
                          </div>

                          {/* Company / Industry */}
                          <p className="crm-card-company-sub">
                            {lead.company || 'Personal Account'}
                          </p>

                          {/* Metrics: Score, Intent, Momentum */}
                          <div className="crm-card-metrics-row">
                            <div className="crm-card-metric-pill" title="Lead qualification score">
                              <span className="crm-metric-lbl">Score:</span>
                              <strong>{lead.score ?? 0}</strong>
                            </div>
                            <span
                              className={`crm-intent-badge intent-${(lead.intent || 'Low').toLowerCase().replace(' ', '-')}`}
                              style={{ fontSize: '11px', padding: '2px 6px' }}
                            >
                              {lead.intent || 'Low'}
                            </span>
                            <span
                              className={`crm-momentum-badge momentum-${(lead.momentum || 'Stable').toLowerCase()}`}
                              style={{ fontSize: '11px', padding: '2px 6px' }}
                            >
                              {(lead.momentum || 'Stable') === 'Rising' ? '↗' : (lead.momentum || 'Stable') === 'Falling' ? '↘' : '→'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
