import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api/client.js';

const PIPELINE_STAGES = [
  { key: 'New', label: 'New', color: 'stage-new', barColor: '#94a3b8' },
  { key: 'Engaged', label: 'Engaged', color: 'stage-engaged', barColor: '#38bdf8' },
  { key: 'Qualified', label: 'Qualified', color: 'stage-qualified', barColor: '#6366f1' },
  { key: 'Demo', label: 'Demo', color: 'stage-demo', barColor: '#8b5cf6' },
  { key: 'Negotiation', label: 'Negotiation', color: 'stage-negotiation', barColor: '#f59e0b' },
  { key: 'Won', label: 'Won', color: 'stage-won', barColor: '#10b981' },
];

const PRIORITY_ORDER = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  NONE: 0,
};

function formatCurrency(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatRelativeTime(dateString) {
  if (!dateString) return 'Recently';
  const now = new Date();
  const d = new Date(dateString);
  const diffSec = Math.floor((now - d) / 1000);
  if (isNaN(diffSec) || diffSec < 0) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SalespersonDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      try {
        setLoading(true);
        const leadsRes = await api('/salesperson/leads', { token });

        if (isMounted) {
          setLeads(leadsRes.leads || []);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        if (isMounted) setError(err.message || 'Failed to load intelligence data');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Derived KPI metrics
  const totalLeads = leads.length;
  const highIntentCount = leads.filter(
    (l) => l.intent === 'High' || l.intent === 'Very High'
  ).length;
  const stalledLeads = leads.filter((l) => Boolean(l.isStalled));
  const totalExpectedRevenue = leads.reduce(
    (sum, l) => sum + (Number(l.expectedDealValue) || 0),
    0
  );

  // Stage breakdown
  const stageCounts = PIPELINE_STAGES.reduce((acc, stg) => {
    acc[stg.key] = leads.filter(
      (l) => (l.stage || 'New').toLowerCase() === stg.key.toLowerCase()
    ).length;
    return acc;
  }, {});

  // Priority Leads (Module 8 logic, active deals, sorted by priority weight)
  const priorityLeads = [...leads]
    .filter((l) => (l.stage || 'New') !== 'Won')
    .sort((a, b) => {
      const pA = PRIORITY_ORDER[(a.priority || 'LOW').toUpperCase()] ?? 1;
      const pB = PRIORITY_ORDER[(b.priority || 'LOW').toUpperCase()] ?? 1;
      if (pB !== pA) return pB - pA;
      return (Number(b.score) || 0) - (Number(a.score) || 0);
    })
    .slice(0, 5);

  // Next Best Actions (Module 10: active leads with actionable recommendations)
  const actionLeads = [...leads]
    .filter((l) => (l.stage || 'New') !== 'Won' && l.nextBestAction)
    .sort((a, b) => {
      if (a.isStalled && !b.isStalled) return -1;
      if (!a.isStalled && b.isStalled) return 1;
      const pA = PRIORITY_ORDER[(a.priority || 'LOW').toUpperCase()] ?? 1;
      const pB = PRIORITY_ORDER[(b.priority || 'LOW').toUpperCase()] ?? 1;
      if (pB !== pA) return pB - pA;
      return (Number(b.score) || 0) - (Number(a.score) || 0);
    });

  const REV_PRIORITY_WEIGHT = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  // Revenue Opportunities (Module 11: active deals with opportunityValue, ranked by revenue priority & value)
  const revenueOpportunities = [...leads]
    .filter((l) => (l.stage || 'New') !== 'Won' && Number(l.opportunityValue || l.expectedDealValue) > 0)
    .sort((a, b) => {
      const rpA = REV_PRIORITY_WEIGHT[(a.revenuePriority || 'LOW').toUpperCase()] ?? 1;
      const rpB = REV_PRIORITY_WEIGHT[(b.revenuePriority || 'LOW').toUpperCase()] ?? 1;
      if (rpB !== rpA) return rpB - rpA;
      return (Number(b.opportunityValue || b.expectedDealValue) || 0) - (Number(a.opportunityValue || a.expectedDealValue) || 0);
    });

  return (
    <DashboardLayout
      title="Sales Intelligence Dashboard"
      subtitle="Monitor customer engagement, pipeline movement and sales opportunities."
      roleLabel="Salesperson"
    >
      {error && <div className="crm-alert-box error">{error}</div>}

      {/* ----------------------------------------------------
          SECTION 1: COMPACT KPI CARDS
          ---------------------------------------------------- */}
      <section className="crm-kpi-grid">
        {/* TOTAL LEADS */}
        <div className="crm-kpi-card" onClick={() => navigate('/sales/leads')}>
          <div className="crm-kpi-top">
            <span className="crm-kpi-label">TOTAL LEADS</span>
            <div className="crm-kpi-icon-box kpi-icon-blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className="crm-kpi-value">{loading ? '…' : totalLeads}</div>
          <span className="crm-kpi-subtext">Active CRM tracked accounts</span>
        </div>

        {/* HIGH INTENT */}
        <div className="crm-kpi-card" onClick={() => navigate('/sales/leads')}>
          <div className="crm-kpi-top">
            <span className="crm-kpi-label">HIGH INTENT</span>
            <div className="crm-kpi-icon-box kpi-icon-purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
          </div>
          <div className="crm-kpi-value">{loading ? '…' : highIntentCount}</div>
          <span className="crm-kpi-subtext">Ready for immediate conversion</span>
        </div>

        {/* STALLED */}
        <div className="crm-kpi-card" onClick={() => navigate('/sales/pipeline')}>
          <div className="crm-kpi-top">
            <span className="crm-kpi-label">STALLED</span>
            <div className="crm-kpi-icon-box kpi-icon-red">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>
          <div className="crm-kpi-value" style={{ color: stalledLeads.length > 0 ? '#e11d48' : '#0f172a' }}>
            {loading ? '…' : stalledLeads.length}
          </div>
          <span className="crm-kpi-subtext">Inactivity threshold reached</span>
        </div>

        {/* EXPECTED REVENUE */}
        <div className="crm-kpi-card" onClick={() => navigate('/sales/analytics')}>
          <div className="crm-kpi-top">
            <span className="crm-kpi-label">EXPECTED REVENUE</span>
            <div className="crm-kpi-icon-box kpi-icon-green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="crm-kpi-value" style={{ color: '#059669' }}>
            {loading ? '…' : formatCurrency(totalExpectedRevenue)}
          </div>
          <span className="crm-kpi-subtext">Total pipeline deal value</span>
        </div>
      </section>

      {/* ----------------------------------------------------
          SECTION 2: PRIORITY LEADS (Module 8)
          ---------------------------------------------------- */}
      <section className="crm-card crm-section-box">
        <div className="crm-card-header">
          <div>
            <h2 className="crm-card-title">Priority Leads</h2>
            <p className="crm-card-subtitle">
              Most critical active opportunities evaluated deterministically by backend priority logic
            </p>
          </div>
          <Link to="/sales/leads" className="crm-header-link">
            View All &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="crm-loading-placeholder">Loading priority leads…</div>
        ) : priorityLeads.length === 0 ? (
          <div className="crm-empty-placeholder">
            <p>No priority leads yet.</p>
          </div>
        ) : (
          <div className="crm-priority-leads-table-wrapper">
            <table className="crm-data-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Product / Company</th>
                  <th>Score</th>
                  <th>Intent</th>
                  <th>Stage</th>
                  <th>Next Best Action</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {priorityLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="crm-table-row-clickable"
                    onClick={() => navigate(`/sales/leads/${lead.id}`)}
                  >
                    <td>
                      <div className="crm-lead-title-box">
                        <span className="crm-lead-name-text">{lead.name}</span>
                        <span className="crm-lead-email-sub">{lead.email}</span>
                      </div>
                    </td>
                    <td>
                      <div className="crm-lead-company-box">
                        <span className="crm-product-name">{lead.product || 'General Inquiry'}</span>
                        <span className="crm-company-name-sub">{lead.company || 'Personal Account'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="crm-score-pill-box">
                        <span className="crm-score-number">{lead.score ?? 0}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`crm-intent-badge intent-${(lead.intent || 'Low').toLowerCase().replace(' ', '-')}`}>
                        {lead.intent || 'Low'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`crm-stage-pill stage-${(lead.stage || 'New').toLowerCase()}`}>
                          {lead.stage || 'New'}
                        </span>
                        {lead.isStalled && (
                          <span className="crm-stalled-mini-badge" title={lead.stalledReason || 'Stalled'}>
                            STALLED
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="crm-nba-container">
                        {lead.nextBestAction ? (
                          <span className="crm-nba-text">{lead.nextBestAction}</span>
                        ) : (
                          <span className="crm-nba-subtle">
                            {lead.stage === 'New'
                              ? 'Review registration'
                              : lead.stage === 'Engaged'
                              ? 'Follow up on browsing'
                              : lead.stage === 'Demo'
                              ? 'Schedule product demo'
                              : lead.stage === 'Negotiation'
                              ? 'Assist with checkout'
                              : 'Monitor activity'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="crm-btn-table-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/sales/leads/${lead.id}`);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ----------------------------------------------------
          SECTION 2B: NEXT BEST ACTIONS (Module 10)
          ---------------------------------------------------- */}
      <section className="crm-card crm-section-box">
        <div className="crm-card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="crm-card-title">Next Best Actions</h2>
              {actionLeads.length > 0 && (
                <span className="crm-nba-count-badge">
                  {actionLeads.length} {actionLeads.length === 1 ? 'Action' : 'Actions'}
                </span>
              )}
            </div>
            <p className="crm-card-subtitle">
              Automated deterministic sales recommendations based on customer engagement signals
            </p>
          </div>
          <Link to="/sales/leads" className="crm-header-link">
            All Leads &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="crm-loading-placeholder">Evaluating next best actions…</div>
        ) : actionLeads.length === 0 ? (
          <div className="crm-empty-placeholder">
            <p>No pending action recommendations.</p>
          </div>
        ) : (
          <div className="crm-nba-cards-grid">
            {actionLeads.slice(0, 4).map((lead) => (
              <div key={lead.id} className="crm-nba-action-card">
                <div className="crm-nba-card-top">
                  <div>
                    <strong className="crm-nba-cust-name">{lead.name}</strong>
                    <span className="crm-nba-prod-name">{lead.product || 'General Inquiry'}</span>
                  </div>
                  <div className="crm-nba-tags-group">
                    <span className={`crm-stage-pill stage-${(lead.stage || 'New').toLowerCase()}`}>
                      Stage: {lead.stage}
                    </span>
                    <span className={`crm-priority-mini-pill priority-${(lead.priority || 'LOW').toLowerCase()}`}>
                      Priority: {lead.priority || 'LOW'}
                    </span>
                  </div>
                </div>

                <div className="crm-nba-recommendation-box">
                  <span className="crm-nba-rec-label">Recommended:</span>
                  <strong className="crm-nba-rec-action">{lead.nextBestAction}</strong>
                  <p className="crm-nba-rec-reason">
                    Reason: "{lead.actionReason || 'Customer demonstrated meaningful engagement.'}"
                  </p>
                </div>

                <div className="crm-nba-card-footer">
                  <button
                    type="button"
                    className="crm-btn-primary crm-btn-sm"
                    onClick={() => navigate(`/sales/leads/${lead.id}`)}
                  >
                    View Lead
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ----------------------------------------------------
          SECTION 3: PIPELINE OVERVIEW & STALLED OPPORTUNITIES (2-Column Grid)
          ---------------------------------------------------- */}
      <section className="crm-two-col-grid">
        {/* PIPELINE OVERVIEW */}
        <div className="crm-card crm-pipeline-overview-card">
          <div className="crm-card-header">
            <div>
              <h2 className="crm-card-title">Pipeline Overview</h2>
              <p className="crm-card-subtitle">
                Autonomous pipeline stages driven by customer behavior (Module 7)
              </p>
            </div>
            <Link to="/sales/pipeline" className="crm-header-link">
              Board &rarr;
            </Link>
          </div>

          {/* Segmented Pipeline Progress Bar */}
          <div className="crm-pipeline-bar-wrapper">
            <div className="crm-pipeline-segmented-bar">
              {PIPELINE_STAGES.map((stg) => {
                const count = stageCounts[stg.key] || 0;
                const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 16.66;
                return (
                  <div
                    key={stg.key}
                    className="crm-pipeline-bar-segment"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: stg.barColor,
                    }}
                    title={`${stg.label}: ${count} leads (${Math.round(pct)}%)`}
                  />
                );
              })}
            </div>
          </div>

          {/* Pipeline Stage Counts Grid */}
          <div className="crm-pipeline-stage-chips-grid">
            {PIPELINE_STAGES.map((stg) => {
              const count = stageCounts[stg.key] || 0;
              return (
                <div
                  key={stg.key}
                  className="crm-stage-chip-item"
                  onClick={() => navigate('/sales/pipeline')}
                >
                  <div className="crm-chip-label-row">
                    <span
                      className="crm-stage-indicator-dot"
                      style={{ backgroundColor: stg.barColor }}
                    />
                    <span className="crm-stage-chip-name">{stg.label}</span>
                  </div>
                  <span className="crm-stage-chip-count">{count}</span>
                </div>
              );
            })}
          </div>

          <div className="crm-pipeline-note-bar">
            <span>🔒 Read-only view &bull; Drag-and-drop disabled</span>
          </div>
        </div>

        {/* STALLED OPPORTUNITIES (Module 9) */}
        <div className="crm-card crm-stalled-card">
          <div className="crm-card-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="crm-card-title">Stalled Opportunities</h2>
                {stalledLeads.length > 0 && (
                  <span className="crm-stalled-count-chip">
                    {stalledLeads.length}
                  </span>
                )}
              </div>
              <p className="crm-card-subtitle">
                Deals in Qualified, Demo, or Negotiation with inactivity
              </p>
            </div>
            <Link to="/sales/pipeline" className="crm-header-link">
              View All &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="crm-loading-placeholder">Checking stalled status…</div>
          ) : stalledLeads.length === 0 ? (
            <div className="crm-empty-placeholder">
              <p>No stalled opportunities.</p>
              <span className="crm-empty-subtext">All active pipeline deals are progressing normally.</span>
            </div>
          ) : (
            <div className="crm-stalled-items-list">
              {stalledLeads.slice(0, 4).map((lead) => (
                <div
                  key={lead.id}
                  className="crm-stalled-item-row"
                  onClick={() => navigate(`/sales/leads/${lead.id}`)}
                >
                  <div className="crm-stalled-item-main">
                    <div className="crm-stalled-name-box">
                      <strong className="crm-stalled-cust-name">{lead.name}</strong>
                      <span className="crm-stalled-product-text">{lead.product || 'General Inquiry'}</span>
                    </div>
                    <span className={`crm-stage-pill stage-${(lead.stage || 'New').toLowerCase()}`}>
                      {lead.stage}
                    </span>
                  </div>
                  <div className="crm-stalled-item-meta">
                    <span className="crm-stalled-days-badge">
                      ⚠️ {lead.daysStalled || 0} {lead.daysStalled === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------
          SECTION 4: REVENUE OPPORTUNITIES (Module 11)
          ---------------------------------------------------- */}
      <section className="crm-card crm-section-box">
        <div className="crm-card-header">
          <div>
            <h2 className="crm-card-title">Revenue Opportunities</h2>
            <p className="crm-card-subtitle">
              Prioritized commercial opportunities ranked by expected revenue impact
            </p>
          </div>
          <Link to="/sales/analytics" className="crm-header-link">
            Analytics &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="crm-loading-placeholder">Loading revenue opportunities…</div>
        ) : revenueOpportunities.length === 0 ? (
          <div className="crm-empty-placeholder">
            <p>No revenue opportunities available yet.</p>
            <span className="crm-empty-subtext">
              Customer checkout initiations, product inquiries, and orders will populate revenue data.
            </span>
          </div>
        ) : (
          <div className="crm-revenue-table-wrapper">
            <table className="crm-data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Opportunity Value</th>
                  <th>Score</th>
                  <th>Intent</th>
                  <th>Momentum</th>
                  <th>Stage</th>
                  <th>Revenue Priority</th>
                  <th>Next Best Action</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {revenueOpportunities.slice(0, 6).map((lead) => (
                  <tr
                    key={lead.id}
                    className="crm-table-row-clickable"
                    onClick={() => navigate(`/sales/leads/${lead.id}`)}
                  >
                    <td>
                      <strong>{lead.name}</strong>
                    </td>
                    <td>
                      <span className="crm-product-name">{lead.product || 'Enterprise Product'}</span>
                    </td>
                    <td>
                      <strong style={{ color: '#059669', fontSize: '14px' }}>
                        {formatCurrency(lead.opportunityValue || lead.expectedDealValue)}
                      </strong>
                    </td>
                    <td>
                      <span className="crm-score-pill">{lead.score ?? 0}</span>
                    </td>
                    <td>
                      <span className={`crm-intent-badge intent-${(lead.intent || 'Low').toLowerCase().replace(' ', '-')}`}>
                        {lead.intent || 'Low'}
                      </span>
                    </td>
                    <td>
                      <span className={`crm-momentum-badge momentum-${(lead.momentum || 'Stable').toLowerCase()}`}>
                        {lead.momentum || 'Stable'}
                      </span>
                    </td>
                    <td>
                      <span className={`crm-stage-pill stage-${(lead.stage || 'New').toLowerCase()}`}>
                        {lead.stage}
                      </span>
                    </td>
                    <td>
                      <span className={`crm-rev-priority-badge rev-priority-${(lead.revenuePriority || 'LOW').toLowerCase()}`}>
                        {lead.revenuePriority || 'LOW'}
                      </span>
                    </td>
                    <td>
                      <span className="crm-nba-text" style={{ fontSize: '12px' }}>
                        {lead.nextBestAction || 'Introduce Relevant Products'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="crm-btn-table-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/sales/leads/${lead.id}`);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
