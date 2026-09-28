import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminContext } from '@/lib/supabase-server';
import { SUPABASE_URL } from '@/lib/supabase-config';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (ctx.status !== 200) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No se recibio archivo.' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Tipo de archivo no permitido. Usa JPG, PNG, WEBP o GIF.' },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'El archivo supera los 2MB.' }, { status: 400 });
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9.\-]/g, '-').toLowerCase();
  const path = 'productos/' + Date.now() + '-' + cleanName;

  const { error } = await ctx.client.storage
    .from('product-images')
    .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const url = SUPABASE_URL + '/storage/v1/object/public/product-images/' + path;
  return NextResponse.json({ url });
}
