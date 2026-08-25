/* ============================================
   laSolutions - Promotions Module
   Deals data, countdown timers, deal-of-day
   ============================================ */

// ---------- Promotions Data ----------
var PROMOTIONS = [
  {
    productId: 1,
    discount: 15,
    salePrice: 764,
    endDate: null, // Will be set dynamically
    label: 'Oferta de escritorio'
  },
  {
    productId: 4,
    discount: 10,
    salePrice: 1349,
    endDate: null,
    label: 'Oferta gaming'
  },
  {
    productId: 7,
    discount: 20,
    salePrice: 879,
    endDate: null,
    label: 'Oferta laptop'
  },
  {
    productId: 9,
    discount: 25,
    salePrice: 449,
    endDate: null,
    label: 'Oferta laptop'
  }
];

// Set end dates (different durations for each promo)
function initPromoDates() {
  var now = Date.now();
  PROMOTIONS[0].endDate = now + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000; // 2 days 5 hours
  PROMOTIONS[1].endDate = now + 1 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000; // 1 day 12 hours
  PROMOTIONS[2].endDate = now + 3 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000; // 3 days 8 hours
  PROMOTIONS[3].endDate = now + 5 * 60 * 60 * 1000 + 30 * 60 * 1000; // 5 hours 30 min
}

// ---------- Apply promotions to product data ----------
function applyPromotions() {
  if (typeof PRODUCTS === 'undefined') return;

  PRODUCTS.forEach(function (product) {
    var promo = PROMOTIONS.find(function (p) { return p.productId === product.id; });
    if (promo) {
      product.originalPrice = product.price;
      product.price = promo.salePrice;
      product.onSale = true;
    }
  });
}

// ---------- Get deal of the day ----------
function getDealOfTheDay() {
  // The deal with the highest discount
  var bestDeal = PROMOTIONS.reduce(function (best, current) {
    return current.discount > best.discount ? current : best;
  });
  return bestDeal;
}

function getPromoForProduct(productId) {
  return PROMOTIONS.find(function (p) { return p.productId === productId; });
}

// ---------- Countdown Timer ----------
function formatCountdown(endTime) {
  var diff = endTime - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

  var days = Math.floor(diff / (1000 * 60 * 60 * 24));
  var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days: days, hours: hours, minutes: minutes, seconds: seconds, expired: false };
}

function renderCountdown(endTime, containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var time = formatCountdown(endTime);
  if (time.expired) {
    container.innerHTML = '<span style="color:var(--error);font-weight:600;">Oferta expirada</span>';
    return;
  }

  container.innerHTML =
    '<div class="countdown-unit"><span class="countdown-value">' + String(time.days).padStart(2, '0') + '</span><span class="countdown-label">Dias</span></div>' +
    '<div class="countdown-unit"><span class="countdown-value">' + String(time.hours).padStart(2, '0') + '</span><span class="countdown-label">Horas</span></div>' +
    '<div class="countdown-unit"><span class="countdown-value">' + String(time.minutes).padStart(2, '0') + '</span><span class="countdown-label">Min</span></div>' +
    '<div class="countdown-unit"><span class="countdown-value">' + String(time.seconds).padStart(2, '0') + '</span><span class="countdown-label">Seg</span></div>';
}

