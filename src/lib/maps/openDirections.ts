/** Destino para apps de navegación (lat/lng en WGS84). */

export function openGoogleMapsDirections(latitude: number, longitude: number): void {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function openWazeNavigate(latitude: number, longitude: number): void {
  const url = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
