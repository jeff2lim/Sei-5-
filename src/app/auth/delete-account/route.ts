import { supabaseUrl } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    return NextResponse.redirect(new URL('/', request.url), { status: 303 });
  }

  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    return new NextResponse('Account deletion is not configured.', { status: 503 });
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) return new NextResponse('Account deletion failed.', { status: 500 });

  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
