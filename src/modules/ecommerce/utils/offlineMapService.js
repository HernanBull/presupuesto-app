/**
 * Servicio de Descarga y Caché Offline de Mosaicos para Leaflet (OpenStreetMap)
 * Almacena cuadrículas en CacheStorage de la PWA para navegación instantánea sin red.
 */

const CACHE_NAME = 'osm-map-tiles-cache';

// Convertir longitud a coordenada de cuadrícula X
export function lon2tile(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

// Convertir latitud a coordenada de cuadrícula Y
export function lat2tile(lat, zoom) {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}

/**
 * Obtener lista de URLs de cuadrículas alrededor de un punto geográfico
 * @param {number} lat - Latitud central
 * @param {number} lng - Longitud central
 * @param {number} radiusKm - Radio en kilómetros (ej. 3 km)
 * @param {number[]} zoomLevels - Niveles de zoom a precargar (ej. [13, 14, 15])
 */
export function getZoneTileUrls(lat, lng, radiusKm = 3, zoomLevels = [13, 14, 15]) {
  const kmPerDegLat = 111.32;
  const kmPerDegLng = 111.32 * Math.cos((lat * Math.PI) / 180);

  const deltaLat = radiusKm / kmPerDegLat;
  const deltaLng = radiusKm / kmPerDegLng;

  const minLat = lat - deltaLat;
  const maxLat = lat + deltaLat;
  const minLng = lng - deltaLng;
  const maxLng = lng + deltaLng;

  const urls = [];

  zoomLevels.forEach((zoom) => {
    const minX = lon2tile(minLng, zoom);
    const maxX = lon2tile(maxLng, zoom);
    const minY = lat2tile(maxLat, zoom); // en Y, menor número es más al norte
    const maxY = lat2tile(minLat, zoom);

    for (let x = Math.min(minX, maxX); x <= Math.max(minX, maxX); x++) {
      for (let y = Math.min(minY, maxY); y <= Math.max(minY, maxY); y++) {
        urls.push(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`);
      }
    }
  });

  return urls;
}

/**
 * Descarga los mosaicos de una zona y los almacena en CacheStorage
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @param {number} radiusKm - Radio en km
 * @param {function} onProgress - Callback con { completed, total, percent }
 */
export async function downloadZoneTiles(lat, lng, radiusKm = 3, onProgress = null) {
  if (!('caches' in window)) {
    throw new Error('Tu navegador no soporta almacenamiento en caché local.');
  }

  const urls = getZoneTileUrls(lat, lng, radiusKm, [13, 14, 15]);
  const total = urls.length;
  let completed = 0;
  let totalBytes = 0;

  const cache = await caches.open(CACHE_NAME);

  // Procesar en lotes de 6 solicitudes concurrentes para no saturar la red ni la memoria
  const BATCH_SIZE = 6;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(async (url) => {
        try {
          // Si ya está en caché, no re-descargar
          const existing = await cache.match(url);
          if (existing) {
            completed++;
            if (onProgress) {
              onProgress({
                completed,
                total,
                percent: Math.round((completed / total) * 100),
                totalBytes
              });
            }
            return;
          }

          const response = await fetch(url, { mode: 'cors' });
          if (response && response.status === 200) {
            const clone = response.clone();
            const blob = await clone.blob();
            totalBytes += blob.size;
            await cache.put(url, response);
          }
        } catch (err) {
          console.warn(`Error al descargar mosaico: ${url}`, err);
        } finally {
          completed++;
          if (onProgress) {
            onProgress({
              completed,
              total,
              percent: Math.round((completed / total) * 100),
              totalBytes
            });
          }
        }
      })
    );
  }

  // Guardar metadatos de la zona descargada
  const zoneMeta = {
    lat,
    lng,
    radiusKm,
    totalTiles: total,
    totalBytes,
    date: new Date().toISOString()
  };
  localStorage.setItem('axon_offline_zone_info', JSON.stringify(zoneMeta));

  return zoneMeta;
}

/**
 * Obtener información de la zona guardada actualmente
 */
export async function getOfflineZoneInfo() {
  try {
    const metaStr = localStorage.getItem('axon_offline_zone_info');
    if (!metaStr) return null;
    return JSON.parse(metaStr);
  } catch {
    return null;
  }
}

/**
 * Limpiar toda la caché de mosaicos del mapa
 */
export async function clearMapCache() {
  if ('caches' in window) {
    await caches.delete(CACHE_NAME);
  }
  localStorage.removeItem('axon_offline_zone_info');
}
