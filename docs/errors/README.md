# Registro de Errores (Error Log)

Esta carpeta almacena documentación sobre errores, bugs o malas decisiones arquitectónicas que ya se han cometido y resuelto en el proyecto.

El objetivo principal es evitar que la IA (o cualquier desarrollador) repita los mismos errores en el futuro, manteniendo un registro claro de la solución aplicada y cómo prevenirlo.

## Estructura sugerida para documentar un error:
- **Síntoma / Problema:** ¿Qué fallaba?
- **Causa Raíz:** ¿Por qué fallaba?
- **Solución Aplicada:** ¿Cómo se resolvió de forma óptima?
- **Prevención:** ¿Qué regla debemos seguir para no repetirlo?

## 📋 Errores Recurrentes en el Proyecto

### 12. Problema: Pantalla en blanco (Crasheo por dependencia eliminada en refactorización)
- **Síntoma:** Al intentar acceder a la plataforma (tienda o admin), la pantalla queda totalmente en blanco y Vite lanza un error de módulo no encontrado (`[plugin:vite:import-analysis] Failed to resolve import`).
- **Causa:** Durante la migración de arquitectura de submódulos a monolito, se eliminó la carpeta de nichos (`src/modules/ecommerce/niches`), pero se olvidó remover la importación antigua de `Registry.jsx` en el archivo cliente `PublicStore.jsx`. Esto rompió la compilación de Vite y por ende el árbol de React crasheó, dejando todo en blanco.
- **Solución Aplicada:** Se buscó con `grep` cualquier archivo que aún importara la carpeta eliminada. Se identificó `PublicStore.jsx`, se eliminó el import de `getNicheConfig` y se reemplazó el control de carrito dinámico por un componente monolítico (botones en línea).
- **Lección Aprendida:** **NUNCA** eliminar un archivo o carpeta sin antes buscar globalmente (ej. usando `grep_search`) si otros archivos en el proyecto dependen de sus exportaciones. Si se hace, el empaquetador de React fallará catastróficamente.

### 11. Problema: Pantalla en blanco (Crasheo de React por TypeError)
**Estado:** Resuelto

**Síntoma / Problema:**
Toda la página se quedó en blanco repentinamente. Al revisar la consola del navegador, aparecía un error de React: `TypeError: Cannot read properties of null`.

**Causa Raíz:**
En el componente `PublicStore.jsx`, se declaró el estado inicial como `const [config, setConfig] = useState(null)`. Más abajo en el cuerpo del componente, antes de que el `useEffect` tuviera tiempo de cargar los datos de la API, se intentó leer la propiedad directamente: `config.store_niche`. Como `config` era `null` en el primer render, esto lanzó una excepción fatal que desmontó todo el árbol de React.

**Solución Aplicada:**
Se utilizó el operador de encadenamiento opcional (Optional Chaining) para acceder a la propiedad de forma segura: `config?.store_niche`. Esto devuelve `undefined` en lugar de romper la app si el objeto es nulo, permitiendo que el fallback (`|| 'viveres'`) actúe correctamente.

**Prevención:**
SIEMPRE utilizar `?.` (Optional Chaining) o valores por defecto seguros cuando se lean propiedades de variables de estado que inician como nulas (`null`) o que provienen de respuestas asíncronas (APIs).

### 10. Problema: Error de Vite `[PARSE_ERROR] Unexpected JSX expression`
**Estado:** Resuelto

**Síntoma / Problema:**
Al crear los nuevos submódulos para el E-commerce, el compilador de Vite lanzó el error `[plugin:vite:oxc] Transform failed with 1 error: [PARSE_ERROR] Unexpected JSX expression` y se detuvo la aplicación con una pantalla de error. El mensaje indicaba que la sintaxis JSX estaba deshabilitada para ese archivo.

**Causa Raíz:**
Los archivos de los submódulos (`Registry.js`, `index.js` en las carpetas de nichos) se crearon con la extensión `.js`, pero su contenido incluía código JSX. En React con Vite, los archivos que contienen componentes React y sintaxis JSX **deben** tener la extensión `.jsx`. El transformador asume que un `.js` es JavaScript puro y un `.jsx` contiene componentes.

**Solución Aplicada:**
Se renombraron todos los archivos de los submódulos de `.js` a `.jsx` (ej. `Registry.jsx`). Vite automáticamente resolvió los imports sin extensión.

