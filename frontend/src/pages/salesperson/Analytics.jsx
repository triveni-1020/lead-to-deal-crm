import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api/client.js';

const PIPELINE_STAGES = [
  { key: 'New', label: 'New', color: '#94a3b8' },
  { key: 'Engaged', label: 'Engaged', color: '#38bdf8' },
  { key: 'Qualified', label: 'Qualified', color: '#6366f1' },
  { key: 'Demo', label: 'Demo', color: '#8b5cf6' },
  { key: 'Negotiation', label: 'Negotiation', color: '#f59e0b' },
  { key: 'Won', label: 'Won', color: '#10b981' },
];

const INTENT_LEVELS = [
  { key: 'Very High', label: 'Very High', color: '#8b5cf6' },
  { key: 'High', label: 'High', color: '#6366f1' },
  { key: 'Medium', label: 'Medium', color: '#3b82f6' },
  { key: 'Low', label: 'Low', color: '#94a3b8' },
];

const MOMENTUM_LEVELS = [
  { key: 'Rising', label: 'Rising', color: '#10b981' },
  { key: 'Stable', label: 'Stable', color: '#3b82f6' },
  { key: 'Falling', label: 'Falling', color: '#f43f5e' },
];

const REVENUE_PRIORITY_LEVELS = [
  { key: 'CRITICAL', label: 'Critical', color: '#9d174d', desc: 'Highest value with strong closing signals' },
  { key: 'HIGH', label: 'High', color: '#c2410c', desc: 'High revenue opportunities or high-value at risk' },
  { key: 'MEDIUM', label: 'Medium', color: '#4338ca', desc: 'Steady buyer interest or high value with low intent' },
  { key: 'LOW', label: 'Low', color: '#64748b', desc: 'Early discovery stage with standard value' },
];

