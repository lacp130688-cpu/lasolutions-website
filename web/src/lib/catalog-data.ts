/* ============================================
   laSolutions - Catalog Data Module
   Products, promotions, filtering, search, sort.
   Data loaded from Supabase with local fallback.
   ============================================ */

import { supabase } from './supabase-config';
import { FALLBACK_PRODUCTS, FALLBACK_PROMOTIONS } from './fallback';

/* ---------- Types ---------- */
export interface Product {
  id: number;
  name: string;
  category: string;
  brand: string;
  price: number;
  originalPrice: number;
  description: string;
  specs: string[];
  image: string;
  onSale: boolean;
  discount: number;
  featured: boolean;
}

export interface Promotion {
  productId: number;
  discount: number;
  salePrice: number;
  label: string;
  endDate: number | null;
}

/* ---------- Module State ---------- */
export let PRODUCTS: Product[] = [];
export let PROMOTIONS: Promotion[] = [];
export let PRODUCTS_LOADED = false;

export const catalogState = {
  searchQuery: '',
  selectedCategories: [] as string[],
  selectedBrands: [] as string[],
  selectedPriceRanges: [] as { min: number; max: number }[],
  sortBy: 'default' as 'default' | 'price-asc' | 'price-desc' | 'name',
};

/* ---------- Constants ---------- */
export const PRICE_RANGES = [
  { label: 'Menos de $700', min: 0, max: 699 },
  { label: '$700 - $1,000', min: 700, max: 1000 },
  { label: '$1,000 - $1,500', min: 1000, max: 1500 },
  { label: 'Mas de $1,500', min: 1500, max: Infinity },
];

/* ---------- Utility Functions ---------- */
export function formatPrice(price: number): string {
  return '$' + price.toLocaleString('en-US');
}

export function escapeHtml(str: string | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getBadgeClass(category: string): string {
  switch (category) {
    case 'Escritorio': return 'badge-desktop';
    case 'Gaming': return 'badge-gaming';
    case 'Laptop': return 'badge-laptop';
    default: return 'badge-desktop';
  }
}

const PLACEHOLDER_IMAGE = '/assets/placeholder.svg';

export function resolveImageUrl(img: string | null | undefined): string {
  if (!img) return PLACEHOLDER_IMAGE;

  const trimmed = String(img).trim();

  // Reject dangerous protocols outright: javascript:, data:, vbscript:, file:
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return PLACEHOLDER_IMAGE;
  }

  // Accept http(s), protocol-relative and blob: URLs as-is
  if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Accept relative paths: /, ./, ../, assets/
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('assets/')
  ) {
    return trimmed.startsWith('/') ? trimmed : '/' + trimmed;
  }

  // Anything else is invalid — fall back to placeholder
  return PLACEHOLDER_IMAGE;
}

/* ---------- Data Loading ---------- */
export function loadFallbackData(): void {
  PRODUCTS = FALLBACK_PRODUCTS.map(p => ({ ...p }));
  PROMOTIONS = FALLBACK_PROMOTIONS.map(p => ({ ...p, endDate: p.endDate }));
  PRODUCTS_LOADED = true;
}

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (typeof window !== 'undefined' &&
      (window as unknown as Record<string, string>).__SUPABASE_URL__) ||
    true // Always try — the real check is in supabase-config
  );
}

