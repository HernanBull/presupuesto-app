/**
 * mediaCacheService.js
 * Sistema de almacenamiento y precarga de medios en caché local (estilo TikTok / Instagram).
 * Utiliza CacheStorage API + pre-decodificación en memoria para navegación instantánea a 60-120 FPS sin consumo recurrente de datos móviles.
 */

const CACHE_NAME = 'axon-market-media-v1';
const isCacheSupported = typeof window !== 'undefined' && 'caches' in window;
const preloadedUrls = new Set();

/**
 * Normaliza la URL de una imagen o video para asegurar acceso absoluto
 */
export const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  return `https://axonmarket-api.onrender.com${url}`;
};

/**
 * Precarga una imagen en la memoria RAM y en el caché de decodificación del navegador
 */
export const preloadImage = (url) => {
  if (!url) return;
  const fullUrl = resolveMediaUrl(url);
  if (preloadedUrls.has(fullUrl)) return;
  preloadedUrls.add(fullUrl);

  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = fullUrl;
  } catch (e) {
    // Silencioso
  }
};

/**
 * Guarda el recurso binario en CacheStorage del teléfono para persistencia offline permanente
 */
export const cacheMediaUrl = async (url) => {
  if (!url || !isCacheSupported) return url;
  const fullUrl = resolveMediaUrl(url);

  try {
    const cache = await caches.open(CACHE_NAME);
    const existing = await cache.match(fullUrl);
    if (!existing) {
      const response = await fetch(fullUrl, { mode: 'no-cors' });
      if (response) {
        await cache.put(fullUrl, response);
      }
    }
  } catch (err) {
    // Si falla o hay restricciones de modo incógnito, no interrumpe el flujo normal
  }
  return fullUrl;
};

/**
 * Precarga en segundo plano los medios de las siguientes publicaciones adyacentes (Buffer lookahead)
 */
export const preloadAdjacentPostsMedia = (posts = [], currentIndex = 0, count = 3) => {
  if (!Array.isArray(posts) || posts.length === 0) return;

  const start = Math.max(0, currentIndex);
  const end = Math.min(posts.length, currentIndex + count + 1);

  for (let i = start; i < end; i++) {
    const p = posts[i];
    if (!p) continue;

    const mediaToPreload = [];

    if (p.image_url) mediaToPreload.push(p.image_url);
    if (p.store_cover) mediaToPreload.push(p.store_cover);
    if (p.store_logo) mediaToPreload.push(p.store_logo);
    if (p.config?.coverUrl) mediaToPreload.push(p.config.coverUrl);
    if (p.config?.logoUrl) mediaToPreload.push(p.config.logoUrl);
    if (p.config?.storefront?.heroUrl) mediaToPreload.push(p.config.storefront.heroUrl);
    if (p.config?.storefront?.logoUrl) mediaToPreload.push(p.config.storefront.logoUrl);

    if (Array.isArray(p.media_urls)) {
      mediaToPreload.push(...p.media_urls);
    }
    if (Array.isArray(p.images)) {
      mediaToPreload.push(...p.images);
    }

    mediaToPreload.forEach((item) => {
      if (typeof item === 'string' && item.trim()) {
        const full = resolveMediaUrl(item);
        preloadImage(full);
        // Cachear asíncronamente en tiempo libre
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          window.requestIdleCallback(() => cacheMediaUrl(full));
        } else {
          setTimeout(() => cacheMediaUrl(full), 100);
        }
      }
    });
  }
};
