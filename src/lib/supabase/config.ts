export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const dataMode = process.env.NEXT_PUBLIC_DATA_MODE ?? 'local';

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function isCloudDataMode() {
  return dataMode === 'hybrid' || dataMode === 'supabase';
}

export function isAuthEnabled() {
  return isCloudDataMode() && isSupabaseConfigured();
}
