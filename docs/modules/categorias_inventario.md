# 📦 PLAN DE IMPLEMENTACIÓN: SISTEMA DE CATEGORÍAS EN INVENTARIO AXONMARKET

> **Documento Oficial de Arquitectura y Guía Técnica**  
> **Ubicación**: `docs/PLAN_IMPLEMENTACION_CATEGORIAS_INVENTARIO_AXONMARKET.md`  
> **Módulo**: E-commerce / Gestión de Inventario y Logística (`InventoryManager.jsx`)  
> **Objetivo**: Incorporar categorización completa, filtrado dinámico, asignación rápida de nuevas categorías y visualización estética en el módulo de Inventario de AxonMarket.  
> **Fecha**: Octubre 2026  
> **Estado**: Implementado y Verificado  

---

## 🎯 1. OBJETIVO Y JUSTIFICACIÓN

Actualmente, el panel de **Logística e Inventario** de AxonMarket permite monitorear existencias, registrar mermas, auditar stock y transferir a vitrina. Sin embargo, los artículos se presentaban como una lista plana sin segmentación por rubro o categoría, lo cual:
1. Dificulta al comerciante encontrar productos rápidamente cuando el catálogo supera los 50 artículos.
2. Impide visualizar el stock y los márgenes por departamento (ej: *Alimentos*, *Bebidas*, *Limpieza*, *Ferretería*, etc.).
3. Desaprovechaba la columna `category` que ya almacena la base de datos Supabase (`ecommerce_products`) y que sincroniza el sistema de punto de venta AxonPOS.

---

## 🏗️ 2. ARQUITECTURA DE DATOS Y SINCRONIZACIÓN

```
┌────────────────────────────────────────────────────────┐
│                   SUPABASE DATABASE                    │
│                 ecommerce_products                     │
│  - id: text (PK)                                       │
│  - workspace_id: text                                  │
│  - name: text                                          │
│  - category: text <────────── (Campo Central)          │
│  - subcategory: text                                   │
│  - stock: numeric                                      │
│  - price: numeric                                      │
│  - cogs: numeric                                       │
│  - publish_status: text ('Publicado' | 'Borrador')     │
└───────────────▲────────────────────────▲───────────────┘
                │                        │
         Sincronización            Sincronización
         Bidireccional               en Tiempo Real
                │                        │
┌───────────────┴───────────────┐ ┌──────┴───────────────┐
│           AXONPOS             │ │     AXONMARKET       │
│         (Escritorio)          │ │       (Web)          │
│ - Dexie.js (Local DB)         │ │ - InventoryManager   │
│ - CatalogJerarquicoModal      │ │ - Filtro por Cat.    │
│ - Sincronizador de Productos  │ │ - Datalist en Modal  │
└───────────────────────────────┘ └──────────────────────┘
```

### Comportamiento del Campo `category`:
- **Por Defecto**: Si un producto no tiene categoría asignada, se normaliza automáticamente como `'General'`.
- **Detección Dinámica**: Las categorías se descubren automáticamente a partir de los productos existentes en el inventario del comerciante.
- **Creación en Caliente**: El comerciante puede seleccionar una existente o escribir una nueva categoría directamente en el formulario del producto sin necesidad de ir a configuraciones adicionales.

---

## 📱 3. EXPERIENCIA DE USUARIO (UI / UX)

### A. Barra de Herramientas (Toolbar):
- **Búsqueda**: SKU, Nombre o Proveedor.
- **Filtro de Categoría**: Selector desplegable con todas las categorías descubiertas (`Todas las Categorías`, `Alimentos`, `Bebidas`, etc.).
- **Filtro de Estado**: `Todos`, `Publicados`, `Borradores`.
- **Botón Generar Pedidos**: Mantiene su funcionalidad para compras sugeridas.

### B. Vista Móvil (Tarjetas):
- Cada tarjeta de producto muestra un chip con su categoría:
  `[🏷️ Alimentos]` junto al nombre y SKU, con colores acordes a la identidad de AxonMarket.

### C. Vista de Escritorio (Tabla):
- Se añade una columna dedicada **"Categoría"** con un badge estilizado e ícono `Tag`, permitiendo escaneo visual inmediato.

### D. Modal de Creación / Edición de Producto:
- Campo **Categoría** con soporte de `<datalist>`:
  - Despliega las categorías ya existentes para selección en 1 clic.
  - Permite escribir libremente cualquier nombre de categoría nueva.

---

## 🛠️ 4. GUÍA PASO A PASO DE IMPLEMENTACIÓN EN CÓDIGO

