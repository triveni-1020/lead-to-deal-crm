import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCustomer } from '../context/CustomerContext.jsx';
import FreeDemoModal from './FreeDemoModal.jsx';

export default function CustomerLayout({ children }) {
  const { user, logout } = useAuth();
  const { wishlistCount, cartCount, toast } = useCustomer();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Strict Navigation Requirements:
  // Home | Shop | Categories | Wishlist | Cart | Profile
  const navLinks = [
    { label: 'Home', path: '/customer' },
    { label: 'Shop', path: '/customer/shop' },
    { label: 'Categories', path: '/customer/categories' },
    { label: 'Wishlist', path: '/customer/wishlist' },
    { label: 'Cart', path: '/customer/cart' },
    { label: 'Profile', path: '/customer/profile' },
  ];

  const isLinkActive = (path) => {
    if (path === '/customer') {
      return location.pathname === '/customer' || location.pathname === '/customer/';
    }
    if (path === '/customer/shop') {
      return location.pathname === '/customer/shop' || location.pathname.startsWith('/customer/products');
    }
    return location.pathname.startsWith(path);
  };

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/customer/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="customer-app">
      {/* Toast Notification */}
      {toast && (
        <div className={`customer-toast toast-${toast.type || 'success'}`}>
          <span className="toast-icon">
            {toast.type === 'error' ? '⚠️' : toast.type === 'info' ? 'ℹ️' : '✓'}
          </span>
          <span className="toast-text">{toast.text}</span>
        </div>
      )}

      {/* Free Product Demo Modal */}
      <FreeDemoModal />

      {/* Main E-Commerce Header */}
      <header className="customer-header">
        <div className="customer-container header-inner">
          {/* Logo & Brand */}
          <Link to="/customer" className="customer-brand">
            <div className="brand-icon">⚡</div>
            <div className="brand-text">
              <span className="brand-title">ApexTech</span>
              <span className="brand-subtitle">Electronics Store</span>
            </div>
          </Link>

          {/* Primary Navigation Links */}
          <nav className={`customer-navbar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <div className="nav-items-list">
              {navLinks.map((item) => {
                const active = isLinkActive(item.path);
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    className={`customer-nav-link ${active ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                    {item.label === 'Wishlist' && wishlistCount > 0 && (
                      <span className="nav-badge">{wishlistCount}</span>
                    )}
                    {item.label === 'Cart' && cartCount > 0 && (
                      <span className="nav-badge badge-cart">{cartCount}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Right Side Actions: Search | Customer Profile | Logout */}
          <div className="customer-header-actions">
            {/* Global Search Bar */}
            <form className="customer-search-form" onSubmit={handleGlobalSearch}>
              <div className="search-input-wrapper">
                <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="customer-search-input"
                />
              </div>
            </form>

            {/* Profile Dropdown */}
            <div className="profile-menu-container">
              <button
                className="profile-menu-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                title="Customer Profile"
              >
                <div className="user-avatar-circle">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <span className="user-display-name">{user?.name ? user.name.split(' ')[0] : 'Profile'}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {userMenuOpen && (
                <div className="profile-dropdown-card">
                  <div className="dropdown-user-header">
                    <strong>{user?.name || 'Customer'}</strong>
                    <span className="dropdown-user-email">{user?.email}</span>
                  </div>
                  <hr className="dropdown-divider" />
                  <Link
                    to="/customer/profile"
                    className="dropdown-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <span>👤</span> Customer Profile
                  </Link>
                  <Link
                    to="/customer/profile#orders"
                    className="dropdown-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <span>📦</span> My Orders
                  </Link>
                  <Link
                    to="/customer/wishlist"
                    className="dropdown-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <span>❤️</span> My Wishlist ({wishlistCount})
                  </Link>
                  <Link
                    to="/customer/cart"
                    className="dropdown-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <span>🛒</span> My Cart ({cartCount})
                  </Link>
                  <hr className="dropdown-divider" />
                  <button
                    className="dropdown-item text-danger"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                  >
                    <span>🚪</span> Logout
                  </button>
                </div>
              )}
            </div>

            {/* Direct Logout Button */}
            <button
              type="button"
              className="btn btn-outline btn-sm btn-nav-logout"
              onClick={logout}
              title="Sign Out"
            >
              Logout
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              className="mobile-nav-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Content Body */}
      <main className="customer-main-content">
        <div className="customer-container">{children}</div>
      </main>

      {/* Modern E-Commerce Footer */}
      <footer className="customer-footer">
        <div className="customer-container footer-content">
          <div className="footer-col">
            <div className="customer-brand footer-brand">
              <div className="brand-icon">⚡</div>
              <span className="brand-title">ApexTech Store</span>
            </div>
            <p className="footer-desc">
              Your premier destination for flagship smartphones, workstations, audio systems, and smart tech essentials with seamless direct ordering.
            </p>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/customer">Home</Link></li>
              <li><Link to="/customer/shop">Shop All Products</Link></li>
              <li><Link to="/customer/categories">Browse Categories</Link></li>
              <li><Link to="/customer/wishlist">Saved Wishlist</Link></li>
              <li><Link to="/customer/cart">Shopping Cart</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Featured Categories</h4>
            <ul>
              <li><Link to="/customer/shop?category=Smartphones">Flagship Smartphones</Link></li>
              <li><Link to="/customer/shop?category=Laptops">Workstations & Laptops</Link></li>
              <li><Link to="/customer/shop?category=Audio">Studio Headphones & ANC</Link></li>
              <li><Link to="/customer/shop?category=Smartwatches">Smartwatches & Wearables</Link></li>
              <li><Link to="/customer/shop?category=Tablets">Pro Creative Tablets</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Customer Account</h4>
            <ul>
              <li><Link to="/customer/profile">My Profile</Link></li>
              <li><Link to="/customer/profile#orders">Order History</Link></li>
              <li><Link to="/customer/wishlist">Wishlist ({wishlistCount})</Link></li>
              <li><Link to="/customer/cart">Shopping Cart ({cartCount})</Link></li>
              <li><button onClick={logout} className="footer-link-btn">Logout</button></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="customer-container footer-bottom-inner">
            <span>© 2026 ApexTech Store. All rights reserved.</span>
            <span>Premium Consumer Electronics & Fast Dispatch.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
