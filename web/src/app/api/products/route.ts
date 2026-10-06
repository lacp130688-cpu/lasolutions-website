import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { verifyOptionalUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const session = await verifyOptionalUser(request);
  if ('ok' in session) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const client = createServerSupabase();

  const { data, error } = await client.from('products').select('*').eq('active', true).order('id');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}
