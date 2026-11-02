# Plan de Implementación: Corrección de Enlace de Vitrina, Datos del Comerciante y Acceso Libre a Módulos sin PIN

## 1. Diagnóstico de los Problemas

### Problema 1: Tienda aparece como "Jhonvip" / "Carlosvip" y enlace de vitrina erróneo
* **Causa Raíz en `MerchantMorePage.jsx`**:
  * En las líneas 19-24, el estado inicial tiene `'Jhonvip'`, `'jhonvip'` y `'Jhon'` en duro.
  * En la línea 37, la consulta a Supabase solicita `.select('name, slug, config, status')`. En la base de datos de Supabase, la columna se llama **`store_slug`** (no `slug`). Al ser `data.slug` nulo o indefinido, el sistema recaía automáticamente en el valor por defecto `'jhonvip'`.
  * Como resultado, el botón de copiar enlace copiaba `https://axonmarket.vip/jhonvip` en vez de la URL real de la tienda.
* **Causa Raíz en `EcommerceLayout.jsx`**:
  * En la línea 25, el nombre por defecto del encabezado estaba inicializado como `'Carlosvip'`.

### Problema 2: Bloqueo inmediato por PIN al iniciar sesión y Barra Inferior oculta
* **Causa Raíz en `EcommerceRouter.jsx`**:
  * Tras iniciar sesión en [MerchantLoginPage.jsx](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/MerchantLoginPage.jsx), el comerciante es redirigido a `/pos`.
  * La ruta `/pos` (y `/dashboard`) está envuelta dentro de `<AdminGuard>` (líneas 404-413).
  * `<AdminGuard>` bloquea la pantalla exigiendo un PIN de 4 dígitos inmediatamente, reseteando el desbloqueo cada vez que cambia la ruta.
* **Causa Raíz en `EcommerceLayout.jsx`**:
  * En la línea 878: `{location.pathname !== '/pos' && !location.pathname.startsWith('/product-studio') && (`
  * La barra de navegación inferior móvil (`MOBILE BOTTOM NAV`) estaba **deliberadamente oculta** en `/pos`. Al unirse el bloqueo de PIN con la ausencia de la barra, el comerciante quedaba atrapado sin poder acceder a ningún otro módulo.

---

## 2. Plan de Solución Paso a Paso

```mermaid
graph TD
    A[Inicio de Sesión Comerciante] --> B[Guardar activeWorkspace, storeSlug y merchant_store_name]
    B --> C[Acceso Directo a /pos o /dashboard SIN Bloqueo de PIN]
    C --> D[Barra Inferior Móvil SIEMPRE VISIBLE en POS y resto de módulos]
    D --> E[Navegación Fluida: Inicio | POS | Órdenes | Inventario | Más]
    E --> F[Módulo 'Más': Consulta store_slug real de Supabase]
    F --> G[Enlace Canónico de Vitrina: axonmarket.vip/mi-tienda-real]
```

---

### Paso 1: Eliminar el bloqueo por PIN al entrar y en los módulos de trabajo
* **Archivo afectado**: [EcommerceRouter.jsx](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/EcommerceRouter.jsx)
* **Acciones**:
  1. El comerciante ya se autentica de forma segura con sus credenciales (correo y contraseña o Google OAuth) en la pantalla de inicio de sesión.
  2. Retirar las rutas operativas (`pos`, `dashboard`, `shifts`, `credits`, `inventory`, `orders`, etc.) de `<AdminGuard>`.
  3. Al entrar tras el login, el comerciante ingresa directamente a su sistema operativo sin ninguna pantalla de PIN que lo frene.

---

### Paso 2: Habilitar la Barra de Navegación Inferior en el POS y todos los módulos
* **Archivo afectado**: [EcommerceLayout.jsx](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/EcommerceLayout.jsx)
* **Acciones**:
  1. Modificar la condición de renderizado de la barra inferior móvil (línea 878):
     * **Antes**: `{location.pathname !== '/pos' && !location.pathname.startsWith('/product-studio') && (`
     * **Ahora**: `{!location.pathname.startsWith('/product-studio') && (`
  2. Ahora el comerciante tiene acceso permanente e instantáneo a los 5 módulos:
     * **Inicio** (`/dashboard`)
     * **POS** (`/pos`)
     * **Órdenes** (`/orders`)
     * **Inventario** (`/inventory`)
     * **Más** (`/more`)

---

### Paso 3: Corrección de datos reales de Supabase y Enlace de la Vitrina
* **Archivos afectados**: 
  * [MerchantMorePage.jsx](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/MerchantMorePage.jsx)
  * [EcommerceLayout.jsx](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/EcommerceLayout.jsx)
* **Acciones**:
  1. **Eliminar todos los fallbacks 'Jhonvip' y 'Carlosvip'**:
     * Reemplazar por datos del comercio real extraídos de `localStorage` (`merchant_store_name`, `storeSlug`) mientras carga Supabase.
  2. **Corregir la consulta a Supabase**:
     ```javascript
     // Usar store_slug (columna real de la tabla workspaces)
     const { data } = await supabase
       .from('workspaces')
       .select('id, name, store_slug, config, status')
       .eq('id', wsId)
       .maybeSingle();
     ```
  3. **Obtener el nombre de la persona y de la tienda**:
     * Nombre comercial: `data.name || localStorage.getItem('merchant_store_name') || 'Mi Tienda'`
     * Nombre del titular/persona: `data.config?.contact?.name || data.config?.ownerName || (data.name ? data.name.split(' ')[0] : 'Comerciante')`
     * Slug real de la tienda: `data.store_slug || localStorage.getItem('storeSlug')`
  4. **Generación del enlace de la vitrina**:
     * Enlace generado y copiado: `${window.location.origin}/${storeSlug}` (o `https://axonmarket.vip/${storeSlug}`).
     * Al hacer clic en "Copiar Enlace" o "Compartir", se copiará el link real de la vitrina del comerciante que abre el perfil estilo Instagram recién rediseñado.

---

### Paso 4: Pruebas y Despliegue a Producción
1. Probar en entorno local la navegación sin PIN entre POS, Inventario, Órdenes, Dashboard y Más.
2. Comprobar que en la barra móvil se puede saltar al POS y regresar a otros módulos con un solo toque.
3. Comprobar que en "Más" aparezca el nombre real de la tienda y el comerciante, y que el botón "Copiar" copie el enlace exacto a su vitrina.
4. Compilar (`npm run build`) y publicar en Cloudflare Pages vía `actualizar.bat`.
