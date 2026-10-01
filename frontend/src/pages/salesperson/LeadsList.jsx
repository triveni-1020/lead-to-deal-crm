import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api/client.js';

const STAGES = [
  'All Stages',
  'New',
  'Engaged',
  'Qualified',
  'Demo',
  'Negotiation',
  'Won',
];

const INTENT_OPTIONS = [
  'All Intents',
  'Very High',
  'High',
  'Medium',
  'Low',
];

const MOMENTUM_OPTIONS = [
  'All Momentum',
  'Rising',
  'Stable',
  'Falling',
];

const STALL_OPTIONS = [
  'All Deals',
  'Stalled',
  'Not Stalled',
];

const SORT_OPTIONS = [
  { value: 'score', label: 'Sort by Score (Highest First)' },
  { value: 'created', label: 'Sort by Newest First' },
  { value: 'name', label: 'Sort by Name (A-Z)' },
];

export default function LeadsList() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');

  // Search and filter states (query param support)
  const queryParams = new URLSearchParams(location.search);
  const initialSearch = queryParams.get('q') || '';
  const initialFilter = queryParams.get('filter') === 'stalled' ? 'Stalled' : 'All Deals';

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [stageFilter, setStageFilter] = useState('All Stages');
  const [intentFilter, setIntentFilter] = useState('All Intents');
  const [momentumFilter, setMomentumFilter] = useState('All Momentum');
  const [stallFilter, setStallFilter] = useState(initialFilter);
  const [sortBy, setSortBy] = useState('score');

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
        if (isMounted) setError(err.message || 'Failed to load leads');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchLeads();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Filter and sort leads
  const filteredLeads = leads
    .filter((lead) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        (lead.name && lead.name.toLowerCase().includes(term)) ||
        (lead.email && lead.email.toLowerCase().includes(term)) ||
        (lead.company && lead.company.toLowerCase().includes(term)) ||
        (lead.product && lead.product.toLowerCase().includes(term));

      const matchesStage =
        stageFilter === 'All Stages' ||
        (lead.stage || 'New').toLowerCase() === stageFilter.toLowerCase();

      const matchesIntent =
        intentFilter === 'All Intents' ||
        (lead.intent || 'Low').toLowerCase() === intentFilter.toLowerCase();

      const matchesMomentum =
        momentumFilter === 'All Momentum' ||
        (lead.momentum || 'Stable').toLowerCase() === momentumFilter.toLowerCase();

      const matchesStall =
        stallFilter === 'All Deals' ||
        (stallFilter === 'Stalled' && Boolean(lead.isStalled)) ||
        (stallFilter === 'Not Stalled' && !lead.isStalled);

      return matchesSearch && matchesStage && matchesIntent && matchesMomentum && matchesStall;
    })
    .sort((a, b) => {
      if (sortBy === 'score') {
        return (Number(b.score) || 0) - (Number(a.score) || 0);
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'created') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      return 0;
    });

  return (
    <DashboardLayout
      title="Leads Management"
      subtitle="View, qualify, and monitor real customer sales opportunities."
      roleLabel="Salesperson"
    >
      {/* Success Notification */}
      {successMessage && (
        <div className="crm-alert-box alert-success">
          <span>{successMessage}</span>
          <button
            type="button"
            className="alert-close"
            onClick={() => setSuccessMessage('')}
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}

      {error && <div className="crm-alert-box error">{error}</div>}

      {/* Header bar */}
      <div className="crm-page-header-row">
        <div>
          <h2 className="crm-page-title">All Customer Leads</h2>
          <p className="crm-page-subtitle">
            Showing {filteredLeads.length} of {leads.length} verified CRM records
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/sales/leads/new" className="crm-btn-primary">
            + New Lead
          </Link>
          <Link to="/sales/pipeline" className="crm-btn-ghost">
            Pipeline Board &rarr;
          </Link>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="crm-filters-card">
        <div className="crm-filters-row">
          <div className="crm-search-input-box">
            <span className="crm-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name, email, company, product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="crm-filter-search-input"
            />
          </div>

          <div className="crm-filter-selects-group">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="crm-select-filter"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={intentFilter}
              onChange={(e) => setIntentFilter(e.target.value)}
              className="crm-select-filter"
            >
              {INTENT_OPTIONS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>

            <select
              value={momentumFilter}
              onChange={(e) => setMomentumFilter(e.target.value)}
              className="crm-select-filter"
            >
              {MOMENTUM_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={stallFilter}
              onChange={(e) => setStallFilter(e.target.value)}
              className="crm-select-filter"
            >
              {STALL_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="crm-select-filter"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table: LEAD | COMPANY / PRODUCT | SCORE | INTENT | MOMENTUM | STAGE | ACTION */}
      <div className="crm-card crm-table-card">
        {loading ? (
          <div className="crm-loading-placeholder">Loading leads catalog…</div>
        ) : leads.length === 0 ? (
          <div className="crm-empty-placeholder">
            <h3>No registered customers yet.</h3>
            <p className="muted">
              Customer registrations from the store will automatically appear here as qualified leads.
            </p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="crm-empty-placeholder">
            <h3>No matching leads</h3>
            <p className="muted">
              No leads match your selected search query or filters. Try adjusting your search term or filters.
            </p>
          </div>
        ) : (
          <div className="crm-table-responsive-wrapper">
            <table className="crm-data-table">
              <thead>
                <tr>
                  <th>LEAD</th>
                  <th>COMPANY / PRODUCT</th>
                  <th>SCORE</th>
                  <th>INTENT</th>
                  <th>MOMENTUM</th>
                  <th>STAGE</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="crm-table-row-clickable"
                    onClick={() => navigate(`/sales/leads/${lead.id}`)}
                  >
                    {/* LEAD COLUMN */}
                    <td>
                      <div className="crm-lead-title-box">
                        <strong className="crm-lead-name-text">{lead.name}</strong>
                        <span className="crm-lead-email-sub">{lead.email}</span>
                      </div>
                    </td>

                    {/* COMPANY / PRODUCT COLUMN */}
                    <td>
                      <div className="crm-lead-company-box">
                        <span className="crm-product-name">{lead.product || 'General Inquiry'}</span>
                        <span className="crm-company-name-sub">
                          {lead.company || 'Personal Account'} &bull; {lead.industry || 'General'}
                        </span>
                      </div>
                    </td>

                    {/* SCORE COLUMN */}
                    <td>
                      <div className="crm-score-pill-box">
                        <span className="crm-score-number">{lead.score ?? 0}</span>
                      </div>
                    </td>

                    {/* INTENT COLUMN */}
                    <td>
                      <span className={`crm-intent-badge intent-${(lead.intent || 'Low').toLowerCase().replace(' ', '-')}`}>
                        {lead.intent || 'Low'}
                      </span>
                    </td>

                    {/* MOMENTUM COLUMN */}
                    <td>
                      <span className={`crm-momentum-badge momentum-${(lead.momentum || 'Stable').toLowerCase()}`}>
                        {(lead.momentum || 'Stable') === 'Rising' ? '↗ ' : (lead.momentum || 'Stable') === 'Falling' ? '↘ ' : '→ '}
                        {lead.momentum || 'Stable'}
                      </span>
                    </td>

                    {/* STAGE COLUMN (with small [STALLED] badge if applicable) */}
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                        <span className={`crm-stage-pill stage-${(lead.stage || 'New').toLowerCase()}`}>
                          {lead.stage || 'New'}
                        </span>
                        {lead.isStalled && (
                          <span className="crm-stalled-mini-badge" title={lead.stalledReason || 'Stalled opportunity'}>
                            STALLED
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ACTION COLUMN */}
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
      </div>
    </DashboardLayout>
  );
}
