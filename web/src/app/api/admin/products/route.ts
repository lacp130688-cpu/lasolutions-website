import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminContext } from '@/lib/supabase-server';

const DANGEROUS_URL_RE = /^(javascript|data|vbscript|file):/i;
const ALLOWED_URL_RE = /^(https?:\/\/|\/|\.\/|\.\.\/|assets\/)/i;

function buildProductPayload(body: unknown): { obj: Record<string, unknown> } | { error: string } {
  const p = (body || {}) as Record<string, unknown>;

  const name = typeof p.name === 'string' ? p.name.trim() : '';
  if (!name) return { error: 'El nombre es obligatorio.' };

  const price = typeof p.price === 'number' ? p.price : Number(p.price);
  if (!Number.isFinite(price) || price < 0) return { error: 'El precio debe ser un numero valido mayor o igual a 0.' };

  const rawOriginal = p.original_price;
  let originalPrice: number | null = null;
  if (rawOriginal === null || rawOriginal === undefined || rawOriginal === '') {
    originalPrice = null;
  } else {
    const candidate = typeof rawOriginal === 'number' ? rawOriginal : Number(rawOriginal);
    if (!Number.isFinite(candidate) || candidate < 0) {
      return { error: 'El precio original debe ser un numero valido mayor o igual a 0.' };
    }
    originalPrice = candidate;
  }

  const specs = Array.isArray(p.specs) ? p.specs : [];
  const asString = (v: unknown) => (typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v));

  let image = asString(p.image).trim();
  if (image) {
    if (DANGEROUS_URL_RE.test(image) || !ALLOWED_URL_RE.test(image)) {
      return { error: 'La URL de imagen debe ser https o una ruta relativa.' };
    }
  } else {
    image = 'assets/placeholder.svg';
  }

  return {
    obj: {
      name,
      category: asString(p.category),
      brand: asString(p.brand),
      price,
      original_price: originalPrice,
      description: asString(p.description),
      specs,
      image,
      featured: Boolean(p.featured),
      active: Boolean(p.active),
    },
  };
}

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (ctx.status !== 200) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { data, error } = await ctx.client.from('products').select('*').order('id', { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (ctx.status !== 200) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Datos invalidos.' }, { status: 400 });
  }

  const built = buildProductPayload(body);
  if ('error' in built) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  const { error } = await ctx.client.from('products').insert(built.obj);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
