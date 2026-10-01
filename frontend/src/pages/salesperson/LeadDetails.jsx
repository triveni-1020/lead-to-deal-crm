import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api/client.js';

const EVENT_TYPES = [
  'Website Visit',
  'Email Sent',
  'Email Opened',
  'Email Replied',
  'Call',
  'Meeting',
  'Demo',
  'Content Download',
  'Pricing Page Visit',
  'Contact Form Submitted',
];

const TIMELINE_FILTERS = ['All', 'Website', 'Email', 'Calls', 'Meetings', 'Demo', 'Other'];

const EVENT_ICONS = {
  'Website Visit': '🌐',
  'Pricing Page Visit': '🏷️',
  'Email Sent': '📤',
  'Email Opened': '✉️',
  'Email Replied': '💬',
  'Call': '📞',
  'Meeting': '👥',
  'Demo': '💻',
  'Content Download': '📄',
  'Contact Form Submitted': '📝',
  'Contact Form': '📝',
};

function getLocalDatetimeString() {
  const now = new Date();
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  return localIso;
}

function formatEventDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatEventTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatCurrency(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

const PIPELINE_STAGES = [
  { key: 'New', label: 'New', desc: 'Newly registered' },
  { key: 'Engaged', label: 'Engaged', desc: 'Catalog engagement' },
  { key: 'Qualified', label: 'Qualified', desc: 'Score ≥ 50 / Inquiry' },
  { key: 'Demo', label: 'Demo', desc: 'Demo requested' },
  { key: 'Negotiation', label: 'Negotiation', desc: 'Checkout initiated' },
  { key: 'Won', label: 'Won', desc: 'Purchase completed' },
];

export default function LeadDetails() {
  const { id } = useParams();
  const { token } = useAuth();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Score history state (Module 5)
  const [scoreHistory, setScoreHistory] = useState([]);

  // Pipeline stage history state (Module 7)
  const [stageHistory, setStageHistory] = useState([]);

  // Timeline events state (Module 4)
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState({ totalActivities: 0, lastActivity: null, lastActivityType: null });
  const [activeFilter, setActiveFilter] = useState('All');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    eventType: 'Website Visit',
    timestamp: getLocalDatetimeString(),
    description: '',
  });
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [leadRes, eventsRes, scoreRes, stageRes] = await Promise.all([
          api(`/salesperson/leads/${id}`, { token }),
          api(`/salesperson/leads/${id}/events`, { token }),
          api(`/salesperson/leads/${id}/score-history`, { token }),
          api(`/salesperson/leads/${id}/stage-history`, { token }),
        ]);

        if (isMounted) {
          setLead(leadRes.lead);
          setEvents(eventsRes.events || []);
          setSummary(eventsRes.summary || { totalActivities: 0, lastActivity: null, lastActivityType: null });
          setScoreHistory(scoreRes.history || []);
          setStageHistory(stageRes.history || []);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load lead details');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [id, token]);

  const openAddEventModal = () => {
    setModalForm({
      eventType: 'Website Visit',
      timestamp: getLocalDatetimeString(),
      description: '',
    });
    setModalError('');
    setShowModal(true);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!modalForm.eventType) {
      return setModalError('Please select an Event Type');
    }
    if (!modalForm.description.trim()) {
      return setModalError('Event description is required');
    }

    try {
      setModalLoading(true);
      const res = await api(`/salesperson/leads/${id}/events`, {
        method: 'POST',
        token,
        body: {
          eventType: modalForm.eventType,
          description: modalForm.description.trim(),
          timestamp: new Date(modalForm.timestamp).toISOString(),
        },
      });

      // 1. Update lead with calculated score
      if (res.lead) {
        setLead(res.lead);
      }

      // 2. Prepend event to timeline events list (newest first)
      if (res.event) {
        const updatedEvents = [res.event, ...events];
        setEvents(updatedEvents);

        // Update summary
        setSummary({
          totalActivities: updatedEvents.length,
          lastActivity: res.event.timestamp,
          lastActivityType: res.event.eventType,
        });
      }

      // 3. Append to score history records
      if (res.scoreRecord) {
        setScoreHistory((prev) => [...prev, res.scoreRecord]);
      }

      // 4. Append to stage history records if stage moved
      if (res.stageRecord) {
        setStageHistory((prev) => [res.stageRecord, ...prev]);
      }

      setShowModal(false);
      const ptStr = res.scoreRecord?.points ? `+${res.scoreRecord.points}` : '+0';
      const stageStr = res.stageChanged ? ` • Stage advanced to ${res.lead?.stage}!` : ` • Stage: ${res.lead?.stage || 'New'}`;
      setSuccessToast(
        `Activity "${res.event.eventType}" added! Score: ${res.scoreRecord?.previousScore ?? 0} → ${res.scoreRecord?.newScore ?? 0} (${ptStr})${stageStr} • Intent: ${res.lead?.intent || 'Low'} • Momentum: ${res.lead?.momentum || 'Stable'}`
      );
      setTimeout(() => setSuccessToast(''), 4500);
    } catch (err) {
      setModalError(err.message || 'Failed to create event');
    } finally {
      setModalLoading(false);
    }
  };

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Website') {
      return e.eventType === 'Website Visit' || e.eventType === 'Pricing Page Visit';
    }
    if (activeFilter === 'Email') {
      return (
        e.eventType === 'Email Sent' ||
        e.eventType === 'Email Opened' ||
        e.eventType === 'Email Replied'
      );
    }
    if (activeFilter === 'Calls') return e.eventType === 'Call';
    if (activeFilter === 'Meetings') return e.eventType === 'Meeting';
    if (activeFilter === 'Demo') return e.eventType === 'Demo';
    if (activeFilter === 'Other') {
      return (
        e.eventType === 'Content Download' ||
        e.eventType === 'Contact Form Submitted' ||
        e.eventType === 'Contact Form' ||
        !['Website Visit', 'Pricing Page Visit', 'Email Sent', 'Email Opened', 'Email Replied', 'Call', 'Meeting', 'Demo'].includes(e.eventType)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <DashboardLayout title="Lead Details" roleLabel="Salesperson" nav={['Dashboard', 'Leads']}>
        <div className="loading-state">Loading lead details…</div>
      </DashboardLayout>
    );
  }

  if (error || !lead) {
    return (
      <DashboardLayout title="Lead Details" roleLabel="Salesperson" nav={['Dashboard', 'Leads']}>
        <div className="error">{error || 'Lead not found'}</div>
        <Link to="/sales/leads" className="btn btn-ghost" style={{ marginTop: '16px', display: 'inline-block' }}>
          &larr; Back to Leads
        </Link>
      </DashboardLayout>
    );
  }

  const currentScore = Number(lead.score) || 0;

  return (
    <DashboardLayout title="Lead Details" roleLabel="Salesperson" nav={['Dashboard', 'Leads', 'Pipeline']}>
      <div className="lead-details-container">
        <div className="lead-details-nav">
          <Link to="/sales/leads" className="back-link">
            &larr; Back to Leads
          </Link>
        </div>

        {successToast && (
          <div className="alert-success">
            <span>{successToast}</span>
            <button type="button" className="alert-close" onClick={() => setSuccessToast('')}>
              &times;
            </button>
          </div>
        )}

        {/* Lead Main Banner */}
        <div className="card lead-summary-card">
          <div className="lead-summary-header">
            <div>
              <div className="lead-id-badge">{lead.id}</div>
              <h2>{lead.name}</h2>
              <p className="lead-company-subtitle">
                {lead.company} &bull; {lead.industry || 'General Industry'}
              </p>
            </div>
            <div className="lead-status-tags">
              {lead.isStalled && (
                <span className="stalled-tag-large">
                  ⚠️ STALLED ({lead.daysStalled}d)
                </span>
              )}
              <span className={`badge-priority badge-priority-${(lead.priority || 'LOW').toLowerCase()}`}>
                <span className="priority-dot" />
                {lead.priority || 'LOW'} Priority
              </span>
              <span className={`crm-rev-priority-badge rev-priority-${(lead.revenuePriority || 'LOW').toLowerCase()}`}>
                Revenue: {lead.revenuePriority || 'LOW'}
              </span>
              <span className={`badge badge-stage stage-${(lead.stage || 'New').toLowerCase()}`}>
                {lead.stage || 'New'}
              </span>
              <span className="badge badge-status-active">{lead.status || 'Active'}</span>
            </div>
          </div>
        </div>

        {/* Module 9: Stalled Opportunity Alert Banner */}
        {lead.isStalled && (
          <div className="stalled-alert-banner">
            <div className="stalled-alert-content">
              <div className="stalled-alert-title">
                <span>⚠️</span> Stalled Opportunity Alert — {lead.stage} Stage
                <span className="badge-stalled">{lead.daysStalled} DAYS STALLED</span>
              </div>
              <p className="stalled-alert-desc">
                <strong>Reason:</strong> {lead.stalledReason || `No meaningful activity or stage progress for ${lead.daysStalled} days.`}
              </p>
            </div>
            <div style={{ textAlign: 'right', minWidth: '190px' }}>
              <span style={{ fontSize: '11px', color: '#881337', display: 'block' }}>Last Meaningful Activity:</span>
              <strong style={{ fontSize: '12px', color: '#9f1239' }}>
                {lead.lastMeaningfulActivityAt
                  ? `${formatEventDate(lead.lastMeaningfulActivityAt)} at ${formatEventTime(lead.lastMeaningfulActivityAt)}`
                  : 'Stage Entry'}
              </strong>
            </div>
          </div>
        )}

        {/* -------------------------------------------
            MODULE 7: Autonomous Pipeline Progress Stepper
            ------------------------------------------- */}
        <div className="card pipeline-stepper-card" style={{ marginTop: '20px' }}>
          <div className="pipeline-stepper-header">
            <div>
              <h3 className="section-title" style={{ borderBottom: 'none', marginBottom: '2px', paddingBottom: 0 }}>
                Autonomous Pipeline Progress
              </h3>
              <p className="muted" style={{ fontSize: '13px' }}>
                Stage transitions are executed deterministically by backend rules based on customer behavior and score
              </p>
            </div>
            <div className="current-stage-tag-box">
              <span className="muted" style={{ fontSize: '13px', fontWeight: 600 }}>Current Stage:</span>
              <span className={`badge-stage-large stage-${(lead.stage || 'New').toLowerCase()}`}>
                {lead.stage || 'New'}
              </span>
            </div>
          </div>

          <div className="pipeline-steps-wrapper">
            {PIPELINE_STAGES.map((stg, idx) => {
              const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === (lead.stage || 'New'));
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const isFuture = idx > currentIdx;

              return (
                <div
                  key={stg.key}
                  className={`pipeline-step-node ${isCurrent ? 'step-current' : ''} ${isPast ? 'step-past' : ''} ${isFuture ? 'step-future' : ''}`}
                >
                  <div className="pipeline-step-indicator">
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <strong className="step-label">{stg.label}</strong>
                  <span className="step-sub">{stg.desc}</span>
                  {idx < PIPELINE_STAGES.length - 1 && <div className="pipeline-step-connector" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* -------------------------------------------
            MODULE 11: REVENUE PRIORITIZATION (Deterministic Commercial Priority)
            ------------------------------------------- */}
        <div className="card crm-rev-featured-card" style={{ marginTop: '20px' }}>
          <div className="crm-rev-featured-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="crm-rev-section-tag">REVENUE PRIORITY</span>
              <span className={`crm-rev-priority-badge rev-priority-${(lead.revenuePriority || 'LOW').toLowerCase()}`}>
                {lead.revenuePriority || 'LOW'}
              </span>
            </div>
            <div className="crm-rev-val-badge">
              Opportunity Value: <strong>{formatCurrency(lead.opportunityValue || lead.expectedDealValue)}</strong>
            </div>
          </div>
          <div className="crm-rev-featured-body">
            <div className="crm-rev-reason-box">
              <span className="crm-rev-why-label">Reason:</span>
              <p className="crm-rev-why-text">
                "{lead.revenuePriorityReason || 'Low opportunity value or early discovery stage with limited commercial commitment.'}"
              </p>
            </div>
            <div className="crm-rev-signals-grid">
              <div className="crm-rev-signal-item">
                <span className="crm-rev-signal-lbl">Product Value</span>
                <strong className="crm-rev-signal-val">{formatCurrency(lead.opportunityValue || lead.expectedDealValue)}</strong>
              </div>
              <div className="crm-rev-signal-item">
                <span className="crm-rev-signal-lbl">Score</span>
                <strong className="crm-rev-signal-val">{lead.score ?? 0}</strong>
              </div>
              <div className="crm-rev-signal-item">
                <span className="crm-rev-signal-lbl">Intent</span>
                <strong className="crm-rev-signal-val">{lead.intent || 'Low'}</strong>
              </div>
              <div className="crm-rev-signal-item">
                <span className="crm-rev-signal-lbl">Momentum</span>
                <strong className="crm-rev-signal-val">{lead.momentum || 'Stable'}</strong>
              </div>
              <div className="crm-rev-signal-item">
                <span className="crm-rev-signal-lbl">Stage</span>
                <strong className="crm-rev-signal-val">{lead.stage || 'New'}</strong>
              </div>
              <div className="crm-rev-signal-item">
                <span className="crm-rev-signal-lbl">Lead Priority</span>
                <strong className="crm-rev-signal-val">{lead.priority || 'LOW'}</strong>
              </div>
              <div className="crm-rev-signal-item">
                <span className="crm-rev-signal-lbl">Revenue Priority</span>
                <strong className="crm-rev-signal-val" style={{ color: lead.revenuePriority === 'CRITICAL' ? '#9d174d' : lead.revenuePriority === 'HIGH' ? '#c2410c' : '#1e1b4b' }}>
                  {lead.revenuePriority || 'LOW'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------
            MODULE 10: NEXT BEST ACTION (Deterministic Recommendation)
            ------------------------------------------- */}
        <div className="card crm-nba-featured-card" style={{ marginTop: '20px' }}>
          <div className="crm-nba-featured-header">
            <span className="crm-nba-badge-tag">NEXT BEST ACTION</span>
            {lead.triggerEvent && (
              <span className="crm-nba-trigger-tag">Trigger: {lead.triggerEvent}</span>
            )}
          </div>
          <div className="crm-nba-featured-body">
            <h3 className="crm-nba-action-heading">
              {lead.nextBestAction || 'No sales follow-up recommendation.'}
            </h3>
            {lead.actionReason && (
              <div className="crm-nba-reason-box">
                <span className="crm-nba-why-label">Why?</span>
                <p className="crm-nba-why-text">{lead.actionReason}</p>
              </div>
            )}
          </div>
        </div>

        {/* -------------------------------------------
            SECTION 1: Lead Information
            ------------------------------------------- */}
        <div className="card lead-section-card" style={{ marginTop: '20px' }}>
          <h3 className="section-title">Lead Information</h3>
          <div className="lead-info-grid" style={{ marginTop: '16px' }}>
            <div className="detail-rows">
              <div className="detail-row">
                <span className="detail-label">Full Name</span>
                <span className="detail-val font-semibold">{lead.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Company</span>
                <span className="detail-val font-semibold">{lead.company}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email</span>
                <span className="detail-val">
                  <a href={`mailto:${lead.email}`}>{lead.email}</a>
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone</span>
                <span className="detail-val">
                  <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                </span>
              </div>
            </div>

            <div className="detail-rows">
              <div className="detail-row">
                <span className="detail-label">Product / Opportunity Value</span>
                <span className="detail-val deal-value-highlight font-semibold">
                  {formatCurrency(lead.opportunityValue || lead.expectedDealValue)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Interested Product</span>
                <span className="detail-val">{lead.product}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Lead Source</span>
                <span className="detail-val">
                  <span className="badge badge-source">{lead.leadSource}</span>
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Location</span>
                <span className="detail-val">{lead.location}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Stalled Status</span>
                <span className="detail-val">
                  {lead.isStalled ? (
                    <span className="badge-stalled" style={{ margin: 0 }}>
                      ⚠️ STALLED ({lead.daysStalled}d)
                    </span>
                  ) : (
                    <span style={{ color: '#059669', fontWeight: 600 }}>Active</span>
                  )}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Revenue Priority</span>
                <span className="detail-val">
                  <span className={`crm-rev-priority-badge rev-priority-${(lead.revenuePriority || 'LOW').toLowerCase()}`}>
                    {lead.revenuePriority || 'LOW'}
                  </span>
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Next Best Action</span>
                <span className="detail-val" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                  {lead.nextBestAction || (
                    lead.stage === 'New'
                      ? 'Review customer registration'
                      : lead.stage === 'Engaged'
                      ? 'Follow up on product browsing'
                      : lead.stage === 'Demo'
                      ? 'Schedule product demo'
                      : lead.stage === 'Negotiation'
                      ? 'Assist with checkout & order'
                      : 'Customer engagement active'
                  )}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Last Meaningful Activity</span>
                <span className="detail-val" style={{ fontSize: '13px' }}>
                  {lead.lastMeaningfulActivityAt
                    ? `${formatEventDate(lead.lastMeaningfulActivityAt)} at ${formatEventTime(lead.lastMeaningfulActivityAt)}`
                    : 'Stage Entry'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------
            SECTION 2: Lead Intelligence (Score & Progress)
            ------------------------------------------- */}
        <div className="card lead-section-card" style={{ marginTop: '20px' }}>
          <div className="intelligence-header">
            <div>
              <h3 className="section-title" style={{ borderBottom: 'none', marginBottom: '2px', paddingBottom: 0 }}>
                Lead Intelligence
              </h3>
              <p className="muted" style={{ fontSize: '13px' }}>
                Real-time dynamic qualification score calculated from customer engagement signals
              </p>
            </div>
            <div className="score-main-display">
              <span className="score-main-label">Current Score:</span>
              <strong className="score-main-number">{currentScore}</strong>
              <span className="score-main-max">/ 100</span>
            </div>
          </div>

          {/* Dynamic Score Progress Bar */}
          <div className="score-progress-container">
            <div className="score-progress-track">
              <div
                className={`score-progress-fill ${
                  currentScore >= 70 ? 'score-hot' : currentScore >= 35 ? 'score-warm' : 'score-cool'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, currentScore))}%` }}
              />
            </div>
            <div className="score-progress-labels">
              <span>0 (Initial)</span>
              <span>35 (Engaged)</span>
              <span>70 (Qualified)</span>
              <span>100 (Deal-Ready)</span>
            </div>
          </div>

          {/* Module 6, 8 & 9: Intent, Momentum, Priority, Stall Status & Pipeline Stage */}
          <div className="signals-preview-grid">
            <div className="signal-box">
              <span className="signal-label">Score</span>
              <div className="signal-val">
                <span>{currentScore}</span>
                <span className="muted-text" style={{ fontSize: '13px', fontWeight: 500 }}>/ 100</span>
              </div>
              <span className="signal-hint">
                {currentScore >= 75 ? 'Very High Engagement' : currentScore >= 50 ? 'High Engagement' : currentScore >= 25 ? 'Medium Engagement' : 'Initial Phase'}
              </span>
            </div>
            <div className="signal-box">
              <span className="signal-label">Priority</span>
              <div className="signal-val">
                <span className={`badge-priority badge-priority-${(lead.priority || 'LOW').toLowerCase()}`}>
                  <span className="priority-dot" />
                  {lead.priority || 'LOW'}
                </span>
              </div>
              <span className="signal-hint">
                {lead.priority === 'URGENT' ? 'Immediate Action' : lead.priority === 'HIGH' ? 'High Focus' : lead.priority === 'MEDIUM' ? 'Standard Queue' : lead.priority === 'NONE' ? 'Deal Won' : 'Low Touch'}
              </span>
            </div>
            <div className="signal-box">
              <span className="signal-label">Stall Status</span>
              <div className="signal-val">
                {lead.isStalled ? (
                  <span className="badge-stalled" style={{ margin: 0 }}>
                    ⚠️ STALLED
                  </span>
                ) : (
                  <span style={{ color: '#059669', fontSize: '13px', fontWeight: 700 }}>● Active</span>
                )}
              </div>
              <span className="signal-hint">
                {lead.isStalled ? `${lead.daysStalled}d inactive in stage` : 'Progressing on track'}
              </span>
            </div>
            <div className="signal-box">
              <span className="signal-label">Intent</span>
              <div className="signal-val">
                <span className={`badge-intent-${(lead.intent || 'Low').toLowerCase().replace(' ', '-')}`}>
                  {lead.intent || 'Low'}
                </span>
              </div>
              <span className="signal-hint">Autonomous Detection</span>
            </div>
            <div className="signal-box">
              <span className="signal-label">Momentum</span>
              <div className="signal-val">
                <span className={`badge-momentum-${(lead.momentum || 'Stable').toLowerCase()}`}>
                  {(lead.momentum || 'Stable') === 'Rising' ? '↗ ' : (lead.momentum || 'Stable') === 'Falling' ? '↘ ' : '→ '}
                  {lead.momentum || 'Stable'}
                </span>
              </div>
              <span className="signal-hint">Activity Velocity</span>
            </div>
            <div className="signal-box">
              <span className="signal-label">Pipeline Stage</span>
              <strong className="signal-val">{lead.stage || 'New'}</strong>
              <span className="signal-hint">Status: {lead.status || 'Active'}</span>
            </div>
          </div>

          {/* Module 6, 8 & 9: Explanations for Priority, Stall Status, Intent, and Momentum */}
          <div className="intelligence-reasons-grid">
            {lead.isStalled && (
              <div className="intelligence-reason-card" style={{ gridColumn: '1 / -1', background: '#fff1f2', border: '1px solid #fecdd3', borderLeft: '4px solid #e11d48' }}>
                <div className="reason-header">
                  <span className="reason-icon">⚠️</span>
                  <span className="reason-title" style={{ color: '#9f1239' }}>Stalled Opportunity Diagnostics</span>
                  <span className="badge-stalled" style={{ marginLeft: 'auto' }}>
                    {lead.daysStalled} Days Inactive
                  </span>
                </div>
                <p className="reason-text" style={{ color: '#881337', fontWeight: 500 }}>
                  "{lead.stalledReason || `No meaningful activity or stage progress for ${lead.daysStalled} days.`}"
                </p>
              </div>
            )}
            <div className="intelligence-reason-card" style={{ gridColumn: '1 / -1' }}>
              <div className="reason-header">
                <span className="reason-icon">⭐</span>
                <span className="reason-title">Priority Reason & Engagement Trigger</span>
                <span className={`badge-priority badge-priority-${(lead.priority || 'LOW').toLowerCase()}`} style={{ marginLeft: 'auto' }}>
                  <span className="priority-dot" />
                  {lead.priority || 'LOW'}
                </span>
              </div>
              <p className="reason-text">
                "{lead.priorityReason || 'Newly registered lead with low engagement and limited recent activity.'}"
              </p>
            </div>
            <div className="intelligence-reason-card">
              <div className="reason-header">
                <span className="reason-icon">🎯</span>
                <span className="reason-title">Intent Reason</span>
              </div>
              <p className="reason-text">
                "{lead.intentReason || 'Intent is low because there is limited recent engagement.'}"
              </p>
            </div>
            <div className="intelligence-reason-card">
              <div className="reason-header">
                <span className="reason-icon">⚡</span>
                <span className="reason-title">Momentum Reason</span>
              </div>
              <p className="reason-text">
                "{lead.momentumReason || 'Engagement is stable because the lead has had consistent activity without a significant recent increase or decrease.'}"
              </p>
            </div>
          </div>
        </div>

        {/* -------------------------------------------
            SECTION 3: Score History (Audit Trail)
            ------------------------------------------- */}
        <div className="card lead-section-card" style={{ marginTop: '20px' }}>
          <div className="score-history-header">
            <div>
              <h3 className="section-title" style={{ borderBottom: 'none', marginBottom: '2px', paddingBottom: 0 }}>
                Score History
              </h3>
              <p className="muted" style={{ fontSize: '13px' }}>
                Transparent step-by-step breakdown of every score adjustment
              </p>
            </div>
            <span className="badge badge-subtle">{scoreHistory.length} adjustments</span>
          </div>

          {scoreHistory.length === 0 ? (
            <div className="empty-history-box">
              <p className="muted">
                No score history yet. When you log activities in the timeline below, the dynamic scoring engine will automatically calculate point increments here.
              </p>
            </div>
          ) : (
            <div className="score-history-list">
              {scoreHistory.map((item, idx) => (
                <div key={item.id || idx} className="score-history-item">
                  <div className="score-history-left">
                    <span className="score-history-icon">
                      {EVENT_ICONS[item.eventType] || '⚡'}
                    </span>
                    <div>
                      <strong className="score-history-title">{item.eventType}</strong>
                      <span className="score-history-meta">
                        {item.timestamp ? `${formatEventDate(item.timestamp)} at ${formatEventTime(item.timestamp)}` : 'Recorded'}
                      </span>
                    </div>
                  </div>

                  <div className="score-history-right">
                    <span className="points-pill">+{item.points}</span>
                    <div className="score-transition-badge">
                      <span className="muted-text">Score:</span>
                      <strong>{item.previousScore}</strong>
                      <span className="arrow-sep">&rarr;</span>
                      <strong className="new-score-highlight">{item.newScore}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* -------------------------------------------
            MODULE 7: Pipeline Stage History
            ------------------------------------------- */}
        <div className="card lead-section-card" style={{ marginTop: '20px' }}>
          <div className="score-history-header">
            <div>
              <h3 className="section-title" style={{ borderBottom: 'none', marginBottom: '2px', paddingBottom: 0 }}>
                Pipeline Stage History
              </h3>
              <p className="muted" style={{ fontSize: '13px' }}>
                Chronological record of automated stage movements driven by customer engagement, events, and score
              </p>
            </div>
            <span className="badge badge-subtle">{stageHistory.length} transitions</span>
          </div>

          {stageHistory.length === 0 ? (
            <div className="empty-history-box">
              <p className="muted">
                No stage transitions recorded yet. The lead is currently in the <strong>{lead.stage || 'New'}</strong> stage. As the customer browses, requests demos, or takes action, the backend will advance their stage here.
              </p>
            </div>
          ) : (
            <div className="stage-history-list">
              {stageHistory.map((item, idx) => (
                <div key={item.id || idx} className="stage-history-item">
                  <div className="stage-history-left">
                    <div className="stage-transition-badges">
                      <span className={`badge-stage-pill stage-${(item.oldStage || 'New').toLowerCase()}`}>
                        {item.oldStage || 'New'}
                      </span>
                      <span className="stage-arrow">→</span>
                      <span className={`badge-stage-pill stage-${(item.newStage || 'New').toLowerCase()} active`}>
                        {item.newStage}
                      </span>
                    </div>
                    <div className="stage-reason-block">
                      <span className="stage-reason-text">"{item.reason}"</span>
                    </div>
                  </div>
                  <div className="stage-history-right">
                    <span className="stage-history-time">
                      {item.timestamp
                        ? `${formatEventDate(item.timestamp)} at ${formatEventTime(item.timestamp)}`
                        : 'Recorded'}
                    </span>
                    <span className="badge-id-subtle">{item.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* -------------------------------------------
            SECTION 4: Activity Timeline & Event Stream
            ------------------------------------------- */}
        <div className="card timeline-card" style={{ marginTop: '20px' }}>
          <div className="timeline-header-bar">
            <div>
              <h3 className="section-title" style={{ borderBottom: 'none', marginBottom: '2px', paddingBottom: 0 }}>
                Activity Timeline
              </h3>
              <p className="muted" style={{ marginTop: '2px', fontSize: '13px' }}>
                Chronological event stream for {lead.name} &bull; Newest events displayed first
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-auto btn-sm"
              onClick={openAddEventModal}
            >
              + Add Event
            </button>
          </div>

          {/* Activity Summary Bar */}
          <div className="timeline-summary-bar">
            <div className="summary-pill">
              <span className="summary-pill-label">Total Activities:</span>
              <strong className="summary-pill-val">{summary.totalActivities}</strong>
            </div>
            <div className="summary-pill">
              <span className="summary-pill-label">Last Activity:</span>
              <strong className="summary-pill-val">
                {summary.lastActivity ? `${formatEventDate(summary.lastActivity)} at ${formatEventTime(summary.lastActivity)}` : 'None recorded'}
              </strong>
            </div>
            <div className="summary-pill">
              <span className="summary-pill-label">Last Activity Type:</span>
              <strong className="summary-pill-val">
                {summary.lastActivityType ? (
                  <span className="badge badge-source" style={{ marginLeft: '4px' }}>
                    {summary.lastActivityType}
                  </span>
                ) : 'N/A'}
              </strong>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="timeline-filters">
            {TIMELINE_FILTERS.map((f) => (
              <button
                type="button"
                key={f}
                className={`timeline-filter-btn ${activeFilter === f ? 'active' : ''}`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Events Stream List */}
          {filteredEvents.length === 0 ? (
            <div className="timeline-empty-box">
              <div className="timeline-icon">⏳</div>
              <h4>No activities recorded yet</h4>
              <p className="muted" style={{ margin: '6px 0 16px' }}>
                {activeFilter !== 'All'
                  ? `No events found matching the "${activeFilter}" filter.`
                  : 'Start logging touchpoints, calls, meetings, or customer interactions.'}
              </p>
              <button
                type="button"
                className="btn btn-primary btn-auto btn-sm"
                onClick={openAddEventModal}
              >
                + Log First Event
              </button>
            </div>
          ) : (
            <div className="timeline-stream">
              {filteredEvents.map((evt) => (
                <div key={evt.id} className="timeline-item">
                  <div className="timeline-icon-bubble">
                    {EVENT_ICONS[evt.eventType] || '📌'}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-meta">
                      <span className="timeline-time">{formatEventTime(evt.timestamp)}</span>
                      <span className="timeline-date">{formatEventDate(evt.timestamp)}</span>
                    </div>
                    <div className="timeline-item-header">
                      <h4 className="timeline-event-title">{evt.eventType}</h4>
                      <span className="timeline-badge-id">{evt.id}</span>
                    </div>
                    <p className="timeline-desc">{evt.description}</p>
                    <div className="timeline-author">
                      Logged by {evt.createdBy?.name || 'Salesperson'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Activity Event</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
            </div>

            {modalError && <div className="error">{modalError}</div>}

            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label htmlFor="eventType">Event Type *</label>
                <select
                  id="eventType"
                  value={modalForm.eventType}
                  onChange={(e) =>
                    setModalForm({ ...modalForm, eventType: e.target.value })
                  }
                  required
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="timestamp">Event Date & Time *</label>
                <input
                  id="timestamp"
                  type="datetime-local"
                  required
                  value={modalForm.timestamp}
                  onChange={(e) =>
                    setModalForm({ ...modalForm, timestamp: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  rows="3"
                  required
                  placeholder="e.g. Discussed pricing and contract scope during 30min discovery call"
                  value={modalForm.description}
                  onChange={(e) =>
                    setModalForm({ ...modalForm, description: e.target.value })
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-auto"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Logging Event…' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