**Prevención:**
Al crear nuevos archivos que vayan a exportar o utilizar etiquetas JSX, siempre asegurarse de nombrarlos con la extensión `.jsx`, nunca `.js`.

### 8. Problema: Pantalla en negro/blanco al navegar a una nueva página
**Estado:** Resuelto

**Síntoma / Problema:**
Al hacer clic en un nuevo enlace de la barra lateral (ej: "Carrito"), la pantalla se quedó en negro y no cargó la interfaz.

**Causa Raíz:**
El sistema de recarga rápida (HMR) de Vite falló. Esto ocurrió porque añadí la importación y la ruta en `EcommerceRouter.jsx` **antes** de terminar de crear el archivo físico `CartSettings.jsx` en el disco. Al actualizar el router, Vite buscó el archivo, no lo encontró y lanzó un error fatal en el cliente, rompiendo el árbol de React y dejando la pantalla vacía.

**Solución Aplicada:**
Simplemente refrescar la página (F5). Al refrescar, Vite vuelve a construir el árbol de componentes y ya encuentra el archivo recién creado.

**Prevención:**
Al crear nuevas vistas o componentes, **siempre** crear el archivo físico (`.jsx`) primero y luego añadir su importación en el enrutador o en la barra lateral. De esta forma, Vite nunca buscará un archivo inexistente.

### 7. Problema: Error "Adjacent JSX elements must be wrapped in an enclosing tag"
**Estado:** Resuelto

**Síntoma / Problema:**
Tras intentar reparar un error previo de sintaxis en `PublicStore.jsx`, el compilador de Vite lanzó un nuevo error: `[PARSE_ERROR] Adjacent JSX elements must be wrapped in an enclosing tag` cerca de la línea 317, rompiendo nuevamente la previsualización.

**Causa Raíz:**
Un error de balance de etiquetas de JSX. En el intento previo de limpieza, quedó un `</div>` adicional duplicado al final del listado de productos del catálogo. Al cerrar anticipadamente el contenedor principal `flex-1`, React interpretó los siguientes elementos hermanos (como la paginación) como nodos adyacentes sueltos sin un tag de nivel superior que los envolviera de manera lógica en ese bloque condicional.

**Solución Aplicada:**
Se eliminó la etiqueta de cierre sobrante (`</div>`) en la línea 308, devolviendo a los elementos JSX (el Grid y la Paginación) a su correcta anidación dentro del contenedor `div className="flex-1"`.

**Prevención:**
Al trabajar con estructuras fuertemente anidadas en React, contar mental o visualmente los niveles de identación y apertura/cierre de `divs` antes de hacer reemplazos con herramientas de texto plano. Si es posible, reemplazar siempre bloques completos que se abran y cierren dentro del mismo reemplazo.

### 6. Problema: Error de sintaxis (Crasheo de Vite por duplicación de código)
**Estado:** Resuelto

**Síntoma / Problema:**
Al refactorizar `PublicStore.jsx` para integrar el consumo de la base de datos, el servidor de desarrollo de Vite falló mostrando un "Red Screen" con el mensaje `[PARSE_ERROR] Expected , or ) but found ;`, dejando inoperativa la tienda pública.

**Causa Raíz:**
Durante la modificación del archivo con herramientas de edición múltiple, se produjo una duplicación accidental de código en los bordes de los bloques reemplazados (específicamente `loadConfig();` y variables como `textColor`). Además, se cortó un tag `<div>` provocando código HTML/JSX malformado.

**Solución Aplicada:**
Se revisó el archivo `PublicStore.jsx`, eliminando las líneas duplicadas, reparando los tags malformados y restaurando la sintaxis válida.

**Prevención:**
Al utilizar herramientas de edición de código sobre archivos grandes, verificar exhaustivamente el código del `TargetContent` y los números de línea `StartLine`/`EndLine` para asegurar que el reemplazo es exacto y no duplica el contenido original ni rompe la estructura del árbol sintáctico.

### 5. Problema: Gráficos de E-commerce sin datos por backend local inactivo
**Estado:** Resuelto

**Síntoma / Problema:**
Los gráficos y métricas del Dashboard y Analytics del E-commerce no mostraban datos (decían "No hay datos en este periodo" o cargaban en $0) porque fallaban las peticiones HTTP al servidor local.

