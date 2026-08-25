/* ============================================
   laSolutions - Product Catalog Module
   Data, filtering, search, sort, rendering
   ============================================ */

// ---------- Product Data ----------
var PRODUCTS = [
  // Desktops
  {
    id: 1,
    name: 'laSolutions Pro Desktop',
    category: 'Escritorio',
    brand: 'laSolutions',
    price: 899,
    originalPrice: 899,
    description: 'Potente escritorio para profesionales. Ideal para oficina, desarrollo y multitarea exigente.',
    specs: ['Intel Core i5-13400', '16GB DDR4 RAM', '512GB SSD NVMe', 'Windows 11 Pro'],
    image: 'assets/placeholder.svg'
  },
  {
    id: 2,
    name: 'laSolutions Office Station',
    category: 'Escritorio',
    brand: 'laSolutions',
    price: 649,
    originalPrice: 649,
    description: 'Estacion de trabajo compacta para tareas de oficina, navegacion y productividad basica.',
    specs: ['Intel Core i3-12100', '8GB DDR4 RAM', '256GB SSD', 'Windows 11 Home'],
    image: 'assets/placeholder.svg'
  },
  {
    id: 3,
    name: 'laSolutions Creator Desktop',
    category: 'Escritorio',
    brand: 'laSolutions',
    price: 1299,
    originalPrice: 1299,
    description: 'Estacion creativa para editores de video, diseno grafico y modelado 3D.',
    specs: ['Intel Core i7-13700', '32GB DDR5 RAM', '1TB SSD NVMe', 'Windows 11 Pro'],
    image: 'assets/placeholder.svg'
  },
  // Gaming
  {
    id: 4,
    name: 'laSolutions Gamer Elite',
    category: 'Gaming',
    brand: 'laSolutions',
    price: 1499,
    originalPrice: 1499,
    description: 'PC gaming de gama media-alta para jugar en 1440p con altas tasas deFrames.',
    specs: ['AMD Ryzen 7 7800X', 'NVIDIA RTX 4070 12GB', '32GB DDR5 RAM', '1TB SSD NVMe'],
    image: 'assets/placeholder.svg'
  },
  {
    id: 5,
    name: 'laSolutions Gamer Ultra',
    category: 'Gaming',
    brand: 'laSolutions',
    price: 2199,
    originalPrice: 2199,
    description: 'La bestia gaming definitiva. Rendimiento extremo en 4K y streaming simultaneo.',
    specs: ['Intel Core i9-13900K', 'NVIDIA RTX 4080 16GB', '64GB DDR5 RAM', '2TB SSD NVMe'],
    image: 'assets/placeholder.svg'
  },
  {
    id: 6,
    name: 'laSolutions Gamer Starter',
    category: 'Gaming',
    brand: 'laSolutions',
    price: 999,
    originalPrice: 999,
    description: 'Tu primera PC gaming con rendimiento solido en 1080p para los juegos populares.',
    specs: ['AMD Ryzen 5 7600', 'NVIDIA RTX 4060 8GB', '16GB DDR5 RAM', '512GB SSD NVMe'],
    image: 'assets/placeholder.svg'
  },
  // Laptops
  {
    id: 7,
    name: 'laSolutions Laptop Pro 15',
    category: 'Laptop',
    brand: 'laSolutions',
    price: 1099,
    originalPrice: 1099,
    description: 'Laptop profesional de 15.6 pulgadas con potencia para trabajar desde cualquier lugar.',
    specs: ['Intel Core i7-13700H', '16GB DDR5 RAM', '512GB SSD NVMe', '15.6" Full HD IPS'],
    image: 'assets/placeholder.svg'
  },
  {
    id: 8,
    name: 'laSolutions Laptop Ultra 14',
    category: 'Laptop',
    brand: 'laSolutions',
    price: 1399,
    originalPrice: 1399,
    description: 'Laptop ultradelgada con pantalla 2K, perfecta para profesionales exigentes.',
    specs: ['Intel Core i7-13700H', '32GB DDR5 RAM', '1TB SSD NVMe', '14" 2K IPS 120Hz'],
    image: 'assets/placeholder.svg'
  },
  {
    id: 9,
    name: 'laSolutions Laptop Essential',
    category: 'Laptop',
    brand: 'laSolutions',
    price: 599,
    originalPrice: 599,
    description: 'Laptop accesible para estudios, oficina y uso diario. Excelente relacion precio-calidad.',
    specs: ['Intel Core i5-1235U', '8GB DDR4 RAM', '256GB SSD', '14" Full HD'],
    image: 'assets/placeholder.svg'
  }
];

// ---------- State ----------
var catalogState = {
  searchQuery: '',
  selectedCategories: [],
  selectedBrands: [],
  selectedPriceRanges: [],
  sortBy: 'default'
};

// ---------- Price Ranges ----------
var PRICE_RANGES = [
  { label: 'Menos de $700', min: 0, max: 699 },
  { label: '$700 - $1,000', min: 700, max: 1000 },
  { label: '$1,000 - $1,500', min: 1000, max: 1500 },
  { label: 'Mas de $1,500', min: 1500, max: Infinity }
];