function formatCurrency(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export default function Analytics() {
  const { token } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function fetchAnalyticsData() {
      try {
        setLoading(true);
        const res = await api('/salesperson/leads?all=true', { token });
        if (isMounted) {
          setLeads(res.leads || []);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load analytics data');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchAnalyticsData();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Separate active leads from won opportunities
  const activeLeads = leads.filter(
    (l) => (l.stage || 'New').toLowerCase() !== 'won'
  );
  const wonLeads = leads.filter(
    (l) => (l.stage || 'New').toLowerCase() === 'won'
  );

  // Key Module 11 Revenue Metrics
  const totalOpportunityValue = activeLeads.reduce(
    (sum, l) => sum + (Number(l.opportunityValue || l.expectedDealValue) || 0),
    0
  );

  const highRevenueOpportunities = activeLeads.filter(
    (l) => (l.revenuePriority || '').toUpperCase() === 'HIGH'
  ).length;

  const criticalRevenueOpportunities = activeLeads.filter(
    (l) => (l.revenuePriority || '').toUpperCase() === 'CRITICAL'
  ).length;

  // Pipeline stages: Qualified, Demo, Negotiation
  const pipelineStages = ['qualified', 'demo', 'negotiation'];
  const pipelineValue = activeLeads
    .filter((l) => pipelineStages.includes((l.stage || '').toLowerCase()))
    .reduce(
      (sum, l) => sum + (Number(l.opportunityValue || l.expectedDealValue) || 0),
      0
    );

  const wonRevenue = wonLeads.reduce(
    (sum, l) => sum + (Number(l.opportunityValue || l.expectedDealValue) || 0),
    0
  );

  const stalledCount = activeLeads.filter((l) => Boolean(l.isStalled)).length;

  // Distributions
  const revenuePriorityBreakdown = REVENUE_PRIORITY_LEVELS.map((rp) => {
    const count = activeLeads.filter(
      (l) => (l.revenuePriority || 'LOW').toUpperCase() === rp.key
    ).length;
    const pct = activeLeads.length > 0 ? Math.round((count / activeLeads.length) * 100) : 0;
    return { ...rp, count, pct };
  });

  const stageBreakdown = PIPELINE_STAGES.map((stg) => {
    const count = leads.filter(
      (l) => (l.stage || 'New').toLowerCase() === stg.key.toLowerCase()
    ).length;
    const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
    return { ...stg, count, pct };
  });

  const intentBreakdown = INTENT_LEVELS.map((int) => {
    const count = leads.filter(
      (l) => (l.intent || 'Low').toLowerCase() === int.key.toLowerCase()
    ).length;
    const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
    return { ...int, count, pct };
  });

  const momentumBreakdown = MOMENTUM_LEVELS.map((mom) => {
    const count = leads.filter(
      (l) => (l.momentum || 'Stable').toLowerCase() === mom.key.toLowerCase()
    ).length;
    const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
    return { ...mom, count, pct };
  });

  const topRevenueOpportunities = [...activeLeads]
    .filter((l) => Number(l.opportunityValue || l.expectedDealValue) > 0)
    .sort(
      (a, b) =>
        (Number(b.opportunityValue || b.expectedDealValue) || 0) -
        (Number(a.opportunityValue || a.expectedDealValue) || 0)
    );

  return (
    <DashboardLayout
      title="Sales Intelligence Analytics"
      subtitle="Comprehensive performance metrics, revenue prioritization, and pipeline insights."
      roleLabel="Salesperson"
    >
      {error && <div className="crm-alert-box error">{error}</div>}

      {/* KPI Cards: 5 Core Revenue Metrics + Stalled Alert */}
      <div className="crm-analytics-kpi-grid">
        <div className="crm-kpi-card">
          <span className="crm-kpi-label">TOTAL OPPORTUNITY VALUE</span>
          <div className="crm-kpi-value" style={{ color: '#0f172a' }}>
            {loading ? '…' : formatCurrency(totalOpportunityValue)}
          </div>
          <span className="crm-kpi-subtext">Active commercial pipeline</span>
        </div>

        <div className="crm-kpi-card">
          <span className="crm-kpi-label">CRITICAL REVENUE DEALS</span>
          <div className="crm-kpi-value" style={{ color: '#9d174d' }}>
            {loading ? '…' : criticalRevenueOpportunities}
          </div>
          <span className="crm-kpi-subtext">Immediate closing focus</span>
        </div>

        <div className="crm-kpi-card">
          <span className="crm-kpi-label">HIGH REVENUE DEALS</span>
          <div className="crm-kpi-value" style={{ color: '#c2410c' }}>
            {loading ? '…' : highRevenueOpportunities}
          </div>
          <span className="crm-kpi-subtext">High value & at-risk opportunities</span>
        </div>

        <div className="crm-kpi-card">
          <span className="crm-kpi-label">PIPELINE VALUE</span>
          <div className="crm-kpi-value" style={{ color: '#2563eb' }}>
            {loading ? '…' : formatCurrency(pipelineValue)}
          </div>
          <span className="crm-kpi-subtext">Qualified, Demo & Negotiation</span>
        </div>

        <div className="crm-kpi-card">
          <span className="crm-kpi-label">WON REVENUE</span>
          <div className="crm-kpi-value" style={{ color: '#10b981' }}>
            {loading ? '…' : formatCurrency(wonRevenue)}
          </div>
          <span className="crm-kpi-subtext">Completed customer orders</span>
        </div>

        <div className="crm-kpi-card">
          <span className="crm-kpi-label">STALLED OPPORTUNITIES</span>
          <div className="crm-kpi-value" style={{ color: stalledCount > 0 ? '#e11d48' : '#0f172a' }}>
            {loading ? '…' : stalledCount}
          </div>
          <span className="crm-kpi-subtext">Inactivity threshold reached</span>
        </div>
      </div>

      {/* Visual Breakdown Grid */}
      <div className="crm-two-col-grid" style={{ marginTop: '20px' }}>
        {/* Module 11: Revenue Priority Distribution */}
        <div className="crm-card crm-section-box">
          <div className="crm-card-header">
            <div>
              <h2 className="crm-card-title">Revenue Priority Distribution</h2>
              <p className="crm-card-subtitle">
                Deterministic business importance balancing product value and buying signals
              </p>
            </div>
          </div>
          <div className="crm-distribution-bars">
            {revenuePriorityBreakdown.map((item) => (
              <div key={item.key} className="crm-dist-bar-row">
                <div className="crm-dist-bar-header">
                  <div>
                    <span className="crm-dist-bar-label">{item.label} Priority</span>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                      {item.desc}
                    </span>
                  </div>
                  <span className="crm-dist-bar-metrics">
                    <strong>{item.count}</strong> ({item.pct}%)
                  </span>
                </div>
                <div className="crm-dist-bar-track">
                  <div
                    className="crm-dist-bar-fill"
                    style={{ width: `${Math.max(item.count > 0 ? 6 : 0, item.pct)}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Distribution */}
        <div className="crm-card crm-section-box">
          <div className="crm-card-header">
            <div>
              <h2 className="crm-card-title">Pipeline Distribution</h2>
              <p className="crm-card-subtitle">Lead concentration across autonomous sales stages</p>
            </div>
          </div>
          <div className="crm-distribution-bars">
            {stageBreakdown.map((item) => (
              <div key={item.key} className="crm-dist-bar-row">
                <div className="crm-dist-bar-header">
                  <span className="crm-dist-bar-label">{item.label}</span>
                  <span className="crm-dist-bar-metrics">
                    <strong>{item.count}</strong> ({item.pct}%)
                  </span>
                </div>
                <div className="crm-dist-bar-track">
                  <div
                    className="crm-dist-bar-fill"
                    style={{ width: `${Math.max(item.count > 0 ? 6 : 0, item.pct)}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Intent Distribution */}
        <div className="crm-card crm-section-box">
          <div className="crm-card-header">
            <div>
              <h2 className="crm-card-title">Intent Distribution</h2>
              <p className="crm-card-subtitle">Customer intent levels derived from browsing behavior</p>
            </div>
          </div>
          <div className="crm-distribution-bars">
            {intentBreakdown.map((item) => (
              <div key={item.key} className="crm-dist-bar-row">
                <div className="crm-dist-bar-header">
                  <span className="crm-dist-bar-label">{item.label}</span>
                  <span className="crm-dist-bar-metrics">
                    <strong>{item.count}</strong> ({item.pct}%)
                  </span>
                </div>
                <div className="crm-dist-bar-track">
                  <div
                    className="crm-dist-bar-fill"
                    style={{ width: `${Math.max(item.count > 0 ? 6 : 0, item.pct)}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Momentum Distribution */}
        <div className="crm-card crm-section-box">
          <div className="crm-card-header">
            <div>
              <h2 className="crm-card-title">Momentum Distribution</h2>
              <p className="crm-card-subtitle">Activity velocity and trajectory across all opportunities</p>
            </div>
          </div>
          <div className="crm-distribution-bars">
            {momentumBreakdown.map((item) => (
              <div key={item.key} className="crm-dist-bar-row">
                <div className="crm-dist-bar-header">
                  <span className="crm-dist-bar-label">{item.label}</span>
                  <span className="crm-dist-bar-metrics">
                    <strong>{item.count}</strong> ({item.pct}%)
                  </span>
                </div>
                <div className="crm-dist-bar-track">
                  <div
                    className="crm-dist-bar-fill"
                    style={{ width: `${Math.max(item.count > 0 ? 6 : 0, item.pct)}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Revenue Opportunities */}
        <div className="crm-card crm-section-box" style={{ gridColumn: '1 / -1' }}>
          <div className="crm-card-header">
            <div>
              <h2 className="crm-card-title">Top Active Revenue Opportunities</h2>
              <p className="crm-card-subtitle">High-impact deals ranked by product and commercial value</p>
            </div>
          </div>
          {topRevenueOpportunities.length === 0 ? (
            <div className="crm-empty-placeholder">
              <p>No active revenue opportunities yet.</p>
            </div>
          ) : (
            <div className="crm-revenue-table-wrapper">
              <table className="crm-data-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Product</th>
                    <th>Opportunity Value</th>
                    <th>Score</th>
                    <th>Intent</th>
                    <th>Momentum</th>
                    <th>Stage</th>
                    <th>Revenue Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {topRevenueOpportunities.slice(0, 8).map((l) => (
                    <tr key={l.id}>
                      <td>
                        <strong>{l.name}</strong>
                      </td>
                      <td>
                        <span className="crm-product-name">{l.product || 'General Product'}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#059669', fontSize: '13px' }}>
                          {formatCurrency(l.opportunityValue || l.expectedDealValue)}
                        </strong>
                      </td>
                      <td>
                        <span className="crm-score-pill">{l.score ?? 0}</span>
                      </td>
                      <td>
                        <span className={`crm-intent-badge intent-${(l.intent || 'Low').toLowerCase().replace(' ', '-')}`}>
                          {l.intent || 'Low'}
                        </span>
                      </td>
                      <td>
                        <span className={`crm-momentum-badge momentum-${(l.momentum || 'Stable').toLowerCase()}`}>
                          {l.momentum || 'Stable'}
                        </span>
                      </td>
                      <td>
                        <span className={`crm-stage-pill stage-${(l.stage || 'New').toLowerCase()}`}>
                          {l.stage}
                        </span>
                      </td>
                      <td>
                        <span className={`crm-rev-priority-badge rev-priority-${(l.revenuePriority || 'LOW').toLowerCase()}`}>
                          {l.revenuePriority || 'LOW'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
