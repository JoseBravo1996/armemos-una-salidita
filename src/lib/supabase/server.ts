import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrlAndAnonKey } from '@/lib/supabase/env';

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseUrlAndAnonKey();

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
          } catch {
            /* ignore when called from a Server Component without mutable store */
          }
        },
      },
    }
  );
}