**Causa Raíz:**
El backend local en Node (`server/index.js`) que expone los endpoints de analíticas (`/api/ecommerce/analytics`) no se estaba ejecutando. El script `"dev"` en `package.json` solo iniciaba el frontend con `vite --host`. Al no estar corriendo el servidor local en el puerto 3001, las llamadas al API fallaban y no se retornaban datos.

**Solución Aplicada:**
Se modificó el archivo `package.json` integrando `concurrently` en el script `"dev": "concurrently \"vite --host\" \"node server/index.js\""`. De esta manera se levantan simultáneamente el frontend y el backend. Además, se ejecutó una petición al endpoint `/api/ecommerce/seed` para rellenar la base de datos local SQLite con información simulada.

**Prevención:**
Al agregar un backend local (o base de datos simulada) que acompañe al frontend, asegúrate siempre de revisar y actualizar los scripts de ejecución en `package.json` (usando librerías como `concurrently`) para garantizar que todas las partes de la aplicación se inicialicen juntas en el entorno de desarrollo. No asumas que el servidor de Vite levantará archivos backend de Node de forma automática.

### 4. Problema: Crasheo del Frontend por propiedades indefinidas de la API (Dashboard E-commerce)
**Estado:** Resuelto

**Síntoma / Problema:**
La página del Dashboard del e-commerce dejaba de cargar (crasheo de React/pantalla en blanco) tras actualizar las métricas para incluir Ticket Promedio y porcentajes de crecimiento.

**Causa Raíz:**
El servidor Node.js no se había reiniciado para aplicar los nuevos cambios en `server/index.js`. Por ende, devolvía el esquema JSON antiguo que no contenía las propiedades `aov` ni `revenueChange`. Al intentar ejecutar funciones de prototipo como `.toFixed(2)` sobre variables `undefined`, React lanzaba una excepción fatal de tipo `TypeError`.

**Solución Aplicada:**
Se modificó `EcommerceDashboard.jsx` para incluir validaciones defensivas y valores por defecto (fallbacks) como `(summary.aov || 0).toFixed(2)` y un control de nulos en `formatChange`, logrando que la interfaz se renderice correctamente aunque reciba un esquema desactualizado.

**Prevención:**
Al renderizar datos provenientes de APIs, siempre aplicar técnicas de programación defensiva en el Frontend (fallbacks `|| 0`, Optional Chaining `?.`) antes de invocar métodos de formato. Nunca asumir que el backend devolverá la estructura perfecta, especialmente en entornos de desarrollo donde puede haber desincronización de versiones.

### 3. Problema: Falla al ejecutar comandos cURL en PowerShell (Invoke-WebRequest)
**Estado:** Resuelto

**Síntoma / Problema:**
Al intentar ejecutar el comando `curl -X POST http://localhost:3001/api/ecommerce/seed` en la terminal (Windows), falló con el error `Invoke-WebRequest : No se encuentra ningún parámetro que coincida con el nombre del parámetro 'X'`.

**Causa Raíz:**
PowerShell intercepta el comando `curl` y lo utiliza como un alias para `Invoke-WebRequest`, el cual no tiene la misma sintaxis que el comando original de cURL (por ejemplo, el flag `-X` no es válido).

**Solución Aplicada:**
Se utilizó `curl.exe` explícitamente en lugar de `curl` para forzar a PowerShell a utilizar el binario nativo de cURL y evitar el alias interno.

**Prevención:**
Cuando se ejecuten comandos de cURL desde el agente o en un entorno PowerShell en Windows, siempre se debe utilizar `curl.exe` en lugar de `curl` para asegurar la compatibilidad de los parámetros y evitar fallos por alias.

### 2. Problema: El bot de Telegram no responde a comandos ("Aceptar Viaje")
**Estado:** Resuelto

**Síntoma / Problema:**
Cuando un pedido se enviaba desde el E-commerce a Delivery, llegaba la notificación al grupo de Telegram. Sin embargo, cuando el repartidor presionaba "Aceptar Viaje" (lo cual enviaba `/start accept_ID` al bot), el bot no respondía nada ni le enviaba los datos del cliente.

**Causa Raíz:**
El motor de sondeo (polling) de Telegram (`startTelegramEngine()`) solo se estaba ejecutando dentro del `useEffect` de `DeliveryRouter.jsx`. Como el usuario estaba probando el flujo desde la pestaña del E-commerce (`OrdersManager.jsx`), el router de Delivery estaba desmontado, apagando el motor de Telegram.

