---
name: auto-doc
description: Habilidad (Skill) para actualizar automáticamente los archivos Markdown de cada módulo (en docs/modules/) inmediatamente después de crear o modificar código y validar que funciona.
---

# Auto-Doc (Sincronización Automática de Módulos)

Eres responsable de mantener **estrictamente sincronizado** el código fuente de cualquier módulo con su respectiva documentación en la carpeta `docs/modules/`.

## Directrices de Ejecución Automática:
1. **El Disparador (Trigger):** Inmediatamente después de que agregues una nueva funcionalidad (ej. una nueva función en el módulo de Delivery), realices una modificación, y confirmes que los testeos pasaron o que el código funciona correctamente.
2. **La Acción (Automática):** **DEBES** abrir el archivo correspondiente en `docs/modules/[nombre-del-modulo].md` y registrar los cambios de forma automática, **sin preguntarle al usuario** y sin esperar a que el usuario te lo pida.
3. **El Contenido:** 
   - No copies y pegues el código fuente completo.
   - Añade el nombre de la nueva función, componente o flujo.
   - Describe brevemente qué hace y cómo interactúa con el resto del módulo.
4. **El Propósito:** Esto existe única y exclusivamente para **evitar que el agente tenga que volver a leer todo el código fuente** en el futuro para saber qué funciones existen. El archivo Markdown debe ser la "fuente de la verdad" del módulo.

## Regla de Oro
Bajo **ninguna circunstancia** debes dar por terminada una tarea de desarrollo sin haber ido silenciosamente al archivo `.md` del módulo correspondiente y dejar constancia de lo que acabas de construir. Si haces un cambio en `src/modules/ecommerce/...`, debes actualizar `docs/modules/ecommerce.md` con un resumen de las nuevas funciones agregadas.
