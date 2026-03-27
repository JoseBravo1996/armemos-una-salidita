'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';

/** Mapbox usa [longitud, latitud] */
const BUENOS_AIRES_CENTER: [number, number] = [-58.3816, -34.6037];

export interface MapboxMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  /** `place` = pin de catálogo `places` (teal); por defecto evento (violeta). */
  kind?: 'event' | 'place';
}

export interface MapboxEventMapCameraTarget {
  latitude: number;
  longitude: number;
  zoom?: number;
}

/** Límite geográfico (mismo criterio que `explore_zones` en Supabase). */
export interface MapboxEventMapFitBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface MapboxEventMapProps {
  accessToken: string | undefined;
  markers: MapboxMapMarker[];
  onMarkerClick?: (id: string) => void;
  className?: string;
  /** Vista embebida (scroll de página no hace zoom; sin botones +/-). */
  embed?: boolean;
  /** Centra el mapa cuando hay evento seleccionado o deep link (tras cargar el estilo). */
  cameraTarget?: MapboxEventMapCameraTarget | null;
  /** Encuadra una zona; ignorado si `cameraTarget` está definido. */
  fitBounds?: MapboxEventMapFitBounds | null;
}

export type MapboxEventMapHandle = {
  /** Centra y acerca usando la ubicación del dispositivo (permiso del navegador). */
  recenterOnUser: () => Promise<void>;
};

