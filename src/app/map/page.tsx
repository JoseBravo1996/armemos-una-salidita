import { Suspense } from 'react';
import { MapView } from '../pages/MapView';

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0f] text-gray-400">
          Cargando mapa…
        </div>
      }
    >
      <MapView />
    </Suspense>
  );
}
