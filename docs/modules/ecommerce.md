# Módulo: E-Commerce
**Descripción:** Módulo masivo para la gestión de la tienda online, abarcando desde la vista pública del cliente (storefront) hasta la administración interna de productos, pedidos e inventario.

## 🏗️ Arquitectura y Archivos Clave
- `EcommerceRouter.jsx`: Define todas las sub-rutas del e-commerce. Diferencia entre rutas públicas (`live`, `picking`) y rutas protegidas bajo el `EcommerceLayout`.
- `EcommerceLayout.jsx`: Wrapper principal para el panel de administración del e-commerce.
- `../pages/RegisterWizard.jsx`: Asistente de registro inicial del comercio (Expediente del Comerciante). Define qué submódulos (Delivery, Vencimientos, Agenda) se activan en la tienda.
- `pages/PublicStore.jsx`: La tienda pública visible por los clientes (Storefront).
- `pages/OrdersManager.jsx`: Gestión y seguimiento de órdenes de clientes.
- `pages/ProductsManager.jsx` & `pages/InventoryManager.jsx`: CRUD de productos y control de stock.
- `pages/ProductStudio.jsx`: Creador/Editor avanzado de productos con pantalla dividida. Soporta manejo de lotes (`batchNumber`) y fechas de caducidad (`expirationDate`).
- `pages/StorefrontSettings.jsx` & `pages/StoreSettings.jsx`: Configuración visual y operativa de la tienda.
- `components/StorePreview.jsx`: Componente puro altamente escalable encargado de renderizar la vitrina y previsualización de la tienda.
- `pages/OrderPreparation.jsx`: Pantalla para el picking y preparación física de pedidos.
- `pages/EcommerceDashboard.jsx` & `pages/AnalyticsManager.jsx`: Vistas avanzadas de analítica y KPIs. Incluyen filtros dinámicos y métricas avanzadas (AOV).

