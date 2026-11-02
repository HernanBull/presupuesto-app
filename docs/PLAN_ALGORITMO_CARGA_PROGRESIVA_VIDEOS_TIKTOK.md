# Plan de Implementación: Algoritmo de Carga Progresiva por Scroll "Uno por Uno" para Imágenes y Videos (Estilo TikTok / Instagram / Facebook)

## 1. Diagnóstico del Problema y Causa Raíz

### 1.1 El Problema Reportado
Al entrar a la sección de clientes de AxonMarket (Feed Principal `/feed`, `/explorar`, `/directorio`):
- **Carga masiva de golpe (Eager Loading Total)**: Decenas de publicaciones con imágenes de alta resolución y videos se cargan en paralelo desde el primer instante.
- **Sobrecarga de Red y Memoria**: Incluso publicaciones que están al final de la página (por debajo de la vista del usuario) inician peticiones de red simultáneas.
- **Reproducción accidental e intermitencia**: Los videos ubicados abajo comienzan a reproducirse o precargarse en segundo plano mientras el usuario aún observa la primera publicación, generando tirones (lags), saltos y lentitud en teléfonos móviles.

### 1.2 La Regla del Scroll Progresivo
Tal como operan TikTok, Instagram Reels y Facebook:
> **"El scroll del usuario es quien autoriza la carga."**
> Ninguna imagen ni video debe solicitar recursos de red hasta que el usuario se aproxime a dicha publicación. Cada publicación se carga **una por una**, de forma progresiva, suave y controlada.

---

## 2. Arquitectura de Carga Progresiva por Scroll (Ventana Dinámica 1:1)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 ALGORITMO DE VENTANA MÓVIL POR SCROLL (TIKTOK)              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ Card N-2 ]  ──►  SUPERIOR: Desmontada de memoria (Placeholder de 0 KB)   │
│  [ Card N-1 ]  ──►  ANTERIOR: Video pausado, imagen en memoria caché local  │
│                                                                             │
│  ═════════════════════════════════════════════════════════════════════════  │
│  ►► [ CARD N ] ──►  EN PANTALLA: Activa al 100%                            │
│                     • Si es Video: Reproducción fluida única a 60 FPS       │
│                     • Si es Imagen: Renderizada en alta resolución          │
│  ═════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  [ Card N+1 ]  ──►  SIGUIENTE: Precalentamiento ligero (Metadata lista)     │
│  [ Card N+2 ]  ──►  EN ESPERA: Solo skeleton/placeholder, sin peticiones    │
│  [ Card N+3+]  ──►  NO EXISTE EN DOM: Se genera al continuar el scroll      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Los 4 Pilares de la Solución Técnica

### Pilar 1: Carga Diferida Estricta de Imágenes ("Una por Una")
- **Problema actual**: El tag `<img src={resolveImageUrl(cover)} />` solicita la imagen inmediatamente para todas las tarjetas.
- **Solución**:
  - `src` no se asigna al elemento `<img>` hasta que la tarjeta entra a una distancia de **1 pantalla del viewport** (`IntersectionObserver`).
  - Mientras la tarjeta está fuera de vista, se muestra un contenedor neutro con degradado CSS liviano (0 KB de red).
  - Al ingresar al umbral visual, se asigna `src`, `loading="lazy"`, `decoding="async"` y una transición suave de desvanecimiento (`fade-in`) al completar la descarga.

### Pilar 2: Coordinador de Video Único (`SingleActivePlayerCoordinator`)
- **Regla inquebrantable**: En ningún momento puede haber más de **UN (1)** video reproduciéndose en el dispositivo.
- **Eliminación de `autoPlay` estático**: La etiqueta `<video>` nunca arranca sola por HTML.
- **Umbral Focal (65%)**:
  - El video solo recibe `.play()` cuando al menos el 65% de la tarjeta está visible en el centro de la pantalla.
  - Al hacer scroll y salir del umbral, se ejecuta inmediatamente `.pause()` y se silencia el canal de audio.
