import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { api } from '../../api/client.js';

export default function Pricing() {
  const { token } = useAuth();
  const { showToast } = useCustomer();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPricing() {
      try {
        const data = await api('/customer/pricing', { token });
        setPlans(data.plans || []);
      } catch (err) {
        console.error('Error fetching pricing plans:', err);
        showToast('Failed to load pricing options', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadPricing();
  }, [token, showToast]);

  const handlePlanClick = async (plan) => {
    try {
      if (token) {
        await api('/customer/events', {
          method: 'POST',
          token,
          body: {
            eventType: 'PRICING_PLAN_VIEW',
            description: `Examined details for plan: ${plan.name}`,
            metadata: { planId: plan.id, planName: plan.name, billingCycle },
          },
        });
      }
    } catch (err) {
      console.warn('Failed to log pricing plan event:', err);
    }
  };

  const handleCtaClick = async (plan) => {
    try {
      if (token) {
        await api('/customer/events', {
          method: 'POST',
          token,
          body: {
            eventType: 'CONTACT_SALES_CLICK',
            description: `Clicked CTA for ${plan.name} pricing plan`,
            metadata: { planId: plan.id, planName: plan.name },
          },
        });
      }
    } catch (err) {
      console.warn('Failed to log contact click:', err);
    }

    if (plan.id === 'tier-starter') {
      navigate('/customer/products');
    } else if (plan.id === 'tier-business') {
      navigate('/customer/request-demo');
    } else {
      navigate(`/customer/contact?subject=${encodeURIComponent(`Enterprise Fleet Inquiry - ${plan.name}`)}`);
    }
  };

  if (loading) {
    return (
      <div className="customer-loading-state">
        <div className="spinner"></div>
        <p>Loading enterprise fleet plans...</p>
      </div>
    );
  }

  return (
    <div className="pricing-page">
      {/* Header */}
      <div className="pricing-header-center">
        <span className="pricing-kicker">Device Lifecycle & Fleet Solutions</span>
        <h1 className="pricing-title">Flexible Hardware Plans for Growing Fleets</h1>
        <p className="pricing-subtitle">
          From direct unit orders to full multi-vendor enterprise provisioning with Zero-Touch deployment and dedicated SLA support.
        </p>

        {/* Billing Switch */}
        <div className="billing-switch-wrap">
          <button
            type="button"
            className={`billing-switch-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly Fleet Billing
          </button>
          <button
            type="button"
            className={`billing-switch-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('yearly')}
          >
            Annual Contract <span className="discount-pill">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="pricing-cards-grid">
        {plans.map((plan) => {
          const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
          const formattedPrice = price > 0 ? `₹${price.toLocaleString('en-IN')}` : 'Pay per Unit';

          return (
            <div
              key={plan.id}
              className={`pricing-tier-card ${plan.highlighted ? 'highlighted' : ''}`}
              onClick={() => handlePlanClick(plan)}
            >
              {plan.highlighted && <div className="tier-popular-tag">Most Popular for Fleets</div>}

              <div className="tier-header">
                <h3 className="tier-name">{plan.name}</h3>
                <p className="tier-desc">{plan.description}</p>
              </div>

              <div className="tier-price-box">
                <span className="tier-price-amount">{formattedPrice}</span>
                {price > 0 && (
                  <span className="tier-price-period">
                    /{billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                )}
              </div>

              <ul className="tier-features-list">
                {plan.features.map((feat, idx) => (
                  <li key={idx} className="tier-feature-item">
                    <span className="tier-check">✓</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`btn btn-block ${plan.highlighted ? 'btn-primary' : 'btn-outline'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCtaClick(plan);
                }}
              >
                {plan.ctaText}
              </button>
            </div>
          );
        })}
      </div>

      {/* Enterprise SLA Comparison Banner */}
      <div className="enterprise-sla-banner">
        <div className="sla-banner-text">
          <h3>Need Custom Turnkey Deployment or Hardware Leasing?</h3>
          <p>
            We structure custom multi-year device leasing programs with trade-in asset residual guarantees for teams with 50+ members.
          </p>
        </div>
        <Link
          to="/customer/contact?subject=Custom%20Enterprise%20Leasing%20Contract"
          className="btn btn-primary btn-lg"
        >
          Consult Our Solutions Architects
        </Link>
      </div>
    </div>
  );
}
