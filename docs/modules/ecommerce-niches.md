# Arquitectura de Submódulos (Nichos) del E-commerce

**Descripción:** Este documento describe la arquitectura basada en Plugins/Submódulos (Nichos de Negocio) implementada para el módulo E-commerce. Esta arquitectura permite que el SaaS escale para soportar múltiples tipos de negocios (víveres, fruterías, comida rápida) sin contaminar el código principal (Core) de la tienda virtual. Para el MVP, nos centraremos exclusivamente en el rubro de comida.

## 🏗️ Estructura de Archivos

La lógica de nichos reside en `src/modules/ecommerce/niches/`:

- `Registry.jsx`: **El Gestor Central**. Su trabajo es mapear el `businessType` seleccionado por el usuario durante el registro (ej. `viveres`, `comida_rapida`) y devolver el archivo de configuración correspondiente. Si un negocio no tiene un submódulo específico, retorna un `defaultNiche`.
- `groceries/index.jsx`: Submódulo de Víveres de Alta Rotación. Inyecta lógica de unidad de medida (Kg, Litros) e incrementos fraccionarios de venta (paso).
- `fast_food/index.jsx`: Submódulo de Comida Rápida. Inyecta opciones vitales de personalización: Salsas, Notas a cocina, Adicionales pagos, Tiempo de preparación, e indicadores visuales de Bebida y Delivery Gratis.
- `fruit_shop/index.jsx`: Submódulo de Fruterías. Inyecta lógica de unidad de medida para frutas y verduras, controlando ventas por kilo y gramos.

## 🔌 ¿Cómo funciona la Inyección de Componentes?

El Core del E-commerce interactúa con el `Registry.jsx` para obtener componentes dinámicos e inyectarlos en sus vistas estáticas:

1. **En el panel de Administración (`ProductStudio.jsx`):**
   Al crear/editar un producto, el componente solicita al Registry `nicheConfig.components.ProductExtraFields`. Esto renderiza dinámicamente un bloque de formulario exclusivo para el negocio del usuario (ej. pedir "Salsas" solo si es comida rápida). Los datos ingresados se guardan automáticamente en el estado `formData` general del producto.

## 🚀 Nichos Soportados (MVP)

Para la etapa inicial del producto (MVP), el sistema se concentrará exclusivamente en la categoría de **Comida**, abarcando:
1. Víveres
2. Fruterías
3. Comida Rápida

Todos los demás nichos (farmacias, repuestos de bicicleta, panaderías, ferreterías, etc.) han sido removidos del alcance del MVP para poder probar el mercado de manera enfocada.

Para personalizar la lógica de un nicho:
1. Navega a `src/modules/ecommerce/niches/<nombre_del_nicho>/index.jsx`.
2. Habilita o deshabilita los `features` según el modelo de negocio.
3. Modifica el componente `ProductExtraFields` para agregar campos de configuración del lado del comerciante al subir productos.

> [!CAUTION]
> **REGLA ARQUITECTÓNICA ESTRICTA:** La carpeta `niches` y sus submódulos son **EXCLUSIVOS PARA LA ADMINISTRACIÓN DEL COMERCIO** (Backoffice). Está estrictamente prohibido inyectar lógica orientada al cliente final (como componentes de vitrina o carrito) desde estos archivos. La lógica del cliente operará como un monolito global separado.

> [!TIP]
> **Regla de Oro:** ¡NUNCA agregues lógica específica de un rubro (ej. condicionales `if (businessType === 'taller')`) dentro de `ProductStudio.jsx` o `PublicStore.jsx`! Toda lógica condicional debe aislarse en su respectivo submódulo en la carpeta `niches`.

## 📜 Historial de Cambios / Auditoría

- **Fecha y Hora:** 2026-09-13 16:25:00
- **Versión:** 1.1.0
- **Descripción:** Se documentaron los nichos pre-creados y se actualizaron las definiciones funcionales de los submódulos de Bodegas, Barberías y Carnicerías.

- **Fecha y Hora:** 2026-09-13 16:29:00
- **Versión:** 1.2.0
- **Descripción:** Se implementó y documentó el nicho de Celulares y Accesorios, inyectando selectores de Estado, Garantía y soporte para Trade-in (Equipos como parte de pago).

- **Fecha y Hora:** 2026-09-13 16:34:00
- **Versión:** 1.3.0
- **Descripción:** Reestructuración de nivel experto para el nicho de Comida Rápida, inyectando controles de Salsas, Notas a cocina, Adicionales pagos, Tiempos de preparación, e indicadores visuales de Bebida y Delivery Gratis.

- **Fecha y Hora:** 2026-09-13 16:42:00
- **Versión:** 1.4.0
- **Descripción:** (Corrección Arquitectónica) Se eliminaron todos los componentes `CartControls` de los submódulos. Se estableció la regla estricta de que la carpeta de nichos es de uso exclusivo para el Panel de Administración del Comercio, delegando la lógica del cliente a un monolito global.

- **Fecha y Hora:** 2026-09-14 17:45:00
- **Versión:** 1.6.0
- **Descripción:** (Refinamiento MVP) Se eliminó el campo del código de barras (SKU) del nicho `viveres` ya que el MVP no requiere funcionalidad POS. Se vinculó `ProductStudio.jsx` para leer las categorías predeterminadas de los nichos configurados en lugar de valores duros globales.

- **Fecha y Hora:** 2026-09-14 17:55:00
- **Versión:** 2.0.0
- **Descripción:** (Refactorización a Monolito) Se eliminó completamente la arquitectura de plugins/submódulos descentralizados (y la carpeta `niches`). Todo el código de campos adicionales por rubro se trasladó al componente monolítico `ProductStudio.jsx` utilizando renderizado condicional. La gestión de "features" también se delegó globalmente.

- **Fecha y Hora:** 2026-09-14 16:50:00
- **Versión:** 1.5.0
- **Descripción:** (Enfoque MVP) Se limpió la arquitectura de nichos eliminando 20 carpetas de submódulos no relacionados con comida. Se actualizó el `Registry.jsx` y la documentación para reflejar que el MVP se concentrará exclusivamente en Víveres, Fruterías y Comida Rápida.