### Paso 1: Extender la Carga de Datos en `fetchInventory`
En [`InventoryManager.jsx`](file:///f:/AxonPos/Presupuesto/src/modules/ecommerce/pages/InventoryManager.jsx):
```javascript
// Normalizar el campo category al mapear los productos desde Supabase
setInventory(data.map(p => ({
  ...p,
  stock: p.stock || 0,
  cogs: p.cogs || 0,
  category: p.category || 'General',
  subcategory: p.subcategory || '',
  minStock: p.min_stock || 5,
  maxStock: p.max_stock || '',
  supplier: p.supplier || '',
  stockVitrina: p.stock_vitrina || 0,
  publishStatus: p.publish_status || 'Borrador',
})));
```

### Paso 2: Estado del Filtro y Descubrimiento Dinámico
```javascript
const [categoryFilter, setCategoryFilter] = useState('Todas');

// Extraer categorías únicas presentes en los productos
const availableCategories = useMemo(() => {
  const cats = new Set(inventory.map(i => i.category || 'General').filter(Boolean));
  return ['Todas', ...Array.from(cats).sort()];
}, [inventory]);
```

### Paso 3: Aplicar el Filtro Reactivo
```javascript
const filteredInventory = inventory.filter(item => {
  const matchesSearch = 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
  
  const matchesStatus = statusFilter === 'Todos' || item.publishStatus === statusFilter;
  const matchesCategory = categoryFilter === 'Todas' || (item.category || 'General') === categoryFilter;

  return matchesSearch && matchesStatus && matchesCategory;
});
```

### Paso 4: Renderizar el Selector en la Barra de Herramientas
```jsx
<select
  value={categoryFilter}
  onChange={(e) => setCategoryFilter(e.target.value)}
  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
>
  <option value="Todas">Todas las Categorías</option>
  {availableCategories.filter(c => c !== 'Todas').map(cat => (
    <option key={cat} value={cat}>{cat}</option>
  ))}
</select>
```

### Paso 5: Mostrar la Categoría en Tarjetas Móviles y Tabla
- **Móvil**:
```jsx
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
  {item.category || 'General'}
</span>
```
- **Desktop**:
```jsx
<td className="py-3 px-4">
  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
    <Tag size={12} className="text-amber-500" />
    {item.category || 'General'}
  </span>
</td>
```

### Paso 6: Soporte en el Modal de Creación / Edición
1. **Estado inicial del formulario**:
```javascript
category: 'General'
```
2. **Input asistido con datalist**:
```jsx
<div className="space-y-2">
  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
    <span>Categoría</span>
    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-normal">Elige o escribe una nueva</span>
  </label>
  <input 
    type="text" 
    name="category"
    list="inventory-categories-list"
    placeholder="Ej: Alimentos, Bebidas, Limpieza..."
    value={formData.category || ''}
    onChange={handleInputChange}
    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-white" 
  />
  <datalist id="inventory-categories-list">
    {availableCategories.filter(c => c !== 'Todas').map(cat => (
      <option key={cat} value={cat} />
    ))}
  </datalist>
</div>
```
3. **Persistencia en Supabase**:
```javascript
const payload = {
  name: newItem.name,
  category: newItem.category ? newItem.category.trim() : 'General',
  stock: newItem.stock,
  cogs: newItem.cogs,
  price: newItem.price,
  min_stock: newItem.minStock,
  max_stock: newItem.maxStock || null,
  supplier: newItem.supplier,
  stock_vitrina: newItem.stockVitrina,
  workspace_id: workspaceId
};
```

---

## 📊 5. MATRIZ DE VERIFICACIÓN Y PRUEBAS

| Escenario | Resultado Esperado | Estado |
| :--- | :--- | :---: |
| **Carga inicial** | El inventario carga los productos y extrae todas las categorías presentes. | ✅ |
| **Filtrado por categoría** | Al cambiar el select, solo se listan los productos de la categoría elegida. | ✅ |
| **Opción "Todas las Categorías"** | Muestra el catálogo completo independientemente de la categoría. | ✅ |
| **Crear producto con categoría existente** | La categoría queda asignada y el filtro la reconoce de inmediato. | ✅ |
| **Crear producto con categoría nueva** | La nueva categoría se almacena en Supabase y se agrega a las opciones del filtro al refrescar. | ✅ |
| **Vista Móvil** | Las tarjetas de producto muestran el badge con tipografía legible y colores adaptables al tema. | ✅ |
| **Vista Desktop** | La columna "Categoría" se visualiza alineada y con ícono identificador. | ✅ |

---

## 🚀 6. CONCLUSIÓN
Con esta implementación, la pantalla de **Logística e Inventario** de AxonMarket queda unificada con el modelo de datos de AxonPOS y el catálogo del cliente final (`PublicStore`), ofreciendo al comerciante orden, velocidad de búsqueda y control visual sobre sus existencias.
