'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUser, logout, onAuthChange, type AuthUser } from '@/lib/auth';
import { addToCart, closeProductModal, onModalChange, onToastChange, getToastMessage, showToast } from '@/lib/ui';
import { formatPrice, getBadgeClass, resolveImageUrl } from '@/lib/catalog-data';
import {
  getCartItems,
  getCartCount,
  updateQty,
  removeItem,
  clearCart,
  formatCartTotal,
  buildOrderMessage,
  type CartItem,
} from '@/lib/cart';
import { submitContactMessage } from '@/lib/contact';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [modalProduct, setModalProduct] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const navMenuRef = useRef<HTMLUListElement>(null);

  // --- Cart state ---
  const [cartBadge, setCartBadge] = useState(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const checkoutNameRef = useRef<HTMLInputElement>(null);

  // --- Refresh cart data ---
  const refreshCart = useCallback(async () => {
    setCartBadge(getCartCount());
    const items = await getCartItems();
    setCartItems(items);
  }, []);

  // --- Auth state ---
  useEffect(() => {
    getCurrentUser().then(setUser);
    const unsub = onAuthChange(setUser);
    return () => { if (unsub) unsub(); };
  }, []);

  // --- Modal subscription ---
  useEffect(() => {
    return onModalChange(setModalProduct);
  }, []);

  // --- Toast subscription ---
  useEffect(() => {
    setToastMsg(getToastMessage());
    return onToastChange(setToastMsg);
  }, []);

  // --- Cart events: custom + storage (multi-tab) ---
  useEffect(() => {
    refreshCart();
    const onCartUpdate = () => refreshCart();
    window.addEventListener('cart:update', onCartUpdate);
    window.addEventListener('storage', onCartUpdate);
    return () => {
      window.removeEventListener('cart:update', onCartUpdate);
      window.removeEventListener('storage', onCartUpdate);
    };
  }, [refreshCart]);

  // --- Body scroll lock when drawer is open ---
  useEffect(() => {
    if (cartDrawerOpen) {
      document.body.classList.add('cart-open');
    } else {
      document.body.classList.remove('cart-open');
    }
    return () => { document.body.classList.remove('cart-open'); };
  }, [cartDrawerOpen]);

  // --- Hamburger toggle ---
  const toggleHamburger = useCallback(() => {
    hamburgerRef.current?.classList.toggle('active');
    navMenuRef.current?.classList.toggle('open');
  }, []);

  // --- Close menu on nav link click ---
  const closeMenu = useCallback(() => {
    hamburgerRef.current?.classList.remove('active');
    navMenuRef.current?.classList.remove('open');
  }, []);

  // --- Navbar scroll effect ---
  useEffect(() => {
    const onScroll = () => {
      const navbar = document.querySelector('.navbar');
      if (navbar) {
        if (window.scrollY > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // --- Close menu on route change ---
  useEffect(() => {
    closeMenu();
    window.scrollTo(0, 0);
  }, [pathname, closeMenu]);

  // --- Escape key: close drawer, then modal ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (cartDrawerOpen) {
          closeCartDrawer();
        } else {
          closeProductModal();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartDrawerOpen]);

  // --- Handle logout ---
  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/');
  }, [router]);

  // --- Smooth scroll for anchor links ---
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href^="#"]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href === '#') return;
        const target = document.querySelector(href!);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // --- Cart drawer controls ---
  const openCartDrawer = useCallback(() => {
    setCheckoutStep(false);
    setCheckoutResult(null);
    setCartDrawerOpen(true);
  }, []);

  const closeCartDrawer = useCallback(() => {
    setCartDrawerOpen(false);
    setCheckoutStep(false);
    setCheckoutResult(null);
  }, []);

  // --- Checkout flow ---
  const startCheckout = useCallback(async () => {
    setCheckoutStep(true);
    setCheckoutResult(null);
    // Prefill from session if available
    if (user) {
      setCheckoutName(user.name);
      setCheckoutEmail(user.email);
    } else {
      // Try to load user async (spinner shows while loading)
      setCheckoutLoading(true);
      try {
        const u = await getCurrentUser();
        if (u) {
          setCheckoutName(u.name);
          setCheckoutEmail(u.email);
        }
      } catch {
        // no session, leave empty
      }
      setCheckoutLoading(false);
    }
    // Focus name field after render
    setTimeout(() => checkoutNameRef.current?.focus(), 100);
  }, [user]);

  const handleCheckoutSubmit = useCallback(async () => {
    // Validation
    const trimmedName = checkoutName.trim();
    const trimmedEmail = checkoutEmail.trim();

    if (!trimmedName) {
      showToast('El nombre es obligatorio.');
      return;
    }
    if (trimmedName.length > 100) {
      showToast('El nombre es demasiado largo (max 100).');
      return;
    }
    if (!trimmedEmail) {
      showToast('El email es obligatorio.');
      return;
    }
    if (trimmedEmail.length > 254) {
      showToast('El email es demasiado largo (max 254).');
      return;
    }
    // Simple email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showToast('Formato de email invalido.');
      return;
    }

    setCheckoutLoading(true);
    try {
      const message = buildOrderMessage(trimmedName, trimmedEmail, cartItems);
      const result = await submitContactMessage({
        name: trimmedName,
        email: trimmedEmail,
        subject: '[Pedido]',
        message,
      });
      if (result.success) {
        clearCart();
        window.dispatchEvent(new CustomEvent('cart:update'));
        setCheckoutResult({ ok: true, msg: 'Pedido enviado correctamente. Te contactaremos a la brevedad.' });
        showToast('Pedido enviado!');
      } else {
        setCheckoutResult({ ok: false, msg: result.message || 'Error al enviar el pedido. Intenta de nuevo.' });
      }
    } catch {
      setCheckoutResult({ ok: false, msg: 'Error al enviar el pedido. Intenta de nuevo.' });
    }
    setCheckoutLoading(false);
  }, [checkoutName, checkoutEmail, cartItems]);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const isAdmin = pathname.startsWith('/admin');

  return (
    <>
      {!isAdmin && (
        <nav className="navbar">
          <div className="container">
            <Link href="/" className="nav-logo" onClick={closeMenu}>la<span>Solutions</span></Link>
            <button className="hamburger" aria-label="Menu" ref={hamburgerRef} onClick={toggleHamburger}>
              <span></span><span></span><span></span>
            </button>
            <ul className="nav-menu" ref={navMenuRef}>
              <li><Link href="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} onClick={closeMenu}>Inicio</Link></li>
              <li><Link href="/catalog" className={`nav-link ${isActive('/catalog') ? 'active' : ''}`} onClick={closeMenu}>Catalogo</Link></li>
              <li><Link href="/promotions" className={`nav-link ${isActive('/promotions') ? 'active' : ''}`} onClick={closeMenu}>Promociones</Link></li>
              <li><Link href="/contact" className={`nav-link ${isActive('/contact') ? 'active' : ''}`} onClick={closeMenu}>Contacto</Link></li>
              <li><Link href="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`} onClick={closeMenu}>Sobre Nosotros</Link></li>
            </ul>
            <div className="nav-actions" id="nav-auth">
              {/* Cart icon */}
              <button className="cart-icon-btn" aria-label="Carrito" onClick={openCartDrawer}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                {cartBadge > 0 && <span className="cart-count">{cartBadge}</span>}
              </button>

              {user ? (
                <>
                  <span className="nav-user">Hola, {user.name.split(' ')[0]}</span>
                  <button className="btn btn-sm btn-outline" onClick={handleLogout}>Cerrar sesion</button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn btn-sm btn-outline">Iniciar sesion</Link>
                  <Link href="/register" className="btn btn-sm btn-primary">Registrarse</Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}

      {children}

      {/* Product Modal (global) */}
      <div
        className={`modal-overlay ${modalProduct ? 'show' : ''}`}
        onClick={(e) => { if (e.target === e.currentTarget) closeProductModal(); }}
      >
        {modalProduct && (
          <div className="modal">
            <button className="modal-close" onClick={closeProductModal} aria-label="Cerrar">&times;</button>
            <div className="modal-image">
              <img src={resolveImageUrl(modalProduct.image)} alt={modalProduct.name} />
            </div>
            <div className="modal-body">
              <span className={`product-badge ${getBadgeClass(modalProduct.category)}`}>{modalProduct.category}</span>
              <h2>{modalProduct.name}</h2>
              {modalProduct.brand && (
                <p style={{ margin: '0.35rem 0' }}>
                  <span className="product-badge" style={{ background: 'rgba(0,212,255,0.12)', color: 'var(--accent)' }}>{modalProduct.brand}</span>
                </p>
              )}
              <p style={{ margin: '0.75rem 0', color: 'var(--text-secondary)' }}>{modalProduct.description}</p>
              {modalProduct.specs && modalProduct.specs.length > 0 && (
                <div className="modal-specs">
                  <h4>Especificaciones</h4>
                  <ul>{modalProduct.specs.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              <div className="modal-footer">
                <div>
                  {modalProduct.originalPrice > modalProduct.price && (
                    <span className="product-price-original">{formatPrice(modalProduct.originalPrice)}</span>
                  )}
                  <span className="product-price">{formatPrice(modalProduct.price)}</span>
                </div>
                <button className="btn btn-accent" onClick={() => { addToCart(modalProduct.id); closeProductModal(); }}>
                  Agregar al carrito
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========== Cart Drawer ========== */}
      <div
        className={`cart-overlay ${cartDrawerOpen ? 'open' : ''}`}
        onClick={() => closeCartDrawer()}
      />
      <div className={`cart-drawer ${cartDrawerOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="cart-drawer-header">
          <h3>Carrito</h3>
          <button className="cart-close-btn" onClick={closeCartDrawer} aria-label="Cerrar carrito">&times;</button>
        </div>

        {/* Body */}
        <div className="cart-drawer-body">
          {/* --- Checkout Success --- */}
          {checkoutResult?.ok ? (
            <div className="cart-checkout-success">
              <div className="cart-checkout-success-icon">&#x2705;</div>
              <h4>Pedido enviado correctamente.</h4>
              <p>{checkoutResult.msg}</p>
              <button className="btn btn-accent" onClick={closeCartDrawer}>Seguir comprando</button>
            </div>

          /* --- Checkout Form --- */
          ) : checkoutStep ? (
            <div className="cart-checkout">
              <h4>Finalizar compra</h4>

              {/* Order summary */}
              <div className="cart-checkout-summary">
                {cartItems.map(item => (
                  <div key={item.id} className="cart-checkout-item">
                    <span className="cart-checkout-item-name">{item.qty}x {item.name}</span>
                    <span className="cart-checkout-item-total">{formatPrice(item.price * item.qty)}</span>
                  </div>
                ))}
                <div className="cart-checkout-total">
                  <span>Total</span>
                  <span>{formatCartTotal(cartItems)}</span>
                </div>
              </div>

              {checkoutLoading && !checkoutName && !checkoutEmail ? (
                <div className="cart-spinner" />
              ) : (
                <div className="cart-checkout-form">
                  <div>
                    <label htmlFor="checkout-name">Nombre</label>
                    <input
                      id="checkout-name"
                      ref={checkoutNameRef}
                      type="text"
                      placeholder="Tu nombre"
                      value={checkoutName}
                      onChange={e => setCheckoutName(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-email">Email</label>
                    <input
                      id="checkout-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={checkoutEmail}
                      onChange={e => setCheckoutEmail(e.target.value)}
                      maxLength={254}
                    />
                  </div>

                  {checkoutResult?.ok === false && (
                    <p className="cart-error">{checkoutResult.msg}</p>
                  )}

                  <div className="cart-checkout-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => setCheckoutStep(false)}>Volver</button>
                    <button
                      className="btn btn-accent btn-sm"
                      onClick={handleCheckoutSubmit}
                      disabled={checkoutLoading}
                    >
                      {checkoutLoading ? 'Enviando...' : 'Confirmar pedido'}
                    </button>
                  </div>
                </div>
              )}
            </div>

          /* --- Empty cart --- */
          ) : cartItems.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon">&#x1F6D2;</div>
              <p>Tu carrito esta vacio.</p>
              <Link href="/catalog" onClick={closeCartDrawer}>Ver catalogo</Link>
            </div>

          /* --- Cart items list --- */
          ) : (
            <>
              {cartItems.map(item => (
                <div key={item.id} className="cart-item">
                  <img src={item.image} alt={item.name} className="cart-item-img" />
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div>
                      <span className="cart-item-price">{formatPrice(item.price)}</span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="cart-item-original-price">{formatPrice(item.originalPrice)}</span>
                      )}
                    </div>
                    <div className="cart-item-controls">
                      <button
                        className="cart-qty-btn"
                        onClick={() => updateQty(item.id, item.qty - 1)}
                        aria-label="Reducir cantidad"
                      >-</button>
                      <span className="cart-qty-value">{item.qty}</span>
                      <button
                        className="cart-qty-btn"
                        onClick={() => updateQty(item.id, item.qty + 1)}
                        aria-label="Aumentar cantidad"
                      >+</button>
                    </div>
                  </div>
                  <button
                    className="cart-item-remove"
                    onClick={() => { removeItem(item.id); refreshCart(); }}
                    aria-label="Remover producto"
                    title="Remover"
                  >
                    &#x1F5D1;&#xFE0F;
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer (only when there are items and not in checkout success) */}
        {cartItems.length > 0 && !checkoutResult?.ok && (
          <div className="cart-drawer-footer">
            <div className="cart-subtotal">
              <span className="cart-subtotal-label">Subtotal</span>
              <span className="cart-subtotal-value">{formatCartTotal(cartItems)}</span>
            </div>
            <div className="cart-footer-actions">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => { clearCart(); refreshCart(); }}
              >
                Vaciar carrito
              </button>
              {!checkoutStep && (
                <button className="btn btn-accent btn-sm" onClick={startCheckout}>
                  Finalizar compra
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div
          className="toast-notification"
          style={{
            position: 'fixed', bottom: '2rem', right: '2rem',
            background: 'var(--primary)', color: '#fff',
            padding: '0.75rem 1.5rem', borderRadius: '8px',
            fontSize: '0.9rem', zIndex: 3000,
            boxShadow: '0 4px 15px rgba(108,99,255,0.4)',
            animation: 'toastIn 0.3s ease',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Toast animation keyframes */}
      <style dangerouslySetInnerHTML={{ __html: '@keyframes toastIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}' }} />
    </>
  );
}
