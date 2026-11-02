# Plan de Implementación: Instalación Obligatoria de PWA en el Paso 8 del Wizard de Comerciantes (AxonMarket)

## 1. Alcance y Requerimiento Específico

### 1.1 Contexto del Negocio y Distinción de Logins
En la plataforma AxonMarket existen dos tipos de acceso claramente diferenciados:
1. **Login de Usuario Normal (Comprador/Cliente)**: Navega por la vitrina, catálogo y directorio web de forma libre, comprando sin obligación de instalar una app.
2. **Login de Comerciante (Dueño de Tienda / Vendedor)**: Accede al Wizard de configuración inicial de 8 pasos (`MerchantOnboardingWizard.jsx`) para registrar su negocio, rubro, canales de venta y catálogo.

### 1.2 El Problema a Resolver
Cuando el comerciante finaliza los pasos de configuración de su tienda en un navegador web móvil o de escritorio (Chrome, Safari, Edge):
- El navegador conserva barras de URL, pestañas y botones de navegación que restan entre 20% y 25% de espacio útil de pantalla.
- Se producen lagueos y gestos accidentales (como recargas involuntarias al deslizar hacia abajo o navegación hacia atrás por gestos táctiles).
- El comerciante pierde el acceso directo a su negocio y debe volver a escribir la dirección web cada vez.

### 1.3 La Solución: Obligatoriedad en el Paso 8 del Wizard
En el **Paso 8 (último paso de éxito) del `MerchantOnboardingWizard.jsx`**:
- **Se obliga al comerciante a instalar la aplicación PWA** en su teléfono o computadora antes de comenzar a operar.
- Una vez instalada, el comerciante accede **directamente desde el icono en su pantalla de inicio o escritorio**, no desde la barra del navegador.
- Al abrir la aplicación instalada, **inicia sesión automáticamente** (las credenciales y workspace ya quedan autenticados en el almacenamiento local persistente).
- La aplicación se abre en **AxonMarket completo** (su panel general/dashboard y vitrina comercial, tal como fue concebido originalmente con la PWA, sin forzarlo exclusivamente al sistema POS Kiosco).

---

## 2. Flujo de Experiencia de Usuario (Paso 8 del Wizard)

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │                  PASOS 1 AL 7 DEL ONBOARDING WIZARD                    │
   │  (Nombre, Rubro, Canales, Sucursales, Sistema, Contacto, Catálogo)     │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │            PASO 8: ¡TIENDA CREADA! INSTALACIÓN OBLIGATORIA             │
   │            ¿La aplicación ya está ejecutándose como PWA?               │
   └───────────────────┬────────────────────────────────┬───────────────────┘
                       │                                │
                  SÍ (Standalone)                  NO (Navegador)
                       │                                │
                       ▼                                ▼
   ┌────────────────────────────────────┐ ┌─────────────────────────────────┐
   │     BOTÓN "ABRIR MI TIENDA"        │ │   BLOQUEO DE INSTALACIÓN PWA    │
   │  • Sesión ya iniciada en local     │ │  "Instala la App Oficial para   │
   │  • Abre AxonMarket directamente    │ │   comenzar a operar tu negocio" │
   │  • Pantalla completa 100%          │ │                                 │
   │                                    │ │ • Android / PC: Botón 1-Clic    │
   │                                    │ │ • iOS Safari: Guía 3 pasos      │
   │                                    │ │ • Detecta instalación y avanza  │
   └────────────────────────────────────┘ └─────────────────────────────────┘
