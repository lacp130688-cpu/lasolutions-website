import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminContext } from '@/lib/api-auth';

type Params = { params: Promise<{ id: string }> };

const DANGEROUS_URL_RE = /^(javascript|data|vbscript|file):/i;
const ALLOWED_URL_RE = /^(https:\/\/|\/|\.\/|\.\.\/|assets\/)/i;
const ALLOWED_CATEGORIES = ['Escritorio', 'Gaming', 'Laptop'];

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

  const category = asString(p.category).trim();
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return { error: 'La categoria debe ser Escritorio, Gaming o Laptop.' };
  }

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
      category,
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

export async function PUT(request: NextRequest, { params }: Params) {
  const ctx = await getAdminContext(request);
  if (ctx.status !== 200) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { id } = await params;

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

  const { data, error } = await ctx.client
    .from('products')
    .update(built.obj)
    .eq('id', id)
    .select('id');
  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: error ? error.message : 'Producto no encontrado.' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const ctx = await getAdminContext(request);
  if (ctx.status !== 200) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { id } = await params;

  const { error } = await ctx.client.from('products').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