## 🧩 Arquitectura de Submódulos (Nichos)
Para evitar que el código principal se contamine con reglas de negocios específicos (ej. solicitar récipe para farmacias o pesos fraccionarios para víveres), el E-commerce utiliza una arquitectura de Plugins. 
Revisar la documentación completa en: [Arquitectura de Submódulos de E-commerce](file:///f:/Presupuesto/docs/modules/ecommerce-niches.md).


## ⚙️ Lógica Principal y Flujo de Datos
- **Patrón:** Dashboard administrativo modularizado (Analytics, Productos, Órdenes, Reseñas, Promociones).
- **Flujo de Usuario Público:** Los usuarios interactúan en `PublicStore`, generan órdenes que se procesan en `OrdersManager` y finalmente pasan a `OrderPreparation`.
- **Integración con Base de Datos:** Las órdenes (`ecommerce_orders_v2`) se manejan vía SQLite (`server/index.js`), permitiendo persistencia y soporte para funcionalidades avanzadas (reservas, números de mesa, tipo de orden). Sincronización real entre `OrdersManager` y `OrderPreparation`.
- **Flujo de Validación y Picking:** Al aprobarse un pago en `OrdersManager`, el sistema cambia la orden a "Preparando" automáticamente y aparece en la lista de `OrderPreparation`.
- **Integración Directa con Delivery (Telegram):** Al terminar la preparación de un pedido en `OrderPreparation` y marcarlo para despacho, la App de Picking actualiza el estado a "Enviado" y dispara **directamente** la petición al Bot de Telegram (`sendDeliveryRequest`). Esto asegura la notificación al repartidor sin depender de que el panel de control esté abierto. Al marcarse como "Entregado" en el bot, `OrdersManager` intercepta el evento global y actualiza la tarjeta a la columna "Entregados" en tiempo real.

## 🧠 Manejo del Estado
- Estado global a nivel de Layout para `theme`.
- Componentes altamente granulares orientados a CRUD interactuando directamente con la base de datos en Supabase.

## 🔌 Dependencias y Llamadas Externas (APIs)
- **Módulos internos:** Probablemente cruce datos con estructuras del módulo CRM (clientes) o WMS/ERP (inventario) a nivel de base de datos.

## 🧩 Interfaces / Estructuras de Datos Clave
- Órdenes (Orders), Productos (Products) y Reseñas (Reviews) son las entidades principales que orquestan este módulo. (Nota: La gestión de Clientes se ha delegado al módulo CRM externo al e-commerce).
- **Bitácora Inteligente (SQLite Base):** Se implementó un registro de ventas local utilizando las tablas `ecommerce_products` (con campos de `is_offer` y `discount_price` para vitrina dinámica), `ecommerce_sales` y `ecommerce_sale_items` en `server/db.js`. Estas alimentan los endpoints de analítica (`/api/ecommerce/analytics/*`) para generar KPIs y gráficos dinámicos de ventas diarias y rotación de stock.

## 📜 Historial de Cambios / Auditoría

- **Fecha y Hora:** 2026-09-08 15:46:00
- **Versión:** 1.0.0
- **Descripción:** Implementación completa del panel de administración del E-commerce y el constructor del Storefront (Vitrina).

- **Fecha y Hora:** 2026-09-09 09:40:00
- **Versión:** 1.5.0
- **Descripción:** Creación y sincronización de `OrderPreparation.jsx` (pantalla de picking) con `OrdersManager.jsx`. Integración de la vista pública de la tienda (`PublicStore.jsx`).

- **Fecha y Hora:** 2026-09-14 17:30:00
- **Versión:** 1.6.0
- **Descripción:** 
  - (Enfoque MVP) Se limpió el listado de categorías de registro de comerciantes (`BUSINESS_TYPES` en `src/config/businessTypes.js`) para mostrar exclusivamente las 3 opciones del MVP: Víveres, Comida Rápida y Fruterías.
  - (Corrección Arquitectónica) Se solucionó un problema de ruteo al intentar salir de la tienda desde el panel de e-commerce (`EcommerceLayout.jsx`). Se sustituyó `navigate('/')` por `window.location.href = '/'` para asegurar una recarga completa que permita escapar del `<BrowserRouter>` aislado utilizado por el módulo de e-commerce y renderizar correctamente la Landing Page.

- **Fecha y Hora:** 2026-09-14 17:45:00
- **Versión:** 1.7.0
- **Descripción:** 
  - (Corrección UI de Productos) Se eliminaron las categorías estáticas (Ropa, Electrónica) en `ProductStudio.jsx`. Ahora el campo de categoría lee dinámicamente el listado por defecto del `BUSINESS_TYPES` según el nicho activo del usuario.
  - (Ajuste MVP Víveres) A petición del cliente, se eliminó el campo "Código de Barras (SKU)" del submódulo de víveres (`viveres/index.jsx`), ya que de momento no se integrará un sistema POS.

- **Fecha y Hora:** 2026-09-14 17:55:00
- **Versión:** 2.0.0
- **Descripción:** (Refactorización a Monolito) Se descartó la arquitectura de submódulos/plugins para los nichos. Todas las extensiones de UI (campos extra para Víveres, Comida Rápida, Fruterías) fueron consolidadas directamente dentro del componente principal `ProductStudio.jsx`, ocultándose mediante renderizado condicional simple. La carpeta de nichos fue eliminada.

- **Fecha y Hora:** 2026-09-14 18:45:00
- **Versión:** 3.0.0
- **Descripción:** (Expansión Nivel ERP para Inventario) Se transformó el `InventoryManager.jsx` y `ProductStudio.jsx` para soportar características de logística avanzada para comercios físicos:
  - **Fase 1 y 2 (Operativa):** Registro de mermas y vencimientos, Puntos de Reorden (Stock Mínimo) automáticos para generación de listas de compra por proveedor, y KARDEX completo (historial inmutable de movimientos). Inclusión del constructor de "Recetas/Ingredientes" en `ProductStudio.jsx` para nichos de Comida Rápida.
  - **Fase 3 (Finanzas):** Implementación del cálculo automático de Costo Promedio Ponderado (CPP) al ingresar nueva mercancía, y herramienta de Auditoría Ciega para ajustes de conteo físico real vs. sistema.
  - **Fase 4 (Escalamiento):** Dashboard de valorización de capital invertido y ganancia potencial. Soporte para transferencias Multialmacén (Depósito a Vitrina). Alertas de Sobre-Stock (`maxStock`) para proteger flujo de caja, y creador de Combos Promocionales/Kits (`isCombo`) que descuentan stock de componentes enlazados automáticamente.

- **Fecha y Hora:** 2026-09-14 19:15:00
- **Versión:** 3.1.0
- **Descripción:** (Ajustes Ergonómicos por Nicho) Rediseño de la página `StoreSettings.jsx` para ofrecer botones de "Configuración Rápida" preestablecidos (Frutería, Minimarket, Comida Rápida). Las características ERP masivas añadidas en la v3.0.0 (Mermas, Multialmacén, KARDEX, CPP, etc.) se ocultan por defecto en `InventoryManager.jsx` y `ProductStudio.jsx`, mostrándose únicamente cuando el comerciante activa el switch correspondiente en los ajustes de su nicho, mejorando radicalmente la UX inicial.

- **Fecha y Hora:** 2026-09-14 20:45:00
- **Versión:** 4.0.0
- **Descripción:** (Autenticación Front-End B2C) Integración del Portal de Clientes.
  - Creación del flujo de "Inicio de Sesión", "Registro" y "Panel de Perfil" para el consumidor final directamente en la interfaz de la tienda virtual (`PublicStore.jsx`).
  - Solicitud de Documento de Identidad (Cédula/RUT/DNI), Teléfono y Dirección de Envío para facilitar el delivery.
  - Conexión global con la `LandingPage.jsx` a través de un Modal animado de Roles que permite al visitante elegir si es "Cliente" (redireccionando a la tienda `?page=register`) o "Comerciante" (redireccionando al Wizard).

- **Fecha y Hora:** 2026-09-15 10:00:00
- **Versión:** 5.0.0
- **Descripción:** (Arquitectura Multi-Tienda / Multi-Tenant B2B2C) 
  - Adaptación de la base de datos y endpoints de productos y pedidos para aislar los datos por `workspace_id`.
  - Introducción del `store_slug` a nivel de workspace para generar URLs dinámicas individuales y profesionales por comercio (ej: `/ecommerce/live/mi-tiendita`).
  - Implementación del sistema de clientes de Identidad Global (SSO), permitiendo que un comprador final se registre una sola vez en la plataforma y pueda comprar en cualquier comercio suscrito utilizando la misma sesión, billetera o perfil.
  - Habilitación 100% funcional del carrito de compras y Checkout en `PublicStore.jsx` exigiendo que el usuario tenga sesión y datos de perfil completos antes de guardar la orden.

- **Fecha y Hora:** 2026-09-15 11:30:00
- **Versión:** 5.5.0
- **Descripción:** (Hub del Cliente y Fidelización - Fase 1 y 2)
  - Evolución del Perfil del Cliente (`CustomerProfile.jsx`) a un verdadero panel de control para el comprador final.
  - Implementación de **Historial de Pedidos** consultando el backend para visualizar el estado de compras pasadas.
  - Implementación de **Tiendas Favoritas** y **Productos Guardados (Wishlist)** integrando el botón de "corazón" directamente en las tarjetas de comercios (`MarketplaceDirectory.jsx`) y productos individuales (`PublicStore.jsx`).
  - Integración de **Libreta de Múltiples Direcciones** (Casa, Oficina) gestionable desde el perfil.
  - Implementación de modal de **Reseñas y Calificaciones** de 5 estrellas para órdenes completadas, fomentando el Social Proof.

- **Fecha y Hora:** 2026-09-16 10:00:00
- **Versión:** 6.0.0
- **Descripción:** (Refactorización de Storefront y Centralización Auth AxonMarket)
  - Centralización completa del sistema de autenticación de clientes. Se eliminaron las vistas redundantes de Login/Registro/Perfil dentro de las tiendas individuales (`PublicStore.jsx`).
  - Implementación de un Auth Gate (modal de autenticación) obligatorio y de diseño premium para visitar tiendas desde el directorio, con redirección automática (`pendingStoreSlug`).
  - Implementación del Modal de Detalles de Producto en `PublicStore.jsx`, permitiendo visualizar descripciones, precios reales, stock dinámico, selector de cantidades y agregar al carrito sin recargar la página.
  - Saneamiento del Navbar de las tiendas públicas: se eliminó el botón de usuario local y se actualizó la estética de la barra BCV para coincidir con la identidad visual global (Índigo/Blanco) de AxonMarket.

- **Fecha y Hora:** 2026-09-16 13:30:00
- **Versión:** 7.0.0
- **Descripción:** (Refactorización B2B - Formulario Unificado de Productos)
  - Se eliminó el formulario fragmentado basado en nichos dentro de `ProductStudio.jsx`.
  - Se creó el componente `UnifiedProductForm.jsx` para centralizar la creación y edición de productos, con una estética B2B minimalista (glassmorphism/ámbar).
  - Integración fluida con `InventoryManager.jsx`, unificando el botón de "Registrar Entrada" y el botón de edición para que abran directamente el `ProductStudio.jsx`.
  - Migración de la base de datos `ecommerce_products`: se añadió una columna dinámica `metadata` (JSONB) para alojar todos los campos adicionales (marca, proveedor, lote, etc.) sin depender de columnas estáticas por rubro.
  - Se ajustó el campo de "Categoría" a un select estandarizado con categorías de producto reales de Venezuela, abandonando la clasificación rígida por tipo de negocio.

- **Fecha y Hora:** 2026-09-17 13:30:00
- **Versión:** 7.1.0
- **Descripción:** (Ofertas Flash y Lógica de Horarios B2C)
  - Creación del panel `OffersManager.jsx` (Ofertas Flash) que permite al comerciante visualizar su inventario y encender/apagar ofertas de productos rápidamente con precios de descuento y actualización instantánea en la vitrina.
  - Habilitación del nuevo endpoint en el backend (`PUT /api/ecommerce/products/:id/offer`) dedicado exclusivamente a las conversiones de ofertas.
  - Refuerzo en la lógica de "Horarios de Atención" (`storeClosed`) dentro de la vitrina `PublicStore.jsx`. Se integró un indicador visual (Abierto/Cerrado) en la cabecera (Navbar) de la tienda.
  - Implementación de bloqueos inteligentes de compra: Si el comercio está cerrado, los botones de "Agregar al carrito" en todas las grillas (Ofertas, Catálogo) y en la ventana modal se deshabilitan y muestran el estado "Cerrado", permitiendo a los clientes explorar el catálogo como una vitrina sin generar transacciones fuera de horario.

- **Fecha y Hora:** 2026-09-17 13:40:00
- **Versión:** 7.2.0
- **Descripción:** (Social Proof - Sistema de Reseñas)
  - Activación full-stack del panel `ReviewsManager.jsx` conectándolo a la nueva tabla `ecommerce_reviews` de la base de datos.
  - Implementación del formulario interactivo de calificación (1 a 5 estrellas) y comentarios en el modal de detalles del producto de `PublicStore.jsx`.
  - Habilitación del flujo de moderación B2B2C: Las reseñas creadas por los clientes nacen en estado "Pendiente". El comerciante puede evaluarlas desde su panel, decidiendo Aprobarlas (para que se muestren en la tienda pública), Rechazarlas (para ocultarlas) o emitir una Respuesta Oficial de la Tienda.

- **Fecha y Hora:** 2026-09-17 13:50:00
- **Versión:** 7.2.1
- **Descripción:** (Social Proof en Grillas - Estrellas en Tarjetas de Producto)
  - Modificación del endpoint `GET /api/ecommerce/products` para inyectar dinámicamente el promedio de calificación (`avg_rating`) y el conteo de reseñas aprobadas (`review_count`) directamente desde la base de datos mediante un `LEFT JOIN` a la tabla `ecommerce_reviews`.
  - Integración del componente visual de estrellas y cantidad de reseñas directamente en la vista principal de la tienda (`PublicStore.jsx`). Las tarjetas de Novedades, Ofertas Flash y Catálogo General ahora muestran la calificación a simple vista, fomentando la confianza del usuario desde el primer contacto visual.

- **Fecha y Hora:** 2026-09-17 13:58:00
- **Versión:** 7.3.0
- **Descripción:** (Motor de Analítica Real Integrado)
  - Creación de la tabla `ecommerce_tracking` en la base de datos para almacenar eventos de comportamiento de los clientes.
  - Creación del endpoint `POST /api/ecommerce/track` para ingesta de eventos (visitas, carritos, inicios de pago).
  - Creación de endpoints de lectura para alimentar las gráficas: `/api/ecommerce/analytics/funnel` y `/api/ecommerce/analytics/abandoned-carts`.
  - Inyección de "espías" invisibles (trackers) en `PublicStore.jsx` para reportar cada vez que un cliente abre la tienda, añade productos al carrito o inicia un pago.
  - Actualización del panel `AnalyticsManager.jsx` para reemplazar todas las simulaciones de la maqueta por conexiones API directas a la base de datos real. El embudo de conversión, carritos abandonados y fuentes de tráfico ahora reflejan la actividad verídica de la tienda seleccionada.

- **Fecha y Hora:** 2026-09-18 14:00:00
- **Versión:** 8.0.0
- **Descripción:** (Sistema Super Admin y Control B2B)
  - Creación del Módulo Super Admin (`SuperAdminDashboard.jsx`) para la gestión integral de todas las tiendas creadas en la plataforma y clientes globales.
  - Implementación del botón de Suspensión de Tiendas, permitiendo inhabilitar comercios por falta de pago. Las tiendas suspendidas muestran una pantalla de "Tienda Suspendida" en su acceso público y desaparecen del Marketplace.
  - Implementación del Lente de Inspección (Directorio de Contacto), que extrae dinámicamente la información de los comercios (Teléfono, Correo, Datos de Pago Móvil/Zelle configurados) para facilitar la cobranza manual por parte del dueño de la plataforma.

- **Fecha y Hora:** 2026-09-18 14:30:00
- **Versión:** 8.1.0
- **Descripción:** (Embudo B2B SaaS y Landing de Precios)
  - Diseño y desarrollo de la página `PricingPage.jsx` con estética premium oscura y presentación de 3 planes (Emprendedor, Pro, Élite).
  - Integración de estrategia de "Free Trial" (14 días gratis) con redirección al modal de creación de cuentas (Cero Fricción) para escalar la captación de nuevos comercios antes de exigir el pago.
  - Redirección del botón global "Vender" hacia este nuevo embudo.
  - Restricción de visibilidad del Carrito de Compras en las landing pages públicas; ahora solo es visible si un cliente B2C ha iniciado sesión.

- **Fecha y Hora:** 2026-09-18 14:45:00
- **Versión:** 8.2.0
- **Descripción:** (Integración O2O - Online to Offline y Geolocalización)
  - Creación de `StoreLocationManager.jsx` dentro del panel de comerciantes, usando `navigator.geolocation` y React-Leaflet (OpenStreetMap) para fijar coordenadas GPS precisas del local sin costos de API.
  - Inserción del botón inteligente "📍 Cómo Llegar" en la vista de cliente (`PublicStore.jsx`). Este enlaza directamente a la URL de navegación de la App Nativa de Google Maps, trazando la ruta desde el dispositivo del cliente hasta la tienda física.

- **Fecha y Hora:** 2026-09-19 12:00:00
- **Versión:** 9.0.0
- **Descripción:** (Animación Premium de Carrito y CTA Rediseñado)
  - Se eliminó el botón genérico de `+` de las tarjetas de producto en la vitrina pública (`PublicStore.jsx`) y se reemplazó por un botón CTA de alta conversión (icono de carrito de compras con gradiente y micro-animación `scale`), adoptando las mejores prácticas de UX de e-commerce.
  - Se implementó una animación "Flying Cart" premium: al hacer clic en el botón de agregar, una miniatura de la imagen del producto despega visualmente y vuela hacia el ícono del carrito en la barra de navegación.
  - La animación se integró tanto en la sección de **Novedades** (Home), **Ofertas Especiales** y la vista **Catálogo General**, usando el sistema de referencia de IDs de imagen (`product-img-{id}` y `modal-img-{id}`) para detectar las coordenadas de origen de cada producto.

- **Fecha y Hora:** 2026-09-19 12:30:00
- **Versión:** 9.1.0
- **Descripción:** (Sistema de Alertas de Stock B2C + Notificaciones B2B en Tiempo Real)
  - **B2C - Alerta Visual Premium:** Se eliminó por completo el uso del `window.alert()` nativo del navegador. Se implementó un componente de notificación tipo "Toast" animado (Glassmorphism + Framer Motion) que aparece desde la parte superior de la pantalla cuando un cliente intenta agregar al carrito más unidades de las disponibles en vitrina. Se auto-destruye en 4 segundos. Componente: `stockAlert` state dentro de `PublicStore.jsx`.
  - **B2B - Tabla de Notificaciones:** Se añadió la tabla `ecommerce_notifications` a `server/db.js` con los campos: `id`, `workspace_id`, `type`, `message`, `product_id`, `customer_id`, `is_read`, `created_at`.
  - **B2B - Endpoints REST:** Se crearon 3 nuevos endpoints en `server/index.js`:
    - `GET /api/ecommerce/notifications/:workspaceId` — Lee historial de alertas.
    - `POST /api/ecommerce/notifications` — Registra nueva alerta (disparado silenciosamente desde `PublicStore.jsx` cada vez que hay una intención de compra fallida por falta de stock).
    - `PUT /api/ecommerce/notifications/:id/read` — Marca como leída una alerta específica.
  - **B2B - Campana en Panel:** Se añadió un ícono de campana 🔔 (componente `Bell` de lucide-react) en el header del `EcommerceLayout.jsx`, tanto en la versión de escritorio como en la versión mobile. Incluye un punto rojo pulsante (`animate-pulse`) cuando hay notificaciones sin leer.
  - **B2B - Polling:** El layout realiza un polling automático cada 15 segundos al endpoint de notificaciones para mantener el contador actualizado sin necesidad de recargar la página.
  - **B2B - Dropdown de Notificaciones:** Al hacer clic en la campana, se despliega un panel flotante (`dropdown`) con las últimas 50 notificaciones. Cada ítem muestra: tipo (badge coloreado), mensaje, fecha y botón para marcar como leída. Al hacer clic en una alerta con `product_id`, el comerciante es redirigido automáticamente al `ProductStudio` del producto afectado y la alerta se marca como leída.

- **Fecha y Hora:** 2026-09-19 12:33:00
- **Versión:** 9.2.0
- **Descripción:** (Módulo Dedicado de Gestión de Notificaciones)
  - Creación de la página `NotificationsManager.jsx` como módulo completo dentro del panel de administración B2B.
  - **Ruta:** `/ecommerce/notifications` (registrada en `EcommerceRouter.jsx`).
  - **Navegación:** Ítem "Notificaciones" añadido al menú lateral (`navItems`) en `EcommerceLayout.jsx` con el ícono `Bell`.
  - **Funcionalidades:**
    - Buscador en tiempo real que filtra el historial por contenido del mensaje.
    - Contador de alertas sin leer (badge rojo).
    - Lista de todas las notificaciones con badges de tipo (`Falta de Stock` vs `Sistema`), fecha/hora, mensaje completo.
    - Botón "Marcar Leída" individual por notificación.
    - Botón "Reponer" que lleva directamente al `ProductStudio` del producto, marcando automáticamente como leída la alerta seleccionada.
    - Diseño escalable: el nombre del módulo es genérico ("Notificaciones") para poder albergar en el futuro otros tipos de avisos (carritos abandonados, devoluciones, nuevas reseñas, etc.).
  - **Acceso Rápido:** Se añadió un botón "Ver todas las notificaciones" en la parte inferior del dropdown flotante de la campana, tanto en desktop como en mobile.

- **Fecha y Hora:** 2026-09-19 18:32:00
- **Versión:** 9.3.0
- **Descripción:** (Funciones Avanzadas de Inventario por Defecto)
  - Se eliminó la sección "Módulos de Inventario Avanzado" y "Ajustes finos" en `StoreSettings.jsx`.
  - Las funciones de control de mermas, auditoría de carga, combos de receta, punto de reorden, alerta sobrestock, transferencia multi-almacén y control de caducidad están habilitadas de forma global y permanente en `InventoryManager.jsx` por defecto para todas las tiendas, sin depender de un estado de configuración (`ecommerce_inventory_settings`).