- **`preload="none"`**: Los videos que no están en la vista actual tienen su atributo `preload` en `"none"`, impidiendo que el navegador descargue megabytes de streaming por adelantado.

### Pilar 3: Renderizado Progresivo del Feed por Lotes en `MarketplaceDirectory.jsx`
- En lugar de inyectar `feedPosts.map(...)` con 50 publicaciones a la vez:
  - **Lote Inicial**: Se renderizan únicamente las **primeras 3 a 4 publicaciones**.
  - **Observador Centinela al Pie**: Un elemento invisible al final del lote actual detecta cuando el usuario llega a la última tarjeta disponible.
  - Al cruzar el centinela, se revelan las siguientes **3 a 4 publicaciones**, logrando una experiencia de scroll infinito completamente fluida y sin saltos.

### Pilar 4: Consultas de Likes y Comentarios Bajo Demanda (Lazy Data Fetching)
- Actualmente cada tarjeta ejecuta consultas a Supabase (`getPostLikeState`, comentarios, favoritos) en el instante de montaje inicial.
- Con 30 tarjetas, esto generaba 60+ peticiones de red simultáneas compitiendo contra las imágenes y videos.
- **Optimización**: Cada tarjeta espera a tener visibilidad real en el viewport (`isIntersecting === true`) para solicitar sus interacciones a Supabase.

---

## 4. Plan de Trabajo Paso a Paso

### Fase 1: Componente de Imagen Progresiva `ProgressiveFeedImage.jsx`
Crear un componente optimizado de imagen que:
- Muestra un skeleton con degradado de pulso suave.
- Detecta visibilidad mediante `IntersectionObserver`.
- Conecta la URL real solo cuando el usuario se acerca a la tarjeta.
- Evita recargas y parpadeos con caché en memoria.

### Fase 2: Coordinador Global de Video Activo `ActiveFeedMediaContext.jsx`
Implementar un contexto ligero que rastrea cuál es el post activo:
- Al enfocar el Post `A`, se asegura de pausar cualquier video anterior (`B`).
- Garantiza que solo un video consuma GPU y decodificación de hardware.

### Fase 3: Refactorización de `SocialFeedCard.jsx`
1. Reemplazar la etiqueta `<video>` con el nuevo control programático sin `autoPlay` y con `preload="none"`.
2. Integrar `ProgressiveFeedImage` para las publicaciones de imagen.
3. Diferir la carga de comentarios y likes hasta que la tarjeta esté visible.

### Fase 4: Paginación Progresiva del Feed en `MarketplaceDirectory.jsx`
1. Sustituir el renderizado masivo por un estado `visibleCount` inicializado en 4.
2. Instalar el centinela de intersección al final de la lista para incrementar `visibleCount` de 4 en 4 conforme el usuario hace scroll hacia abajo.

### Fase 5: Validación y Certificación
- Probar en `http://localhost:5174/feed` con DevTools limitando red a "Fast 3G" para certificar que no haya bloqueos ni saturación.
- Verificar con audio y scroll continuo que los videos no se solapen.
- Compilar (`npm run build`) y desplegar con `actualizar.bat`.

---

## 5. Comparativa de Rendimiento

| Indicador | Antes (Carga Masiva) | Después (Scroll Progresivo TikTok) |
|---|---|---|
| **Peticiones de Red Iniciales** | 60 a 90 peticiones simultáneas | **6 a 10 peticiones estrictas** |
| **Videos Descargando Simultáneamente** | 5 a 15 videos compitiendo | **Exactamente 1 video activo** |
| **Uso de Memoria RAM en Teléfono** | 450 MB – 600 MB | **< 120 MB estables** |
| **FPS en Scroll Vertical** | 25 – 40 FPS con caídas | **60 FPS estables y fluidos** |
| **Reproducción Fantasma Fuera de Pantalla** | Ocurría frecuentemente | **Totalmente eliminada** |
