# Plan de Implementación: Ilustraciones Profesionales Estilo DoorDash para AxonMarket

Este plan detalla la sustitución de los iconos genéricos de Lucide (`Bike`, `Store`, `Smartphone`) por **ilustraciones vectoriales comerciales personalizadas** con la identidad de marca de **AxonMarket** (Caja/Bolsa dorada-anaranjada, tonos cálidos y fondo orgánico suave), adaptando 1 a 1 el modelo visual de **DoorDash**.

---

## 1. Análisis Comparativo del Diseño DoorDash vs. AxonMarket

| Elemento | DoorDash (Referencia) | AxonMarket Actual | AxonMarket Objetivo |
| :--- | :--- | :--- | :--- |
| **Pilar 1 (Delivery)** | Chica en scooter roja con mochila DoorDash sobre fondo celeste orgánico | Icono de línea `Bike` en cajita beige | **Repartidor masculino en moto/scooter naranja** con casco y mochila delivery exhibiendo la cajita AxonMarket |
| **Pilar 2 (Comercio)** | Fachada de tienda roja con toldo y vitrina sobre fondo celeste | Icono de línea `Store` en cajita naranja | **Fachada de tienda local con vitrina y toldo a rayas naranja y blanco** con la insignia de AxonMarket |
| **Pilar 3 (App Móvil)** | Smartphone con logo DoorDash en pantalla sobre fondo celeste | Icono de línea `Smartphone` en cajita oscura | **Smartphone moderno con pantalla exhibiendo la app y logo de AxonMarket** |
| **Contenedor** | Ilustración plana con fondo blob orgánico pastel (sin recuadros duros) | Cuadrado pequeño con bordes redondeados (`w-16 h-16`) | **Ilustración estilizada de tamaño completo (`w-24 h-24` a `w-32 h-32`) sobre blob pastel cálido** |

---

## 2. Especificación de Cada Ilustración

### Ilustración 1: "Conviértete en Repartidor"
- **Personaje**: Repartidor masculino con casco aerodinámico.
- **Vehículo**: Moto / scooter moderna en tono naranja cálido (`#EA580C` / `#F59E0B`).
- **Mochila Delivery**: Caja térmica trasera con el logo oficial de la cajita AxonMarket (`#FFFFFF` sobre fondo naranja).
- **Fondo**: Silueta orgánica pastel suave (forma de nube / blob en `#FFF7ED` o `#FEF3C7`).

### Ilustración 2: "Abre tu Tienda en AxonMarket"
- **Estructura**: Tienda comercial local moderna y amigable.
- **Toldo**: Marquesina con franjas en naranja vibrante (`#EA580C`) y blanco crema.
- **Vitrina**: Puerta de vidrio y ventana iluminada mostrando productos.
- **Detalle de Marca**: Insignia de la cajita AxonMarket sobre la entrada.
- **Fondo**: Silueta orgánica pastel suave en tono ámbar/naranja.

### Ilustración 3: "La mejor experiencia en tu móvil"
- **Dispositivo**: Smartphone ergonómico con bordes redondeados y cámara frontal sutil.
- **Pantalla**: Interfaz de AxonMarket mostrando la cajita dorada/anaranjada, fondo degradado y barra de navegación.
- **Fondo**: Silueta orgánica pastel suave que unifica la composición con las otras dos tarjetas.

---

## 3. Estrategia Técnica de Implementación

### Opción A (Recomendada): Componentes SVG Vectoriales Nativos
- **Ventajas**:
  - Carga ultrarrápida (0 ms de descarga externa, sin peticiones de red ni dependencias pesadas).
  - Nitidez perfecta (100% vector escalable en pantallas Retina, 4K y móviles).
  - Fondo 100% transparente sin bordes blancos residuales.
  - El logo de la cajita AxonMarket se incrusta con exactitud matemática de píxeles vectoriales.
- **Ubicación**: Integradas como componentes limpios en `src/modules/ecommerce/components/LandingIllustrations.jsx` o en `WelcomeLanding.jsx`.

---

## 4. Fases de Ejecución

1. **Fase 1 - Creación de Ilustraciones**:
   - Crear el diseño vectorial para el Repartidor en Scooter Naranja con la cajita.
   - Crear la Tienda Comercial con toldo naranja/blanco.
   - Crear el Smartphone con la app de AxonMarket en pantalla.
2. **Fase 2 - Maquetación de Tarjetas**:
   - Reemplazar los contenedores pequeños `w-16 h-16` por espacios generosos de `w-28 h-28` con efecto blob.
   - Armonizar los colores de los botones de acción (`Empezar a ganar →`, `Registrar mi comercio →`, `Abrir la App →`) en naranja DoorDash/AxonMarket (`#EA580C`).
3. **Fase 3 - Verificación Visual**:
   - Probar en vista móvil (390px) y escritorio (1280px).
4. **Fase 4 - Compilación y Despliegue**:
   - `npm run build`, `git commit` y `git push` a producción.
