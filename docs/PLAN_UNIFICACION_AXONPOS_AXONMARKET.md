# 🚀 Plan Maestro de Unificación: AxonPOS ↔ AxonMarket
**Arquitectura Unificada de Comercio: Punto de Venta Híbrido, E-Commerce y Gestión Operativa**  
**Versión:** 3.0 Master Integration  
**Fecha:** Octubre 2026  
**Objetivo:** Trasladar y unificar la lógica de negocio y capacidades operativas de **AxonPOS** dentro de **AxonMarket**, preservando la estética, navegación y estructura moderna de **Commercy**.

---

## 🧭 1. Visión y Propósito Estratégico

Actualmente coexisten dos aplicaciones con propósitos complementarios:
1. **AxonPOS:** Sistema de Punto de Venta (POS) de alta velocidad, optimizado para operaciones de mostrador en tiempo real, control de caja (turnos X/Z), cuentas por cobrar (fiado), facturación fiscal multimoneda (USD/Bs) y soporte de periféricos (balanza, lector de barras, impresora térmica).
2. **AxonMarket:** Plataforma web y móvil de vitrina virtual, catálogo en línea con 0% de comisiones, pedidos con delivery/retiro, chat directo con clientes, marketing, ofertas flash y panel de administración con diseño **Commercy**.

### El Objetivo de la Unificación:
Transformar a **AxonMarket** en un **Ecosistema Comercial Unificado** donde el comerciante no tenga que cambiar de sistema entre la venta física y la digital:
* **Inventario Único:** Lo que se vende en el mostrador descuenta inmediatamente el stock en la vitrina web.
* **Caja y Ventas Consolidadas:** El cierre de turno incluye tanto las ventas físicas (efectivo, punto de venta, pago móvil en tienda) como los pedidos web confirmados.
* **Experiencia de Usuario Commercy:** Toda la botonera, atajos y rapidez del POS se integran armónicamente en el layout de AxonMarket con la paleta anaranjada corporativa.

---

## 🏛️ 2. Matriz de Módulos y Funcionalidades a Portar

| Módulo Original de AxonPOS | Archivo Fuente en AxonPOS | Destino en AxonMarket | Estado y Descripción |
| :--- | :--- | :--- | :--- |
| **Terminal de Venta Rápida (POS)** | `src/components/PosWorkspace.tsx` + `CartSidebar.tsx` | `src/modules/ecommerce/pages/UnifiedPosPage.jsx` | Selector visual y buscador por código de barras, atajos de teclado, carrito rápido y cotizaciones. |
| **Cobro Multimoneda & Split Payment** | `src/components/CheckoutModal.tsx` | `src/modules/ecommerce/components/PosCheckoutModal.jsx` | Cobro dividido en Efectivo USD, Efectivo Bs, Pago Móvil, Tarjeta Débito/Crédito, Zelle, Binance Pay y Crédito. |
| **Caja, Turnos y Cierres X/Z** | `src/components/CashShiftModal.tsx` | `src/modules/ecommerce/pages/CashShiftManager.jsx` | Apertura con fondo inicial, arqueo ciego, retiros, ingresos y cuadre multimoneda. |
| **Cuentas por Cobrar (Crédito / Fiado)** | `src/components/CreditAccountsModal.tsx` | `src/modules/ecommerce/pages/CreditAccountsManager.jsx` | Control de saldos pendientes, límites de crédito por cliente, abonos multimoneda y comprobantes WhatsApp. |
| **Directorio de Clientes Comerciales** | `src/components/CustomerModal.tsx` | `src/modules/ecommerce/pages/CustomersManager.jsx` | Gestión de RIF, Cédula, dirección fiscal, teléfono y límite de crédito. |
| **Libro de Ventas Fiscal (SENIAT / IGTF)** | `src/components/FiscalSalesBookModal.tsx` | `src/modules/ecommerce/pages/FiscalReportManager.jsx` | Resumen fiscal mensual, desglose de base imponible, exento, 16% IVA y 3% IGTF. |
| **Control de Periféricos & Hardware** | `src/components/HardwareManagerModal.tsx` | `src/modules/ecommerce/pages/HardwareSettingsPage.jsx` | Conexión con impresoras térmicas ESC/POS (80mm/58mm), balanza de peso y escáner móvil WiFi. |
| **Escáner Móvil por Teléfono** | `src/components/MobileScannerModal.tsx` | `src/modules/ecommerce/pages/MobileScannerHub.jsx` | Lector de código de barras desde smartphone mediante SSE/WebSockets. |

