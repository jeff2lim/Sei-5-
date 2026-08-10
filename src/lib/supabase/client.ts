'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from './config';

let browserClient: SupabaseClient | null = null;

export function createBrowserSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 공개 환경변수가 설정되지 않았습니다.');
  }

  browserClient ??= createBrowserClient(supabaseUrl, supabasePublishableKey);
  return browserClient;
}
