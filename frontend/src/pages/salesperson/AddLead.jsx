import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api/client.js';

const LEAD_SOURCES = [
  'Website',
  'Campaign',
  'Referral',
  'Event',
  'Partner',
  'Cold Outreach',
];

const COMPANY_SIZES = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '500+ employees',
];

export default function AddLead() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    industry: '',
    companySize: '',
    location: '',
    leadSource: 'Website',
    product: '',
    expectedDealValue: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!form.name.trim()) return setError('Full Name is required');
    if (
      !form.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      return setError('Please enter a valid email address');
    }
    if (!form.phone.trim()) return setError('Phone Number is required');
    if (!form.company.trim()) return setError('Company is required');
    if (!form.industry.trim()) return setError('Industry is required');
    if (!form.companySize) return setError('Please select a Company Size');
    if (!form.location.trim()) return setError('Location is required');
    if (!form.leadSource) return setError('Please select a Lead Source');
    if (!form.product.trim())
      return setError('Interested Product/Service is required');
    if (
      form.expectedDealValue === '' ||
      isNaN(Number(form.expectedDealValue)) ||
      Number(form.expectedDealValue) < 0
    ) {
      return setError('Please enter a valid Expected Deal Value');
    }

    try {
      setLoading(true);
      const res = await api('/salesperson/leads', {
        method: 'POST',
        token,
        body: {
          ...form,
          expectedDealValue: Number(form.expectedDealValue),
        },
      });

      // Redirect to leads list with success message
      navigate('/sales/leads', {
        state: {
          message: `Lead "${res.lead?.name || form.name}" created successfully!`,
        },
        replace: true,
      });
    } catch (err) {
      setError(err.message || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Create Lead" roleLabel="Salesperson" nav={['Dashboard', 'Leads']}>
      <div className="add-lead-container">
        <div className="form-header">
          <Link to="/sales/leads" className="back-link">
            &larr; Back to Leads
          </Link>
          <h2>Capture New Lead</h2>
          <p className="muted">
            Enter prospect details to add a new lead to your sales pipeline.
          </p>
        </div>

        <div className="card form-card">
          {error && <div className="error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <h3 className="section-title">Prospect Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="e.g. j.doe@company.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="e.g. +1 (555) 123-4567"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="location">Location *</label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  required
                  placeholder="e.g. Austin, TX or Toronto, ON"
                  value={form.location}
                  onChange={handleChange}
                />
              </div>
            </div>

            <h3 className="section-title" style={{ marginTop: '24px' }}>
              Company Details
            </h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="company">Company Name *</label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  required
                  placeholder="e.g. Global Tech Enterprises"
                  value={form.company}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="industry">Industry *</label>
                <input
                  id="industry"
                  name="industry"
                  type="text"
                  required
                  placeholder="e.g. SaaS, Fintech, Healthcare"
                  value={form.industry}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="companySize">Company Size *</label>
                <select
                  id="companySize"
                  name="companySize"
                  required
                  value={form.companySize}
                  onChange={handleChange}
                >
                  <option value="">Select Company Size</option>
                  {COMPANY_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="leadSource">Lead Source *</label>
                <select
                  id="leadSource"
                  name="leadSource"
                  required
                  value={form.leadSource}
                  onChange={handleChange}
                >
                  {LEAD_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <h3 className="section-title" style={{ marginTop: '24px' }}>
              Opportunity Overview
            </h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="product">Interested Product / Service *</label>
                <input
                  id="product"
                  name="product"
                  type="text"
                  required
                  placeholder="e.g. Enterprise License Tier 1"
                  value={form.product}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="expectedDealValue">
                  Expected Deal Value ($) *
                </label>
                <input
                  id="expectedDealValue"
                  name="expectedDealValue"
                  type="number"
                  min="0"
                  step="100"
                  required
                  placeholder="e.g. 50000"
                  value={form.expectedDealValue}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-actions">
              <Link to="/sales/leads" className="btn btn-ghost">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary btn-auto"
                disabled={loading}
              >
                {loading ? 'Saving Lead…' : 'Save & Capture Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
