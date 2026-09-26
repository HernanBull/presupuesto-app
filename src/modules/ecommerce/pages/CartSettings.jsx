import React, { useState, useEffect } from 'react';
import { ShoppingCart, Smartphone, Monitor, Save, Eye, EyeOff, Check, X, ShieldCheck, Camera, CreditCard, LayoutTemplate, Box, FileText, ToggleLeft } from 'lucide-react';
import CartPreview from '../components/CartPreview';

export default function CartSettings() {
  // Configuración del Carrito
  const [cartType, setCartType] = useState('drawer'); // 'drawer' | 'modal'
  const [primaryColor, setPrimaryColor] = useState('#7c3aed');
  
  // Checkout y Formulario
  const [requireAddress, setRequireAddress] = useState(true);
  const [requireDni, setRequireDni] = useState(false);
  
  // Pagos
  const [paymentMobile, setPaymentMobile] = useState(true);
  const [ocrVerification, setOcrVerification] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [activeTab, setActiveTab] = useState('style'); // style, form, payments
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar configuración desde SQLite
  useEffect(() => {
    fetch(`https://axonmarket-api.onrender.com/api/workspaces`)
      .then(res => res.json())
      .then(data => {
        const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';
        const defaultWs = data.find(w => w.id === workspaceId);
        if (defaultWs && defaultWs.config && defaultWs.config.cart) {
          const config = defaultWs.config.cart;
          setCartType(config.cartType || 'drawer');
          setPrimaryColor(config.primaryColor || '#7c3aed');
          setRequireAddress(config.requireAddress !== undefined ? config.requireAddress : true);
          setRequireDni(config.requireDni || false);
          setPaymentMobile(config.paymentMobile !== undefined ? config.paymentMobile : true);
          setOcrVerification(config.ocrVerification || false);
        }
        setIsLoaded(true);
      })
      .catch(err => {
        console.error("Error fetching workspace config:", err);
        setIsLoaded(true);
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';
      // Primero obtener la config actual
      const res = await fetch(`https://axonmarket-api.onrender.com/api/workspaces`);
      const data = await res.json();
      const defaultWs = data.find(w => w.id === workspaceId) || { config: {} };
      
      const newConfig = {
        ...defaultWs.config,
        cart: {
          cartType, primaryColor, requireAddress, requireDni, paymentMobile, ocrVerification
        }
      };

      await fetch(`https://axonmarket-api.onrender.com/api/workspaces/${workspaceId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig })
      });
      
      setTimeout(() => {
        setIsSaving(false);
        alert('Configuración del carrito guardada en la base de datos exitosamente.');
      }, 500);
    } catch (err) {
      console.error(err);
      setIsSaving(false);
      alert('Error guardando la configuración');
    }
  };

  const configState = { cartType, primaryColor, requireAddress, requireDni, paymentMobile, ocrVerification };

  if (!isLoaded) return <div className="p-8 text-center text-slate-500 font-bold">Cargando...</div>;

  return (
    <div className="p-6 md:p-8 max-w-[1800px] mx-auto space-y-8 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            Configuración de Carrito <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Checkout</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Personaliza cómo tus clientes completan su compra.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg">
            <Save size={18} />
            {isSaving ? 'Guardando...' : 'Guardar Carrito'}
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 h-[800px]">
        {/* PANEL IZQUIERDO */}
        <div className="w-full xl:w-[450px] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-shrink-0">
          
          <div className="flex overflow-x-auto hide-scrollbar border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex-shrink-0">
            <button onClick={() => setActiveTab('style')} className={`flex items-center gap-2 px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'style' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>
              <LayoutTemplate size={14} /> Estilo Visual
            </button>
            <button onClick={() => setActiveTab('form')} className={`flex items-center gap-2 px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'form' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>
              <FileText size={14} /> Formulario
            </button>
            <button onClick={() => setActiveTab('payments')} className={`flex items-center gap-2 px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'payments' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>
              <CreditCard size={14} /> Pagos
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            {/* TABS CONTENIDO */}
            {activeTab === 'style' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-teal-500 flex items-center gap-2"><Box size={14} /> Tipo de Despliegue</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setCartType('drawer')} className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${cartType === 'drawer' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                      <ToggleLeft size={24} className="rotate-90" />
                      <span className="text-xs font-bold">Panel Lateral (Drawer)</span>
                    </button>
                    <button onClick={() => setCartType('modal')} className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${cartType === 'modal' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                      <LayoutTemplate size={24} />
                      <span className="text-xs font-bold">Ventana Central (Modal)</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-teal-500 flex items-center gap-2">Color del Botón de Pago</label>
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-14 w-14 rounded-xl cursor-pointer border-2 border-white dark:border-slate-800 shadow-sm appearance-none bg-transparent" />
                    <input type="text" value={primaryColor.toUpperCase()} onChange={(e) => setPrimaryColor(e.target.value)} className="bg-transparent font-mono text-sm font-bold focus:outline-none dark:text-white uppercase flex-1 px-2" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'form' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-xl border border-teal-100 dark:border-teal-900/50 mb-4">
                  <p className="text-xs text-teal-700 dark:text-teal-400 font-medium leading-relaxed">
                    Selecciona qué información es obligatoria pedirle a tu cliente antes de finalizar su pedido.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">Pedir Dirección</h4>
                      <p className="text-xs text-slate-500">Útil si haces envíos a domicilio.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={requireAddress} onChange={() => setRequireAddress(!requireAddress)} />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-teal-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">Pedir Documento (RUT/DNI)</h4>
                      <p className="text-xs text-slate-500">Para facturación oficial.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={requireDni} onChange={() => setRequireDni(!requireDni)} />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-teal-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Opciones de Pago</h3>
                  
                  <div className={`p-4 border-2 rounded-xl transition-all ${paymentMobile ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className={paymentMobile ? 'text-teal-600' : 'text-slate-400'} />
                        <div>
                          <h4 className={`text-sm font-bold ${paymentMobile ? 'text-teal-800 dark:text-teal-300' : 'text-slate-700 dark:text-slate-300'}`}>Pago Móvil / Transferencia</h4>
                          <p className="text-xs text-slate-500">El cliente subirá una captura del comprobante.</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={paymentMobile} onChange={() => setPaymentMobile(!paymentMobile)} />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-teal-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                      </label>
                    </div>

                    {/* OCR CONFIGURATION */}
                    {paymentMobile && (
                      <div className="mt-4 pt-4 border-t border-teal-200 dark:border-teal-800/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-teal-800 dark:text-teal-300">
                            <Camera size={14} /> Activar Verificación OCR
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={ocrVerification} onChange={() => setOcrVerification(!ocrVerification)} />
                            <div className="w-7 h-4 bg-teal-200 peer-focus:outline-none rounded-full peer dark:bg-teal-800 peer-checked:after:translate-x-full peer-checked:bg-teal-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                          </label>
                        </div>
                        <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-2">Extrae datos (referencia, monto) de la imagen para pre-verificar el comprobante antes de la validación manual.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: VISTA PREVIA DEL CARRITO */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 rounded-2xl p-4 flex flex-col items-center justify-start border border-slate-200 dark:border-slate-800 relative overflow-hidden h-full">
          
          <div className="absolute top-4 inset-x-0 z-50 flex justify-between px-8">
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 flex gap-2 shadow-md">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Eye size={14} /> Vista Previa Interactiva</span>
            </div>
            {/* Device Toggle */}
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-2 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 flex gap-1 shadow-md">
              <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded-full transition-colors ${previewMode === 'mobile' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500'}`}><Smartphone size={16} /></button>
              <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded-full transition-colors ${previewMode === 'desktop' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500'}`}><Monitor size={16} /></button>
            </div>
          </div>

          <CartPreview config={configState} previewMode={previewMode} />
        </div>
      </div>
    </div>
  );
}
