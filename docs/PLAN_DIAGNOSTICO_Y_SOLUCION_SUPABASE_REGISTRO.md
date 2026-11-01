# 📋 Plan de Diagnóstico y Solución: Conexión Supabase, Registro de Comerciantes y Aprobación Super Admin

**Fecha:** 1 de Noviembre de 2026  
**Sistema:** AxonMarket (`f:\AxonPos\Presupuesto`)  
**Base de Datos Única:** Supabase (`https://iafhbrjeterrhtpctwqb.supabase.co`)  

---

## 🔍 1. Diagnóstico del Estado Actual de Supabase

Se auditó la base de datos de Supabase tabla por tabla. Todas las tablas responden correctamente con sus credenciales oficiales:

| Tabla en Supabase | Estado de Conexión | Registros Actuales | Propósito |
| :--- | :---: | :---: | :--- |
| **`workspaces`** | ✅ Operativa | 3 tiendas | Tiendas registradas, expedientes y configuración |
| **`merchant_contacts`** | ✅ Operativa | 0 contactos | Datos directos del titular (WhatsApp, correo) |
| **`ecommerce_products`** | ✅ Operativa | 37 productos | Inventario y catálogo para la vitrina |
| **`ecommerce_orders_v2`** | ✅ Operativa | 36 pedidos | Pedidos online de clientes y delivery |
| **`ecommerce_customers`** | ✅ Operativa | 6 clientes | CRM y perfiles de compradores |
| **`users`** | ✅ Operativa | 4 empleados | Personal del POS (roles y PINes) |
| **`pos_sales`** | ✅ Operativa | Enlazada | Cola de ventas sincronizadas desde Dexie |
| **`pos_shifts`** | ✅ Operativa | Enlazada | Turnos de caja y aperturas |
| **`ecommerce_store_news`**| ✅ Operativa | 4 noticias | Estados y promociones en la vitrina |

---

## 🛑 2. Causa Raíz de los Errores Reportados

### ❌ Error 1: El registro de nuevos comerciantes no enviaba datos a Supabase
* **Causa Identificada:** En [`MerchantTrialAuthModal.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/components/MerchantTrialAuthModal.jsx), el código intentaba insertar el campo `owner_email: cleanEmail` directamente en la tabla `workspaces`.
* **Respuesta de Supabase:** `PGRST204: Could not find the 'owner_email' column of 'workspaces' in the schema cache`.
* **Impacto:** Debido a que la columna `owner_email` no existe en la tabla `workspaces` (el correo se guarda dentro del JSONB `config.adminEmail` o en `merchant_contacts`), Supabase rechazaba el insert con un error 400 y abortaba el registro sin crear la tienda.

### ❌ Error 2: Falla en el inicio de sesión y Google OAuth
* **Causa Identificada:** La consulta de búsqueda de tiendas existentes ejecutaba:
  ```javascript
  .or(`id.eq.${userId},owner_email.ilike.${cleanEmail},config->>adminEmail.ilike.${cleanEmail}`)
  ```
* **Respuesta de Supabase:** `42703: column workspaces.owner_email does not exist`.

### ❌ Error 3: Discrepancia en la activación de la vitrina vs. Validación Física
* **Comportamiento Anterior Erróneo:** En algunos puntos se creaba el workspace con `status: 'Activo'` de inmediato, permitiendo acceso prematuro.
* **Flujo Corporativo Requerido:**
  1. El comerciante se registra ➔ se crea la tienda en Supabase con `status: 'Pendiente'`.
  2. Su vitrina pública no está activa y en su panel ve la pantalla de **"Cuenta en Revisión"**.
  3. El Super Admin visita el local físico o valida sus credenciales.
  4. El Super Admin ingresa a `/axs-vault-99xqz` y hace clic en **"Activar Comercio"** ➔ el estado cambia a `Activo`.
  5. La vitrina pública queda en línea en `axonmarket.vip/:slug`.

---

## 🛠️ 3. Correcciones Aplicadas en el Código

1. **[`MerchantTrialAuthModal.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/components/MerchantTrialAuthModal.jsx):**
   - Eliminado el campo inexistente `owner_email` en el Paso 1, Paso 2 y Google OAuth.
   - Establecido `status: 'Pendiente'` por defecto en todos los nuevos registros de tiendas.
   - Corregida la consulta de inicio de sesión para buscar por `id` o por `config->>adminEmail` sin romper por columnas inexistentes.
   - En Google OAuth, se genera un UUID estándar compatible con PostgreSQL (`crypto.randomUUID()`) en lugar del string `g_...` que causaba error de sintaxis UUID.

2. **[`MarketplaceDirectory.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/MarketplaceDirectory.jsx):**
   - Corregida la verificación previa de Google para consultar `config->>adminEmail`.

3. **[`RegisterWizard.jsx`](file:///f:/AxonPos/Presupuesto/src/pages/RegisterWizard.jsx):**
   - Eliminado `owner_email` del payload y asegurado `status: 'Pendiente'`.

4. **Unificación a una sola Base de Datos Supabase:**
   - Confirmado que tanto el e-commerce, el POS Kiosco, la sincronización offline Dexie y el Centro de Respaldos apuntan exclusivamente a la base de datos única de AxonMarket en `https://iafhbrjeterrhtpctwqb.supabase.co`.

---

## 🚀 4. Plan de Pruebas de Certificación

1. **Prueba de Registro de Nuevo Comerciante:**
   - Navegar a `http://localhost:5174/probar-gratis`.
   - Ingresar un correo y contraseña nuevos.
   - Verificar que se cree el registro en `workspaces` con estado `Pendiente`.
2. **Prueba de Bloqueo "Cuenta en Revisión":**
   - Verificar que el comerciante recién registrado vea el mensaje oficial de revisión y no pueda activar la vitrina por su cuenta.
3. **Prueba de Aprobación Super Admin:**
   - Ingresar a `http://localhost:5174/axs-vault-99xqz`.
   - Localizar el comercio en la lista de tiendas pendientes.
   - Hacer clic en el botón de activación para pasarlo a `Activo`.
   - Verificar que la tienda ya pueda ingresar a su ERP y que su vitrina `axonmarket.vip/:slug` sea pública.
3. **Despliegue a Producción:**
   - Ejecutar `actualizar.bat` para enviar las correcciones a Cloudflare Pages.