function createPinElement(
  onClick: () => void,
  kind: 'event' | 'place' = 'event'
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className =
    'relative flex h-10 w-10 cursor-pointer items-center justify-center border-0 bg-transparent p-0 outline-none';
  btn.setAttribute(
    'aria-label',
    kind === 'place' ? 'Ver lugar en el mapa' : 'Ver evento en el mapa'
  );

  const pulse = document.createElement('div');
  pulse.className =
    kind === 'place'
      ? 'pointer-events-none absolute inset-0 rounded-full bg-teal-500 opacity-75 animate-ping'
      : 'pointer-events-none absolute inset-0 rounded-full bg-purple-600 opacity-75 animate-ping';

  const inner = document.createElement('div');
  inner.className =
    kind === 'place'
      ? 'relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/20 bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg'
      : 'relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/20 bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg';

  inner.innerHTML =
    kind === 'place'
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';

  btn.appendChild(pulse);
  btn.appendChild(inner);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

function flyTo(map: MapboxMap, target: MapboxEventMapCameraTarget) {
  map.flyTo({
    center: [target.longitude, target.latitude],
    zoom: target.zoom ?? 14,
    essential: true,
  });
}

function applyFitBounds(map: MapboxMap, b: MapboxEventMapFitBounds) {
  map.fitBounds(
    [
      [b.minLng, b.minLat],
      [b.maxLng, b.maxLat],
    ],
    { padding: 48, duration: 1100, essential: true }
  );
}

export const MapboxEventMap = forwardRef<MapboxEventMapHandle, MapboxEventMapProps>(
  function MapboxEventMap(
    {
      accessToken,
      markers,
      onMarkerClick,
      className = '',
      embed = false,
      cameraTarget = null,
      fitBounds = null,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapboxMap | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const markersRef = useRef<import('mapbox-gl').Marker[]>([]);
    const markersDataRef = useRef(markers);
    markersDataRef.current = markers;
    const onMarkerClickRef = useRef(onMarkerClick);
    onMarkerClickRef.current = onMarkerClick;
    const cameraTargetRef = useRef(cameraTarget);
    cameraTargetRef.current = cameraTarget;
    const fitBoundsRef = useRef(fitBounds);
    fitBoundsRef.current = fitBounds;
    const [mapError, setMapError] = useState<string | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        recenterOnUser: () =>
          new Promise<void>((resolve, reject) => {
            const map = mapRef.current;
            if (!map?.isStyleLoaded()) {
              reject(new Error('El mapa no está listo'));
              return;
            }
            if (typeof navigator === 'undefined' || !navigator.geolocation) {
              reject(new Error('Tu navegador no permite geolocalización'));
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                try {
                  flyTo(map, {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    zoom: 14,
                  });
                  resolve();
                } catch {
                  reject(new Error('No se pudo mover el mapa'));
                }
              },
              (err: GeolocationPositionError) => {
                const msg =
                  err.code === 1
                    ? 'Permiso de ubicación denegado'
                    : err.code === 3
                      ? 'Tiempo agotado al obtener tu ubicación'
                      : 'No se pudo obtener tu ubicación';
                reject(new Error(msg));
              },
              { enableHighAccuracy: true, maximumAge: 60_000, timeout: 12_000 }
            );
          }),
      }),
      []
    );

    const syncMarkers = useCallback(
      (
        map: MapboxMap,
        list: MapboxMapMarker[],
        MarkerClass: typeof import('mapbox-gl').Marker
      ) => {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        list.forEach((item) => {
          const el = createPinElement(
            () => onMarkerClickRef.current?.(item.id),
            item.kind ?? 'event'
          );
          const marker = new MarkerClass({ element: el, anchor: 'bottom' })
            .setLngLat([item.longitude, item.latitude])
            .addTo(map);
          markersRef.current.push(marker);
        });
      },
      []
    );

    useEffect(() => {
      const token = accessToken?.trim();
      const el = containerRef.current;
      if (!token || !el) return;

      setMapError(null);
      let cancelled = false;

      void (async () => {
        const mapboxgl = (await import('mapbox-gl')).default;

        if (cancelled || !el.isConnected) return;

        mapboxgl.accessToken = token;

        const coarsePointer =
          typeof window !== 'undefined' &&
          window.matchMedia?.('(pointer: coarse)')?.matches;
        const map = new mapboxgl.Map({
          container: el,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: BUENOS_AIRES_CENTER,
          zoom: embed ? 11.5 : 12,
          attributionControl: true,
          // antialias en mobile suele romper o empeorar WebGL en algunos GPU / Safari
          antialias: !coarsePointer,
          dragRotate: false,
          pitchWithRotate: false,
          cooperativeGestures: embed,
        });

        if (cancelled || !el.isConnected) {
          map.remove();
          return;
        }

        mapRef.current = map;
        map.touchZoomRotate.disableRotation();
        if (!embed) {
          map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
        }

        const onMapError = (e: { error?: Error }) => {
          if (cancelled) return;
          setMapError(e.error?.message ?? 'Error al cargar el mapa');
        };
        map.on('error', onMapError);

        resizeObserverRef.current?.disconnect();
        const ro = new ResizeObserver(() => {
          map.resize();
        });
        resizeObserverRef.current = ro;
        ro.observe(el);

        const nudgeResize = () => {
          try {
            map.resize();
          } catch {
            /* noop */
          }
          requestAnimationFrame(() => {
            try {
              map.resize();
            } catch {
              /* noop */
            }
          });
        };

        const onWinResize = () => nudgeResize();
        const onOrientation = () => {
          window.setTimeout(nudgeResize, 200);
          window.setTimeout(nudgeResize, 600);
        };
        const onVisibility = () => {
          if (document.visibilityState === 'visible') {
            window.setTimeout(nudgeResize, 0);
            window.setTimeout(nudgeResize, 300);
          }
        };

        window.addEventListener('resize', onWinResize);
        window.addEventListener('orientationchange', onOrientation);
        document.addEventListener('visibilitychange', onVisibility);
        const vv = typeof window !== 'undefined' ? window.visualViewport : null;
        if (vv) vv.addEventListener('resize', onWinResize);

        const onLoad = () => {
          nudgeResize();
          syncMarkers(map, markersDataRef.current, mapboxgl.Marker);
          const t = cameraTargetRef.current;
          const fb = fitBoundsRef.current;
          if (t) flyTo(map, t);
          else if (fb) applyFitBounds(map, fb);
          window.setTimeout(nudgeResize, 100);
          window.setTimeout(nudgeResize, 500);
        };
        map.once('load', onLoad);

        const onIdle = () => {
          nudgeResize();
        };
        map.once('idle', onIdle);

        (map as MapboxMap & { __ausCleanup?: () => void }).__ausCleanup = () => {
          window.removeEventListener('resize', onWinResize);
          window.removeEventListener('orientationchange', onOrientation);
          document.removeEventListener('visibilitychange', onVisibility);
          if (vv) vv.removeEventListener('resize', onWinResize);
        };
      })();

      return () => {
        cancelled = true;
        resizeObserverRef.current?.disconnect();
        resizeObserverRef.current = null;
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        const map = mapRef.current;
        mapRef.current = null;
        if (map) {
          const extra = map as MapboxMap & { __ausCleanup?: () => void };
          try {
            extra.__ausCleanup?.();
          } catch {
            /* noop */
          }
          try {
            map.remove();
          } catch {
            /* ya destruido */
          }
        }
      };
    }, [accessToken, embed, syncMarkers]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map?.isStyleLoaded() || !cameraTarget) return;
      flyTo(map, cameraTarget);
    }, [cameraTarget?.latitude, cameraTarget?.longitude, cameraTarget?.zoom]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map?.isStyleLoaded() || cameraTarget || !fitBounds) return;
      applyFitBounds(map, fitBounds);
    }, [
      cameraTarget,
      fitBounds?.minLng,
      fitBounds?.minLat,
      fitBounds?.maxLng,
      fitBounds?.maxLat,
    ]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map?.isStyleLoaded()) return;
      void import('mapbox-gl').then(({ default: mapboxgl }) => {
        if (mapRef.current !== map || !map.isStyleLoaded()) return;
        syncMarkers(map, markers, mapboxgl.Marker);
      });
    }, [markers, syncMarkers]);

    const token = accessToken?.trim();

    if (!token) {
      return (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#0a0a0f] to-[#16213e] ${className}`}
        >
          <p className="max-w-xs px-6 text-center text-sm text-gray-500">
            Agregá <code className="text-purple-400">NEXT_PUBLIC_MAPBOX_TOKEN</code> en{' '}
            <code className="text-gray-400">.env.local</code> y reiniciá el servidor de desarrollo.
          </p>
        </div>
      );
    }

    if (mapError) {
      return (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1a1a2e] via-[#0a0a0f] to-[#16213e] px-6 ${className}`}
        >
          <p className="max-w-sm text-center text-sm text-red-400">{mapError}</p>
          <p className="max-w-sm text-center text-xs text-gray-500">
            Revisá que el token sea válido y que las URLs del sitio estén permitidas en Mapbox.
          </p>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={`map-view-mapbox absolute inset-0 z-0 min-h-0 w-full ${className}`}
        style={{ width: '100%', height: '100%', minHeight: '100%' }}
        role="presentation"
      />
    );
  }
);