---

## 🗄️ 3. Modelo de Datos Unificado (Supabase + Dexie Offline-First)

### 3.1. Tablas en la Nube (Supabase PostgreSQL)
1. **`pos_sales`:**
   * `id`: UUID (Primary Key)
   * `workspace_id`: UUID (Foreign Key a `workspaces`)
   * `shift_id`: UUID (Vínculo al turno de caja activo)
   * `invoice_number`: Texto (Correlativo interno o fiscal)
   * `customer_id`: UUID (Opcional, cliente registrado o mostrador genérico)
   * `customer_name`: Texto
   * `document_type`: Enum (`TICKET_NOTA`, `FACTURA_FISCAL`, `GUIA_DESPACHO`)
   * `subtotal_usd`, `tax_usd`, `total_usd`: Numérico
   * `exchange_rate_bcv`: Numérico (Tasa BCV del momento)
   * `total_ves`: Numérico
   * `payment_methods`: JSONB (Array de métodos: `{ method, amount_usd, amount_ves, reference }`)
   * `items`: JSONB (Detalle de productos facturados)
   * `status`: Texto (`COMPLETADA`, `ANULADA`, `EN_CREDITO`)
   * `created_at`: Timestamptz

2. **`pos_shifts` (Turnos de Caja):**
   * `id`: UUID
   * `workspace_id`: UUID
   * `cashier_name`: Texto
   * `opening_time`, `closing_time`: Timestamptz
   * `initial_cash_usd`, `initial_cash_ves`: Numérico
   * `declared_cash_usd`, `declared_cash_ves`: Numérico (Arqueo ciego)
   * `system_cash_usd`, `system_cash_ves`: Numérico (Cálculo del sistema)
   * `difference_usd`, `difference_ves`: Numérico (Faltante / Sobrante)
   * `status`: Texto (`ABIERTO`, `CERRADO`)

3. **`pos_credits` (Cuentas por Cobrar):**
   * `id`: UUID
   * `workspace_id`: UUID
   * `customer_id`: UUID
   * `sale_id`: UUID
   * `total_debt_usd`: Numérico
   * `remaining_balance_usd`: Numérico
   * `due_date`: Date
   * `status`: Texto (`PENDIENTE`, `PAGADO_TOTAL`, `VENCIDO`)

4. **`pos_credit_payments` (Abonos a deudas):**
   * `id`: UUID
   * `credit_id`: UUID
   * `amount_usd`, `amount_ves`: Numérico
   * `payment_method`: Texto
   * `reference`: Texto
   * `created_at`: Timestamptz

### 3.2. Estrategia Offline-First (Resiliencia ante caídas de Internet)
* Se mantiene el motor **Dexie / IndexedDB** en el navegador para que si el comercio pierde conexión a Internet:
  1. El cajero pueda seguir cobrando y emitiendo tickets en el POS localmente.
  2. Las ventas queden almacenadas en una cola local (`pending_sync_sales`).
  3. Al restablecerse la red, un Worker en segundo plano sincronice las ventas con Supabase y actualice el stock centralizado.

---

## 🎨 4. Integración en la Navegación y Estructura Commercy

El sidebar lateral de AxonMarket (con su paleta anaranjada `#ea580c`) incorpora los nuevos accesos del POS de forma natural:

