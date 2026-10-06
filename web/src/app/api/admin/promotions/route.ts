import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminContext } from '@/lib/api-auth';

function buildPromotionPayload(body: unknown): { obj: Record<string, unknown> } | { error: string } {
  const p = (body || {}) as Record<string, unknown>;

  const rawProductId = typeof p.product_id === 'number' ? p.product_id : Number(p.product_id);
  if (!Number.isFinite(rawProductId) || rawProductId <= 0) {
    return { error: 'Selecciona un producto.' };
  }
  const productId = Math.trunc(rawProductId);

  const rawDiscount = typeof p.discount === 'number' ? p.discount : Number(p.discount);
  if (!Number.isInteger(rawDiscount) || rawDiscount < 1 || rawDiscount > 99) {
    return { error: 'El descuento debe ser un numero entero entre 1 y 99.' };
  }

  const salePrice = typeof p.sale_price === 'number' ? p.sale_price : Number(p.sale_price);
  if (!Number.isFinite(salePrice) || salePrice < 0) {
    return { error: 'El precio de oferta debe ser un numero valido mayor o igual a 0.' };
  }

  const label = typeof p.label === 'string' ? p.label.trim() : '';
  if (label.length > 200) {
    return { error: 'La etiqueta no puede superar los 200 caracteres.' };
  }

  return {
    obj: {
      product_id: productId,
      discount: rawDiscount,
      sale_price: salePrice,
      label,
      active: Boolean(p.active),
    },
  };
}

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (ctx.status !== 200) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { data, error } = await ctx.client
    .from('promotions')
    .select('*')
    .order('product_id', { ascending: true });
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

  const built = buildPromotionPayload(body);
  if ('error' in built) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  const { data: product } = await ctx.client
    .from('products')
    .select('id')
    .eq('id', built.obj.product_id)
    .maybeSingle();
  if (!product) {
    return NextResponse.json({ error: 'El producto seleccionado no existe.' }, { status: 400 });
  }

  const { error } = await ctx.client.from('promotions').insert(built.obj);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
