import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../../context/AuthContext.jsx';
import RoleSelector from '../../components/RoleSelector.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('customer'); // 'customer' | 'salesperson'

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [skills, setSkills] = useState('');
  const [territory, setTerritory] = useState('');
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [location, setLocation] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter your full name');
        return;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError('Please enter a valid email address');
        return;
      }
      if (!phone.trim()) {
        setError('Please enter your phone number');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (role === 'salesperson') {
        if (!skills.trim()) {
          setError('Please provide your skills');
          return;
        }
        if (!territory.trim()) {
          setError('Please provide your sales territory');
          return;
        }
      }
    }

    setLoading(true);
    try {
      let user;
      if (mode === 'login') {
        user = await login(email, password, role);
      } else {
        user = await register({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          confirmPassword,
          role,
          ...(role === 'salesperson' && {
            skills: skills.trim(),
            territory: territory.trim(),
          }),
        });
      }
      navigate(homePathFor(user.role), { replace: true });
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <span className="logo">L</span> Lead-to-Deal Intelligence
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Authentication Options">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>

        <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p className="muted">
          {mode === 'login'
            ? 'Sign in to access your dashboard'
            : `Register as a ${role === 'salesperson' ? 'Salesperson' : 'Customer'}`}
        </p>

        <form onSubmit={submit} noValidate>
          <label>{mode === 'login' ? 'Login as' : 'Register as'}</label>
          <RoleSelector value={role} onChange={setRole} />

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 012-3456"
                autoComplete="tel"
              />
            </div>
          )}

          {mode === 'login' ? (
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          ) : (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {mode === 'register' && role === 'salesperson' && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="skills">Skills</label>
                <input
                  id="skills"
                  type="text"
                  required
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. Inbound, Enterprise SaaS"
                />
              </div>
              <div className="form-group">
                <label htmlFor="territory">Territory</label>
                <input
                  id="territory"
                  type="text"
                  required
                  value={territory}
                  onChange={(e) => setTerritory(e.target.value)}
                  placeholder="e.g. North America, EMEA"
                />
              </div>
            </div>
          )}

          {error && <div className="error">{error}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading
              ? mode === 'login'
                ? 'Signing in…'
                : 'Creating account…'
              : mode === 'login'
              ? 'Sign in'
              : 'Register & Continue'}
          </button>
        </form>

        <div className="auth-footer">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button type="button" className="link-btn" onClick={() => switchMode('register')}>
                Register
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button type="button" className="link-btn" onClick={() => switchMode('login')}>
                Login
              </button>
            </p>
          )}
        </div>

        <div className="demo-hint">
          <span>Dev testing demo accounts:</span><br />
          <code>customer@demo.com</code> / <code>customer123</code> &bull; <code>sales@demo.com</code> / <code>sales123</code>
        </div>
      </div>
    </div>
  );
}
