import { analytics } from '@/domain/analytics';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function safeNext(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/home';
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeNext(requestUrl.searchParams.get('next'));

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      analytics.track({ name: 'kakao_login_completed' });
      const forwardedHost = request.headers.get('x-forwarded-host');
      const origin =
        process.env.NODE_ENV === 'development' || !forwardedHost
          ? requestUrl.origin
          : `https://${forwardedHost}`;
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/auth/error`);
}
