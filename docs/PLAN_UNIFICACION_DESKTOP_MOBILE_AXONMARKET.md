# Plan de Implementación: Unificación Visual Escritorio-Móvil en AxonMarket

## 1. Diagnóstico del Problema Actual

En la versión actual de [MarketplaceDirectory.jsx](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/MarketplaceDirectory.jsx) y [PublicStore.jsx](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/PublicStore.jsx), existen bifurcaciones condicionales de Tailwind CSS (`md:hidden` vs `hidden md:flex` / `hidden md:grid`).

Como se observa en la captura de pantalla:
1. **Pantalla estirada y vacía**: En escritorio, el contenedor se expande hasta `max-w-[1400px]`, dispersando los elementos y generando grandes espacios blancos.
2. **Navegación tradicional de portal web**: En la parte superior derecha se muestran botones planos horizontales (*Inicio, Categorías, Favoritos, Mapa Radar, Carrito, Abrir Tienda, Iniciar Sesión*) en lugar de la cabecera limpia y compacta de la app.
3. **Sección de Departamentos sobredimensionada**: Se renderizan cajas cuadradas grandes con controles de flechas laterales en lugar de las burbujas circulares táctiles tipo stories de la app móvil.
4. **Directorio en Cuadrícula vs Feed Social**: La versión de escritorio muestra un `grid` de 4 columnas de tarjetas genéricas de comercios ("Directorio Completo"), mientras que el feed interactivo tipo red social ([SocialFeedCard](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/components/SocialFeedCard.jsx)), con publicaciones, imágenes, comentarios y likes, está oculto con `md:hidden`.
5. **Barra de navegación inferior ausente**: La barra flotante inferior de vidrio (Glassmorphic Bottom Navigation) con accesos directos (*Inicio, Categorías, Carrito/Bolsa central, Favoritos, Mapa*) solo aparece en teléfonos (`md:hidden`).

---

## 2. Arquitectura de Solución: "Centered Mobile-First App Shell"

Para lograr que en computadoras de escritorio AxonMarket se vea **exactamente igual que en el teléfono**, adoptamos el patrón de diseño utilizado por aplicaciones de primer nivel como **Instagram Web, TikTok Web, WhatsApp Web y Threads**:

```
+-------------------------------------------------------------+
|           Fondo Ambiental Suave / Glow Sutil                |
|                                                             |
|             +---------------------------------+             |
|             |  [=] AXONMARKET       [Avatar]  | <-- Header  |
|             +---------------------------------+             |
|             |  [🔍 ¿Qué quieres pedir hoy?]   | <-- Buscador|
|             +---------------------------------+             |
|             |  (Dep1) (Dep2) (Dep3) (Dep4)    | <-- Stories |
|             +---------------------------------+             |
|             |  +---------------------------+  |             |
|             |  | Post Social / Noticia     |  |             |
|             |  | [ Imagen del Producto ]   |  | <-- Feed    |
|             |  | [Like] [Comentar] [Share] |  |   Social    |
|             |  +---------------------------+  |             |
|             |                                 |             |
|             |  [ 🏠    📂    (🛍️)   ❤️   📍 ] | <-- Bottom  |
|             +---------------------------------+       Bar   |
|                                                             |
+-------------------------------------------------------------+
```

### Características del App Shell en Escritorio:
- **Ancho Óptimo de Lectura**: Un contenedor central de `max-w-[480px]` a `max-w-[520px]` centrado horizontalmente en la pantalla con sombra sutil (`shadow-2xl`) y fondo limpio (`bg-white` o `bg-zinc-50`).
- **Fondo de Pantalla Ambiental**: Las áreas laterales de monitores ultra-anchos o Full HD lucen un degradado ambiental suave con desenfoque (`backdrop-blur` y luces doradas suaves `amber-500/5`), haciendo que el marco de la app resalte de forma premium.
- **Identidad 100% Compartida**: La versión de escritorio y la versión móvil ejecutarán exactamente los mismos componentes JSX sin duplicación ni bifurcación.

---

## 3. Fases de Implementación Paso a Paso