export async function loadSiteData(): Promise<Product[]> {
  if (PRODUCTS_LOADED) return PRODUCTS;

  try {
    // Try Supabase first
    const [productsResult, promosResult] = await Promise.all([
      supabase.from('products').select('*').eq('active', true).order('id'),
      supabase.from('promotions').select('*').eq('active', true),
    ]);

    const productsRows = productsResult.data || [];
    const promoRows = promosResult.data || [];

    if (!productsRows.length) {
      loadFallbackData();
      return PRODUCTS;
    }

    // Build PROMOTIONS array
    PROMOTIONS = (promoRows || []).map((promo: Record<string, unknown>) => ({
      productId: promo.product_id as number,
      discount: promo.discount as number,
      salePrice: Number(promo.sale_price),
      endDate: promo.ends_at ? Date.parse(promo.ends_at as string) : null,
      label: (promo.label as string) || '',
    }));

    // Merge products with promos
    PRODUCTS = productsRows.map((product: Record<string, unknown>) => {
      let specs = product.specs as string | string[];
      if (typeof specs === 'string') {
        try { specs = JSON.parse(specs); } catch { specs = []; }
      }
      if (!Array.isArray(specs)) specs = [];

      const originalPrice = Number(product.original_price || product.price);
      let price = Number(product.price);
      let onSale = false;
      let discount = 0;

      const promo = PROMOTIONS.find((p: Promotion) => p.productId === product.id);
      if (promo) {
        price = promo.salePrice;
        onSale = true;
        discount = promo.discount;
      }

      return {
        id: product.id as number,
        name: product.name as string,
        category: product.category as string,
        brand: product.brand as string,
        price,
        originalPrice,
        description: product.description as string,
        specs: specs as string[],
        image: (product.image as string) || 'assets/placeholder.svg',
        onSale,
        discount,
        featured: product.featured as boolean,
      };
    });

    PRODUCTS_LOADED = true;
    return PRODUCTS;
  } catch (err) {
    console.error('Error cargando datos de Supabase, usando datos locales:', err);
    loadFallbackData();
    return PRODUCTS;
  }
}

/* ---------- Filter & Sort ---------- */
export function getFilteredProducts(): Product[] {
  let filtered = PRODUCTS.slice();

  if (catalogState.searchQuery) {
    const query = catalogState.searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
  }

  if (catalogState.selectedCategories.length > 0) {
    filtered = filtered.filter(p => catalogState.selectedCategories.includes(p.category));
  }

  if (catalogState.selectedBrands.length > 0) {
    filtered = filtered.filter(p => catalogState.selectedBrands.includes(p.brand));
  }

  if (catalogState.selectedPriceRanges.length > 0) {
    filtered = filtered.filter(p =>
      catalogState.selectedPriceRanges.some(range => p.price >= range.min && p.price <= range.max)
    );
  }

  switch (catalogState.sortBy) {
    case 'price-asc':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      filtered.sort((a, b) => b.price - a.price);
      break;
    case 'name':
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  return filtered;
}

/* ---------- Data Helpers ---------- */
export function getFeaturedProducts(): Product[] {
  return PRODUCTS.filter(p => p.featured === true);
}

export function getThirdPartyBrands(): string[] {
  const brands: string[] = [];
  PRODUCTS.forEach(p => {
    if (!p.brand || p.brand === 'laSolutions') return;
    if (!brands.includes(p.brand)) brands.push(p.brand);
  });
  brands.sort((a, b) => a.localeCompare(b));
  return brands;
}

export function getAllBrands(): string[] {
  const brands: string[] = [];
  PRODUCTS.forEach(p => {
    if (p.brand && !brands.includes(p.brand)) brands.push(p.brand);
  });
  brands.sort((a, b) => a.localeCompare(b));
  return brands;
}

/* ---------- Carousel ---------- */
export function scrollCarousel(direction: number, track: HTMLElement | null): void {
  if (!track) return;
  const card = track.querySelector('.product-card') as HTMLElement | null;
  const step = card ? card.getBoundingClientRect().width + 32 : 360;
  track.scrollBy({ left: direction * step, behavior: 'smooth' });
}

/* ---------- Promotion Helpers ---------- */
export function getDealOfTheDay(): Promotion | null {
  if (!PROMOTIONS.length) return null;
  return PROMOTIONS.reduce((best, current) =>
    current.discount > best.discount ? current : best
  );
}

export function getPromoForProduct(productId: number): Promotion | null {
  return PROMOTIONS.find(p => p.productId === productId) || null;
}

export function formatCountdown(endTime: number | null): {
  days: number; hours: number; minutes: number; seconds: number; expired: boolean;
} {
  if (!endTime) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const diff = endTime - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    expired: false,
  };
}
