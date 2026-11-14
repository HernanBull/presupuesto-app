import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Minus, Trash2, Package, Sparkles, CheckCircle2, 
  AlertCircle, DollarSign, Image as ImageIcon, Tag, Search, ArrowLeft, Check 
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import MultiImageUploader from './MultiImageUploader';

export default function ComboBuilderModal({ isOpen, onClose, onComboSaved, existingCombo = null, availableProducts = [] }) {
  const workspaceId = localStorage.getItem('activeWorkspace');

  // Estados del Formulario
  const [comboName, setComboName] = useState('');
  const [comboDescription, setComboDescription] = useState('');
  const [comboPrice, setComboPrice] = useState('');
  const [comboStock, setComboStock] = useState('10');
  const [comboImages, setComboImages] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState('🎁 COMBO ESPECIAL');
  const [comboItems, setComboItems] = useState([]); // [{ id, name, price, qty, image_url, unit_type }]
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Inicializar o limpiar
  useEffect(() => {
    if (existingCombo) {
      setComboName(existingCombo.name || '');
      setComboDescription(existingCombo.description || '');
      setComboPrice(existingCombo.discount_price ? String(existingCombo.discount_price) : String(existingCombo.price || ''));
      setComboStock(String(existingCombo.stock_vitrina ?? existingCombo.stock ?? '10'));
      
      const loadedImages = Array.isArray(existingCombo.images) && existingCombo.images.length > 0
        ? existingCombo.images
        : Array.isArray(existingCombo.metadata?.images) && existingCombo.metadata.images.length > 0
          ? existingCombo.metadata.images
          : existingCombo.image_url ? [existingCombo.image_url] : [];
      setComboImages(loadedImages);
      setSelectedBadge(existingCombo.metadata?.combo_badge || '🎁 COMBO ESPECIAL');
      
      const rawItems = existingCombo.metadata?.combo_items || [];
      setComboItems(rawItems.map(it => ({
        id: it.id,
        name: it.name,
        price: Number(it.price || 0),
        qty: Number(it.qty || 1),
        image_url: it.image_url || '',
        unit_type: it.unit || it.unit_type || 'und'
      })));
    } else {
      setComboName('');
      setComboDescription('');
      setComboPrice('');
      setComboStock('10');
      setComboImages([]);
      setSelectedBadge('🎁 COMBO ESPECIAL');
      setComboItems([]);
      setProductSearch('');
      setError(null);
    }
  }, [existingCombo, isOpen]);

  // Cálculos Financieros
  const originalSumPrice = comboItems.reduce((acc, it) => acc + (it.price * it.qty), 0);
  const numericComboPrice = Number(comboPrice) || 0;
  const savingsAmount = originalSumPrice > numericComboPrice ? originalSumPrice - numericComboPrice : 0;
  const savingsPct = originalSumPrice > 0 && numericComboPrice > 0 && originalSumPrice > numericComboPrice
    ? Math.round((savingsAmount / originalSumPrice) * 100)
    : 0;

  // Sugerir precio del combo con 15% de descuento por defecto cuando se añaden items y comboPrice está vacío
  useEffect(() => {
    if (!existingCombo && comboItems.length > 0 && !comboPrice && originalSumPrice > 0) {
      setComboPrice((originalSumPrice * 0.85).toFixed(2));
    }
  }, [comboItems.length, originalSumPrice]);

  // Auto-llenar imagen con la del primer producto si no tiene imagen propia
  useEffect(() => {
    if ((!comboImages || comboImages.length === 0) && comboItems.length > 0 && comboItems[0].image_url) {
      setComboImages([comboItems[0].image_url]);
    }
  }, [comboItems, comboImages]);

  // Manejo de Items
  const handleAddItem = (product) => {
    const existing = comboItems.find(it => it.id === product.id);
    if (existing) {
      setComboItems(prev => prev.map(it => 
        it.id === product.id ? { ...it, qty: it.qty + 1 } : it
      ));
    } else {
      setComboItems(prev => [...prev, {
        id: product.id,
        name: product.name,
        price: Number(product.price || 0),
        qty: 1,
        image_url: product.image_url || '',
        unit_type: product.unit_type || 'und'
      }]);
    }
  };

  const handleUpdateQty = (productId, delta) => {
    setComboItems(prev => prev.map(it => {
      if (it.id === productId) {
        const newQty = it.qty + delta;
        return newQty > 0 ? { ...it, qty: newQty } : null;
      }
      return it;
    }).filter(Boolean));
  };

  const handleRemoveItem = (productId) => {
    setComboItems(prev => prev.filter(it => it.id !== productId));
  };

  // Guardar en Supabase
  const handleSaveCombo = async () => {
    setError(null);

    if (!comboName.trim()) {
      setError('Por favor indica un nombre para el combo (Ej. Mega Combo Víveres Quincenal).');
      return;
    }
    if (comboItems.length < 2) {
      setError('Un combo debe incluir al menos 2 productos del inventario.');
      return;
    }
    if (numericComboPrice <= 0) {
      setError('Indica un precio de venta válido para el combo.');
      return;
    }

    try {
      setSaving(true);
      const comboId = existingCombo?.id || String(Date.now());
      
      const payload = {
        id: comboId,
        workspace_id: workspaceId,
        name: comboName.trim(),
        description: comboDescription.trim() || `Combo especial incluye: ${comboItems.map(i => `${i.qty}x ${i.name}`).join(', ')}`,
        category: 'Combos',
        created_at: existingCombo?.created_at || new Date().toISOString(),
        price: Number(numericComboPrice.toFixed(2)),
        discount_price: 0,
        is_offer: 0,
        stock: Number(comboStock) || 10,
        stock_vitrina: Number(comboStock) || 10,
        publish_status: 'Publicado',
        image_url: (comboImages && comboImages[0]) ? comboImages[0] : (comboItems[0]?.image_url || null),
        unit_type: 'combo',
        step_size: 1,
        metadata: {
          ...(existingCombo?.metadata || {}),
          images: comboImages,
          is_combo: true,
          combo_badge: selectedBadge,
          combo_items: comboItems.map(it => ({
            id: it.id,
            name: it.name,
            qty: it.qty,
            price: it.price,
            image_url: it.image_url || null,
            unit: it.unit_type
          })),
          original_sum_price: Number(originalSumPrice.toFixed(2)),
          savings_usd: Number(savingsAmount.toFixed(2)),
          savings_percentage: savingsPct
        }
      };

      let { error: dbError } = await supabase
        .from('ecommerce_products')
        .upsert(payload);

      if (dbError && dbError.message && dbError.message.includes("Could not find the '")) {
        const match = dbError.message.match(/Could not find the '([^']+)' column/);
        if (match && match[1] && payload[match[1]] !== undefined) {
          delete payload[match[1]];
          const retryRes = await supabase.from('ecommerce_products').upsert(payload);
          dbError = retryRes.error;
        }
      }

      if (dbError) throw dbError;

      if (onComboSaved) onComboSaved(payload);
      onClose();
    } catch (err) {
      console.error('Error guardando combo:', err);
      setError('Error guardando combo: ' + (err.message || 'Error de conexión'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Filtrado de productos disponibles que no sean ya combos
  const candidateProducts = availableProducts.filter(p => 
    !p.metadata?.is_combo &&
    p.category !== 'Combos' &&
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const comboBadges = [
    '🎁 COMBO ESPECIAL',
    '💥 PACK AHORRO',
    '🔥 COMBO FAMILIAR',
    '⭐ SUPER PACK',
    '🥗 COMBO SALUDABLE',
    '🛠️ KIT PROFESIONAL'
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col w-full h-full min-h-screen overflow-hidden animate-in fade-in duration-150">
        {/* Header de Ventana Completa (Rápido, Fluido y sin Ventanas Flotantes Pequeñas) */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-3.5 sm:px-6 text-white flex justify-between items-center relative shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Volver"
            >
              <ArrowLeft size={19} />
            </button>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <Package size={20} className="text-white" />
                {existingCombo ? 'Modificar Combo' : 'Crear Combo de Productos'}
              </h3>
              <p className="text-white/85 text-[11px] sm:text-xs">
                Agrupa productos de tu inventario para venderlos juntos con un precio especial en vitrina.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/15 hover:bg-black/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Formulario en Secuencia Optimizada:
            1. Nombre & Etiqueta
            2. Agregar Producto (Catálogo con buscador)
            3. Productos Incluidos (Cantidades y total)
            4. Precio Especial del Combo & Ahorro
            5. Stock Disponible
            6. Fotos del Combo (De último)
        */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full">
          <div className="space-y-6 pb-24">
            {error && (
              <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2 shadow-xs">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ENCABEZADO DEL COMBO: Nombre y Etiqueta Promocional */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div>
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block mb-1.5">
                  Nombre del Combo *
                </label>
                <input
                  type="text"
                  value={comboName}
                  onChange={(e) => setComboName(e.target.value)}
                  placeholder="Ej. Mega Combo Víveres Quincenal, Parrillada Familiar..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  Etiqueta Promocional
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {comboBadges.map((badge) => (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => setSelectedBadge(badge)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                        selectedBadge === badge
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm font-black scale-102'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      {badge}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PASO 1: AGREGAR PRODUCTO (Catálogo disponible con buscador) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Agregar Productos al Combo
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Busca y toca los productos de tu inventario que formarán parte de este paquete.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {candidateProducts.length} disponibles
                </span>
              </div>

              {/* Buscador */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar producto por nombre..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Lista Deslizable de Productos para Añadir Rápido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {candidateProducts.map((p) => {
                  const existingItem = comboItems.find(it => it.id === p.id);
                  const isSelected = Boolean(existingItem);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleAddItem(p)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer group active:scale-[0.99] ${
                        isSelected
                          ? 'bg-amber-50/70 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30'
                          : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-amber-400 hover:bg-amber-50/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Tag size={16} className="text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-600 transition-colors">
                            {p.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-black text-slate-700 dark:text-slate-300">
                              ${Number(p.price || 0).toFixed(2)}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-black text-amber-700 bg-amber-100 dark:bg-amber-500/20 px-1.5 py-0.2 rounded-md">
                                {existingItem.qty} en combo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddItem(p);
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black transition-all cursor-pointer shrink-0 ml-2 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-500'
                        }`}
                        title="Agregar una unidad al combo"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  );
                })}

                {candidateProducts.length === 0 && (
                  <div className="col-span-full p-6 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                    No se encontraron productos coincidentes en el inventario.
                  </div>
                )}
              </div>
            </div>

            {/* PASO 2: PRODUCTOS INCLUIDOS EN EL COMBO (Cantidades, subtotales y eliminación) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Productos Incluidos en el Combo ({comboItems.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Ajusta la cantidad de cada ítem que recibirá el cliente al comprar el paquete.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-500 block">Suma Regular Total</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    ${originalSumPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {comboItems.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-amber-200 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5 rounded-2xl space-y-1.5">
                  <Package size={30} className="mx-auto text-amber-500 opacity-80" />
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">El combo aún está vacío</p>
                  <p className="text-[11px] text-slate-500">
                    Selecciona productos en el paso 1 anterior usando el botón (+) para agregarlos al combo.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {comboItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-700 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Tag size={16} className="text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-500">${item.price.toFixed(2)} c/u</p>
                        </div>
                      </div>

                      {/* Controles de Cantidad */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                          title="Restar cantidad"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-7 text-center text-xs font-black text-slate-900 dark:text-white">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                          title="Sumar cantidad"
                        >
                          <Plus size={13} />
                        </button>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 w-16 text-right">
                          ${(item.price * item.qty).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="w-7 h-7 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center ml-1 transition-colors cursor-pointer"
                          title="Quitar del combo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PASO 3: PRECIO ESPECIAL DEL COMBO Y AHORRO */}
            <div className="bg-gradient-to-br from-amber-50 via-orange-50/60 to-white dark:from-amber-500/10 dark:via-orange-500/5 dark:to-slate-900 border-2 border-amber-300 dark:border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Precio Especial del Combo ($) *
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Establece el precio promocional que pagará el cliente por todo el paquete en vitrina.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span>Precio de los productos por separado: </span>
                  <strong className="text-slate-900 dark:text-white">${originalSumPrice.toFixed(2)}</strong>
                </div>

                <div className="relative w-full sm:w-44">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-black text-amber-600">
                    $
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={comboPrice}
                    onChange={(e) => setComboPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 bg-white dark:bg-slate-950 border-2 border-amber-400 rounded-xl text-lg font-black text-slate-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Banner de Ahorro para el Cliente */}
              {savingsAmount > 0 ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs flex-wrap gap-2">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Sparkles size={15} className="text-emerald-600" />
                    ¡Ahorro del Cliente: <strong>${savingsAmount.toFixed(2)}</strong> ({savingsPct}% OFF)!
                  </span>
                  <span className="text-[11px] text-slate-400 line-through">
                    Antes: ${originalSumPrice.toFixed(2)}
                  </span>
                </div>
              ) : originalSumPrice > 0 && numericComboPrice >= originalSumPrice ? (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  💡 Tip: Para que el combo sea atractivo, fija un precio menor a la suma regular (${originalSumPrice.toFixed(2)}).
                </div>
              ) : null}
            </div>

            {/* PASO 4: STOCK DISPONIBLE DEL COMBO */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shrink-0">
                  4
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Stock Disponible del Combo
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Cantidad de combos completos disponibles para vender en la vitrina.
                  </p>
                </div>
              </div>

              <input
                type="number"
                min="1"
                value={comboStock}
                onChange={(e) => setComboStock(e.target.value)}
                placeholder="10"
                className="w-full sm:w-48 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* PASO 5: FOTOS DEL COMBO (DE ÚLTIMO) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shrink-0">
                  5
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Fotos del Combo
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Sube fotos del combo preparado o presentación (con cuadro de superficie 1:1 para encuadre perfecto).
                  </p>
                </div>
              </div>

              <MultiImageUploader
                images={comboImages}
                onChange={setComboImages}
                folder="combos"
                maxImages={5}
                title="Fotos del Combo"
                subtitle="Sube fotos del combo preparado o presentación."
              />
            </div>
          </div>
        </div>

        {/* Footer de Acciones Sticky / Fijo al Borde Inferior */}
        <div className="p-4 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md flex items-center justify-between sm:justify-end gap-3 shrink-0 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveCombo}
            disabled={saving || comboItems.length < 2 || !comboPrice || Number(comboPrice) <= 0}
            className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <span>Guardar Combo (${Number(comboPrice || 0).toFixed(2)})</span>
            )}
          </button>
        </div>
      </div>
    </AnimatePresence>
  );
}
