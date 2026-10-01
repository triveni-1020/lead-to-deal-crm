const fs = require('fs');
const path = require('path');

const PRODUCTS_FILE = path.join(__dirname, 'products.json');

function loadProducts() {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      const data = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading products.json:', err.message);
  }
  return [];
}

let products = loadProducts();

function reload() {
  products = loadProducts();
  return products;
}

function getAll() {
  return [...products];
}

function getById(id) {
  if (!id) return null;
  const normalized = String(id).trim().toLowerCase();
  return products.find((p) => String(p.id).trim().toLowerCase() === normalized) || null;
}

function getCategories() {
  const cats = new Set(products.map((p) => p.category).filter(Boolean));
  return Array.from(cats).sort();
}

function getBrands(category = null) {
  let list = products;
  if (category) {
    list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }
  const brands = new Set(list.map((p) => p.brand).filter(Boolean));
  return Array.from(brands).sort();
}

function getRelated(productId, limit = 4) {
  const current = getById(productId);
  if (!current) return products.slice(0, limit);

  return products
    .filter((p) => p.id !== current.id)
    .sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      if (a.category === current.category) scoreA += 5;
      if (b.category === current.category) scoreB += 5;
      if (a.brand === current.brand) scoreA += 3;
      if (b.brand === current.brand) scoreB += 3;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

function searchAndFilter({
  q = '',
  category = '',
  brand = '',
  minPrice = null,
  maxPrice = null,
  rating = null,
  availability = '',
  inStock = false,
  sort = 'recommended',

  // Category specific filters
  ram = '',
  storage = '',
  fiveG = false,
  screenSize = '',
  camera = '',
  battery = '',
  processor = '',
  graphics = '',
  os = '',
  wireless = false,
  noiseCancellation = false,
  type = '',
  batteryLife = '',
  gps = false,
  calling = false,
  waterResistance = '',
  compatibility = '',
  cellularWifi = '',
} = {}) {
  let list = [...products];

  // 1. Text Query Search (name, brand, category, description, features, tags)
  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    list = list.filter((p) => {
      const matchName = p.name && p.name.toLowerCase().includes(query);
      const matchBrand = p.brand && p.brand.toLowerCase().includes(query);
      const matchCategory = p.category && p.category.toLowerCase().includes(query);
      const matchDesc = p.description && p.description.toLowerCase().includes(query);
      const matchFeatures = Array.isArray(p.features) && p.features.some((f) => f.toLowerCase().includes(query));
      const matchTags = Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(query));
      const matchSpecs = p.specifications && Object.values(p.specifications).some((val) => String(val).toLowerCase().includes(query));
      return matchName || matchBrand || matchCategory || matchDesc || matchFeatures || matchTags || matchSpecs;
    });
  }

  // 2. Category Filter
  if (category && category !== 'All') {
    const cats = category.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
    if (cats.length > 0) {
      list = list.filter((p) => p.category && cats.includes(p.category.toLowerCase()));
    }
  }

  // 3. Brand Filter
  if (brand && brand !== 'All') {
    const brands = brand.split(',').map((b) => b.trim().toLowerCase()).filter(Boolean);
    if (brands.length > 0) {
      list = list.filter((p) => p.brand && brands.includes(p.brand.toLowerCase()));
    }
  }

  // 4. Price Range
  if (minPrice !== null && minPrice !== undefined && minPrice !== '') {
    const min = Number(minPrice);
    if (!isNaN(min)) {
      list = list.filter((p) => p.price >= min);
    }
  }
  if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '') {
    const max = Number(maxPrice);
    if (!isNaN(max)) {
      list = list.filter((p) => p.price <= max);
    }
  }

  // 5. Rating
  if (rating !== null && rating !== undefined && rating !== '') {
    const r = Number(rating);
    if (!isNaN(r)) {
      list = list.filter((p) => (p.rating || 0) >= r);
    }
  }

  // 6. Availability
  if (availability === 'In Stock' || inStock === true || inStock === 'true') {
    list = list.filter((p) => p.available && p.stock > 0);
  } else if (availability === 'Out of Stock') {
    list = list.filter((p) => !p.available || p.stock <= 0);
  }

  // Helper spec matcher
  const matchSpec = (item, specKey, filterVal) => {
    if (!filterVal) return true;
    const val = item.specifications && item.specifications[specKey];
    if (!val) return false;
    return String(val).toLowerCase().includes(String(filterVal).toLowerCase());
  };

  // 7. Category-Specific Filters
  if (ram) list = list.filter((p) => matchSpec(p, 'RAM', ram));
  if (storage) list = list.filter((p) => matchSpec(p, 'Storage', storage));
  if (screenSize) list = list.filter((p) => matchSpec(p, 'Screen Size', screenSize) || matchSpec(p, 'Display', screenSize));
  if (camera) list = list.filter((p) => matchSpec(p, 'Camera', camera));
  if (battery) list = list.filter((p) => matchSpec(p, 'Battery', battery));
  if (processor) list = list.filter((p) => matchSpec(p, 'Processor', processor));
  if (graphics) list = list.filter((p) => matchSpec(p, 'Graphics', graphics));
  if (os) list = list.filter((p) => matchSpec(p, 'OS', os));
  if (batteryLife) list = list.filter((p) => matchSpec(p, 'Battery Life', batteryLife) || matchSpec(p, 'Battery', batteryLife));
  if (type) list = list.filter((p) => matchSpec(p, 'Type', type));
  if (waterResistance) list = list.filter((p) => matchSpec(p, 'Water Resistance', waterResistance));
  if (compatibility) list = list.filter((p) => matchSpec(p, 'Compatibility', compatibility));
  if (cellularWifi) list = list.filter((p) => matchSpec(p, 'Cellular/Wi-Fi', cellularWifi) || matchSpec(p, 'Network', cellularWifi));

  if (fiveG === true || fiveG === 'true') {
    list = list.filter((p) => {
      const net = (p.specifications && p.specifications['Network']) || (p.specifications && p.specifications['5G']) || '';
      return String(net).includes('5G') || (Array.isArray(p.tags) && p.tags.includes('5G'));
    });
  }

  if (noiseCancellation === true || noiseCancellation === 'true') {
    list = list.filter((p) => {
      const anc = p.specifications && p.specifications['Noise Cancellation'];
      return anc && !String(anc).toLowerCase().includes('no');
    });
  }

  if (wireless === true || wireless === 'true') {
    list = list.filter((p) => {
      const w = p.specifications && p.specifications['Wireless'];
      return w || (p.description && p.description.toLowerCase().includes('wireless'));
    });
  }

  if (gps === true || gps === 'true') {
    list = list.filter((p) => {
      const g = p.specifications && p.specifications['GPS'];
      return g && !String(g).toLowerCase().includes('no');
    });
  }

  if (calling === true || calling === 'true') {
    list = list.filter((p) => {
      const c = p.specifications && p.specifications['Calling'];
      return c && !String(c).toLowerCase().includes('no');
    });
  }

  // 8. Sorting
  switch (sort) {
    case 'price-asc':
    case 'Price Low → High':
      list.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
    case 'Price High → Low':
      list.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
    case 'Rating':
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'newest':
    case 'Newest':
      list.sort((a, b) => String(b.id).localeCompare(String(a.id)));
      break;
    case 'popular':
      list.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
      break;
    case 'relevance':
    case 'Relevance':
      if (q && q.trim()) {
        const query = q.trim().toLowerCase();
        list.sort((a, b) => {
          const aMatch = a.name.toLowerCase().includes(query) ? 2 : 0;
          const bMatch = b.name.toLowerCase().includes(query) ? 2 : 0;
          return bMatch - aMatch;
        });
      }
      break;
    case 'recommended':
    default:
      // Balanced default sort: high ratings & review volume
      list.sort((a, b) => ((b.rating || 4.5) * 10 + (b.reviewCount || 0) / 50) - ((a.rating || 4.5) * 10 + (a.reviewCount || 0) / 50));
      break;
  }

  return list;
}

module.exports = {
  reload,
  getAll,
  getById,
  getCategories,
  getBrands,
  getRelated,
  searchAndFilter,
};
