# Plan de Implementación: Página de Bienvenida AxonMarket (Inspirada en DoorDash)

## 1. Visión General y Objetivo
Crear una **página de bienvenida oficial (Landing Gateway)** para **AxonMarket** (`https://axonmarket.vip/`) mediante ingeniería inversa del flujo visual y de conversión de **DoorDash**.

Cuando cualquier usuario ingrese a `axonmarket.vip`:
1. Será recibido por una interfaz moderna, limpia y atractiva que comunica instantáneamente los servicios de AxonMarket (delivery local, compras, ofertas y pedidos).
2. Podrá ingresar su dirección/zona o hacer clic en **"Abrir App / Explorar Comercios"** para acceder de inmediato al feed interactivo y tiendas.
3. Tendrá a la mano los 3 pilares de negocio:
   - **Repartidores**: Registrarse para hacer delivery.
   - **Comercios**: Registrar su negocio y vender sin comisiones abusivas.
   - **Compradores**: Descargar la PWA / Abrir la App web para pedir y descubrir tiendas.

---

## 2. Ingeniería Inversa de Secciones (Adaptadas a AxonMarket)

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Banner Superior]: "Navega más rápido en la App" • [Instalar / Abrir]   │
├────────────────────────────────────────────────────────────────────────┤
│ [Header]: (Logo AxonMarket)              [Ubicación]  [Entrar / Login] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                              HERO SECTION                              │
│                                                                        │
│                [ LOGO OFICIAL AXONMARKET SHOPPINGBAG ]                 │
│                                                                        │
│               TUS TIENDAS, RESTAURANTES Y BODEGONES                    │
│                     FAVORITOS EN UN SOLO LUGAR                         │
│                                                                        │
│           ┌──────────────────────────────────────────────┐             │
│           │ [Icono] Ingresa tu dirección o ciudad...     │ [Buscar]    │
│           └──────────────────────────────────────────────┘             │
│                     ↗ Usar mi ubicación actual                         │
│                                                                        │
│                   [ BOTÓN DESTACADO: ABRIR APP ]                       │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                     TRES PILARES DE SERVICIOS                          │
│                                                                        │
│  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │ 🛵 Haz Delivery    │  │ 🏬 Vende con Nosotros│ │ 📱 La Mejor App  │  │
│  │ Genera ingresos    │  │ Digitaliza tu local│  │ Explora ofertas, │  │
│  │ con tus horarios.  │  │ catálogo WhatsApp. │  │ historias y más. │  │
│  │ [Ser Repartidor ➔] │  │ [Registrar Tienda ➔│  │ [Abrir App ➔]   │  │
│  └────────────────────┘  └────────────────────┘  └──────────────────┘  │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                CATEGORÍAS POPULARES & CIUDADES ACTIVAS                 │
│         [Comida] [Bodegones] [Farmacias] [Moda] [Tecnología]           │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ [Footer]: Términos • Privacidad • WhatsApp Soporte • Acceso Comerciante│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Desglose Detallado de Componentes

### 3.1. Smart App Banner Superior (Estilo DoorDash)
- **Mensaje**: *"Navega más rápido en nuestra App"*
- **Subtexto**: *"Instala el acceso directo o abre en tu navegador"*
- **Acción**: Botón rojo/ámbar `[Abrir]` que dispara el prompt de instalación PWA o redirige al Feed.

### 3.2. Hero Section (Fondo Ámbar / Gradiente Cálido)
- **Identidad de Marca**: Paleta de colores AxonMarket (ámbar `#f59e0b`, naranja cálido `#ea580c` y acentos oscuros de alta legibilidad).
- **Titular Principal**:
  > **$0 COSTO DE ENVÍO EN TU PRIMER PEDIDO** *(o "LO MEJOR DE TU CIUDAD A TU PUERTA")*
- **Buscador de Ubicación / Tiendas**:
  - Input tipo cápsula flotante: *"Ingresa tu dirección o ciudad (ej. Cagua, Maracay...)"*
  - Enlace rápido interactivo: *"Usar mi ubicación actual ↗"* (utiliza la API nativa de geolocalización para sugerir comercios cercanos en el mapa).
- **Botón CTA Central**:
  - Botón prominente `[Abrir App]` / `[Explorar Comercios]` que lleva directamente al directorio y feed social.

### 3.3. Las 3 Tarjetas de Propuesta de Valor (1:1 con DoorDash)

| Tarjeta | Icono / Ilustración | Titular | Descripción | Llamado a la Acción (CTA) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Repartidores** | 🛵 Moto / Scooter Delivery | **Conviértete en Repartidor** | Genera ingresos en tu propio horario como repartidor independiente con moto o auto. Registro rápido. | `Empezar a ganar ➔` *(Abre contacto directo / formulario de registro de repartidores)* |
| **2. Comerciantes** | 🏬 Fachada de Negocio | **Abre tu Tienda en AxonMarket** | Atrae nuevos clientes locales, recibe pedidos directo a WhatsApp y vende sin comisiones abusivas. | `Registrar mi comercio ➔` *(Lleva al Wizard de registro de tiendas)* |
| **3. Clientes / App** | 📱 Smartphone con App | **Vive la mejor experiencia AxonMarket** | Disfruta de promociones exclusivas, historias en vivo y los mejores negocios de tu zona en un solo lugar. | `Abrir la App ➔` *(Lleva al Feed Social / Directorio)* |

### 3.4. Barra de Categorías Rápidas
- Iconos visuales y directos a filtros de búsqueda:
  - 🍔 Restaurantes & Comida Rápida
  - 🛒 Bodegones & Supermercados
  - 💊 Farmacias & Cuidado Personal
  - 👕 Ropa & Calzado
  - ⚡ Tecnología & Accesorios

### 3.5. Footer Institucional
- Descarga de App PWA.
- Enlaces legales: Términos y Condiciones, Política de Privacidad.
- Enlace al Portal de Administración del Comerciante (`/admin` / `/dashboard`).
- Redes sociales y soporte oficial por WhatsApp.

---

## 4. Arquitectura de Enrutamiento y Navegación

Para garantizar una experiencia fluida:
1. **Ruta `/`**: Carga el nuevo componente `WelcomeLanding.jsx` (Página de Bienvenida DoorDash).
2. **Ruta `/explorar` (o `/app`)**: Carga el feed social y directorio interactivo (`MarketplaceDirectory.jsx`).
3. **Persistencia y Acceso Rápido**:
   - Cuando un usuario pulsa **"Abrir App"**, **"Explorar"** o hace una búsqueda, el sistema lo lleva fluidamente a `/explorar`.
   - Si un cliente ya tiene una sesión iniciada con su cuenta Google/Email, puede tener una barra superior en la landing que le diga *"Hola, [Nombre] • Volver a mi feed"*.

---

## 5. Fases de Ejecución

- [ ] **Fase 1**: Crear el componente `src/modules/ecommerce/pages/WelcomeLanding.jsx` con diseño estético prémium, mobile-first y adaptativo a pantallas grandes.
- [ ] **Fase 2**: Integrar los tres pilares de servicio (Repartidores, Comercios, Clientes) con sus respectivos enlaces y modales.
- [ ] **Fase 3**: Configurar las rutas en `src/modules/ecommerce/EcommerceRouter.jsx` conectando la Landing con el Feed (`/explorar`).
- [ ] **Fase 4**: Pruebas de responsividad, verificación visual en navegador y despliegue a producción en `axonmarket.vip`.
