# Módulo: Delivery
**Descripción:** Módulo encargado de gestionar el enrutamiento, agencias de envíos y rastreo de entregas activas, integrando servicios externos como Telegram para notificaciones.

## 🏗️ Arquitectura y Archivos Clave
- `DeliveryRouter.jsx`: Enrutador principal del módulo que inicializa el motor de Telegram (`startTelegramEngine`).
- `pages/DeliveryAgencySelection.jsx`: Selección y gestión de la agencia de envíos a utilizar.
- `pages/AgencySettings.jsx`: Configuración específica de cada agencia de delivery.
- `pages/ActiveDeliveries.jsx`: Panel de seguimiento de entregas en curso.
- `utils/telegramService.js`: Lógica para interactuar con el bot de Telegram (iniciar/detener motor).

## ⚙️ Lógica Principal y Flujo de Datos
- **Enrutamiento:** Proveído por `react-router-dom` con un entry point en `DeliveryRouter`.
- **Integración Externa y Conexión Persistente:** Se levanta un proceso o conexión persistente (Telegram Engine) al montar el router y se limpia al desmontar.
- **Intersección con E-commerce (Picking):** El módulo de Delivery exporta el método `sendDeliveryRequest` que es invocado directamente por la Estación de Picking (`OrderPreparation.jsx`) del módulo E-commerce al momento de despachar un pedido empacado. Esto garantiza que la asignación al repartidor vía Telegram ocurra inmediatamente tras el empaque, evitando depender del cliente o del gestor general.

## 🧠 Manejo del Estado
- El estado principal fluye a través de propiedades pasadas desde el nivel superior (`session`, `theme`, `toggleTheme`).

## 🔌 Dependencias y Llamadas Externas (APIs)
- **APIs:** Dependencia fuerte del servicio `telegramService` para notificaciones y mensajería en las entregas.
- Recibe la sesión global de la aplicación.

## ⚠️ Notas Críticas / Gotchas
- El `telegramEngine` se inicializa a nivel de Router en un `useEffect`. Es vital asegurarse de que `stopTelegramEngine()` limpie correctamente en la función de cleanup del hook para evitar memory leaks o múltiples conexiones al cambiar entre módulos de la plataforma.

## 📜 Historial de Cambios / Auditoría

- **Fecha y Hora:** 2026-09-08 14:50:46
- **Versión:** 1.0.0
- **Descripción:** Implementación inicial del MVP del módulo de Delivery. Se crearon las vistas `ActiveDeliveries`, `AgencySettings` y `DeliveryAgencySelection`. Se integró `telegramService.js` para gestionar notificaciones y conexión con bots de Telegram.
