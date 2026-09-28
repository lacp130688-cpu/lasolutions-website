import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminContext } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (ctx.status !== 200) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { data, error } = await ctx.client
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}
