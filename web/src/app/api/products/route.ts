import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET() {
  const client = createServerSupabase();

  const { data, error } = await client.from('products').select('*').eq('active', true).order('id');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}