```

---

## 3. Comportamiento Detallado por Dispositivo

### 3.1 En Teléfonos Android y Computadoras (Chrome / Edge en Windows y Mac)
1. El componente escucha el evento nativo del navegador `beforeinstallprompt`.
2. En el Paso 8 se despliega una tarjeta prominente con diseño corporativo AxonMarket:
   - **Título**: *"Instala la App Oficial de AxonMarket en tu Teléfono / Escritorio"*.
   - **Motivo**: *"Para aprovechar el 100% de la pantalla, evitar lagueos y tener acceso directo a tu negocio con inicio de sesión automático."*
   - **Botón Principal**: **`[ ⚡ Instalar App de AxonMarket ]`**.
3. Al presionar el botón:
   - Se invoca `deferredPrompt.prompt()`.
   - El sistema operativo (Android o Windows) muestra el cuadro oficial de instalación.
4. Al confirmarse (`appinstalled`):
   - La pantalla cambia de inmediato a estado de éxito:
     * *"¡App instalada correctamente! 🎉"*
     * *"Cierra esta pestaña del navegador y abre AxonMarket desde el nuevo icono en tu pantalla de inicio. Tu sesión ya está iniciada."*

### 3.2 En iPhone / iPad (Safari iOS)
Dado que Apple no permite disparar el cuadro de instalación por botón de JavaScript:
1. El Paso 8 detecta que el usuario está en iOS (`/iPad|iPhone|iPod/.test(navigator.userAgent)`).
2. Se muestra una guía interactiva con 3 pasos visuales ilustrados:
   - **Paso A**: Toca el botón **Compartir** (`⎋` en la barra inferior de Safari).
   - **Paso B**: Desliza hacia abajo y presiona **"Agregar al Inicio" (+)**.
   - **Paso C**: Abre **AxonMarket** desde tu pantalla de inicio para entrar directamente con tu sesión abierta.
3. Se incluye un botón de verificación: **`[ Ya la instalé, verificar ]`** que comprueba si ya cambió a modo standalone o confirma las instrucciones.

### 3.3 Si el Comerciante YA está dentro de la PWA
Si el usuario ya había instalado la PWA previamente (por ejemplo, desde la vitrina pública) y completa el Wizard desde la propia App:
- `isAppInstalledOrStandalone()` devuelve `true`.
- El Paso 8 muestra directamente el botón: **`[ Entrar a mi Tienda en AxonMarket ]`** y navega a `/dashboard` sin mostrar peticiones redundantes de instalación.

---

## 4. Persistencia e Inicio de Sesión Automático

Para que al pulsar el icono de la App en el teléfono el comerciante no tenga que volver a escribir su correo o contraseña:
1. En el Paso 7 del Wizard (`MerchantOnboardingWizard.jsx`), al momento de guardar los datos en Supabase, se almacenan en `localStorage`:
   ```javascript
   localStorage.setItem('activeWorkspace', workspaceId);
   localStorage.setItem('storeSlug', cleanSlug);
   localStorage.setItem('merchant_store_name', businessName);
   localStorage.setItem('merchant_pwa_installed', 'true');
   // Limpieza de cualquier sesión previa de comprador
   localStorage.removeItem('ecommerce_current_customer');
   ```
2. Dado que el almacenamiento local (`localStorage`) es compartido entre el navegador y la PWA instalada en el mismo dominio (`axonmarket.vip` o `localhost`), **cuando la persona abre la App instalada, su sesión ya está lista y entra directamente a AxonMarket sin pantallas de login.**

---

## 5. Destino de Entrada: AxonMarket Completo

El usuario especificó claramente:
> *"Simplemente quiero eso, que inicie la AxonMarket directamente en su teléfono, no del sistema POS, no, completamente AxonMarket como lo tenemos originalmente con la parte PWA."*

Por lo tanto:
- El `start_url` del PWA Manifest en `vite.config.js` se mantiene en `/dashboard` o `/` (el panel principal de AxonMarket).
- No se encasilla al comerciante en el módulo POS Kiosco `/pos`, sino en la experiencia global de AxonMarket (Dashboard con métricas, inventario, vitrina virtual, pedidos y acceso a POS cuando lo requiera).

---

## 6. Plan de Trabajo Técnico para la Ejecución

| Fase | Tarea Técnica | Archivos Involucrados |
|---|---|---|
| **Fase 1** | Capturar y propagar el evento `beforeinstallprompt` a nivel global para que esté disponible cuando el Wizard alcance el Paso 8. | `src/modules/ecommerce/components/PwaInstallBanner.jsx`<br/>`src/modules/ecommerce/context/PwaContext.jsx` o hook personalizado `usePwaInstall.js` |
| **Fase 2** | Rediseñar el **Paso 8** de `MerchantOnboardingWizard.jsx`: sustituir el botón simple de "Ir a mi panel" por el bloque interactivo de instalación obligatoria adaptado a Android/PC e iOS. | `src/modules/ecommerce/components/MerchantOnboardingWizard.jsx` |
| **Fase 3** | Implementar la detección de `isInStandaloneMode()` en el Paso 8 y la transición post-instalación con auto-login asegurado. | `src/modules/ecommerce/components/MerchantOnboardingWizard.jsx` |
| **Fase 4** | Verificar en `vite.config.js` que el `manifest` mantenga `display: 'standalone'` y `start_url: '/'` para abrir AxonMarket de forma general. | `vite.config.js` |
| **Fase 5** | Pruebas de compilación (`npm run build`) y despliegue a producción mediante `actualizar.bat`. | `actualizar.bat` |

---

## 7. Criterios de Aceptación y Validación

- [ ] Un comerciante nuevo que completa los 7 primeros pasos del Wizard llega al Paso 8.
- [ ] En el Paso 8, si está en Chrome/Edge o Android en el navegador, no puede salir a una pestaña web ordinaria sin antes ver la opción obligatoria de instalación.
- [ ] Al hacer clic en "Instalar", se abre el diálogo nativo de instalación de la aplicación.
- [ ] En iPhone, se le presenta la guía paso a paso de Safari ("Compartir" -> "Agregar al Inicio").
- [ ] Al abrir el icono instalado en el teléfono, AxonMarket abre a pantalla completa (sin barra de navegación web) con la sesión del comerciante iniciada automáticamente.
