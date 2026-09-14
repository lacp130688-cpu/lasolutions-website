/* ============================================
   laSolutions - Main Application Logic
   Navigation, shared utilities, page init
   ============================================ */

// Base path helper — determines relative prefix from current page depth
function getBasePath() {
  const path = window.location.pathname;
  if (path.includes('/pages/')) return '../';
  return '';
}

// Resolves an image source: absolute URLs (http/https/data) pass through,
// relative paths get the base path prefix so they work from any page depth
function resolveImageUrl(img) {
  if (!img) {
    img = 'assets/placeholder.svg';
  }
  if (/^(https?:)?\/\//.test(img) || img.indexOf('data:') === 0) {
    return img;
  }
  return getBasePath() + img;
}

// ---------- Mobile Navigation ----------
document.addEventListener('DOMContentLoaded', function () {
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('open');
    });

    // Close menu on link click
    navMenu.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        hamburger.classList.remove('active');
        navMenu.classList.remove('open');
      });
    });
  }

  // Scroll effect on navbar
  window.addEventListener('scroll', function () {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  });

  // Update nav auth state (async)
  getCurrentUser().then(renderNavAuth);

  // Listen for live session changes
  onAuthChange(renderNavAuth);
});

// ---------- Navigation Auth State ----------
function renderNavAuth(user) {
  const authContainer = document.getElementById('nav-auth');
  if (!authContainer) return;

  const base = getBasePath();

  if (user) {
    authContainer.innerHTML =
      '<span class="nav-user">Hola, ' + escapeHtml(user.name.split(' ')[0]) + '</span>' +
      '<button class="btn btn-sm btn-outline" onclick="handleLogout()">Cerrar sesion</button>';
  } else {
    authContainer.innerHTML =
      '<a href="' + base + 'pages/login.html" class="btn btn-sm btn-outline">Iniciar sesion</a>' +
      '<a href="' + base + 'pages/register.html" class="btn btn-sm btn-primary">Registrarse</a>';
  }
}

function handleLogout() {
  logout().then(function () {
    const base = getBasePath();
    window.location.href = base + 'index.html';
  });
}

// ---------- Smooth Scroll ----------
document.addEventListener('click', function (e) {
  const anchor = e.target.closest('a[href^="#"]');
  if (anchor) {
    const targetId = anchor.getAttribute('href');
    if (targetId === '#') return;
    const target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
});

// ---------- Utility Functions ----------
function formatPrice(price) {
  return '$' + price.toLocaleString('en-US');
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function getBadgeClass(category) {
  switch (category) {
    case 'Escritorio': return 'badge-desktop';
    case 'Gaming': return 'badge-gaming';
    case 'Laptop': return 'badge-laptop';
    default: return 'badge-desktop';
  }
}

// ---------- Product Detail Modal ----------
function openProductModal(productId) {
  var product = PRODUCTS.find(function (p) { return p.id === productId; });
  if (!product) return;

  var base = getBasePath();
  var modal = document.getElementById('product-modal');
  if (!modal) return;

  var badgeClass = getBadgeClass(product.category);
  var priceHtml = '';
  if (product.originalPrice && product.originalPrice > product.price) {
    priceHtml = '<span class="product-price-original">' + formatPrice(product.originalPrice) + '</span>' +
                '<span class="product-price">' + formatPrice(product.price) + '</span>';
  } else {
    priceHtml = '<span class="product-price">' + formatPrice(product.price) + '</span>';
  }

  var specsHtml = '';
  if (product.specs && product.specs.length) {
    specsHtml = '<div class="modal-specs"><h4>Especificaciones</h4><ul>';
    product.specs.forEach(function (spec) {
      specsHtml += '<li>' + escapeHtml(spec) + '</li>';
    });
    specsHtml += '</ul></div>';
  }

  modal.innerHTML =
    '<div class="modal">' +
      '<button class="modal-close" onclick="closeProductModal()" aria-label="Cerrar">&times;</button>' +
      '<div class="modal-image"><img src="' + resolveImageUrl(product.image) + '" alt="' + escapeHtml(product.name) + '"></div>' +
      '<div class="modal-body">' +
'<span class="product-badge ' + badgeClass + '">' + escapeHtml(product.category) + '</span>' +
        '<h2>' + escapeHtml(product.name) + '</h2>' +
        (product.brand ? '<p style="margin:0.35rem 0;"><span class="product-badge" style="background:rgba(0,212,255,0.12);color:var(--accent);">' + escapeHtml(product.brand) + '</span></p>' : '') +
        '<p style="margin: 0.75rem 0; color: var(--text-secondary);">' + escapeHtml(product.description) + '</p>' +
        specsHtml +
        '<div class="modal-footer">' +
          '<div>' + priceHtml + '</div>' +
          '<button class="btn btn-accent" onclick="addToCart(' + product.id + '); closeProductModal();">Agregar al carrito</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  var modal = document.getElementById('product-modal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

// Close modal on overlay click
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('show')) {
    closeProductModal();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeProductModal();
});

// ---------- Cart (localStorage) ----------
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('lasolutions_cart')) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('lasolutions_cart', JSON.stringify(cart));
}

function addToCart(productId) {
  var cart = getCart();
  var existing = cart.find(function (item) { return item.id === productId; });
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: productId, qty: 1 });
  }
  saveCart(cart);

  // Simple visual feedback
  var product = PRODUCTS.find(function (p) { return p.id === productId; });
  if (product) {
    showToast('Agregado: ' + product.name);
  }
}

// ---------- Toast Notification ----------
function showToast(message) {
  // Remove existing toast
  var existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  toast.style.cssText = 'position:fixed;bottom:2rem;right:2rem;background:var(--primary);color:#fff;padding:0.75rem 1.5rem;border-radius:8px;font-size:0.9rem;z-index:3000;animation:toastIn 0.3s ease;box-shadow:0 4px 15px rgba(108,99,255,0.4);';
  document.body.appendChild(toast);

  setTimeout(function () {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(function () { toast.remove(); }, 300);
  }, 2500);
}

// Inject toast animation
(function () {
  var style = document.createElement('style');
  style.textContent = '@keyframes toastIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}';
  document.head.appendChild(style);
})();
