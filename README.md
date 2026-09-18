# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Registro de Errores

### Pantalla Negra en ProductStudio e Inventario (Registrar Entrada)
- **Problema:** Al entrar a agregar un nuevo producto o al hacer clic en "Registrar Entrada" en el Inventario, la aplicación mostraba una pantalla negra.
- **Causa:** Un error fatal de React causado por imports faltantes e incorrectos desde la librería `lucide-react` en `ProductStudio.jsx`. Se intentó importar `ImageIcon` directamente (el cual se exporta como `Image`) y faltaban los imports de `Star`, `ShoppingBag` y `Check` para la vista previa en vivo.
- **Solución:** Se corrigieron los imports en `ProductStudio.jsx` (`import { Image as ImageIcon, Star, ShoppingBag, Check } from 'lucide-react';`).