// ---------- Filter & Sort ----------
function getFilteredProducts() {
  var filtered = PRODUCTS.slice();

  // Search
  if (catalogState.searchQuery) {
    var query = catalogState.searchQuery.toLowerCase();
    filtered = filtered.filter(function (p) {
      return p.name.toLowerCase().includes(query) ||
             p.description.toLowerCase().includes(query) ||
             p.category.toLowerCase().includes(query);
    });
  }

  // Category filter
  if (catalogState.selectedCategories.length > 0) {
    filtered = filtered.filter(function (p) {
      return catalogState.selectedCategories.indexOf(p.category) !== -1;
    });
  }

  // Brand filter
  if (catalogState.selectedBrands.length > 0) {
    filtered = filtered.filter(function (p) {
      return catalogState.selectedBrands.indexOf(p.brand) !== -1;
    });
  }

  // Price range filter
  if (catalogState.selectedPriceRanges.length > 0) {
    filtered = filtered.filter(function (p) {
      return catalogState.selectedPriceRanges.some(function (range) {
        return p.price >= range.min && p.price <= range.max;
      });
    });
  }

  // Sort
  switch (catalogState.sortBy) {
    case 'price-asc':
      filtered.sort(function (a, b) { return a.price - b.price; });
      break;
    case 'price-desc':
      filtered.sort(function (a, b) { return b.price - a.price; });
      break;
    case 'name':
      filtered.sort(function (a, b) { return a.name.localeCompare(b.name); });
      break;
  }

  return filtered;
}

// ---------- Rendering ----------
function renderProductCard(product) {
  var base = typeof getBasePath === 'function' ? getBasePath() : '';
  var badgeClass = getBadgeClass(product.category);
  var hasPromo = product.originalPrice > product.price;
  var priceHtml = '';

  if (hasPromo) {
    priceHtml = '<span class="product-price-original">' + formatPrice(product.originalPrice) + '</span>' +
                '<span class="product-price">' + formatPrice(product.price) + '</span>';
  } else {
    priceHtml = '<span class="product-price">' + formatPrice(product.price) + '</span>';
  }

  var badgeHtml = '<span class="product-badge ' + badgeClass + '">' + escapeHtml(product.category) + '</span>';
  if (hasPromo) {
    var discount = Math.round((1 - product.price / product.originalPrice) * 100);
    badgeHtml += ' <span class="product-badge badge-sale">-' + discount + '%</span>';
  }

  return '<div class="product-card" onclick="openProductModal(' + product.id + ')">' +
    '<div class="product-card-image">' +
      '<img src="' + base + product.image + '" alt="' + escapeHtml(product.name) + '" loading="lazy">' +
    '</div>' +
    '<div class="product-card-body">' +
      badgeHtml +
      '<h3>' + escapeHtml(product.name) + '</h3>' +
      '<p class="product-desc">' + escapeHtml(product.description) + '</p>' +
      '<div class="product-price-row">' +
        '<div>' + priceHtml + '</div>' +
        '<button class="btn btn-accent btn-sm" onclick="event.stopPropagation(); addToCart(' + product.id + ')">Agregar</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderCatalog() {
  var grid = document.getElementById('catalog-grid');
  var countEl = document.getElementById('product-count');
  if (!grid) return;

  var products = getFilteredProducts();

  if (countEl) {
    countEl.textContent = products.length + ' producto' + (products.length !== 1 ? 's' : '') + ' encontrado' + (products.length !== 1 ? 's' : '');
  }

  if (products.length === 0) {
    grid.innerHTML = '<div class="no-results" style="grid-column:1/-1"><h3>Sin resultados</h3><p>No se encontraron productos con los filtros seleccionados.</p></div>';
    return;
  }

  grid.innerHTML = products.map(renderProductCard).join('');
}

// ---------- Event Handlers ----------
function initCatalog() {
  // Search
  var searchInput = document.getElementById('catalog-search');
  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      catalogState.searchQuery = e.target.value;
      renderCatalog();
    });
  }

  // Sort
  var sortSelect = document.getElementById('catalog-sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', function (e) {
      catalogState.sortBy = e.target.value;
      renderCatalog();
    });
  }

  // Category checkboxes
  document.querySelectorAll('[data-filter-type="category"]').forEach(function (cb) {
    cb.addEventListener('change', function (e) {
      if (e.target.checked) {
        catalogState.selectedCategories.push(e.target.value);
      } else {
        catalogState.selectedCategories = catalogState.selectedCategories.filter(function (c) { return c !== e.target.value; });
      }
      renderCatalog();
    });
  });

  // Brand checkboxes
  document.querySelectorAll('[data-filter-type="brand"]').forEach(function (cb) {
    cb.addEventListener('change', function (e) {
      if (e.target.checked) {
        catalogState.selectedBrands.push(e.target.value);
      } else {
        catalogState.selectedBrands = catalogState.selectedBrands.filter(function (b) { return b !== e.target.value; });
      }
      renderCatalog();
    });
  });

  // Price range checkboxes
  document.querySelectorAll('[data-filter-type="price"]').forEach(function (cb) {
    cb.addEventListener('change', function (e) {
      var rangeIndex = parseInt(e.target.dataset.rangeIndex);
      if (e.target.checked) {
        catalogState.selectedPriceRanges.push(PRICE_RANGES[rangeIndex]);
      } else {
        catalogState.selectedPriceRanges = catalogState.selectedPriceRanges.filter(function (_, i) { return i !== rangeIndex; });
      }
      renderCatalog();
    });
  });

  // Mobile filter toggle
  var filterToggle = document.getElementById('filter-toggle');
  var sidebar = document.querySelector('.catalog-sidebar');
  if (filterToggle && sidebar) {
    filterToggle.addEventListener('click', function () {
      sidebar.classList.toggle('mobile-open');
    });
  }

  renderCatalog();
}

// ---------- Featured Products (Home page) ----------
function renderFeaturedProducts() {
  var grid = document.getElementById('featured-grid');
  if (!grid) return;

  // One per category: id 1 (Desktop), 4 (Gaming), 7 (Laptop)
  var featuredIds = [1, 4, 7];
  var featured = featuredIds.map(function (id) {
    return PRODUCTS.find(function (p) { return p.id === id; });
  }).filter(Boolean);

  grid.innerHTML = featured.map(renderProductCard).join('');
}
