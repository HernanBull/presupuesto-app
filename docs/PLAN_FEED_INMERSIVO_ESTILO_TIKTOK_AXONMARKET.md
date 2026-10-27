# Plan de Implementación: Feed Inmersivo y Animaciones Estilo TikTok (Optimizado para Cero Lag Móvil)

## 1. Diagnóstico de los Defectos Identificados en las Capturas

Al analizar las capturas enviadas, se detectaron 3 problemas visuales críticos:

1. **Corte y Solapamiento entre Posts (No hay pantalla completa por publicación)**:
   - *Problema*: En la primera captura se ve la mitad inferior del post de la hamburguesa y la mitad superior del post de la moto al mismo tiempo.
   - *Comportamiento TikTok*: En TikTok cada publicación ocupa **exactamente el 100% de la altura visible** de la pantalla. Nunca se ven dos publicaciones a medias simultáneamente. Al deslizar el dedo (swipe), la pantalla salta de forma magnética (*snap*) a la siguiente publicación.

2. **Franja Irregular de Luz y Sombra ("Oscuro en un lugar, claro en otro")**:
   - *Problema*: El degradado inferior de sombra estaba colocado dentro del contenedor del texto izquierdo (`right-16`), por lo que no cubría el ancho total del post. Esto causó una línea vertical de corte donde los botones de la derecha tenían fondo claro y el texto izquierdo fondo negro.
   - *Solución*: El degradado debe ser de **ancho completo** (`inset-x-0 bottom-0 h-64`) para dar una atmósfera de iluminación homogénea y premium en toda la base del post.

3. **Franjas y Bordes Laterales con Desfase**:
   - *Problema*: Detrás de los botones de la derecha se asomaban franjas de color rojo/marrón debido a desbordamiento o desajuste de ancho en la tarjeta.
   - *Solución*: La imagen debe cubrir el 100% del contenedor con `object-cover` sin márgenes residuales, y el contenedor debe tener `overflow-hidden` con ancho exacto.

---

## 2. Estrategia de Rendimiento Extremo (Evitar Lags en Dispositivos Móviles)

El usuario enfatizó: *"vamos a intentar tocar las menos animaciones posibles para que se haga más fluido todo el teléfono, tomando en cuenta que hay algunos lagueos en la parte móvil"*.

### Reglas de Oro para Cero Lag:
- **CERO animaciones de scroll por JavaScript**: No utilizar librerías pesadas de física de scroll ni hooks de JS en el evento `onScroll` continuo, ya que saturan el hilo principal de la CPU en móviles Android/iOS de gama media y provocan tirones (*jank*).
- **CSS Scroll Snap Nativo por Hardware**:
  - Utilizar propiedades estándar de CSS:
    ```css
    scroll-snap-type: y mandatory;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    ```
  - Cada tarjeta tendrá:
    ```css
    scroll-snap-align: start;
    scroll-snap-stop: always;
    ```
  - **Ventaja**: El motor del navegador y la GPU del teléfono manejan la transición a 60fps/120fps nativos con **0% de consumo de CPU**.
- **Aceleración por GPU (Compositing)**:
  - Añadir `transform: translateZ(0)` y `will-change: transform` exclusivamente a las tarjetas activas para que la GPU procese las texturas directamente en memoria de video.
- **Micro-animación Liviana de Doble Tap (Corazón)**:
  - En lugar de efectos de partículas o librerías pesadas, utilizar una animación CSS simple de 400ms (`transform: scale(...) opacity`) que desaparezca inmediatamente.

---

## 3. Arquitectura Visual del Nuevo Feed TikTok

```
┌─────────────────────────────────────────────────────────────┐
│  [Top Bar AxonMarket] (Buscador + Categorías Destacadas)     │
├─────────────────────────────────────────────────────────────┤
│  ▲ Desplazamiento Snap 1-por-1 (100% Alto de Pantalla)      │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │                  FOTO / MULTIMEDIA                    │  │
│  │                (100% Ancho y Alto)                    │  │
│  │                                          [ 1/1 ] [...]│  │
│  │                                                       │  │
│  │                                             [ ❤️ ]    │  │
│  │                                               12      │  │
│  │                                             [ 💬 ]    │  │
│  │                                               4       │  │
│  │                                             [ ✈️ ]    │  │
│  │                                            Compartir  │  │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  [ 🔖 ]    │  │
│  │  DEGRADADO OSCURO UNIFORME DE ANCHO COMPLETO   Guardar │  │
│  │  (from-black/95 via-black/50 to-transparent)          │  │
│  │                                                       │  │
│  │  (Avatar) @Comercio  [+ Seguir]                       │  │
│  │  📍 Ubicación del local                               │  │
│  │  Texto de la publicación o promoción...               │  │
│  │  💬 Ver comentarios • Hace 2 días                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ▼ Deslizar con el dedo salta magnéticamente al sgte. post  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Fases de Ejecución Paso a Paso

### Fase 1: Corrección de `SocialFeedCard.jsx`
1. **Gradiente de Fondo Uniforme**:
   - Mover el gradiente `bg-gradient-to-t from-black/95 via-black/55 to-transparent` al nivel raíz de la tarjeta (`inset-x-0 bottom-0 h-64 pointer-events-none`).
   - Esto elimina la franja de contraste bicolor ("oscuro en un lugar y claro en otro") y unifica toda la base.
2. **Dimensiones de Tarjeta de Pantalla Completa**:
   - Ajustar el contenedor del post a `h-[calc(100dvh-130px)]` o `h-[calc(100vh-130px)]` en móvil (respetando la cabecera superior y el área de categorías).
   - Asegurar `scroll-snap-align: start` y `scroll-snap-stop: always`.
3. **Alineación de Botones Laterales**:
   - Ajustar la columna derecha (`right-3 bottom-6`) para que no pegue con el borde de la pantalla y quede perfectamente integrada sobre el gradiente oscuro.

### Fase 2: Configuración del Contenedor en `MarketplaceDirectory.jsx`
1. **Activar CSS Snap Scroll Nativo**:
   - Envolver el listado de publicaciones en un contenedor de scroll con:
     `h-[calc(100dvh-130px)] overflow-y-auto scroll-smooth snap-y snap-mandatory overscroll-contain`
   - Opcionalmente ocultar la barra de scroll nativa mediante utilidades CSS (`scrollbar-none`).
2. **Sincronización con la Barra Desplegable**:
   - Mantener la barra flotante desplegable/ocultable para no interferir con la navegación por swipe de los posts.

### Fase 3: Optimización y Pruebas de Fluidez en Móvil
1. **Prueba de Rendimiento (FPS)**:
   - Verificar que al hacer swipe vertical entre posts no haya tirones ni recargas.
   - Validar que las imágenes pesadas no congelen el scroll mediante `loading="lazy"` y decodificación asíncrona (`decoding="async"`).
2. **Validación de Compilación**:
   - Ejecutar `npm run build` en el proyecto Vite para descartar cualquier error de sintaxis o empaquetado.

### Fase 4: Despliegue en Producción
- Ejecutar `actualizar.bat` para compilar y sincronizar con la rama `main` de Cloudflare Pages.
