/* ============================================
   laSolutions - Promotions Module
   Countdown timers, deal-of-day, promo banner
   Data loaded from Supabase via loadSiteData()
   ============================================ */

// ---------- Promotions Data ----------
var PROMOTIONS = [];

// ---------- Apply promotions to product data (idempotent) ----------
function applyPromotions() {
  if (!window.PRODUCTS || !window.PRODUCTS.length) return;
  if (!window.PROMOTIONS || !window.PROMOTIONS.length) return;

  window.PRODUCTS.forEach(function (product) {
    var promo = window.PROMOTIONS.find(function (p) { return p.productId === product.id; });
    if (promo) {
      product.originalPrice = product.originalPrice || product.price;
      product.price = promo.salePrice;
      product.onSale = true;
      product.discount = promo.discount;
    }
  });
}

// ---------- Get deal of the day ----------
function getDealOfTheDay() {
  if (!window.PROMOTIONS || !window.PROMOTIONS.length) return null;
  var bestDeal = window.PROMOTIONS.reduce(function (best, current) {
    return current.discount > best.discount ? current : best;
  });
  return bestDeal;
}

function getPromoForProduct(productId) {
  if (!window.PROMOTIONS || !window.PROMOTIONS.length) return null;
  return window.PROMOTIONS.find(function (p) { return p.productId === productId; });
}

// ---------- Countdown Timer ----------
function formatCountdown(endTime) {
  if (!endTime) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
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

  var promos = window.PROMOTIONS || [];
  var products = window.PRODUCTS || [];

  if (!promos.length) {
    if (dealContainer) dealContainer.innerHTML = '<p style="text-align:center;">No hay promociones disponibles en este momento.</p>';
    if (promoGrid) promoGrid.innerHTML = '';
    return;
  }

  // Deal of the day
  var deal = getDealOfTheDay();
  var dealProduct = deal
    ? products.find(function (p) { return p.id === deal.productId; })
    : null;

  if (dealContainer && dealProduct && deal) {
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
    var otherPromos = promos.filter(function (p) { return deal && p.productId !== deal.productId; });
    var html = '';

    otherPromos.forEach(function (promo, index) {
      var product = products.find(function (p) { return p.id === promo.productId; });
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
  var promos = window.PROMOTIONS || [];
  if (!promos.length) return;

  var deal = getDealOfTheDay();
  if (deal) {
    renderCountdown(deal.endDate, 'deal-countdown');
  }

  var otherPromos = deal ? promos.filter(function (p) { return p.productId !== deal.productId; }) : [];
  otherPromos.forEach(function (promo, index) {
    renderCountdown(promo.endDate, 'promo-countdown-' + index);
  });

  // Update every second
  if (window._promoInterval) clearInterval(window._promoInterval);
  window._promoInterval = setInterval(function () {
    if (deal) renderCountdown(deal.endDate, 'deal-countdown');
    otherPromos.forEach(function (promo, index) {
      renderCountdown(promo.endDate, 'promo-countdown-' + index);
    });
  }, 1000);
}

// ---------- Render promo banner on home page ----------
function renderPromoBanner() {
  var banner = document.getElementById('promo-banner');
  if (!banner) return;

  var promos = window.PROMOTIONS || [];
  if (!promos.length) {
    banner.innerHTML = '';
    return;
  }

  var totalSavings = promos.reduce(function (sum, p) { return sum + p.discount; }, 0);
  var maxDiscount = Math.max.apply(null, promos.map(function (p) { return p.discount; }));
  var base = typeof getBasePath === 'function' ? getBasePath() : '';

  banner.innerHTML =
    '<div class="promo-banner-text">' +
      '<h2>Ofertas Especiales</h2>' +
      '<p>Hasta ' + maxDiscount + '% de descuento en productos seleccionados. No te las pierdas.</p>' +
      '<a href="' + base + 'pages/promotions.html" class="btn btn-accent">Ver todas las ofertas</a>' +
    '</div>';
}
