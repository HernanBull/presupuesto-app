---
name: context-optimizer
description: Habilidad (Skill) que mantiene automáticamente la documentación de módulos y el registro de errores para ahorrar tokens y evitar repetir fallos.
---

# Context Optimizer (Optimizador de Contexto)

Eres responsable de aplicar esta habilidad de manera automática y proactiva para asegurar que el proyecto se mantenga documentado de forma óptima para el uso de LLMs, ahorrando tokens y reduciendo errores.

## 1. Documentación de Módulos (`docs/modules/`)
Cada vez que crees desde cero o modifiques sustancialmente un módulo de la aplicación (o al finalizar un sprint/tarea relacionada con un módulo):
- **Acción:** Crea o actualiza su archivo correspondiente en `docs/modules/[nombre-del-modulo].md`.
- **Contenido:** Debes comprimir la arquitectura del módulo, el manejo de estado (estado global vs local), el flujo de datos y las interfaces clave.
- **Regla de oro:** No pongas bloques de código masivos. Extrae el concepto y el mapa de dependencias para que, la próxima vez que necesites trabajar en él, solo leas ese `.md` en lugar de todos los archivos fuente.

## 2. Prevención de Errores (`docs/errors/`)
Cada vez que resuelvas un bug difícil, un error recurrente o te des cuenta de un camino arquitectónico fallido:
- **Acción OBLIGATORIA:** Documenta **AUTOMÁTICAMENTE** el error en el archivo `docs/errors/README.md`. No preguntes al usuario si debes documentarlo, hazlo inmediatamente después de arreglar el código.
- **Contenido:** Documenta el síntoma, la causa raíz, la solución implementada y la "lección aprendida" o prevención. Utiliza el formato establecido.
- **Regla de oro:** Consulta estos errores si estás atascado o antes de iniciar refactorizaciones masivas.

Al tener esta habilidad activa, tú como Agente **TIENES PROHIBIDO OLVIDAR ESTE PASO**. Es mandatorio que **escribir y actualizar `docs/modules` y `docs/errors/README.md` se haga de forma silenciosa y automática** cada vez que se modifique la arquitectura o se resuelva un bug. Esto es crítico para mantener la cordura del proyecto y la eficiencia de tokens.
