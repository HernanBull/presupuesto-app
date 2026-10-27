import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Minus, Trash2, Package, Sparkles, CheckCircle2, 
  AlertCircle, DollarSign, Image as ImageIcon, Tag, Search, ArrowRight 
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

export default function ComboBuilderModal({ isOpen, onClose, onComboSaved, existingCombo = null, availableProducts = [] }) {
  const workspaceId = localStorage.getItem('activeWorkspace');

  // Estados del Formulario
  const [comboName, setComboName] = useState('');
  const [comboDescription, setComboDescription] = useState('');
  const [comboPrice, setComboPrice] = useState('');
  const [comboStock, setComboStock] = useState('10');
  const [comboImage, setComboImage] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('🎁 COMBO ESPECIAL');
  const [comboItems, setComboItems] = useState([]); // [{ id, name, price, qty, image_url, unit_type }]
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `combos/${workspaceId || 'general'}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('ecommerce').upload(path, file, { upsert: true });
      if (!upErr) {
        const { data } = supabase.storage.from('ecommerce').getPublicUrl(path);
        if (data?.publicUrl) setComboImage(data.publicUrl);
      } else {
        const reader = new FileReader();
        reader.onload = (re) => setComboImage(re.target.result);
        reader.readAsDataURL(file);
      }
    } catch(err) {
      console.error('Error subiendo imagen:', err);
      const reader = new FileReader();
      reader.onload = (re) => setComboImage(re.target.result);
      reader.readAsDataURL(file);
    } finally {
      setUploadingImg(false);
    }
  };

  // Inicializar o limpiar
  useEffect(() => {
    if (existingCombo) {
      setComboName(existingCombo.name || '');
      setComboDescription(existingCombo.description || '');
      setComboPrice(existingCombo.discount_price ? String(existingCombo.discount_price) : String(existingCombo.price || ''));
      setComboStock(String(existingCombo.stock_vitrina ?? existingCombo.stock ?? '10'));
      setComboImage(existingCombo.image_url || '');
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
      setComboImage('');
      setSelectedBadge('🎁 COMBO ESPECIAL');
      setComboItems([]);
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
    if (!comboImage && comboItems.length > 0 && comboItems[0].image_url) {
      setComboImage(comboItems[0].image_url);
    }
  }, [comboItems, comboImage]);

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
      setError('Por favor indica un nombre para el combo (Ej. Combo Víveres Quincenal).');
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
        image_url: comboImage.trim() || comboItems[0]?.image_url || null,
        unit_type: 'combo',
        step_size: 1,
        metadata: {
          ...(existingCombo?.metadata || {}),
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

      const { error: dbError } = await supabase
        .from('ecommerce_products')
        .upsert(payload);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 text-white flex justify-between items-center relative shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                <Package size={22} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">
                  {existingCombo ? 'Modificar Combo' : 'Crear Combo de Productos'}
                </h3>
                <p className="text-white/80 text-xs">
                  Agrupa productos de tu inventario para venderlos juntos como un combo.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/10 hover:bg-black/20 text-white flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Cuerpo con 2 columnas (Productos Seleccionados vs Catálogo para Agregar) */}
          <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Columna Izquierda: Configuración del Combo (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Nombre y Badge */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Nombre del Combo *
                  </label>
                  <input
                    type="text"
                    value={comboName}
                    onChange={(e) => setComboName(e.target.value)}
                    placeholder="Ej. Mega Combo Víveres Quincenal"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Badge Promocional */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Etiqueta Promocional
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {comboBadges.map((badge) => (
                      <button
                        key={badge}
                        type="button"
                        onClick={() => setSelectedBadge(badge)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all ${
                          selectedBadge === badge
                            ? 'bg-amber-500 text-black border-amber-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {badge}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lista de Productos Incluidos en el Combo */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Productos Incluidos ({comboItems.length})
                  </label>
                  <span className="text-[11px] font-bold text-slate-500">
                    Suma Regular: <strong className="text-slate-800 dark:text-slate-200">${originalSumPrice.toFixed(2)}</strong>
                  </span>
                </div>

                {comboItems.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-amber-200 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5 rounded-2xl">
                    <Package size={28} className="mx-auto text-amber-500 mb-1.5 opacity-80" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">El combo aún está vacío</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Selecciona productos de la lista de la derecha para agregarlos al combo.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {comboItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-700 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600">
                            {item.image_url
                              ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                              : <Tag size={16} className="text-slate-400" />
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{item.name}</p>
                            <p className="text-[10px] text-slate-500">${item.price.toFixed(2)} c/u</p>
                          </div>
                        </div>

                        {/* Controles de Cantidad */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.id, -1)}
                            className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-slate-800 dark:text-white">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.id, 1)}
                            className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100"
                          >
                            <Plus size={12} />
                          </button>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300 w-14 text-right">
                            ${(item.price * item.qty).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="w-6 h-6 text-red-500 hover:text-red-700 flex items-center justify-center ml-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Caja de Fijación de Precios y Ahorro */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-300 dark:border-amber-500/40 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                      Precio Especial del Combo ($) *
                    </label>
                    <p className="text-[10px] text-slate-500">Lo que pagará el cliente en vitrina</p>
                  </div>
                  <div className="relative w-36">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={comboPrice}
                      onChange={(e) => setComboPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border-2 border-amber-400 rounded-xl text-lg font-black text-slate-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Banner de Ahorro para el Cliente */}
                {savingsAmount > 0 && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-emerald-600" />
                      ¡Ahorro del Cliente: <strong>${savingsAmount.toFixed(2)}</strong> ({savingsPct}% OFF)!
                    </span>
                    <span className="text-[10px] text-slate-400 line-through">
                      Antes: ${originalSumPrice.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Stock y Foto del Combo */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Stock Disponible del Combo
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={comboStock}
                    onChange={(e) => setComboStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Foto del Combo
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs">
                      <ImageIcon size={14} className="text-amber-500" />
                      <span>{uploadingImg ? 'Subiendo...' : comboImage ? 'Cambiar Foto' : 'Subir Foto'}</span>
                      <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" disabled={uploadingImg} />
                    </label>
                    {comboImage && (
                      <div className="w-9 h-9 rounded-lg border border-amber-300 overflow-hidden shrink-0 bg-white shadow-2xs">
                        <img src={comboImage} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Catálogo para Seleccionar Productos (5 cols) */}
            <div className="md:col-span-5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 flex flex-col">
              <div className="mb-2.5">
                <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Plus size={14} className="text-amber-500" /> Agregar Productos
                </p>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Lista de Candidatos */}
              <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[380px] pr-1">
                {candidateProducts.map((p) => {
                  const isSelected = comboItems.some(it => it.id === p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleAddItem(p)}
                      className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                            : <Tag size={14} className="text-slate-400" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">${Number(p.price).toFixed(2)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-black shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-amber-100 hover:text-amber-700'
                        }`}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  );
                })}

                {candidateProducts.length === 0 && (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No se encontraron productos coincidentes.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer de Acciones */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveCombo}
              disabled={saving || comboItems.length < 2 || !comboPrice || Number(comboPrice) <= 0}
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <span>Guardar Combo (${Number(comboPrice || 0).toFixed(2)})</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
