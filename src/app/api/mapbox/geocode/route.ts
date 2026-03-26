import { NextResponse } from 'next/server';
import type { MapboxGeocodeFeatureDTO } from '@/types/mapboxGeocode';
import {
  buildMapboxGeocodeSearchUrl,
  mapGeocodeJsonToFeatures,
} from '@/lib/mapbox/geocode';

/**
 * Proxy opcional (p. ej. token solo servidor). Si el token tiene restricción por URL,
 * suele fallar aquí y convivir con búsqueda directa desde el cliente.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ features: [] as MapboxGeocodeFeatureDTO[] });
  }

  const token =
    process.env.MAPBOX_SERVER_ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const trimmed = token?.trim();
  if (!trimmed) {
    return NextResponse.json(
      { error: 'Falta MAPBOX_SERVER_ACCESS_TOKEN o NEXT_PUBLIC_MAPBOX_TOKEN' },
      { status: 500 }
    );
  }

  const url = buildMapboxGeocodeSearchUrl(q, trimmed);
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    let mapboxMessage = '';
    try {
      const body = (await res.json()) as { message?: string };
      mapboxMessage = body.message?.trim() ?? '';
    } catch {
      /* ignore */
    }
    return NextResponse.json(
      {
        error:
          mapboxMessage ||
          (res.status === 401
            ? 'Token de Mapbox inválido o sin permisos'
            : res.status === 403
              ? 'Mapbox rechazó la petición (revisá restricciones de URL del token en mapbox.com)'
              : `Mapbox respondió ${res.status}`),
      },
      { status: 502 }
    );
  }

  const data = await res.json();
  const features = mapGeocodeJsonToFeatures(data);
  return NextResponse.json({ features });
}
