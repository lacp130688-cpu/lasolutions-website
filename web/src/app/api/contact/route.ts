import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

const EMAIL_RE = /.+@.+\..+/;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Datos invalidos.' }, { status: 400 });
  }

  const payload = (body || {}) as Record<string, unknown>;
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';

  const valid =
    name.length > 0 &&
    email.length > 0 &&
    subject.length > 0 &&
    message.length > 0 &&
    name.length <= 120 &&
    email.length <= 200 &&
    EMAIL_RE.test(email) &&
    subject.length <= 200 &&
    message.length <= 5000;

  if (!valid) {
    return NextResponse.json({ error: 'Datos invalidos.' }, { status: 400 });
  }

  const client = createServerSupabase();

  const { error } = await client.from('contact_messages').insert([
    { name, email, subject, message },
  ]);

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar el mensaje.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
