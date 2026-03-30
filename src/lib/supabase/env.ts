/**
 * URL y clave anónima deben usar prefijo NEXT_PUBLIC_ para incluirse en el bundle del navegador.
 * Si solo definís SUPABASE_ANON_KEY (sin NEXT_PUBLIC_), el servidor puede tenerla pero el cliente no → "No API key found".
 */
export function getSupabaseUrlAndAnonKey(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

  if (!url || !anonKey) {
    throw new Error(
      'Supabase: falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'En Project Settings → API de Supabase copiá la URL y la anon public key a .env.local con esos nombres exactos. ' +
        'Reiniciá `npm run dev` o volvé a desplegar; en Vercel/Netlify agregá las mismas variables al proyecto.'
    );
  }

  return { url, anonKey };
}
