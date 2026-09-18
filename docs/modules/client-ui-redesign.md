# Sistema de Diseño y Rediseño UI (Cliente / Marketplace)

**Fecha de Actualización:** 2026-09-16
**Objetivo:** Documentar los patrones arquitectónicos visuales y decisiones de diseño implementadas durante el rediseño del ecosistema de clientes (Marketplace y Tiendas Públicas).

## 🎨 1. Estética General: "Ultra-Premium Dark Mode"
Para elevar la percepción de valor de la plataforma (acercándola a un producto SaaS de clase mundial), se abandonó el diseño tradicional (Light Mode + color primario sólido) en favor de una estética **Dark Mode con Glassmorphism**.

### 1.1. Paleta de Colores Base
- **Fondo Principal:** `bg-black` o `bg-zinc-950`. Se evita el gris claro para fondos base.
- **Superficies (Tarjetas, Paneles):** `bg-zinc-900` con variaciones de opacidad (ej. `bg-zinc-900/50`) para permitir el efecto *Glassmorphism*.
- **Acentos (Brand Colors):**
  - **Ámbar / Oro:** `amber-400` a `amber-600`. Utilizado para CTAs primarios, íconos de interacción principal (carrito) y detalles luminosos. Transmite lujo y exclusividad.
  - **Violeta (Legado/Alternativo):** Ocasionalmente usado para contrastes secundarios si es necesario, pero el ámbar es el protagonista.
- **Textos:** `text-white` para títulos (con `font-light` o `font-normal`), y `text-zinc-400` o `text-zinc-500` para textos secundarios.

### 1.2. Efectos Visuales Clave
1. **Glassmorphism:** Uso intensivo de `backdrop-blur-md` o `backdrop-blur-xl` en menús de navegación, modales y tarjetas, superpuestos sobre fondos oscuros.
2. **Iluminación Ambiental (Orbes):** En lugar de fondos sólidos, se usan gradientes radiales (`radial-gradient`) o divs desenfocados (`blur-[100px]`) en las esquinas de las pantallas para simular luces de neón iluminando la interfaz.
3. **Micro-animaciones (Framer Motion):**
   - Transiciones suaves de opacidad y escala al montar componentes.
   - Efectos "Magnéticos" (Hover): Las tarjetas se elevan (`hover:-translate-y-1`), los bordes brillan (`hover:border-amber-500/30`), y las sombras resplandecen (`shadow-[0_0_20px_rgba(245,158,11,0.3)]`).

## 🛒 2. Componentes Clave Rediseñados

### 2.1. Directorio del Marketplace (`MarketplaceDirectory.jsx`)
- **Hero Banner:** Reemplazado por un diseño con luz volumétrica simulada y tipografía de peso fino (`font-light`).
- **Filtros MVP:** Simplificados estrictamente a los rubros funcionales actuales: "Todas", "Comida Rápida", "Víveres", "Fruterías".
- **Store Cards (Tarjetas de Tienda):** Ahora integran el logo sobre un pedestal flotante, bordes reactivos al hover, y botones de acción limpios.

### 2.2. Tienda del Comerciante (`PublicStore.jsx`) - *Completado (Nivel Experto)*
- **Objetivo Cumplido:** Alineación del escaparate de los comerciantes con el sistema de diseño ultra-premium.
- **Cambios Principales:**
  - **Auth Gate Premium:** Pantalla modal de login/registro interactiva con desenfoque extremo, eliminando pantallas blancas planas.
  - **Ofertas Flash (Glow Magnético):** Las tarjetas de productos en descuento presentan insignias de rayo luminosas, animaciones 3D de Framer Motion (resorteo al renderizar y levitación profunda al hover), y auras de luz radial al pasar el cursor.
  - **Slide-over de Carrito de Alta Gama:** Transición del carro básico blanco/gris a un panel Glassmorphism oscuro (`bg-zinc-950/80 backdrop-blur-3xl`). Las tarjetas de productos del carrito se animan en cascada (staggered fade-in) y descansan sobre fondos de contraste translúcidos con controles futuristas.
  - **Adaptación Cromática (Candado Visual Universal):** Se deshabilitó la lectura de personalizaciones desde la base de datos para el MVP. El sistema inyecta forzosamente un tema oscuro con color primario Ámbar (`#f59e0b`) y tipografía sans-serif para todas las tiendas registradas, logrando una estandarización estética absoluta (estilo SaaS cerrado) que garantiza una experiencia de usuario inquebrantable a lo largo de toda la plataforma.

## 📝 Reglas de Prevención para Futuros Desarrollos UI
1. **Evitar bordes duros y sombras pesadas:** En Dark Mode, usar bordes sutiles (`border-white/5` o `border-white/10`) en lugar de colores sólidos.
2. **Consistencia en el Carrito:** El slide-over del carrito debe compartir siempre la misma base oscura (`zinc-950`) en todas las vistas orientadas al cliente (Marketplace y PublicStore).
3. **No romper el MVP:** Cualquier nuevo filtro de UI debe validarse contra `ecommerce-niches.md` para asegurar que el negocio lo soporta operativamente.
