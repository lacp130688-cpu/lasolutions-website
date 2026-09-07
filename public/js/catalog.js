/* ============================================
   laSolutions - Product Catalog Module
   Supabase data layer, filtering, search, sort, rendering
   ============================================ */

// ---------- Product Data ----------
var PRODUCTS = [];
var PRODUCTS_LOADED = false;

// ---------- Load data from Supabase ----------
function isSupabaseConfigured() {
  return !!(
    window.SUPABASE_URL &&
    window.SUPABASE_URL.indexOf('TU-PROYECTO') === -1 &&
    window.SUPABASE_ANON_KEY &&
    window.SUPABASE_ANON_KEY.indexOf('TU-ANON-KEY') === -1
  );
}

// Datos locales (ejemplos) mientras Supabase no este configurado
function loadFallbackData() {
  PRODUCTS = (window.FALLBACK_PRODUCTS || []).map(function (p) {
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      brand: p.brand,
      price: p.price,
      originalPrice: p.originalPrice,
      description: p.description,
      specs: (p.specs || []).slice(),
      image: p.image || 'assets/placeholder.svg',
      onSale: p.onSale === true,
      discount: p.discount || 0,
      featured: p.featured === true
    };
  });
  window.PROMOTIONS = (window.FALLBACK_PROMOTIONS || []).map(function (p) {
    return { productId: p.productId, discount: p.discount, salePrice: p.salePrice, endDate: p.endDate, label: p.label || '' };
  });
  PRODUCTS_LOADED = true;
}

function loadSiteData() {
  if (PRODUCTS_LOADED) return Promise.resolve(PRODUCTS);

  try {
    // Sin credenciales reales o SDK sin cargar: usar los productos ficticios de ejemplo
    if (!isSupabaseConfigured() || !window.supabase) {
      loadFallbackData();
      return Promise.resolve(PRODUCTS);
    }

    return Promise.all([
      supabase.from('products').select('*').eq('active', true).order('id'),
      supabase.from('promotions').select('*').eq('active', true)
    ])
    .then(function (results) {
      var productsRows = results[0].data || [];
      var promoRows = results[1].data || [];

      // Sin datos en la base: caer a los ejemplos locales
      if (!productsRows.length) {
        loadFallbackData();
        return PRODUCTS;
      }

      // Build legacy PROMOTIONS array
      // Postgres numeric viene como string: se convierte con Number()
      window.PROMOTIONS = promoRows.map(function (promo) {
        return {
          productId: promo.product_id,
          discount: promo.discount,
          salePrice: Number(promo.sale_price),
          endDate: promo.ends_at ? Date.parse(promo.ends_at) : null,
          label: promo.label || ''
        };
      });

      // Merge products with promos
      PRODUCTS = productsRows.map(function (product) {
        var specs = product.specs;
        if (typeof specs === 'string') {
          try { specs = JSON.parse(specs); } catch (e) { specs = []; }
        }
        if (!Array.isArray(specs)) specs = [];

        var originalPrice = Number(product.original_price || product.price);
        var price = Number(product.price);
        var onSale = false;
        var discount = 0;

        var promo = window.PROMOTIONS.find(function (p) { return p.productId === product.id; });
        if (promo) {
          price = promo.salePrice;
          onSale = true;
          discount = promo.discount;
        }

        return {
          id: product.id,
          name: product.name,
          category: product.category,
          brand: product.brand,
          price: price,
          originalPrice: originalPrice,
          description: product.description,
          specs: specs,
          image: product.image || 'assets/placeholder.svg',
          onSale: onSale,
          discount: discount,
          featured: product.featured
        };
      });

      PRODUCTS_LOADED = true;
      return PRODUCTS;
    })
    .catch(function (err) {
      console.error('Error cargando datos de Supabase, usando datos locales:', err);
      loadFallbackData();
      return PRODUCTS;
    });
  } catch (err) {
    // Defensa final: ningun error sincronico puede dejar la pagina vacia
    console.error('Error inesperado en loadSiteData, usando respaldo:', err);
    loadFallbackData();
    return Promise.resolve(PRODUCTS);
  }
}

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
      '<img src="' + resolveImageUrl(product.image) + '" alt="' + escapeHtml(product.name) + '" loading="lazy">' +
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

