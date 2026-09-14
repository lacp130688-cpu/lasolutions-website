/* ============================================
   laSolutions - UI shared state
   Modal, Cart, Toast (subscriber pattern for React)
   ============================================ */

import { PRODUCTS } from './catalog-data';

/* ---------- Types ---------- */
export interface CartItem {
  id: number;
  qty: number;
}

/* ---------- Modal ---------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _modalProduct: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _modalListeners: Array<(p: any) => void> = [];

export function openProductModal(productId: number): void {
  _modalProduct = PRODUCTS.find(p => p.id === productId) || null;
  _modalListeners.forEach(fn => fn(_modalProduct));
}

export function closeProductModal(): void {
  _modalProduct = null;
  _modalListeners.forEach(fn => fn(null));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getModalProduct(): any { return _modalProduct; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function onModalChange(fn: (p: any) => void): () => void {
  _modalListeners.push(fn);
  return () => { _modalListeners = _modalListeners.filter(l => l !== fn); };
}

/* ---------- Cart ---------- */
export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('lasolutions_cart') || '[]') || [];
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lasolutions_cart', JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent('cart:update'));
}

export function addToCart(productId: number): void {
  const cart = getCart();
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: productId, qty: 1 });
  }
  saveCart(cart);

  const product = PRODUCTS.find(p => p.id === productId);
  if (product) {
    showToast('Agregado: ' + product.name);
  }
}

/* ---------- Toast ---------- */
let _toastMessage: string | null = null;
let _toastListeners: Array<(msg: string | null) => void> = [];
let _toastTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string): void {
  if (_toastTimer) { clearTimeout(_toastTimer); }
  _toastMessage = message;
  _toastListeners.forEach(fn => fn(message));
  _toastTimer = setTimeout(() => {
    _toastMessage = null;
    _toastListeners.forEach(fn => fn(null));
  }, 2500);
}

export function onToastChange(fn: (msg: string | null) => void): () => void {
  _toastListeners.push(fn);
  return () => { _toastListeners = _toastListeners.filter(l => l !== fn); };
}

export function getToastMessage(): string | null { return _toastMessage; }
