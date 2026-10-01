import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api/client.js';
import ProductCard from '../../components/ProductCard.jsx';

export default function Products() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Filter state
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [submittedQuery, setSubmittedQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || '');
  const [pricePreset, setPricePreset] = useState(searchParams.get('priceRange') || '');
  const [minRating, setMinRating] = useState(searchParams.get('rating') || '');
  const [availability, setAvailability] = useState(searchParams.get('availability') || '');
  const [sortOption, setSortOption] = useState(searchParams.get('sort') || 'featured');

  // Category-specific "More Filters"
  const [selectedRam, setSelectedRam] = useState(searchParams.get('ram') || '');
  const [selectedStorage, setSelectedStorage] = useState(searchParams.get('storage') || '');
  const [fiveGOnly, setFiveGOnly] = useState(searchParams.get('fiveG') === 'true');
  const [noiseCancellingOnly, setNoiseCancellingOnly] = useState(searchParams.get('noiseCancelling') === 'true');
  const [wirelessOnly, setWirelessOnly] = useState(searchParams.get('wireless') === 'true');
  const [selectedScreenSize, setSelectedScreenSize] = useState(searchParams.get('screenSize') || '');
  const [selectedProcessor, setSelectedProcessor] = useState(searchParams.get('processor') || '');

  // UI state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  // Prevent event spamming on initial mount
  const isFirstRender = useRef(true);

  // Sync state when URL searchParams change
  useEffect(() => {
    const qParam = searchParams.get('q') || '';
    const catParam = searchParams.get('category') || '';
    const brandParam = searchParams.get('brand') || '';
    const priceParam = searchParams.get('priceRange') || '';
    const ratingParam = searchParams.get('rating') || '';
    const availParam = searchParams.get('availability') || '';
    const sortParam = searchParams.get('sort') || 'featured';

    setSearchInput(qParam);
    setSubmittedQuery(qParam);
    setSelectedCategory(catParam);
    setSelectedBrand(brandParam);
    setPricePreset(priceParam);
    setMinRating(ratingParam);
    setAvailability(availParam);
    setSortOption(sortParam);

    setSelectedRam(searchParams.get('ram') || '');
    setSelectedStorage(searchParams.get('storage') || '');
    setFiveGOnly(searchParams.get('fiveG') === 'true');
    setNoiseCancellingOnly(searchParams.get('noiseCancelling') === 'true');
    setWirelessOnly(searchParams.get('wireless') === 'true');
    setSelectedScreenSize(searchParams.get('screenSize') || '');
    setSelectedProcessor(searchParams.get('processor') || '');
  }, [searchParams]);

  // Fetch products from backend
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (submittedQuery) params.set('q', submittedQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedBrand) params.set('brand', selectedBrand);

      // Price preset mapping
      if (pricePreset === 'under-10k') {
        params.set('maxPrice', '10000');
      } else if (pricePreset === '10k-25k') {
        params.set('minPrice', '10000');
        params.set('maxPrice', '25000');
      } else if (pricePreset === '25k-50k') {
        params.set('minPrice', '25000');
        params.set('maxPrice', '50000');
      } else if (pricePreset === '50k-100k') {
        params.set('minPrice', '50000');
        params.set('maxPrice', '100000');
      } else if (pricePreset === 'above-100k') {
        params.set('minPrice', '100000');
      }

      if (minRating) params.set('rating', minRating);
      if (availability) params.set('availability', availability);
      if (selectedRam) params.set('ram', selectedRam);
      if (selectedStorage) params.set('storage', selectedStorage);
      if (fiveGOnly) params.set('fiveG', 'true');
      if (noiseCancellingOnly) params.set('noiseCancelling', 'true');
      if (wirelessOnly) params.set('wireless', 'true');
      if (selectedScreenSize) params.set('screenSize', selectedScreenSize);
      if (selectedProcessor) params.set('processor', selectedProcessor);
      if (sortOption) params.set('sort', sortOption);

      const data = await api(`/customer/products?${params.toString()}`, { token });
      setProducts(data.products || []);
      if (data.categories) setCategories(data.categories);
      if (data.brands) setBrands(data.brands);
    } catch (err) {
      console.error('Error fetching catalog products:', err);
    } finally {
      setLoading(false);
    }
  }, [
    token,
    submittedQuery,
    selectedCategory,
    selectedBrand,
    pricePreset,
    minRating,
    availability,
    selectedRam,
    selectedStorage,
    fiveGOnly,
    noiseCancellingOnly,
    wirelessOnly,
    selectedScreenSize,
    selectedProcessor,
    sortOption,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Log filter events to salesperson CRM
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const hasActiveFilters = Boolean(
      selectedCategory ||
      selectedBrand ||
      pricePreset ||
      minRating ||
      availability ||
      selectedRam ||
      selectedStorage ||
      fiveGOnly ||
      noiseCancellingOnly ||
      wirelessOnly ||
      selectedScreenSize ||
      selectedProcessor
    );

    if (hasActiveFilters && token) {
      api('/customer/events', {
        method: 'POST',
        token,
        body: {
          eventType: 'PRODUCT_FILTER_USED',
          description: `Filtered products by: ${[
            selectedCategory && `Category: ${selectedCategory}`,
            selectedBrand && `Brand: ${selectedBrand}`,
            pricePreset && `Price: ${pricePreset}`,
            minRating && `${minRating}★+`,
            availability && availability,
            selectedRam && `RAM: ${selectedRam}`,
            selectedStorage && `Storage: ${selectedStorage}`,
            fiveGOnly && '5G',
            noiseCancellingOnly && 'Noise Cancelling',
            wirelessOnly && 'Wireless',
          ].filter(Boolean).join(', ')}`,
          metadata: {
            category: selectedCategory,
            brand: selectedBrand,
            pricePreset,
            minRating,
            availability,
          },
        },
      }).catch(() => {});
    }
  }, [
    token,
    selectedCategory,
    selectedBrand,
    pricePreset,
    minRating,
    availability,
    selectedRam,
    selectedStorage,
    fiveGOnly,
    noiseCancellingOnly,
    wirelessOnly,
    selectedScreenSize,
    selectedProcessor,
  ]);

  const updateUrlParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val) {
      next.set(key, val);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSubmittedQuery(searchInput.trim());
    updateUrlParam('q', searchInput.trim());

    if (searchInput.trim() && token) {
      api('/customer/events', {
        method: 'POST',
        token,
        body: {
          eventType: 'SEARCH',
          description: `Searched store catalog for "${searchInput.trim()}"`,
          metadata: { query: searchInput.trim() },
        },
      }).catch(() => {});
    }
  };

  const handleSortChange = (newSort) => {
    setSortOption(newSort);
    updateUrlParam('sort', newSort);
    if (token) {
      api('/customer/events', {
        method: 'POST',
        token,
        body: {
          eventType: 'PRODUCT_SORT_USED',
          description: `Sorted products by: ${newSort}`,
          metadata: { sort: newSort },
        },
      }).catch(() => {});
    }
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setSubmittedQuery('');
    setSelectedCategory('');
    setSelectedBrand('');
    setPricePreset('');
    setMinRating('');
    setAvailability('');
    setSelectedRam('');
    setSelectedStorage('');
    setFiveGOnly(false);
    setNoiseCancellingOnly(false);
    setWirelessOnly(false);
    setSelectedScreenSize('');
    setSelectedProcessor('');
    setSortOption('featured');
    setSearchParams({});
  };

  // Determine active category-specific filters count
  const moreFiltersCount = [
    selectedRam,
    selectedStorage,
    fiveGOnly,
    noiseCancellingOnly,
    wirelessOnly,
    selectedScreenSize,
    selectedProcessor,
  ].filter(Boolean).length;

  // Active filter chips list
  const activeChips = [];
  if (submittedQuery) {
    activeChips.push({ label: `Query: "${submittedQuery}"`, onRemove: () => { setSubmittedQuery(''); setSearchInput(''); updateUrlParam('q', ''); } });
  }
  if (selectedCategory) {
    activeChips.push({ label: `Category: ${selectedCategory}`, onRemove: () => { setSelectedCategory(''); updateUrlParam('category', ''); } });
  }
  if (selectedBrand) {
    activeChips.push({ label: `Brand: ${selectedBrand}`, onRemove: () => { setSelectedBrand(''); updateUrlParam('brand', ''); } });
  }
  if (pricePreset) {
    const priceLabels = {
      'under-10k': 'Under ₹10,000',
      '10k-25k': '₹10k - ₹25k',
      '25k-50k': '₹25k - ₹50k',
      '50k-100k': '₹50k - ₹100k',
      'above-100k': 'Above ₹100k',
    };
    activeChips.push({ label: `Price: ${priceLabels[pricePreset] || pricePreset}`, onRemove: () => { setPricePreset(''); updateUrlParam('priceRange', ''); } });
  }
  if (minRating) {
    activeChips.push({ label: `Rating: ${minRating}★+`, onRemove: () => { setMinRating(''); updateUrlParam('rating', ''); } });
  }
  if (availability) {
    activeChips.push({ label: `Stock: ${availability}`, onRemove: () => { setAvailability(''); updateUrlParam('availability', ''); } });
  }
  if (selectedRam) {
    activeChips.push({ label: `RAM: ${selectedRam}`, onRemove: () => { setSelectedRam(''); updateUrlParam('ram', ''); } });
  }
  if (selectedStorage) {
    activeChips.push({ label: `Storage: ${selectedStorage}`, onRemove: () => { setSelectedStorage(''); updateUrlParam('storage', ''); } });
  }
  if (fiveGOnly) {
    activeChips.push({ label: '5G Enabled', onRemove: () => { setFiveGOnly(false); updateUrlParam('fiveG', ''); } });
  }
  if (noiseCancellingOnly) {
    activeChips.push({ label: 'Noise Cancelling', onRemove: () => { setNoiseCancellingOnly(false); updateUrlParam('noiseCancelling', ''); } });
  }
  if (wirelessOnly) {
    activeChips.push({ label: 'Wireless Only', onRemove: () => { setWirelessOnly(false); updateUrlParam('wireless', ''); } });
  }
  if (selectedScreenSize) {
    activeChips.push({ label: `Screen: ${selectedScreenSize}`, onRemove: () => { setSelectedScreenSize(''); updateUrlParam('screenSize', ''); } });
  }
  if (selectedProcessor) {
    activeChips.push({ label: `CPU: ${selectedProcessor}`, onRemove: () => { setSelectedProcessor(''); updateUrlParam('processor', ''); } });
  }

  // Normalize selected category for drawer
  const normCategory = (selectedCategory || '').toLowerCase();
  const isPhone = normCategory.includes('smart') || normCategory.includes('phone');
  const isLaptop = normCategory.includes('laptop') || normCategory.includes('workstation');
  const isAudio = normCategory.includes('audio') || normCategory.includes('headphone');
  const isWatch = normCategory.includes('watch') || normCategory.includes('wearable');
  const isTablet = normCategory.includes('tablet') || normCategory.includes('ipad');

  return (
    <div className="shop-page">
      {/* Top Banner & Search Bar */}
      <div className="shop-header-banner">
        <div className="shop-header-left">
          <h1 className="shop-title">Shop Electronics</h1>
          <p className="shop-subtitle">
            Explore authentic flagship smartphones, workstations, audio systems, and wearables with verified warranty.
          </p>
        </div>

        <form className="shop-search-bar" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Search by name, brand, feature..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="shop-search-input"
          />
          <button type="submit" className="btn btn-primary shop-search-btn">
            Search
          </button>
        </form>
      </div>

      {/* CLEAN TOP FILTER BAR (NO large sidebar) */}
      <div className="top-filter-bar">
        {/* Category Dropdown */}
        <div className="filter-dropdown-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              updateUrlParam('category', e.target.value);
            }}
            className="top-filter-select"
            aria-label="Filter by Category"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Brand Dropdown */}
        <div className="filter-dropdown-wrap">
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              updateUrlParam('brand', e.target.value);
            }}
            className="top-filter-select"
            aria-label="Filter by Brand"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Price Dropdown */}
        <div className="filter-dropdown-wrap">
          <select
            value={pricePreset}
            onChange={(e) => {
              setPricePreset(e.target.value);
              updateUrlParam('priceRange', e.target.value);
            }}
            className="top-filter-select"
            aria-label="Filter by Price"
          >
            <option value="">Any Price</option>
            <option value="under-10k">Under ₹10,000</option>
            <option value="10k-25k">₹10,000 - ₹25,000</option>
            <option value="25k-50k">₹25,000 - ₹50,000</option>
            <option value="50k-100k">₹50,000 - ₹100,000</option>
            <option value="above-100k">Above ₹100,000</option>
          </select>
        </div>

        {/* Rating Dropdown */}
        <div className="filter-dropdown-wrap">
          <select
            value={minRating}
            onChange={(e) => {
              setMinRating(e.target.value);
              updateUrlParam('rating', e.target.value);
            }}
            className="top-filter-select"
            aria-label="Filter by Rating"
          >
            <option value="">All Ratings</option>
            <option value="4.5">4.5★ & Above</option>
            <option value="4.0">4.0★ & Above</option>
            <option value="3.5">3.5★ & Above</option>
          </select>
        </div>

        {/* Availability Dropdown */}
        <div className="filter-dropdown-wrap">
          <select
            value={availability}
            onChange={(e) => {
              setAvailability(e.target.value);
              updateUrlParam('availability', e.target.value);
            }}
            className="top-filter-select"
            aria-label="Filter by Availability"
          >
            <option value="">All Availability</option>
            <option value="In Stock">In Stock Only</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>

        {/* "More Filters" Button */}
        <button
          type="button"
          className={`btn-more-filters ${moreFiltersCount > 0 ? 'active' : ''}`}
          onClick={() => setMoreFiltersOpen(true)}
        >
          <span>⚙️ More Filters</span>
          {moreFiltersCount > 0 && <span className="more-filters-badge">{moreFiltersCount}</span>}
        </button>

        {/* Sort Dropdown */}
        <div className="sort-dropdown-wrap">
          <label htmlFor="sort-select" className="sort-label">Sort:</label>
          <select
            id="sort-select"
            value={sortOption}
            onChange={(e) => handleSortChange(e.target.value)}
            className="top-filter-select sort-select"
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Rating: High to Low</option>
            <option value="newest">Newest Arrivals</option>
          </select>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {activeChips.length > 0 && (
        <div className="filter-chips-bar">
          <span className="chips-label">Active Filters:</span>
          <div className="chips-list">
            {activeChips.map((chip, idx) => (
              <span key={idx} className="filter-chip">
                {chip.label}
                <button
                  type="button"
                  className="chip-remove-btn"
                  onClick={chip.onRemove}
                  title="Remove filter"
                >
                  ✕
                </button>
              </span>
            ))}
            <button
              type="button"
              className="btn-clear-all-chips"
              onClick={clearAllFilters}
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Products Count Line */}
      <div className="products-results-info">
        <span>
          Showing <strong>{products.length}</strong> {products.length === 1 ? 'product' : 'products'}
          {selectedCategory && ` in "${selectedCategory}"`}
        </span>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="shop-loading-state">
          <div className="spinner"></div>
          <p>Loading products...</p>
        </div>
      ) : products.length > 0 ? (
        <div className="product-grid shop-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="shop-empty-state">
          <div className="empty-icon">🔍</div>
          <h2>No matching products found</h2>
          <p>Try removing some filter criteria or searching with a different term.</p>
          <button type="button" className="btn btn-primary" onClick={clearAllFilters}>
            Reset All Filters
          </button>
        </div>
      )}

      {/* "MORE FILTERS" MODAL / SLIDING DRAWER (Displays ONLY category-relevant filters) */}
      {moreFiltersOpen && (
        <div className="modal-backdrop" onClick={() => setMoreFiltersOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3>Category Specifications</h3>
                <small>Showing filters tailored to: <strong>{selectedCategory || 'All Categories'}</strong></small>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setMoreFiltersOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="drawer-body">
              {!selectedCategory && (
                <div className="drawer-notice-box">
                  <p>💡 <em>Tip: Select a category above (e.g. Smartphones, Laptops, Audio) to see category-specific filters.</em></p>
                </div>
              )}

              {/* 1. SMARTPHONE FILTERS */}
              {(isPhone || !selectedCategory) && (
                <div className="drawer-section">
                  <h4 className="drawer-sec-title">📱 Smartphone Specs</h4>

                  <div className="drawer-field">
                    <label className="checkbox-control">
                      <input
                        type="checkbox"
                        checked={fiveGOnly}
                        onChange={(e) => {
                          setFiveGOnly(e.target.checked);
                          updateUrlParam('fiveG', e.target.checked ? 'true' : '');
                        }}
                      />
                      <span>5G Network Support</span>
                    </label>
                  </div>

                  <div className="drawer-field">
                    <label className="drawer-label">RAM Memory</label>
                    <select
                      value={selectedRam}
                      onChange={(e) => {
                        setSelectedRam(e.target.value);
                        updateUrlParam('ram', e.target.value);
                      }}
                      className="form-control"
                    >
                      <option value="">Any RAM</option>
                      <option value="8GB">8GB</option>
                      <option value="12GB">12GB</option>
                      <option value="16GB">16GB</option>
                    </select>
                  </div>

                  <div className="drawer-field">
                    <label className="drawer-label">Storage Capacity</label>
                    <select
                      value={selectedStorage}
                      onChange={(e) => {
                        setSelectedStorage(e.target.value);
                        updateUrlParam('storage', e.target.value);
                      }}
                      className="form-control"
                    >
                      <option value="">Any Storage</option>
                      <option value="128GB">128GB</option>
                      <option value="256GB">256GB</option>
                      <option value="512GB">512GB</option>
                      <option value="1TB">1TB</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 2. LAPTOP FILTERS */}
              {(isLaptop || !selectedCategory) && (
                <div className="drawer-section">
                  <h4 className="drawer-sec-title">💻 Laptop & Workstation Specs</h4>

                  <div className="drawer-field">
                    <label className="drawer-label">RAM Memory</label>
                    <select
                      value={selectedRam}
                      onChange={(e) => {
                        setSelectedRam(e.target.value);
                        updateUrlParam('ram', e.target.value);
                      }}
                      className="form-control"
                    >
                      <option value="">Any RAM</option>
                      <option value="16GB">16GB Unified / LPDDR5X</option>
                      <option value="32GB">32GB High-Performance</option>
                      <option value="64GB">64GB Enterprise Workstation</option>
                    </select>
                  </div>

                  <div className="drawer-field">
                    <label className="drawer-label">Processor Type</label>
                    <select
                      value={selectedProcessor}
                      onChange={(e) => {
                        setSelectedProcessor(e.target.value);
                        updateUrlParam('processor', e.target.value);
                      }}
                      className="form-control"
                    >
                      <option value="">Any Processor</option>
                      <option value="Apple M3">Apple Silicon M3 / M4</option>
                      <option value="Intel Core Ultra">Intel Core Ultra 9 / 7</option>
                      <option value="Snapdragon X Elite">Snapdragon X Elite</option>
                      <option value="AMD Ryzen">AMD Ryzen AI 9</option>
                    </select>
                  </div>

                  <div className="drawer-field">
                    <label className="drawer-label">Display Size</label>
                    <select
                      value={selectedScreenSize}
                      onChange={(e) => {
                        setSelectedScreenSize(e.target.value);
                        updateUrlParam('screenSize', e.target.value);
                      }}
                      className="form-control"
                    >
                      <option value="">Any Size</option>
                      <option value="13 inch">13-inch Compact</option>
                      <option value="14 inch">14-inch Balanced</option>
                      <option value="16 inch">16-inch Creative Studio</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 3. AUDIO FILTERS */}
              {(isAudio || !selectedCategory) && (
                <div className="drawer-section">
                  <h4 className="drawer-sec-title">🎧 Audio & Acoustic Specs</h4>

                  <div className="drawer-field">
                    <label className="checkbox-control">
                      <input
                        type="checkbox"
                        checked={noiseCancellingOnly}
                        onChange={(e) => {
                          setNoiseCancellingOnly(e.target.checked);
                          updateUrlParam('noiseCancelling', e.target.checked ? 'true' : '');
                        }}
                      />
                      <span>Active Noise Cancellation (ANC)</span>
                    </label>
                  </div>

                  <div className="drawer-field">
                    <label className="checkbox-control">
                      <input
                        type="checkbox"
                        checked={wirelessOnly}
                        onChange={(e) => {
                          setWirelessOnly(e.target.checked);
                          updateUrlParam('wireless', e.target.checked ? 'true' : '');
                        }}
                      />
                      <span>True Wireless / Bluetooth 5.4</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 4. SMARTWATCH & TABLET FILTERS */}
              {(isWatch || isTablet || !selectedCategory) && (
                <div className="drawer-section">
                  <h4 className="drawer-sec-title">⌚ Wearable & Tablet Specs</h4>

                  <div className="drawer-field">
                    <label className="checkbox-control">
                      <input
                        type="checkbox"
                        checked={fiveGOnly}
                        onChange={(e) => {
                          setFiveGOnly(e.target.checked);
                          updateUrlParam('fiveG', e.target.checked ? 'true' : '');
                        }}
                      />
                      <span>Cellular (eSIM / 5G) Enabled</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="drawer-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setSelectedRam('');
                  setSelectedStorage('');
                  setFiveGOnly(false);
                  setNoiseCancellingOnly(false);
                  setWirelessOnly(false);
                  setSelectedScreenSize('');
                  setSelectedProcessor('');
                  updateUrlParam('ram', '');
                  updateUrlParam('storage', '');
                  updateUrlParam('fiveG', '');
                  updateUrlParam('noiseCancelling', '');
                  updateUrlParam('wireless', '');
                  updateUrlParam('screenSize', '');
                  updateUrlParam('processor', '');
                }}
              >
                Reset Specs
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setMoreFiltersOpen(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