```
┌──────────────────────────────────────────────┐
│ [🛒] axonmarket                              │
│                                              │
│ [🏢 Carlosvip / Profesional             ↗ ] │
│                                              │
│ [ 🔍 Buscar...                           ⌘K] │
├──────────────────────────────────────────────┤
│ 🚀 Puesta en marcha                     4/4 │
│ 🖥️ Punto de Venta (POS)              [POS] ∨ │  <-- NUEVO: Venta Rápida de Mostrador
│ 📊 Estadísticas                             │
│ 🛍️ Ventas & Pedidos                       ∨ │  <-- Unifica pedidos web y mostrador
│ 💵 Caja y Turnos                          ∨ │  <-- NUEVO: Apertura, Cierre X/Z
│ 📦 Inventario & Stock                     ∨ │  <-- Stock unificado depósito/vitrina
│ 🏷️ Precios & Combos                       ∨ │
│ 👥 Clientes & Créditos                    ∨ │  <-- NUEVO: Libro de fiados
│ 📦 Tareas & Picking                         │
│ 💳 Finanzas & Fiscal                      ∨ │  <-- NUEVO: Libro fiscal SENIAT
│ 🌐 Mis páginas web                        ↗ │
│ 📣 Red de ventas                          ∨ │
│ ⚡ Dropshipping                            ∨ │
├──────────────────────────────────────────────┤
│ ⚪ Prueba · 13 días                [Activar] │
│ ════════════════════════════════════════════ │
│ 🖨️ Hardware & Balanza                       │  <-- Periféricos
│ ⚙️ Configuración                             │
│                                              │
│ (C) Carlos (Admin · Carlosvip)        ⇅  ⎋   │
└──────────────────────────────────────────────┘
```

---

## ⚙️ 5. Fases de Ejecución del Plan de Unificación

### 🚩 Fase 1: Creación del Hub de Punto de Venta y Pantalla de Trabajo (`UnifiedPosPage.jsx`)
* **Acción:** Montar el módulo `/pos` con grid táctil de productos, lector de código de barras rápido, atajos de teclado (<kbd>F2</kbd> cobrar, <kbd>F4</kbd> buscar, <kbd>ESC</kbd> limpiar) y selector de cantidades.
* **Componentes clave:** Visor de totales multimoneda en vivo ($ USD y Bs al cambio oficial BCV).

### 🚩 Fase 2: Modal de Cobro Split Payment Multimoneda
* **Acción:** Integrar el modal de cobro (`PosCheckoutModal.jsx`) capaz de fraccionar una compra en múltiples formas de pago (ej. $20 en efectivo + 500 Bs por Pago Móvil + resto a crédito).
* **Salida:** Emisión de comprobante en ticket térmico e impacto inmediato en stock.

### 🚩 Fase 3: Módulo de Caja, Turnos y Cuadre de Efectivo
* **Acción:** Crear la vista `/shifts` para apertura de turno con fondo inicial, control de egresos (pagos a proveedores o adelantos) y arqueo de caja con reporte final para el dueño.

### 🚩 Fase 4: Módulo de Cuentas por Cobrar (Créditos / Fiados)
* **Acción:** Desarrollar `/credits` para listar qué clientes deben, cuánto deben en divisa y permitir registrar abonos con generación de recibos digitales listos para enviar por WhatsApp.

### 🚩 Fase 5: Conectores de Hardware & Convivencia Offline
* **Acción:** Habilitar el módulo `/hardware` para configurar la impresora de tickets por USB/Red y balanza electrónica para productos a granel (carnicería, charcutería, víveres).

---

## 🛡️ 6. Beneficios Inmediatos para el Comerciante

1. **Cero Doble Trabajo:** No tiene que cargar los productos dos veces (uno en el POS y otro en la vitrina web).
2. **Sincronización Automática:** Si vende la última botella de refresco en la tienda física, la vitrina virtual avisa automáticamente que se agotó.
3. **Visibilidad Total del Dinero:** Un solo panel donde ve cuánto entró por ventas en caja física y cuánto por compras web.
4. **Diseño Premium Commercy:** Interfaz limpia, rápida, moderna y agradable a la vista con la identidad anaranjada de AxonMarket.
