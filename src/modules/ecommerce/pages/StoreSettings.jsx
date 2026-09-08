import React from 'react';
import { Save, Store, CreditCard, Truck } from 'lucide-react';

export default function StoreSettings() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Configuración</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ajusta los detalles generales de tu tienda en línea.</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-500/20">
          <Save size={18} />
          Guardar Cambios
        </button>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
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
              <input type="text" defaultValue="Mi Tienda Online" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Moneda Principal</label>
              <select className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="COP">COP ($)</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descripción Breve</label>
              <textarea rows="3" defaultValue="Vendemos los mejores productos del mercado con envíos a todo el país." className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"></textarea>
            </div>
          </div>
        </section>

        {/* Payment Methods */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CreditCard size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Métodos de Pago</h3>
          </div>
          
          <div className="space-y-4">
            {[
              { id: 'card', name: 'Tarjetas de Crédito / Débito', desc: 'Acepta pagos con Visa, MasterCard, etc.', active: true },
              { id: 'transfer', name: 'Transferencia Bancaria', desc: 'Instrucciones para enviar dinero directo a tu cuenta.', active: false },
              { id: 'cash', name: 'Pago Contra Entrega', desc: 'El cliente paga al recibir su pedido.', active: true },
            ].map(method => (
              <div key={method.id} className="flex items-start justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{method.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{method.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" value="" className="sr-only peer" defaultChecked={method.active} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-600"></div>
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* Shipping */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
              <Truck size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Configuración de Envío</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
               <div>
                 <p className="text-sm font-bold text-slate-800 dark:text-white">Tarifa Plana</p>
                 <p className="text-xs text-slate-500 mt-1">Cobra un valor fijo por cualquier envío.</p>
               </div>
               <div className="flex items-center gap-2">
                 <span className="text-sm font-bold text-slate-800 dark:text-white">$</span>
                 <input type="number" defaultValue="5.00" className="w-20 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-center text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
               </div>
            </div>
            
            <div className="flex items-start justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Envío Gratis</p>
                <p className="text-xs text-slate-500 mt-1">Activar envío gratis para pedidos superiores a un monto.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" value="" className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-600"></div>
              </label>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
