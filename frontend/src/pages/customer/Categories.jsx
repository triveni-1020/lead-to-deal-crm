import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api/client.js';

export default function Categories() {
  const { token } = useAuth();
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const categoryDefinitions = [
    {
      id: 'smartphones',
      name: 'Smartphones',
      queryParam: 'Smartphones',
      title: 'Flagship Smartphones',
      description: 'Ultra-fast processors, pro-grade optics, all-day battery life, and high-speed 5G connectivity.',
      icon: '📱',
      badge: 'Bestseller Category',
      popularBrands: 'Apple, Samsung, Google, OnePlus',
      image: '/products/prod-phone-1.svg',
    },
    {
      id: 'laptops',
      name: 'Laptops',
      queryParam: 'Laptops',
      title: 'Workstations & Laptops',
      description: 'Engineered for power users, developers, creative professionals, and executive multitasking.',
      icon: '💻',
      badge: 'High Performance',
      popularBrands: 'Apple, Dell, Lenovo, HP, ASUS',
      image: '/products/prod-laptop-1.svg',
    },
    {
      id: 'audio',
      name: 'Audio',
      queryParam: 'Audio',
      title: 'Audio & Studio Headphones',
      description: 'Immersive spatial audio, industry-leading active noise cancellation, and high-fidelity sound.',
      icon: '🎧',
      badge: 'Studio Grade',
      popularBrands: 'Sony, Bose, Sennheiser, Apple',
      image: '/products/prod-audio-1.svg',
    },
    {
      id: 'tablets',
      name: 'Tablets',
      queryParam: 'Tablets',
      title: 'Tablets & iPads',
      description: 'Ultra-thin OLED displays, precision stylus support, and exceptional all-day creative versatility.',
      icon: '📋',
      badge: 'Creative Precision',
      popularBrands: 'Apple, Samsung, Microsoft',
      image: '/products/prod-tab-1.svg',
    },
    {
      id: 'smartwatches',
      name: 'Smartwatches',
      queryParam: 'Smartwatches',
      title: 'Smartwatches & Wearables',
      description: 'Advanced biometric tracking, ECG monitoring, cellular untethered calls, and titanium durability.',
      icon: '⌚',
      badge: 'Health & Telemetry',
      popularBrands: 'Apple, Samsung, Garmin',
      image: '/products/prod-watch-1.svg',
    },
    {
      id: 'accessories',
      name: 'Accessories',
      queryParam: 'Accessories',
      title: 'Tech Essentials & Accessories',
      description: 'High-speed GaN fast chargers, magnetic wireless power banks, and premium braided cables.',
      icon: '🔌',
      badge: 'Everyday Essentials',
      popularBrands: 'Anker, Belkin, Apple',
      image: '/products/prod-acc-1.svg',
    },
  ];

  useEffect(() => {
    async function loadCounts() {
      try {
        const data = await api('/customer/products', { token });
        const list = data.products || [];
        const counts = {};
        list.forEach((p) => {
          const cat = p.category;
          counts[cat] = (counts[cat] || 0) + 1;
        });
        setCategoryCounts(counts);
      } catch (err) {
        console.error('Error loading category counts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCounts();
  }, [token]);

  return (
    <div className="categories-page">
      <div className="categories-header-banner">
        <div className="header-kicker">Device Fleet & Catalog</div>
        <h1 className="categories-title">Browse By Category</h1>
        <p className="categories-subtitle">
          Explore our complete selection of 24 flagship devices across 6 distinct hardware categories.
        </p>
      </div>

      {loading ? (
        <div className="customer-loading-state">
          <div className="spinner"></div>
          <p>Loading category catalog...</p>
        </div>
      ) : (
        <div className="categories-grid">
          {categoryDefinitions.map((cat) => {
            const count = categoryCounts[cat.name] || 4;

            return (
              <div key={cat.id} className="category-showcase-card">
                <div className="cat-card-top">
                  <div className="cat-icon-box">{cat.icon}</div>
                  <span className="cat-badge">{cat.badge}</span>
                </div>

                <div className="cat-card-img-wrap">
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="cat-card-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/products/prod-phone-1.svg';
                    }}
                  />
                </div>

                <div className="cat-card-body">
                  <h3 className="cat-card-title">{cat.title}</h3>
                  <p className="cat-card-desc">{cat.description}</p>

                  <div className="cat-meta-row">
                    <span className="cat-count-pill">{count} Products</span>
                    <span className="cat-brands-text">Brands: {cat.popularBrands}</span>
                  </div>

                  <Link
                    to={`/customer/shop?category=${encodeURIComponent(cat.queryParam)}`}
                    className="btn btn-primary btn-block cat-shop-btn"
                  >
                    Shop {cat.name} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
