import React, { useState, useEffect } from 'react';
import { Save, Store, Calculator, CreditCard, Smartphone as PhoneIcon, Truck, Clock, DollarSign, Building2 } from 'lucide-react';

export default function StoreProfileManager() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Perfil
  const [storeName, setStoreName] = useState('Mi Tienda Online');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  
  // BCV
  const [bcvRate, setBcvRate] = useState(36.50);
  const [autoBcv, setAutoBcv] = useState(false);
  
  // Pago Móvil
  const [paymentMobile, setPaymentMobile] = useState(true);
  const [pmBank, setPmBank] = useState('');
  const [pmPhone, setPmPhone] = useState('');
  const [pmId, setPmId] = useState('');
  
  // Zelle
  const [zelleActive, setZelleActive] = useState(false);
  const [zelleEmail, setZelleEmail] = useState('');
  const [zelleName, setZelleName] = useState('');

  // Efectivo en Tienda / Delivery
  const [cashActive, setCashActive] = useState(false);

  // Envíos
  const [flatRate, setFlatRate] = useState(0);
  const [freeShipping, setFreeShipping] = useState(false);

  // Horarios de Atención
  const [scheduleActive, setScheduleActive] = useState(false);
  const [workDays, setWorkDays] = useState({
    lunes: true, martes: true, miercoles: true, jueves: true, viernes: true, sabado: false, domingo: false
  });
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('18:00');
  
  const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';

  useEffect(() => {
    fetch('http://localhost:3001/api/workspaces', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const ws = data.find(w => w.id === workspaceId);
        if (ws) {
          if (ws.name) setStoreName(ws.name);
          if (ws.config) {
            if (ws.config.currency) setCurrency(ws.config.currency);
            if (ws.config.description) setDescription(ws.config.description);
            if (ws.config.bcvRate) setBcvRate(ws.config.bcvRate);
            if (ws.config.autoBcv) setAutoBcv(ws.config.autoBcv);
            
            if (ws.config.paymentProfile) {
              setPaymentMobile(ws.config.paymentProfile.paymentMobile !== false);
              setPmBank(ws.config.paymentProfile.pmBank || '');
              setPmPhone(ws.config.paymentProfile.pmPhone || '');
              setPmId(ws.config.paymentProfile.pmId || '');
              setZelleActive(ws.config.paymentProfile.zelleActive || false);
              setZelleEmail(ws.config.paymentProfile.zelleEmail || '');
              setZelleName(ws.config.paymentProfile.zelleName || '');
              setCashActive(ws.config.paymentProfile.cashActive || false);
            }
            if (ws.config.shippingProfile) {
              setFlatRate(ws.config.shippingProfile.flatRate || 0);
              setFreeShipping(ws.config.shippingProfile.freeShipping || false);
            }
            if (ws.config.scheduleProfile) {
              setScheduleActive(ws.config.scheduleProfile.scheduleActive || false);
              if (ws.config.scheduleProfile.workDays) setWorkDays(ws.config.scheduleProfile.workDays);
              if (ws.config.scheduleProfile.openTime) setOpenTime(ws.config.scheduleProfile.openTime);
              if (ws.config.scheduleProfile.closeTime) setCloseTime(ws.config.scheduleProfile.closeTime);
            }
          }
        }
        setIsLoaded(true);
      })
      .catch(err => {
        console.error(err);
        setIsLoaded(true);
      });
  }, [workspaceId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('http://localhost:3001/api/workspaces', { cache: 'no-store' });
      const data = await res.json();
      const ws = data.find(w => w.id === workspaceId) || { config: {} };
      
      const newConfig = {
        ...ws.config,
        currency,
        description,
        bcvRate,
        autoBcv,
        paymentProfile: {
          paymentMobile,
          pmBank,
          pmPhone,
          pmId,
          zelleActive,
          zelleEmail,
          zelleName,
          cashActive
        },
        shippingProfile: {
          flatRate,
          freeShipping
        },
        scheduleProfile: {
          scheduleActive,
          workDays,
          openTime,
          closeTime
        }
      };

      // Si queremos cambiar el nombre del workspace, el endpoint PUT /config no lo cambia,
      // pero para la funcionalidad de pagos esto es suficiente.

      await fetch(`http://localhost:3001/api/workspaces/${workspaceId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig })
      });
      
      setTimeout(() => {
        setIsSaving(false);
        alert('Perfil de pagos guardado exitosamente.');
      }, 500);
    } catch (err) {
      console.error(err);
      setIsSaving(false);
      alert('Error al guardar el perfil.');
    }
  };

  if (!isLoaded) return <div className="p-8 text-center font-bold text-slate-500">Cargando perfil...</div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Perfil de la Tienda</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configura los datos públicos y métodos de cobro.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-70 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-500/20">
          <Save size={18} />
          {isSaving ? 'Guardando...' : 'Guardar Perfil'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Info de Tienda */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg">
              <Store size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Información de la Tienda</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre de la Tienda</label>
              <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} disabled className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Moneda Principal</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="COP">COP ($)</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descripción Breve</label>
              <textarea rows="3" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Vendemos los mejores productos del mercado..." className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"></textarea>
            </div>
          </div>
        </section>

        {/* Tasa BCV */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg">
              <Calculator size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tasa de Cambio (BCV)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tasa de Cambio Actual (Bs por $)</label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-slate-400 font-bold">Bs.</span>
                <input type="number" step="0.01" value={bcvRate} onChange={e => setBcvRate(Number(e.target.value))} className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
              </div>
            </div>
            <div className="flex items-center pt-6">
               <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={autoBcv} onChange={e => setAutoBcv(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-600"></div>
                  <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Actualizar automáticamente (Pro)</span>
                </label>
            </div>
          </div>
        </section>

        {/* Pago Móvil */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Datos de Pago Móvil</h3>
              <p className="text-xs text-slate-500 mt-1">Estos datos se le mostrarán al cliente al hacer checkout.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-3 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <PhoneIcon size={18} className="text-slate-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Aceptar Pago Móvil</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={paymentMobile} onChange={e => setPaymentMobile(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              
              {paymentMobile && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Banco Emisor</label>
                    <input type="text" value={pmBank} onChange={e => setPmBank(e.target.value)} placeholder="Ej. Banesco (0134)" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Teléfono</label>
                    <input type="text" value={pmPhone} onChange={e => setPmPhone(e.target.value)} placeholder="Ej. 04141234567" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Cédula / RIF</label>
                    <input type="text" value={pmId} onChange={e => setPmId(e.target.value)} placeholder="Ej. V20123456" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                  </div>
                </div>
              )}
            </div>
            {/* Zelle */}
            <div className="flex flex-col gap-3 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign size={18} className="text-slate-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Zelle</p>
                    <p className="text-xs text-slate-500">Recibe pagos en dólares.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={zelleActive} onChange={e => setZelleActive(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              
              {zelleActive && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Correo de Zelle</label>
                    <input type="email" value={zelleEmail} onChange={e => setZelleEmail(e.target.value)} placeholder="Ej. pagos@mitienda.com" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre del Titular</label>
                    <input type="text" value={zelleName} onChange={e => setZelleName(e.target.value)} placeholder="Ej. Juan Perez" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Efectivo */}
            <div className="flex items-start justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <Building2 size={18} className="text-slate-500" />
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Efectivo en Tienda / Delivery</p>
                  <p className="text-xs text-slate-500">El cliente paga en efectivo al recibir.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={cashActive} onChange={e => setCashActive(e.target.checked)} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Envíos */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Configuración de Envío</h3>
              <p className="text-xs text-slate-500 mt-1">Reglas para el cobro del delivery.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Tarifa Plana</p>
                <p className="text-xs text-slate-500">Cobra un valor fijo por cualquier envío.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-800 dark:text-white font-bold">$</span>
                <input type="number" step="0.01" value={flatRate} onChange={e => setFlatRate(Number(e.target.value))} className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Envío Gratis</p>
                <p className="text-xs text-slate-500">No cobrar delivery en ningún caso.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={freeShipping} onChange={e => setFreeShipping(e.target.checked)} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Horarios de Atención */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Horarios de Atención</h3>
              <p className="text-xs text-slate-500 mt-1">Configura si tu tienda tiene horario de recepción de pedidos.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Activar Restricción de Horario</p>
                  <p className="text-xs text-slate-500">Bloquea el carrito cuando estés cerrado.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={scheduleActive} onChange={e => setScheduleActive(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-orange-600"></div>
                </label>
              </div>

              {scheduleActive && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Hora Apertura</label>
                      <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Hora Cierre</label>
                      <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block">Días Laborables</label>
                    <div className="flex flex-wrap gap-2">
                      {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => (
                        <button 
                          key={dia}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setWorkDays(prev => ({ ...prev, [dia]: !prev[dia] }));
                          }}
                          className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                            workDays[dia] 
                            ? 'bg-violet-100 border-violet-200 text-violet-700 dark:bg-violet-900/40 dark:border-violet-700 dark:text-violet-300' 
                            : 'bg-white border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {dia.charAt(0).toUpperCase() + dia.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
