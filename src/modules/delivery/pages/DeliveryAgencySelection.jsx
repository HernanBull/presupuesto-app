import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Package, User, Phone, ShoppingBag, Send, CheckCircle2, Loader2, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sendDeliveryRequest, globalListeners } from '../utils/telegramService';

export default function DeliveryAgencySelection({ session, theme, toggleTheme }) {
  const [loading, setLoading] = useState(false);
  const [orderStatus, setOrderStatus] = useState(null); // null | 'searching' | 'accepted'
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [driver, setDriver] = useState(null);
  const [deliveryPin, setDeliveryPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Formulario del cliente
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    zone: '', // Nuevo campo
    address: '',
    packageType: 'Comida',
    productList: '',
    weight: '',
    quantity: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isFormValid = () => {
    return formData.name && formData.phone && formData.zone && formData.address && formData.productList;
  };

  useEffect(() => {
    const handleAccept = (acceptedOrderId, driverData) => {
      if (currentOrderId && acceptedOrderId === currentOrderId) {
        setDriver(driverData);
        setOrderStatus('accepted');
        
        setTimeout(() => {
          setOrderStatus(null);
          setCurrentOrderId(null);
          setDeliveryPin('');
          setFormData({
            name: '', phone: '', zone: '', address: '', packageType: 'Comida', productList: '', weight: '', quantity: ''
          });
        }, 20000);
      }
    };
    
    globalListeners.onAccept.push(handleAccept);
    return () => {
      globalListeners.onAccept = globalListeners.onAccept.filter(cb => cb !== handleAccept);
    };
  }, [currentOrderId]);

  const handleConfirm = async () => {
    if (!isFormValid()) return;
    
    setErrorMsg('');
    setLoading(true);
    const commerceId = session?.user?.id || 'COM-999'; 

    const result = await sendDeliveryRequest(commerceId, formData);
    setLoading(false);
    
    if (result.success) {
      setDeliveryPin(result.deliveryPin);
      setCurrentOrderId(result.orderId);
      setOrderStatus('searching');
    } else {
      setErrorMsg(result.error || "Error al contactar con el grupo de repartidores.");
    }
  };

  if (orderStatus === 'searching') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-full shadow-xl shadow-indigo-500/10 border border-slate-100 dark:border-slate-800 relative z-10">
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 text-center">Buscando Repartidor...</h1>
        <p className="text-slate-500 text-center max-w-md mb-8 text-lg">
          Tu solicitud fue lanzada al grupo de Telegram. Esperando que un conductor pulse "Aceptar Viaje".
        </p>
        <div className="bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden h-2 w-48 mx-auto relative">
          <div className="absolute top-0 bottom-0 bg-indigo-500 w-1/3 animate-[translateX_2s_ease-in-out_infinite]" style={{ animationName: 'ping-pong' }}></div>
        </div>
      </div>
    );
  }

  if (orderStatus === 'accepted') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-emerald-500/10 p-6 rounded-full mb-6">
          <CheckCircle2 className="w-20 h-20 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 text-center">¡Viaje Aceptado!</h1>
        <p className="text-slate-500 text-center max-w-md text-lg mb-6">
          <strong>{driver?.name}</strong> ha tomado tu pedido y va en camino.
        </p>

        {/* Tarjeta de Datos del Conductor */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm max-w-md w-full mb-6 text-left">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" /> 
            Datos del Conductor
            {driver?.driverCode && (
              <span className="text-xs bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-full ml-auto font-mono">
                {driver.driverCode}
              </span>
            )}
          </h3>
          <div className="space-y-3 text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span className="font-medium">Cédula:</span>
              <span className="font-bold text-slate-900 dark:text-white">{driver?.cedula || 'Pendiente'} {driver?.age ? `(${driver.age} años)` : ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Vehículo:</span>
              <span className="font-bold text-slate-900 dark:text-white">{driver?.moto || 'Pendiente'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Placa:</span>
              <span className="font-bold text-slate-900 dark:text-white">{driver?.placa || 'Pendiente'}</span>
            </div>
          </div>
          {(!driver?.cedula || !driver?.moto) && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-amber-700 dark:text-amber-400 text-sm">
              ℹ️ Este conductor no tiene sus datos completos. Regístralos en Ajustes.
            </div>
          )}
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 text-center max-w-md w-full mb-6">
          <h2 className="text-amber-600 dark:text-amber-400 font-bold mb-3">PIN DE SEGURIDAD</h2>
          <div className="text-5xl font-mono font-black text-slate-900 dark:text-white tracking-[0.25em] bg-white dark:bg-slate-900 py-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
            {deliveryPin}
          </div>
          <p className="text-sm text-slate-500 mt-4 leading-relaxed">
            Dile este PIN al cliente. El repartidor se lo pedirá al entregar el paquete para confirmar que es la persona correcta.
          </p>
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 bg-white dark:bg-slate-900 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Navigation className="w-5 h-5 text-emerald-500" />
          <span>La dirección ha sido enviada al conductor por privado.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-amber-500" />
            <span className="font-bold text-lg">Solicitar Repartidor</span>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              to="/delivery/panel" 
              className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-full mr-2 transition-colors"
            >
              📦 Envíos Activos
            </Link>
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {errorMsg && (
          <div className="mb-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        <section className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Detalles del Envío</h2>
            <p className="text-slate-500">Ingresa la información del cliente y lo que envías.</p>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Nombre del Cliente</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                  <input 
                    type="text" name="name" value={formData.name} onChange={handleInputChange}
                    placeholder="Ej. Juan Pérez"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Teléfono</label>
                <div className="relative">
                  <Phone className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                  <input 
                    type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                    placeholder="+1 234 567 890"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Zona / Barrio (Público)</label>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-4 top-3.5 text-sky-400" />
                  <input 
                    type="text" name="zone" value={formData.zone} onChange={handleInputChange}
                    placeholder="Ej. Centro, Norte..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Dirección Exacta (Oculta)</label>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                  <input 
                    type="text" name="address" value={formData.address} onChange={handleInputChange}
                    placeholder="Calle, Número, Ref..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-500" />
                ¿Qué estás enviando?
              </h3>
              
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-500 mb-2">Tipo de Paquete</label>
                <div className="flex gap-3">
                  {['Comida', 'Ropa', 'Otro'].map(type => (
                    <button
                      key={type}
                      onClick={() => setFormData(prev => ({ ...prev, packageType: type }))}
                      className={`flex-1 py-3 rounded-xl font-medium transition-all ${formData.packageType === type ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Descripción de los Productos</label>
                <textarea 
                  name="productList" value={formData.productList} onChange={handleInputChange}
                  rows="3"
                  placeholder="Ej. 2 Hamburguesas simples, 1 Papas Fritas..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {(formData.packageType === 'Comida' || formData.packageType === 'Otro') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Peso (kg)</label>
                    <input 
                      type="number" step="0.1" name="weight" value={formData.weight} onChange={handleInputChange}
                      placeholder="Ej. 1.5"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                    />
                  </div>
                )}
                {(formData.packageType === 'Ropa' || formData.packageType === 'Otro') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Unidades</label>
                    <input 
                      type="number" name="quantity" value={formData.quantity} onChange={handleInputChange}
                      placeholder="Ej. 3"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 mt-6">
              <button 
                onClick={handleConfirm}
                disabled={!isFormValid() || loading}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-lg
                  ${isFormValid() && !loading
                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 hover:-translate-y-1' 
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    Lanzar Solicitud a Repartidores
                  </>
                )}
              </button>
              {!isFormValid() && (
                <p className="text-center text-sm text-slate-500 mt-3">
                  * Completa todos los campos obligatorios para poder solicitar.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
