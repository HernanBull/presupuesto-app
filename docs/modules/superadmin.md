# Módulo: SuperAdmin
**Descripción:** Panel de administración global (Master) diseñado para el dueño de la plataforma. Permite gestionar todas las tiendas (workspaces), clientes globales, y configurar la clave maestra del servidor.

## 🏗️ Arquitectura y Archivos Clave
- `SuperAdminRouter.jsx`: Enrutador y puerta de acceso (Login) protegida. Solo permite el paso mediante validación de la `VITE_SUPERADMIN_KEY`.
- `pages/SuperAdminDashboard.jsx`: Panel principal. Muestra estadísticas globales, lista de comercios, lista de clientes y herramientas administrativas destructivas.
- `server/index.js` (Backend): Contiene los endpoints `/api/superadmin/*` protegidos por el middleware `requireSuperAdmin`, y la lógica para sobreescribir el archivo `.env`.

## ⚙️ Lógica Principal y Flujo de Datos
- **Seguridad Maestra (Master Key):** No utiliza un esquema de usuario/contraseña tradicional. Depende exclusivamente de una clave maestra inyectada a través de las cabeceras HTTP (`x-superadmin-key`).
- **Autenticación en el Cliente:** La sesión se mantiene almacenada en `localStorage` y se valida transparentemente usando un `useEffect` al montar el enrutador para evitar bucles de renderizado (Login Loops).
- **Recuperación Segura:** No hay correos ni recuperación automática. Si el SuperAdmin olvida su clave, el sistema le indica que debe ingresar directamente a los archivos del servidor (`.env`) para consultarla o modificarla.
- **Cambio de Clave en Caliente:** El SuperAdmin puede modificar la clave maestra desde el panel. El backend utiliza la librería `fs` de Node.js para buscar la variable en el archivo `.env`, actualizar su valor, guardar el archivo físicamente en disco y modificar el `process.env` en tiempo real.
- **Borrado en Cascada Blindado:** Al "Destruir Registro" de un comercio, el backend ejecuta sentencias `DELETE` encadenadas utilizando `try-catch` individuales. Esto asegura que si una tabla satélite (ej. `ecommerce_tracking` o `budgets`) no existe o fue eliminada previamente, el borrado de la tienda matriz (`workspaces`) no se detenga.

## 📜 Historial de Cambios / Auditoría

- **Fecha y Hora:** 2026-09-19 19:40:00
- **Versión:** 1.0.0
- **Descripción:** (Hardening y Estabilización)
  - **Fix Login Loop:** Refactorización de `SuperAdminRouter.jsx` moviendo la lógica de validación de autenticación persistente al ciclo de vida correcto (`useEffect`) para eliminar pantallas negras o loops de renderizado.
  - **Rotación de Clave Maestra:** Implementación de endpoint `PUT /api/superadmin/key` en el backend para sobreescribir físicamente el `.env` del servidor y rotar la variable `VITE_SUPERADMIN_KEY` dinámicamente sin reiniciar Node.
  - **Interfaz de Clave y Recuperación:** Adición de botones "Key" (rotación) y "Olvidé mi clave" (explicación de recuperación manual vía `.env`) en la UI.
  - **Tolerancia a Fallos en Cascada:** Refactorización profunda del `DELETE /api/superadmin/merchants/:id` para que el borrado de comercios sea robusto usando `db.transaction()` blindada y evitar bloqueos silenciosos por relaciones inexistentes.
  - **UI Tolerante a Errores de Usuario:** Actualización de la validación del botón "Destruir Registro" usando `trim().toUpperCase()` para que un espacio vacío o el uso de minúsculas no congele el botón.
