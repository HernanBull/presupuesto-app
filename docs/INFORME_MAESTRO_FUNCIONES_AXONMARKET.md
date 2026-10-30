# 📊 Informe Maestro de Funcionalidades y Capacidades de AxonMarket
**Versión:** 2.0 Cloud Architecture  
**Propósito:** Resumen ejecutivo y técnico de todas las herramientas, módulos y flujos desarrollados para comerciantes y clientes finales.

---

## 🧭 1. Resumen Ejecutivo de la Plataforma
**AxonMarket** es un ecosistema comercial y logístico híbrido (Web + PWA + Desktop POS Sync) diseñado para que comerciantes, restaurantes, tiendas de víveres y distribuidores operen su vitrina virtual con **0% de comisiones por venta**, pagos directos a cuenta bancaria (Pago Móvil / Zelle / Efectivo) y sincronización con punto de venta e inventario en tiempo real.

---

## 🏛️ 2. Módulos del Comerciante (Admin & Operaciones)

### 2.1. Gestión de Inventario y Productos ([`ProductsManager.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/ProductsManager.jsx) / [`ProductStudio.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/ProductStudio.jsx) / [`UnifiedProductForm.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/components/UnifiedProductForm.jsx))
- **Control de Catálogo Integral:** Creación, edición, categorización, precios en USD/Bs., control de stock en anaquel y stock vitrina digital.
- **Soporte Multi-Imagen Profesional ([`MultiImageUploader.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/components/MultiImageUploader.jsx)):** Subida múltiple simultánea (Drag & Drop), selección de foto de portada con un clic, reordenamiento dinámico y sincronización en la nube (Supabase Storage).
- **Importador Masivo:** Carga inteligente mediante archivos Excel / CSV compatible con formatos a2, Saint y Profit.
- **Detalles Operativos Avanzados:** Registro de número de lote, fecha de vencimiento, proveedor, punto de reorden mínimo y cálculo dinámico de margen de ganancia comercial.

### 2.2. Arma Tu Combo y Paquetes ([`ComboBuilderModal.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/components/ComboBuilderModal.jsx))
- **Agrupador Inteligente de Artículos:** Permite crear combos reuniendo múltiples productos del inventario con cantidades y precios personalizados.
- **Cálculo Automático de Ahorro:** Muestra en tiempo real la suma regular, el valor con descuento y el porcentaje de beneficio para el cliente (ej. *20% OFF*).
- **Galería Exclusiva de Combos:** Carga de fotos preparadas de la presentación del combo.

### 2.3. Gestor de Ofertas Flash y Marketing ([`OffersManager.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/OffersManager.jsx))
- **Descuentos Dinámicos:** Presets rápidos (-10%, -15%, -20%, -30%, -50%) o precios específicos.
- **Mecanismos Anti-Acaparamiento:** Límite máximo de compra por cliente/pedido.
- **Vigencia Temporal:** Configuración de ofertas flash de 24 horas, fin de semana o fecha/hora personalizada.
- **Badges Promocionales:** Etiquetas destacadas (*🔥 Oferta Flash, ⚡ Liquidación, 🏷️ Precio Especial*).

### 2.4. Gestión de Pedidos y Despacho ([`OrdersManager.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/OrdersManager.jsx) / [`OrderPreparation.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/OrderPreparation.jsx))
- **Monitor Kanban / Lista de Estados:** Recepción, En Espera, Confirmado, En Preparación, Despachado, Entregado y Cancelado.
- **Verificación de Pagos Instantánea:** Visor integrado de capturas de comprobante de Pago Móvil o Zelle con validación rápida.
- **Modo Preparación / Cocina (KDS):** Interfaz táctil optimizada para que el equipo de embalaje o cocina marque artículos listos con feedback visual y sonoro.

