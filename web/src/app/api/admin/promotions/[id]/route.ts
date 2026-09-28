import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminContext } from '@/lib/supabase-server';

type Params = { params: Promise<{ id: string }> };

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

  const built = buildPromotionPayload(body);
  if ('error' in built) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  const { data, error } = await ctx.client
    .from('promotions')
    .update(built.obj)
    .eq('id', id)
    .select('id');
  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: error ? error.message : 'Promocion no encontrada.' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const ctx = await getAdminContext(request);
  if (ctx.status !== 200) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { id } = await params;

  const { error } = await ctx.client.from('promotions').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
