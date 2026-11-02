# Plan Maestro de Implementación: Rediseño del Perfil de Tienda Pública (Estilo Instagram / TikTok Profesional)

**Documento:** `docs/PLAN_REDISENO_PERFIL_TIENDA_INSTAGRAM_STYLE.md`  
**Módulo Principal:** [PublicStore.jsx](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/PublicStore.jsx)  
**Componentes Relacionados:** [MerchantStatusViewerModal.jsx](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/components/MerchantStatusViewerModal.jsx), [SocialFeedCard.jsx](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/components/SocialFeedCard.jsx)  
**Fecha:** 2026-11-01  

---

## 1. Requerimiento del Usuario (Transcripción de Instrucciones de Audio)

> *"A mí me gustó el diseño pero vamos a hacer unas modificaciones, vamos a ser una parte más inteligente:*  
> *1. Portada limpia: la foto de fondo 100% visible sin tapar en el medio.*  
> *2. Abajo de 'Estados y Promociones' vamos a colocar dos íconos:*  
> *- El primer ícono es la información del comerciante (todo Acerca de, Calificaciones, Horario, Ubicación).*  
> *- El segundo botón sería el botón de multimedia donde van a salir todos los videos que ha publicado ese comerciante en cuadrícula vertical de 3 columnas (estilo TikTok/Reels) con contador de reproducciones ▶.*  
> *- Incluso la parte de novedades y noticias no va en la parte de información del comerciante, sino en multimedia.*  
> *Haz esa modificación ahí."*

---

## 2. Arquitectura Visual Completa

```
┌──────────────────────────────────────────────────────────────┐
│  <  Atrás                    [PORTADA]                     👤 │
│                                                              │
│         [ FOTO DE FONDO 100% LIMPIA Y VISIBLE ]              │
│       (Cero elementos en el medio que tapen la imagen)       │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  ┌───────────┐      33            2            1             │
│  │  AVATAR   │  Publicaciones  Seguidores   Me gusta         │
│  │ CIRCULAR  │                                               │
│  └───────────┘                                               │
│                                                              │
│  Nombre de la Tienda ✔                                       │
│  @slug  ·  [⭐ Calificar (5.0)]  [EM ⚡ en minutos]          │
│  🏎️ La mejor calidad y servicio para ti.                     │
│  📍 Cagua diagonal                                           │
│                                                              │
│  ┌────────────────────────┐  ┌───────────┐  ┌───┐  ┌───┐    │
│  │       + Seguir         │  │ Contactar │  │ 🔗│  │ 📷│    │
│  └────────────────────────┘  └───────────┘  └───┘  └───┘    │
├──────────────────────────────────────────────────────────────┤
│  🟢 ESTADOS Y PROMOCIONES (Barra Horizontal WhatsApp/Stories)│
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐              │
│  │ Story1 │  │ Story2 │  │ Story3 │  │ Story4 │              │
│  └────────┘  └────────┘  └────────┘  └────────┘              │
├──────────────────────────────────────────────────────────────┤
│               SUB-PESTAÑAS INTELIGENTES (2 ÍCONOS)           │
│         [ ||| INFORMACIÓN ]       [ 🔁 MULTIMEDIA / VIDEOS ] │
│         ═══════════════════                                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  SI PESTAÑA = INFORMACIÓN (Ícono 1):                         │
│  - 🏢 Acerca de (Descripción + Dirección)                    │
│  - ⭐ Calificaciones de los Clientes                         │
│  - 🕒 Horario (Abierto/Cerrado + Detalle expandible)         │
│  - 📍 Ubicación (Mapa interactivo + botón Maps)              │
│  *(Nota: Novedades y noticias NO va aquí)*                   │
│                                                              │
│  SI PESTAÑA = MULTIMEDIA / VIDEOS (Ícono 2):                 │
│  (Cuadrícula vertical 3 columnas aspecto 9:16 con vistas ▶): │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │   VIDEO 1  │  │   VIDEO 2  │  │   VIDEO 3  │              │
│  │ ▶ 84,4 mil │  │ ▶ 624,7 mil│  │ ▶ 89,1 mil │              │
│  └────────────┘  └────────────┘  └────────────┘              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │   VIDEO 4  │  │   VIDEO 5  │  │   VIDEO 6  │              │
│  │ ▶ 633 mil  │  │ ▶ 342,4 mil│  │ ▶ 1,5 mill.│              │
│  └────────────┘  └────────────┘  └────────────┘              │
│                                                              │
│  Navegación: Tocar íconos o Deslizar táctil (Swipe)          │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Especificaciones de Implementación

1. **Foto de Portada**:
   - `h-44 sm:h-52 md:h-64 relative w-full overflow-hidden bg-slate-900`.
   - 100% visible, sin textos ni avatares encima.
   - Solo la barra superior flotante con `< Volver` y `👤 Perfil`.

2. **Bloque Comercial debajo de la Portada**:
   - Avatar a la izquierda (`w-20 h-20 sm:w-24 sm:h-24` con aro de historia activo/gris si tiene estados).
   - Estadísticas a la derecha (`Publicaciones`, `Seguidores` interactivo, `Me gusta`).
   - Nombre de tienda, `@slug`, `[⭐ Calificar]` con puntuación promedio, badge `[EM ⚡ en minutos]`, descripción y ubicación.
   - Fila de botones de acción: `[+ Seguir]`, `[Contactar]`, `[🔗]`, `[📷]`.

3. **Sección de Estados y Promociones**:
   - Barra horizontal de historias/estados con miniaturas y reproducción inmersiva al tocar.

4. **Selector de 2 Pestañas (Abajo de Estados)**:
   - Estado: `const [profileSubTab, setProfileSubTab] = useState('info'); // 'info' | 'media'`
   - Ícono 1: 6 barras verticales / Ficha informativa (`Información`).
   - Ícono 2: Flechas circulares / Repost / Reels (`Multimedia / Videos`).
   - Línea indicadora activa animada (`motion.div layoutId="profileSubTabIndicator"`).
   - Soporte para deslizamiento táctil horizontal (`Swipe left/right`).

5. **Pestaña 1 (Información)**:
   - `Acerca de`
   - `Calificaciones de los Clientes`
   - `Horario`
   - `Ubicación`

6. **Pestaña 2 (Multimedia / Videos)**:
   - Cuadrícula de 3 columnas (`grid grid-cols-3 gap-1 sm:gap-1.5`).
   - Tarjetas aspecto vertical 9:16 (`aspect-[9/16]`).
   - Contador de reproducciones inferior izquierdo: `▶ {views}` formateado (ej. `▶ 84,4 mil`).
   - Al tocar cualquier video se abre inmediatamente en el visor inmersivo `MerchantStatusViewerModal`.
   - Las publicaciones de novedades con contenido audiovisual se muestran en esta cuadrícula.