### Fase 1: Estructura del Contenedor Central (App Frame)
- **Archivo principal**: [MarketplaceDirectory.jsx](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/MarketplaceDirectory.jsx)
- **Acción**:
  - Reemplazar el contenedor exterior `max-w-[1400px]` por un contenedor centrado `max-w-md md:max-w-lg mx-auto min-h-screen bg-white shadow-xl border-x border-zinc-100`.
  - Crear el fondo envolvente para monitores grandes con gradientes suaves en el `body`/contenedor padre.

### Fase 2: Unificación de Header y Buscador
- **Acción**:
  - Eliminar los botones de navegación horizontal de escritorio (`hidden md:flex items-center gap-1`) del encabezado.
  - Dejar el header unificado con:
    1. Botón de menú lateral para accesos secundarios y legales ([isMobileMenuOpen](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/MarketplaceDirectory.jsx#L3060)).
    2. Logotipo central de **AXONMARKET**.
    3. Avatar de perfil del cliente o botón de iniciar sesión/abrir tienda.
  - Mantener la barra de búsqueda tipo píldora (`¿Qué quieres pedir hoy?`) fija o integrada justo debajo del header tanto en móvil como en PC.

### Fase 3: Despliegue del Feed Social en Escritorio
- **Acción**:
  - Eliminar el bloque de cuadrícula estática de 4 columnas (`hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`).
  - Mostrar exclusivamente el feed vertical interactivo de publicaciones ([SocialFeedCard](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/components/SocialFeedCard.jsx)) tanto en móvil como en escritorio.
  - Esto garantiza que las fotos, promociones, carruseles, descripciones de productos y novedades publicadas por los comercios sean el foco central de la experiencia en cualquier dispositivo.

### Fase 4: Barra Flotante Inferior Unificada (Bottom Navigation)
- **Acción**:
  - Quitar la clase `md:hidden` de la barra inferior flotante de cristal.
  - Ajustar su posición y ancho en escritorio para que permanezca centrada al pie del contenedor de la aplicación (`max-w-[420px] left-1/2 -translate-x-1/2 bottom-6 fixed z-50`).
  - Habilitar el botón central flotante (Action Button de bolsa/tienda) con animación de escala para volver al inicio o descubrir tiendas destacadas.

### Fase 5: Cajón Lateral y Modales
- **Acción**:
  - Adaptar los modales y el cajón lateral ([PostCommentsDrawer](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/components/PostCommentsDrawer.jsx), comentarios de publicaciones, carrito y autenticación) para que en escritorio se abran anclados coherentemente al marco de la app central.

### Fase 6: Unificación de la Vitrina del Comercio ([PublicStore.jsx](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/PublicStore.jsx))
- **Acción**:
  - Una vez unificado el directorio general, aplicar la misma arquitectura de contenedor centrado a la página de cada tienda (`/axon`, `/pocho`, `/ganador`).
  - Asegurar que la vista de productos, historias del comercio, carrito y botón flotante de WhatsApp se vean exactamente con las proporciones y estética de la app móvil.

---

## 4. Comparativa de Cambios

| Componente | Antes (Escritorio) | Ahora (Unificado Tipo App) |
| :--- | :--- | :--- |
| **Ancho de Pantalla** | `1400px` estirado con espacios muertos | Contenedor centrado `~500px` con glow ambiental |
| **Navegación Superior** | 7 botones horizontales planos | Header móvil compacto + Drawer lateral |
| **Contenido Principal** | Cuadrícula de 4 columnas de tarjetas | Feed vertical social interactivo (estilo Instagram) |
| **Navegación Principal** | Enlaces superiores dispersos | Barra flotante inferior de cristal (Bottom Nav) |
| **Interacción** | Solo clic en tienda | Likes, comentarios, historias y feed dinámico |

---

## 5. Pasos de Validación y Despliegue
1. Validar responsividad en resoluciones de escritorio (1920x1080, 1366x768, 2560x1440) y móviles (390px, 412px).
2. Probar interacción completa: búsqueda en tiempo real, cambio de categorías, scroll del feed, apertura de comentarios y navegación hacia vitrinas.
3. Ejecutar compilación de producción con Vite (`npm run build`).
4. Desplegar los cambios actualizados a Cloudflare Pages mediante `actualizar.bat`.
