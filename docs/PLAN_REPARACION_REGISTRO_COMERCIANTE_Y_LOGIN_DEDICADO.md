# Plan de Reparación: Registro de Comerciantes y Portal de Login Dedicado

## 1. Problema Identificado
1. **Fuga y sobreescritura de datos en el registro**:
   - `MerchantOnboardingWizard.jsx` sobreescribía el campo `config` de la tabla `workspaces` reemplazando el objeto entero en lugar de fusionarlo (`merge`). Esto provocaba la pérdida de `adminEmail`.
   - `ownerName` (nombre del dueño/propietario) no se almacenaba en `config.expediente.ownerName`. En `SuperAdminDashboard.jsx`, al no encontrar dicho campo, se utilizaba como respaldo `selectedDetails.name` (el nombre del comercio), duplicando "Panadería Trebol" tanto en nombre como en dueño.
   - `merchant_contacts` no era consultado por `SuperAdminDashboard.jsx` para enriquecer la ficha de la tienda.
2. **Confusión de flujos Cliente vs Comerciante**:
   - No existía una pantalla de acceso exclusiva para comerciantes (`/merchant/login`).
   - `MerchantGuard` redirigía a la raíz `/` (directorio/feed de clientes) cuando un comerciante no tenía sesión activa.
   - Al finalizar el registro e instalar la PWA, los comerciantes podían ser devueltos a la vista del cliente.

---

## 2. Solución Arquitectónica

### Fase 1: Enlace Robusto de Base de Datos
- **`MerchantOnboardingWizard.jsx`**: En `handleFinalize`, leer la configuración previa (`prevConfig`) y preservarla:
  - `adminEmail: prevConfig.adminEmail || prevConfig.contact?.email`
  - `contact: { phone, email, ownerName }`
  - `expediente: { ...prevConfig.expediente, ownerName, whatsapp }`
  - Actualizar `merchant_contacts` (`id`, `full_name`, `phone`, `email`).
- **`SuperAdminDashboard.jsx`**:
  - Al consultar comercios, obtener también la tabla `merchant_contacts`.
  - En el modal de detalles, mostrar:
    - Email Administrador: `merchantContact?.email || config.adminEmail || config.contact?.email || 'No registrado'`
    - Dueño / Propietario: `merchantContact?.full_name || config.expediente?.ownerName || config.contact?.ownerName || 'No registrado'` (sin duplicar el nombre de la tienda).

### Fase 2: Login Dedicado para Comerciantes
- Crear `src/modules/ecommerce/pages/MerchantLoginPage.jsx` con diseño profesional corporativo.
- Autenticar mediante `loginUser` de Supabase.
- Al iniciar sesión con éxito:
  - Guardar `activeWorkspace` y `storeSlug`.
  - Limpiar variables de cliente (`ecommerce_current_customer`).
  - Redirigir directamente a `/pos` o `/dashboard`.
- Registrar las rutas `/merchant/login` y `/comerciante/login` en [EcommerceRouter.jsx](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/EcommerceRouter.jsx).
- Modificar `MerchantGuard` para que, en caso de no existir sesión activa, redirija a `/merchant/login` y **nunca a la vista de clientes**.

### Fase 3: Auto-acceso PWA Post-Registro
- Al completar el paso 8 de `MerchantOnboardingWizard`, dirigir al comerciante directamente a su punto de venta (`/pos`) o panel (`/dashboard`).