**Solución Aplicada:**
Se extrajo la inicialización del motor `startTelegramEngine()` y se colocó de forma global en `App.jsx`. De esta manera, el bot siempre está escuchando en segundo plano sin importar qué módulo de la plataforma esté abierto.

**Prevención:**
Cualquier servicio en segundo plano (WebSockets, Polling de APIs externas, integraciones de bots) que necesite estar activo en toda la plataforma debe inicializarse en el punto de entrada de la App (`App.jsx` o en un Context Provider Global), no estar atado al ciclo de vida de un enrutador de módulo específico.

### 1. Problema: No se pueden tomar viajes desde Telegram (Error 404)
**Estado:** Resuelto (commit 697d429)

**Síntoma / Problema:**
Al presionar "Aceptar Viaje" en Telegram, el usuario era redirigido a una página de error 404.

**Causa Raíz:**
La URL de redirección en `sendDeliveryRequest` apuntaba a una ruta que no existía en `react-router-dom`.
```javascript
// Código original problemático:
...&url=https://localhost:5173/delivery/orders/new/${orderId}`
```

**Solución Aplicada:**
Se corrigió la ruta para que coincida con el router real del módulo de Delivery.
```javascript
// Código corregido:
...&url=https://localhost:5173/delivery/orders/new/${orderId}`
```

**Prevención:**
Siempre verificar la ruta en `DeliveryRouter.jsx` antes de generar enlaces de redirección en `sendDeliveryRequest`.

### 9. Problema: Pantalla totalmente en blanco en toda la app (Crasheo de Vite por Exportación Faltante)
**Estado:** Resuelto

**Síntoma / Problema:**
Toda la aplicación (Landing, E-commerce, Presupuesto) cargaba con la pantalla completamente en blanco o fallaba silenciosamente al iniciar.

**Causa Raíz:**
Se importó un ícono (`Instagram`) desde la librería `lucide-react` en `RegisterWizard.jsx`, pero la versión instalada no exportaba dicho componente. Esto provocó un error fatal `[MISSING_EXPORT]` durante el bundling de Vite, impidiendo que el cliente se construyera y rompiendo el árbol de componentes (ya que `App.jsx` dependía del archivo).

**Solución Aplicada:**
Se eliminó la importación de `<Instagram />` de `lucide-react` y se reemplazó por un texto estilizado equivalente (`@`).

**Prevención:**
Si la pantalla queda totalmente en blanco de manera global (en todas las rutas), siempre verificar el registro del terminal de Vite (o correr `npm run build`) para detectar errores de `MISSING_EXPORT` o de sintaxis fatal. Al usar librerías de iconos, verificar la disponibilidad de los mismos para la versión específica instalada.

### 10. Problema: Error de Sintaxis JSX [PARSE_ERROR] (Expected '>' but found '<' / Unexpected token)
**Estado:** Resuelto

**Síntoma / Problema:**
El servidor de desarrollo de Vite (HMR) crasheaba con un overlay rojo indicando un fallo de transformación con el mensaje `[PARSE_ERROR]`. Inicialmente esperaba un `>` pero encontró `<`. Luego, al intentar solucionarlo, cambió a `[PARSE_ERROR] Unexpected token`. Ambos ocurrieron en el archivo `InventoryManager.jsx` alrededor de la línea 745.

**Causa Raíz:**
1. Durante la manipulación automatizada del código JSX mediante reemplazos múltiples para inyectar lógica de Combos/Recetas, se eliminaron sin querer las etiquetas de cierre del botón `<button>` y de dos contenedores `<div>`.
2. Al intentar inyectar las líneas faltantes con un script, se produjo una duplicación de la llave de cierre de la función `onClick` (`}}`), lo que corrompió completamente el árbol de AST (Abstract Syntax Tree) de JSX, impidiendo la compilación.

**Solución Aplicada:**
Se identificó exactamente la duplicación del bloque `}}` en la línea 745 a través del log de Vite. Se utilizó un script de Python para eliminar de forma quirúrgica la línea sobrante (la línea exacta duplicada) logrando que la estructura JSX y los contenedores de los botones quedaran perfectamente equilibrados de nuevo.

**Prevención:**
Evitar las inserciones o reemplazos masivos basados en texto (expresiones regulares o line-matching) en componentes con gran profundidad de anidación (indentación JSX). Siempre que se aplique una actualización de UI grande, revisar con atención los cierres de etiquetas (`</div>`, `}</>`) e iterar sobre los logs de Vite para asegurar que no queden tokens huerfanos.
