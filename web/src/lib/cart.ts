/* ============================================
   laSolutions - Cart Module
   Resolves raw localStorage cart against
   loaded products, provides helpers for the
   cart drawer and checkout.
   ============================================ */

import { getCart, saveCart } from './ui';
import {
  PRODUCTS,
  PRODUCTS_LOADED,
  loadSiteData,
  resolveImageUrl,
  formatPrice,
  type Product,
} from './catalog-data';

/* ---------- Types ---------- */
export interface CartItem {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  qty: number;
}

/* ---------- Helpers ---------- */

function resolveEffectivePrice(product: Product): {
  price: number;
  originalPrice?: number;
} {
  if (product.onSale && product.originalPrice > product.price) {
    return { price: product.price, originalPrice: product.originalPrice };
  }
  return { price: product.price };
}

/**
 * Reads the raw cart from localStorage, ensures products are loaded,
 * then resolves each entry to a full CartItem.
 */
export async function getCartItems(): Promise<CartItem[]> {
  // Ensure product data is available
  if (!PRODUCTS_LOADED) {
    await loadSiteData();
  }

  const raw = getCart();
  if (!raw.length) return [];

  const items: CartItem[] = [];
  for (const entry of raw) {
    const product = PRODUCTS.find(p => p.id === entry.id);
    if (!product) continue; // skip unknown products
    const { price, originalPrice } = resolveEffectivePrice(product);
    items.push({
      id: product.id,
      name: product.name,
      price,
      originalPrice,
      image: resolveImageUrl(product.image),
      qty: entry.qty,
    });
  }
  return items;
}

/**
 * Returns the total quantity across all cart entries (for the badge).
 * This is synchronous and reads localStorage directly — no product
 * resolution needed.
 */
export function getCartCount(): number {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

/**
 * Updates the quantity for a given product id.
 * If qty <= 0, the item is removed from the cart.
 */
export function updateQty(id: number, qty: number): void {
  const cart = getCart();
  if (qty <= 0) {
    const next = cart.filter(item => item.id !== id);
    saveCart(next);
  } else {
    const entry = cart.find(item => item.id === id);
    if (entry) {
      entry.qty = qty;
      saveCart(cart);
    }
  }
}

/**
 * Removes a single product from the cart.
 */
export function removeItem(id: number): void {
  const cart = getCart().filter(item => item.id !== id);
  saveCart(cart);
}

/**
 * Clears the entire cart.
 */
export function clearCart(): void {
  saveCart([]);
}

/**
 * Returns the formatted total price for a list of resolved CartItems.
 */
export function getCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

/**
 * Formats a total as a display string using the catalog formatter.
 */
export function formatCartTotal(items: CartItem[]): string {
  return formatPrice(getCartTotal(items));
}

/**
 * Builds a plain-text order message for the contact_messages table.
 */
export function buildOrderMessage(
  name: string,
  email: string,
  items: CartItem[],
): string {
  const lines: string[] = [];
  lines.push(`Pedido de ${name} (${email})`);
  lines.push('');

  for (const item of items) {
    const subtotal = item.price * item.qty;
    lines.push(
      `${item.qty}x ${item.name} - ${formatPrice(item.price)} c/u = ${formatPrice(subtotal)}`,
    );
  }

  lines.push('');
  lines.push(`TOTAL: ${formatCartTotal(items)}`);
  return lines.join('\n');
}
