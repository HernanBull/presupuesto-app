/**
 * storefrontThemeUtils.js
 * Utilidades para paletas y temas dinámicos exclusivos de la vitrina del comerciante.
 */

export const DEFAULT_STOREFRONT_COLOR = '#f59e0b'; // Ámbar oficial Axon

export const STOREFRONT_COLOR_PRESETS = [
  {
    id: 'amber',
    name: 'Ámbar Axon',
    hex: '#f59e0b',
    description: 'Estándar dinámico y comercial',
    badge: 'Oficial'
  },
  {
    id: 'orange',
    name: 'Naranja Enérgico',
    hex: '#ea580c',
    description: 'Comida rápida, retail y ofertas'
  },
  {
    id: 'emerald',
    name: 'Verde Esmeralda',
    hex: '#10b981',
    description: 'Víveres, abastos, salud y orgánicos'
  },
  {
    id: 'forest',
    name: 'Verde Botánico',
    hex: '#059669',
    description: 'Farmacias, naturistas y bienestar'
  },
  {
    id: 'blue',
    name: 'Azul Zafiro',
    hex: '#2563eb',
    description: 'Tecnología, ferretería y confianza'
  },
  {
    id: 'indigo',
    name: 'Azul Índigo',
    hex: '#4f46e5',
    description: 'Servicios, gadgets y electrónica'
  },
  {
    id: 'violet',
    name: 'Violeta Neón',
    hex: '#8b5cf6',
    description: 'Moda, calzado y estética moderna'
  },
  {
    id: 'pink',
    name: 'Rosa Rubí',
    hex: '#ec4899',
    description: 'Belleza, cosméticos, repostería'
  },
  {
    id: 'red',
    name: 'Rojo Pasión',
    hex: '#ef4444',
    description: 'Gourmet, carnicería, promociones'
  },
  {
    id: 'cyan',
    name: 'Cian Caribe',
    hex: '#06b6d4',
    description: 'Bebidas, deportes y frescura'
  },
  {
    id: 'gold',
    name: 'Oro Imperial',
    hex: '#d97706',
    description: 'Joyería, alta gama y exclusividad'
  },
  {
    id: 'midnight',
    name: 'Negro Medianoche',
    hex: '#18181b',
    description: 'Boutique minimalista y moda urbana'
  }
];

/**
 * Convierte un color HEX (#RRGGBB o #RGB) a formato rgba(r, g, b, alpha)
 */
export function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== 'string') return `rgba(245, 158, 11, ${alpha})`;
  let cleanHex = hex.trim().replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) {
    return `rgba(245, 158, 11, ${alpha})`;
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Calcula si sobre el color de fondo debe ir texto blanco o negro según luminancia relativa
 */
export function getContrastTextColor(hex) {
  if (!hex || typeof hex !== 'string') return '#ffffff';
  let cleanHex = hex.trim().replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) return '#ffffff';
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  
  // Fórmula estándar de luminancia perceptiva (ITU-R BT.709)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? '#09090b' : '#ffffff';
}

/**
 * Valida si un string es un código HEX válido (#RRGGBB o #RGB)
 */
export function isValidHex(hex) {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(hex);
}

/**
 * Normaliza y formatea un HEX
 */
export function normalizeHex(hex, fallback = DEFAULT_STOREFRONT_COLOR) {
  if (!hex) return fallback;
  const clean = hex.trim();
  const withHash = clean.startsWith('#') ? clean : `#${clean}`;
  return isValidHex(withHash) ? withHash : fallback;
}

/**
 * Ajusta el brillo de un HEX (-100 a 100)
 */
export function adjustBrightness(hex, percent) {
  const cleanHex = normalizeHex(hex).replace('#', '');
  const num = parseInt(cleanHex, 16);
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Genera gradientes y estilos para la vitrina del comerciante
 */
export function getStorefrontThemeStyles(hex) {
  const base = normalizeHex(hex);
  const darker = adjustBrightness(base, -18);
  const lighter = adjustBrightness(base, 15);
  const subtleBg = hexToRgba(base, 0.08);
  const borderLight = hexToRgba(base, 0.25);
  const textContrast = getContrastTextColor(base);

  return {
    base,
    darker,
    lighter,
    subtleBg,
    borderLight,
    textContrast,
    bannerGradient: `linear-gradient(135deg, ${darker} 0%, ${base} 55%, ${lighter} 100%)`,
    coverGradient: `linear-gradient(135deg, ${darker} 0%, ${base} 50%, ${lighter} 100%)`,
    buttonStyle: {
      backgroundColor: base,
      color: textContrast,
      boxShadow: `0 4px 14px ${hexToRgba(base, 0.35)}`
    }
  };
}

