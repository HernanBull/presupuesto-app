# Módulo: E-Commerce
**Descripción:** Módulo masivo para la gestión de la tienda online, abarcando desde la vista pública del cliente (storefront) hasta la administración interna de productos, pedidos e inventario.

## 🏗️ Arquitectura y Archivos Clave
- `EcommerceRouter.jsx`: Define todas las sub-rutas del e-commerce. Diferencia entre rutas públicas (`live`, `picking`) y rutas protegidas bajo el `EcommerceLayout`.
- `EcommerceLayout.jsx`: Wrapper principal para el panel de administración del e-commerce.
- `pages/PublicStore.jsx`: La tienda pública visible por los clientes (Storefront).
- `pages/OrdersManager.jsx`: Gestión y seguimiento de órdenes de clientes.
- `pages/ProductsManager.jsx` & `pages/InventoryManager.jsx`: CRUD de productos y control de stock.
- `pages/ProductStudio.jsx`: Creador/Editor avanzado de productos con pantalla dividida y pre-visualización en vivo simulando el escaparate de la tienda pública. Incluye campos dinámicos para ofertas y descuentos.
- `pages/StorefrontSettings.jsx` & `pages/StoreSettings.jsx`: Configuración visual y operativa de la tienda.
- `components/StorePreview.jsx`: Componente puro altamente escalable encargado de renderizar la vitrina y previsualización de la tienda utilizando datos reales del backend, con badges de estado para administradores.
- `pages/OrderPreparation.jsx`: Pantalla para el picking y preparación física de pedidos.
- `pages/EcommerceDashboard.jsx` & `pages/AnalyticsManager.jsx`: Vistas avanzadas de analítica y KPIs. Incluyen filtros dinámicos de fechas (`7d, 30d, year`), cálculo de crecimiento porcentual y métricas avanzadas como Ticket Promedio (AOV). Uso de `recharts` con diseños fluidos (AreaChart con gradientes) para una estética profesional.

## ⚙️ Lógica Principal y Flujo de Datos
- **Patrón:** Dashboard administrativo modularizado (Analytics, Productos, Órdenes, Reseñas, Promociones).
- **Flujo de Usuario Público:** Los usuarios interactúan en `PublicStore`, generan órdenes que se procesan en `OrdersManager` y finalmente pasan a `OrderPreparation`.
- **Integración con Base de Datos:** Las órdenes (`ecommerce_orders_v2`) se manejan vía SQLite (`server/index.js`), permitiendo persistencia y sincronización real entre `OrdersManager` y `OrderPreparation`.
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