// ---------- Render Promotions Page ----------
function renderPromotionsPage() {
  var dealContainer = document.getElementById('deal-of-day');
  var promoGrid = document.getElementById('promo-grid');

  if (!dealContainer && !promoGrid) return;

  initPromoDates();

  // Deal of the day
  var deal = getDealOfTheDay();
  var dealProduct = typeof PRODUCTS !== 'undefined'
    ? PRODUCTS.find(function (p) { return p.id === deal.productId; })
    : null;

  if (dealContainer && dealProduct) {
    var base = typeof getBasePath === 'function' ? getBasePath() : '';
    dealContainer.innerHTML =
      '<div>' +
        '<div style="margin-bottom:1rem;"><span class="promo-discount">-' + deal.discount + '% OFF</span></div>' +
        '<h2 style="margin-bottom:0.5rem;">' + escapeHtml(dealProduct.name) + '</h2>' +
        '<p style="margin-bottom:1rem;">' + escapeHtml(dealProduct.description) + '</p>' +
        '<div class="promo-prices">' +
          '<span class="promo-price-old">' + formatPrice(dealProduct.originalPrice) + '</span>' +
          '<span class="promo-price-new">' + formatPrice(dealProduct.price) + '</span>' +
        '</div>' +
        '<div class="countdown" id="deal-countdown"></div>' +
        '<div style="margin-top:1.5rem;">' +
          '<button class="btn btn-accent" onclick="addToCart(' + dealProduct.id + ')">Comprar ahora</button>' +
        '</div>' +
      '</div>' +
      '<div class="promo-card-image" style="border-radius:var(--radius-card);">' +
        '<img src="' + base + 'assets/placeholder.svg" alt="' + escapeHtml(dealProduct.name) + '">' +
      '</div>';
  }

  // Other promotions
  if (promoGrid) {
    var otherPromos = PROMOTIONS.filter(function (p) { return p.productId !== deal.productId; });
    var html = '';

    otherPromos.forEach(function (promo, index) {
      var product = typeof PRODUCTS !== 'undefined'
        ? PRODUCTS.find(function (p) { return p.id === promo.productId; })
        : null;
      if (!product) return;

      var base = typeof getBasePath === 'function' ? getBasePath() : '';
      html +=
        '<div class="promo-card">' +
          '<div class="promo-card-image">' +
            '<img src="' + base + 'assets/placeholder.svg" alt="' + escapeHtml(product.name) + '" loading="lazy">' +
          '</div>' +
          '<div class="promo-card-body">' +
            '<span class="promo-discount">-' + promo.discount + '% OFF</span>' +
            '<h3>' + escapeHtml(product.name) + '</h3>' +
            '<div class="promo-prices">' +
              '<span class="promo-price-old">' + formatPrice(product.originalPrice) + '</span>' +
              '<span class="promo-price-new">' + formatPrice(product.price) + '</span>' +
            '</div>' +
            '<div class="countdown" id="promo-countdown-' + index + '"></div>' +
            '<div style="margin-top:1rem;">' +
              '<button class="btn btn-accent btn-sm" onclick="addToCart(' + product.id + ')">Agregar al carrito</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    });

    promoGrid.innerHTML = html;
  }

  // Start countdown timers
  startCountdowns();
}

function startCountdowns() {
  // Deal of the day countdown
  var deal = getDealOfTheDay();
  renderCountdown(deal.endDate, 'deal-countdown');

  // Other promo countdowns
  var otherPromos = PROMOTIONS.filter(function (p) { return p.productId !== deal.productId; });
  otherPromos.forEach(function (promo, index) {
    renderCountdown(promo.endDate, 'promo-countdown-' + index);
  });

  // Update every second
  if (window._promoInterval) clearInterval(window._promoInterval);
  window._promoInterval = setInterval(function () {
    renderCountdown(deal.endDate, 'deal-countdown');
    otherPromos.forEach(function (promo, index) {
      renderCountdown(promo.endDate, 'promo-countdown-' + index);
    });
  }, 1000);
}

// ---------- Render promo banner on home page ----------
function renderPromoBanner() {
  var banner = document.getElementById('promo-banner');
  if (!banner) return;

  initPromoDates();
  var totalSavings = PROMOTIONS.reduce(function (sum, p) { return sum + p.discount; }, 0);
  var base = typeof getBasePath === 'function' ? getBasePath() : '';

  banner.innerHTML =
    '<div class="promo-banner-text">' +
      '<h2>Ofertas Especiales</h2>' +
      '<p>Hasta ' + Math.max.apply(null, PROMOTIONS.map(function (p) { return p.discount; })) + '% de descuento en productos seleccionados. No te las pierdas.</p>' +
      '<a href="' + base + 'pages/promotions.html" class="btn btn-accent">Ver todas las ofertas</a>' +
    '</div>';
}
