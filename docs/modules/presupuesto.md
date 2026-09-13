# Módulo: Presupuesto
**Descripción:** Módulo centrado en la generación, gestión y seguimiento de presupuestos y contratos para clientes.

## 🏗️ Arquitectura y Archivos Clave
- `pages/PresupuestoDashboard.jsx`: Panel principal y probablemente el orquestador principal del estado y la UI del módulo.
- `components/`: Componentes reutilizables específicos para el armado visual e interactivo de los presupuestos.
- `contratos/`: Lógica o plantillas relacionadas a la emisión de contratos legales, términos de servicio o PDFs.
- `logo/`: Assets o componentes visuales de branding inyectados en los presupuestos exportables.
- `utils/`: Funciones de formateo monetario, cálculos matemáticos y utilidades de renderizado.

## ⚙️ Lógica Principal y Flujo de Datos
- Un dashboard central (`PresupuestoDashboard`) consolida la creación y visión general de las cotizaciones emitidas, organizando flujos hacia componentes internos.

## ⚠️ Notas Críticas / Gotchas
- Este módulo maneja componentes visuales específicos (`logo`, `contratos`) enfocados a exportación o presentación formal hacia el cliente. Cambios en el modelo de datos de un presupuesto deben ser probados minuciosamente para no romper los renderizados de contratos.