### 2.5. Social Feed, Estados e Historias ([`MerchantSocialFeedPage.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/MerchantSocialFeedPage.jsx) / [`MerchantStatusViewerModal.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/components/MerchantStatusViewerModal.jsx))
- **Historias de la Tienda (Estilo WhatsApp/Instagram):** Publicación de fotos y videos efímeros de 24 horas con visor inmersivo a pantalla completa, barra de progreso y botón de acción directo al catálogo.
- **Anillo de Estados Interactivo:** Borde anaranjado degradado para estados no vistos y gris sutil para vistos en el avatar de la tienda.
- **Muro Social y Comentarios:** Publicación de noticias, promociones en video y recepción de comentarios y "me gusta" de clientes.

### 2.6. Asistente Financiero & Analítica ([`AnalyticsManager.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/AnalyticsManager.jsx) / [`CFOAssistantWizard.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/components/CFOAssistantWizard.jsx))
- Métricas en tiempo real de volumen de ventas, ticket promedio, clientes recurrentes y productos más vendidos.
- Asistente tipo CFO para estimación de rentabilidad y consejos de crecimiento comercial.

### 2.7. Configuración de Tienda y Carrito ([`StoreProfileManager.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/StoreProfileManager.jsx) / [`CartSettings.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/CartSettings.jsx))
- Personalización de Logo, Portada, Razón Social, RIF, Teléfonos, Redes Sociales y Ubicación GPS.
- Configuración de métodos de pago (Cuentas bancarias de Pago Móvil, Zelle, Efectivo en tienda).
- Parámetros de envío: Delivery con tarifa fija, cálculo por distancia o retiro en local (Pick-up).

---

## 🛍️ 3. Experiencia del Cliente / Tienda Pública ([`PublicStore.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/PublicStore.jsx))

### 3.1. Navegación y Catálogo Interactivo
- **Catálogo Rápido con Filtros:** Por categorías, buscador por nombre/código y tabs de promociones y combos.
- **Modal de Detalle de Producto:**
  - **Carrusel Swipeable Táctil:** Con deslizamiento suave en móvil, indicadores tipo puntos (dots), flechas y tira de miniaturas activas.
  - Desglose visual de productos incluidos en combos.
  - Contador de stock en vitrina en tiempo real (*"¡Solo quedan 3!"*).

### 3.2. Carrito y Checkout Transparente
- Cálculo automático de subtotal, conversión de moneda a tasa oficial del día y costo de delivery.
- Subida directa de comprobante de pago para aprobación del comerciante.
- Envío automático de resumen y seguimiento por WhatsApp con enlace directo.

### 3.3. Autenticación y Perfil del Cliente
- Registro ultra-rápido por Correo Electrónico o **Google OAuth (Un Clic)**.
- **Medidor Dinámico de Seguridad:** Indicador en tiempo real (*Débil, Aceptable, Segura*) sin listas de requisitos invasivas.
- Perfil con libreta de direcciones guardadas, historial de pedidos con comprobantes y seguimiento en tiempo real.

---

## 🗺️ 4. Directorio & Mapa de Exploración ([`MarketplaceDirectory.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/MarketplaceDirectory.jsx) / [`StoreScannerMap.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/StoreScannerMap.jsx))
- **Directorio de Comercios:** Buscador geolocalizado de tiendas aliadas agrupadas por rubro (Restaurantes, Víveres, Farmacia, Repuestos, Tecnología).
- **Mapa Interactivo con Leaflet:** Visualización de pines de comercios cercanos, cálculo de distancia y apertura directa de la vitrina correspondiente.
- **Soporte Offline:** Caché de datos para consultar comercios y pedidos incluso con interrupciones temporales de conexión.

---

## ⚡ 5. Arquitectura Técnica y Seguridad
- **Frontend:** React 19 + Vite + Tailwind CSS + Framer Motion.
- **Backend & Base de Datos:** Supabase (PostgreSQL, Storage Buckets, Realtime Subscriptions, Row Level Security).
- **Compatibilidad Híbrida POS:** El campo `image_url` y los arrays `images` / `metadata` coexisten asegurando sincronización con el Punto de Venta AxonPOS de escritorio sin bloqueos de esquema.
- **PWA (Progressive Web App):** Instalable en teléfonos Android e iOS como una app nativa con Service Workers para carga instantánea.
