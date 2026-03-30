import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseUrlAndAnonKey } from '@/lib/supabase/env';

export function createClient() {
  const { url, anonKey } = getSupabaseUrlAndAnonKey();
  return createBrowserClient(url, anonKey);
}
