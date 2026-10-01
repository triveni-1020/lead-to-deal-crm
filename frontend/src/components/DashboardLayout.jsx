import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// SVG Navigation & Action Icons (Crisp, modern, professional)
const Icons = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  Leads: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Pipeline: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Activities: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Analytics: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Logout: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Search: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Bell: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  Close: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { key: 'Dashboard', label: 'Dashboard', path: '/sales', icon: Icons.Dashboard },
  { key: 'Leads', label: 'Leads', path: '/sales/leads', icon: Icons.Leads },
  { key: 'Pipeline', label: 'Pipeline', path: '/sales/pipeline', icon: Icons.Pipeline },
  { key: 'Activities', label: 'Activities', path: '/sales/activities', icon: Icons.Activities },
  { key: 'Analytics', label: 'Analytics', path: '/sales/analytics', icon: Icons.Analytics },
  { key: 'Settings', label: 'Settings', path: '/sales/settings', icon: Icons.Settings },
];

export default function DashboardLayout({
  title = 'Sales Intelligence Dashboard',
  subtitle = 'Monitor customer engagement, pipeline movement and sales opportunities.',
  roleLabel = 'Salesperson',
  children,
}) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isNavActive = (path) => {
    if (path === '/sales') {
      return location.pathname === '/sales' || location.pathname === '/sales/';
    }
    return location.pathname.startsWith(path);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      navigate(`/sales/leads?q=${encodeURIComponent(headerSearch.trim())}`);
    }
  };

  // Format today's date in a clean, professional format
  const todayDateString = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const salespersonInitials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'SP';

  return (
    <div className="crm-app-container">
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="crm-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* FIXED DARK NAVY SIDEBAR */}
      <aside className={`crm-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Top: Salesperson Profile Card */}
        <div className="crm-sidebar-profile">
          <div className="crm-profile-avatar-circle">
            {salespersonInitials}
          </div>
          <div className="crm-profile-info">
            <h3 className="crm-profile-name" title={user?.name || 'Sales Representative'}>
              {user?.name || 'Sales Representative'}
            </h3>
            <p className="crm-profile-email" title={user?.email || 'salesperson@email.com'}>
              {user?.email || 'salesperson@email.com'}
            </p>
          </div>
          <button
            type="button"
            className="crm-sidebar-mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <Icons.Close />
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="crm-sidebar-nav">
          <div className="crm-nav-section-label">MENU</div>
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(item.path);
            const IconComponent = item.icon;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`crm-nav-link ${active ? 'active' : ''}`}
              >
                <span className="crm-nav-icon">
                  <IconComponent />
                </span>
                <span className="crm-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Sidebar: Role & Logout */}
        <div className="crm-sidebar-footer">
          <div className="crm-sidebar-role-indicator">
            <span className="crm-role-status-dot" />
            <span className="crm-role-text">{roleLabel} Area</span>
          </div>
          <button
            type="button"
            className="crm-sidebar-logout-btn"
            onClick={logout}
            title="Log out of sales session"
          >
            <span className="crm-logout-icon">
              <Icons.Logout />
            </span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="crm-main-viewport">
        {/* TOP HEADER */}
        <header className="crm-top-header">
          <div className="crm-top-header-left">
            <button
              type="button"
              className="crm-hamburger-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation"
            >
              <Icons.Menu />
            </button>
            <div className="crm-header-titles">
              <h1 className="crm-header-title">{title}</h1>
              {subtitle && <p className="crm-header-subtitle">{subtitle}</p>}
            </div>
          </div>

          <div className="crm-top-header-right">
            {/* Header Search Form */}
            <form onSubmit={handleSearchSubmit} className="crm-header-search-form">
              <span className="crm-header-search-icon">
                <Icons.Search />
              </span>
              <input
                type="text"
                placeholder="Search leads, accounts..."
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                className="crm-header-search-input"
              />
            </form>

            {/* Notification Icon */}
            <div className="crm-header-notification-btn" title="System alerts & notifications">
              <Icons.Bell />
              <span className="crm-notification-badge-dot" />
            </div>

            {/* Subtle Date Label */}
            <div className="crm-header-date-badge">
              <span className="crm-date-text">{todayDateString}</span>
            </div>

            {/* Salesperson Avatar Pill */}
            <div
              className="crm-header-user-badge"
              onClick={() => navigate('/sales/settings')}
              title="Sales Profile & Settings"
            >
              <div className="crm-header-avatar">{salespersonInitials}</div>
              <span className="crm-header-user-name">{user?.name ? user.name.split(' ')[0] : 'Sales'}</span>
            </div>
          </div>
        </header>

        {/* DASHBOARD CONTENT BODY */}
        <main className="crm-content-canvas">
          {children}
        </main>
      </div>
    </div>
  );
}