// ---------- Render brand filters dynamically from loaded data ----------
function renderBrandFilters() {
  var list = document.getElementById('brand-list');
  if (!list) return;

  var brands = [];
  PRODUCTS.forEach(function (p) {
    if (p.brand && brands.indexOf(p.brand) === -1) brands.push(p.brand);
  });
  brands.sort(function (a, b) { return a.localeCompare(b); });

  list.innerHTML = brands.map(function (b) {
    return '<label><input type="checkbox" data-filter-type="brand" value="' + escapeHtml(b) + '"> ' + escapeHtml(b) + '</label>';
  }).join('');
}

// ---------- Event Handlers ----------
function initCatalog() {
  // Brand filters are generated from the loaded products (Supabase or fallback)
  renderBrandFilters();

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

  var featured = PRODUCTS.filter(function (p) { return p.featured === true; });

  grid.innerHTML = featured.map(renderProductCard).join('');
}

// ---------- Brands marquee (Home page) ----------
function renderBrandsStrip() {
  var track = document.getElementById('brands-strip');
  if (!track) return;

  var brands = [];
  PRODUCTS.forEach(function (p) {
    // Solo marcas de terceros: la marca propia ya esta en el logo del sitio
    if (!p.brand || p.brand === 'laSolutions') return;
    if (brands.indexOf(p.brand) === -1) brands.push(p.brand);
  });
  brands.sort(function (a, b) { return a.localeCompare(b); });

  var chips = brands.map(function (b) {
    return '<div class="brand-chip" title="' + escapeHtml(b) + '">' + escapeHtml(b) + '</div>';
  }).join('');

  // Set duplicado para el loop infinito del marquee (translateX -50%)
  track.innerHTML = chips + chips;
}

// ---------- Featured carousel (Home page) ----------
function scrollCarousel(direction) {
  var track = document.getElementById('featured-grid');
  if (!track) return;

  var card = track.querySelector('.product-card');
  var step = card ? card.getBoundingClientRect().width + 32 : 360;
  track.scrollBy({ left: direction * step, behavior: 'smooth' });
}

function initFeaturedCarousel() {
  var track = document.getElementById('featured-grid');
  if (!track || !track.classList.contains('featured-carousel')) return;

  // Flechas: atenuar en los extremos
  track.addEventListener('scroll', function () {
    var prev = document.querySelector('.carousel-prev');
    var next = document.querySelector('.carousel-next');
    if (prev) prev.style.opacity = track.scrollLeft > 10 ? '1' : '0.35';
    if (next) next.style.opacity = track.scrollLeft + track.clientWidth >= track.scrollWidth - 10 ? '0.35' : '1';
  }, { passive: true });

  // Auto-play: avanza cada 4s, vuelve al inicio al llegar al final.
  // Pausa con el mouse encima o al tocar; se reanuda al salir.
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  var AUTO_MS = 4000;
  var timer = null;

  function step() {
    if (document.hidden) return;
    var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 10;
    if (atEnd) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    var card = track.querySelector('.product-card');
    var stepPx = card ? card.getBoundingClientRect().width + 32 : 360;
    track.scrollBy({ left: stepPx, behavior: 'smooth' });
  }

  function startAuto() {
    stopAuto();
    timer = setInterval(step, AUTO_MS);
  }

  function stopAuto() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  // Interaccion manual (scroll, hover, touch) reinicia el timer
  track.addEventListener('scroll', startAuto, { passive: true });
  track.addEventListener('mouseenter', stopAuto);
  track.addEventListener('mouseleave', startAuto);
  track.addEventListener('touchstart', stopAuto, { passive: true });
  track.addEventListener('touchend', startAuto, { passive: true });

  startAuto();
}
