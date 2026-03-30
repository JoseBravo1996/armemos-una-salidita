'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import type { MapPinCategory } from '@/lib/map/inferPlacePinCategory';
import { categoryCircleColorExpr } from '@/lib/map/mapPinPalette';

/** Mapbox usa [longitud, latitud] */
const BUENOS_AIRES_CENTER: [number, number] = [-58.3816, -34.6037];

const CLUSTER_SOURCE = 'aus-markers';
const CLUSTER_CIRCLES = 'aus-clusters';
const CLUSTER_COUNT = 'aus-cluster-count';
const UNCLUSTERED = 'aus-unclustered';

const HIGHLIGHT_NONE = '__aus_no_selection__';

export interface MapboxMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  kind?: 'event' | 'place';
  /** Tipo visual del pin (evento o lugar deducido de OSM). */
  category?: MapPinCategory;
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
  /** Resalta un punto por su `id` completo (p. ej. `evt:…` / `plc:…`). */
  highlightedMarkerId?: string | null;
}

export type MapboxEventMapHandle = {
  /** Centra y acerca usando la ubicación del dispositivo (permiso del navegador). */
  recenterOnUser: () => Promise<void>;
};

function markersToFeatureCollection(markers: MapboxMapMarker[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: markers.map((m) => ({
      type: 'Feature',
      properties: {
        id: m.id,
        kind: m.kind ?? 'event',
        category: m.category ?? 'other',
      },
      geometry: {
        type: 'Point',
        coordinates: [m.longitude, m.latitude],
      },
    })),
  };
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

function ensureClusterLayers(
  map: MapboxMap,
  mapboxgl: typeof import('mapbox-gl').default,
  embed: boolean,
  onMarkerClick: (id: string) => void
) {
  if (map.getSource(CLUSTER_SOURCE)) return;

  map.addSource(CLUSTER_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: embed ? 13 : 15,
    clusterRadius: embed ? 42 : 54,
  });

  map.addLayer({
    id: CLUSTER_CIRCLES,
    type: 'circle',
    source: CLUSTER_SOURCE,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': 'rgba(129, 95, 218, 0.5)',
      'circle-stroke-color': 'rgba(255,255,255,0.75)',
      'circle-stroke-width': 2,
      'circle-radius': ['step', ['get', 'point_count'], 16, 8, 20, 24, 24, 100, 30],
    },
  });

  map.addLayer({
    id: CLUSTER_COUNT,
    type: 'symbol',
    source: CLUSTER_SOURCE,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
    paint: {
      'text-color': '#f8fafc',
    },
  });

  map.addLayer({
    id: UNCLUSTERED,
    type: 'circle',
    source: CLUSTER_SOURCE,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': categoryCircleColorExpr(),
      'circle-radius': 5,
      'circle-stroke-width': 1.25,
      'circle-stroke-color': 'rgba(255,255,255,0.9)',
      'circle-opacity': 0.95,
    },
  });

  map.on('click', CLUSTER_CIRCLES, (e) => {
    const feats = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_CIRCLES] });
    const f = feats[0];
    if (!f || f.geometry.type !== 'Point') return;
    const clusterId = f.properties?.cluster_id;
    const src = map.getSource(CLUSTER_SOURCE) as mapboxgl.GeoJSONSource;
    if (typeof clusterId !== 'number') return;
    src.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err != null || zoom == null) return;
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      map.easeTo({ center: coords, zoom, duration: 380, essential: true });
    });
  });

  map.on('click', UNCLUSTERED, (e) => {
    const feats = map.queryRenderedFeatures(e.point, { layers: [UNCLUSTERED] });
    const id = feats[0]?.properties?.id;
    if (typeof id === 'string') onMarkerClick(id);
  });

  const setPointer = () => {
    map.getCanvas().style.cursor = 'pointer';
  };
  const clearPointer = () => {
    map.getCanvas().style.cursor = '';
  };
  map.on('mouseenter', CLUSTER_CIRCLES, setPointer);
  map.on('mouseleave', CLUSTER_CIRCLES, clearPointer);
  map.on('mouseenter', UNCLUSTERED, setPointer);
  map.on('mouseleave', UNCLUSTERED, clearPointer);
}

function setMarkerData(map: MapboxMap, markers: MapboxMapMarker[]) {
  const src = map.getSource(CLUSTER_SOURCE) as import('mapbox-gl').GeoJSONSource | undefined;
  if (src) src.setData(markersToFeatureCollection(markers));
}

function applyHighlight(map: MapboxMap, highlightedMarkerId: string | null | undefined) {
  if (!map.getLayer(UNCLUSTERED)) return;
  const hi = highlightedMarkerId && highlightedMarkerId.length > 0 ? highlightedMarkerId : HIGHLIGHT_NONE;
  map.setPaintProperty(UNCLUSTERED, 'circle-radius', [
    'case',
    ['==', ['get', 'id'], hi],
    9,
    5,
  ]);
  map.setPaintProperty(UNCLUSTERED, 'circle-stroke-width', [
    'case',
    ['==', ['get', 'id'], hi],
    2.75,
    1.25,
  ]);
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
      highlightedMarkerId = null,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapboxMap | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const markersRef = useRef(markers);
    markersRef.current = markers;
    const onMarkerClickRef = useRef(onMarkerClick);
    onMarkerClickRef.current = onMarkerClick;
    const cameraTargetRef = useRef(cameraTarget);
    cameraTargetRef.current = cameraTarget;
    const fitBoundsRef = useRef(fitBounds);
    fitBoundsRef.current = fitBounds;
    const highlightedRef = useRef(highlightedMarkerId);
    highlightedRef.current = highlightedMarkerId;
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
          ensureClusterLayers(map, mapboxgl, embed, (id) => onMarkerClickRef.current?.(id));
          setMarkerData(map, markersRef.current);
          applyHighlight(map, highlightedRef.current);
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
    }, [accessToken, embed]);

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
      setMarkerData(map, markers);
    }, [markers]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map?.isStyleLoaded()) return;
      applyHighlight(map, highlightedMarkerId);
    }, [highlightedMarkerId]);

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
