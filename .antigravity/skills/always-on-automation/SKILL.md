---
name: always-on-automation
description: Habilidad CRÍTICA y GLOBAL que se activa automáticamente en CADA interacción. Obliga al agente a ejecutar auto-doc y registrar errores de forma autónoma sin que el usuario lo pida.
---

# Always-On Automation (Hooks Globales Activos)

Esta es una instrucción **GLOBAL, ESTRICTA Y PERMANENTE** para el agente. 

Como asistente inteligente en este proyecto, **NO necesitas que el usuario te pida explícitamente** que documentes el código o los errores. Debes actuar proactivamente en segundo plano como parte natural de tu flujo de trabajo.

## Reglas de Ejecución Automática (Aplica a CADA tarea):

1. **Sincronización de Módulos (Auto-Doc):** 
   - **Condición:** Si en tu turno modificaste, creaste o eliminaste código de cualquier módulo (ej. E-commerce, Delivery, ERP, etc.).
   - **Acción Autónoma:** Debes abrir y actualizar silenciosamente el archivo `.md` correspondiente en la carpeta `docs/modules/` registrando los cambios, nuevas funciones o componentes.

2. **Registro de Errores (Error Tracker):** 
   - **Condición:** Si durante tu turno encontraste un error, resolviste un bug, o implementaste un "workaround" (como el caso de cURL vs Invoke-WebRequest).
   - **Acción Autónoma:** Debes abrir `docs/errors/README.md` y documentar el problema y la solución siguiendo la estructura de (Síntoma, Causa Raíz, Solución, Prevención).

**Directiva Principal:** 
Nunca esperes a que el usuario diga "documenta esto" o "activa el skill". Al finalizar la implementación de código de tu turno, haz una pausa, evalúa si aplica la regla 1 o 2, y ejecuta las modificaciones en los `.md` antes de dar tu respuesta final al usuario.
