import React, { useState, useEffect } from 'react';
import { User, FileText, Phone, MapPin, Edit3, ArrowLeft, LogOut, ShoppingBag, History, Heart, Package, Store, ChevronRight, CheckCircle, Clock, Plus, Trash2, Settings, HelpCircle, Star, StarHalf } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomerProfile() {
  const navigate = useNavigate();
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('datos'); // 'datos', 'pedidos', 'favoritas', 'wishlist', 'direcciones', 'ajustes'
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', docId: '', phone: '', address: '' });
  
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  const [newAddress, setNewAddress] = useState('');
  const [newAddressName, setNewAddressName] = useState('');
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  
  const [ratingModal, setRatingModal] = useState({ isOpen: false, orderId: null, rating: 0, comment: '' });

  useEffect(() => {
    const savedCustomer = localStorage.getItem('ecommerce_current_customer');
    if (savedCustomer) {
      const parsed = JSON.parse(savedCustomer);
      setCurrentCustomer(parsed);
      setProfileForm({
        name: parsed.name || '',
        docId: parsed.docId || '',
        phone: parsed.phone || '',
        address: parsed.address || ''
      });
      fetchOrders(parsed.email);
    } else {
      navigate('/ecommerce/live');
    }
  }, [navigate]);

  const fetchOrders = async (email) => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`http://localhost:3001/api/ecommerce/customer-orders/${email}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingOrders(false);
  };

  const updateCustomerData = async (updatedData) => {
    const newUser = { ...currentCustomer, ...updatedData };
    setCurrentCustomer(newUser);
    localStorage.setItem('ecommerce_current_customer', JSON.stringify(newUser));
    try {
      await fetch(`http://localhost:3001/api/ecommerce/customers/${currentCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    await updateCustomerData(profileForm);
    setIsEditingProfile(false);
  };

  const removeFavorite = async (storeSlug) => {
    const favorites = Array.isArray(currentCustomer.favorites) ? currentCustomer.favorites : (
      typeof currentCustomer.favorites === 'string' ? JSON.parse(currentCustomer.favorites || '[]') : []
    );
    const updatedFavorites = favorites.filter(f => f.slug !== storeSlug);
    await updateCustomerData({ favorites: updatedFavorites });
  };
  
  const removeWishlist = async (productId) => {
    const wishlist = Array.isArray(currentCustomer.wishlist) ? currentCustomer.wishlist : (
      typeof currentCustomer.wishlist === 'string' ? JSON.parse(currentCustomer.wishlist || '[]') : []
    );
    const updatedWishlist = wishlist.filter(p => p.productId !== productId);
    await updateCustomerData({ wishlist: updatedWishlist });
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddressName || !newAddress) return;
    
    const addresses = Array.isArray(currentCustomer.addresses) ? currentCustomer.addresses : (
      typeof currentCustomer.addresses === 'string' ? JSON.parse(currentCustomer.addresses || '[]') : []
    );
    
    const newAddr = {
      id: Date.now().toString(),
      name: newAddressName,
      address: newAddress,
      isDefault: addresses.length === 0
    };
    
    const updatedAddresses = [...addresses, newAddr];
    await updateCustomerData({ addresses: updatedAddresses });
    setIsAddingAddress(false);
    setNewAddress('');
    setNewAddressName('');
  };

  const removeAddress = async (id) => {
    const addresses = Array.isArray(currentCustomer.addresses) ? currentCustomer.addresses : (
      typeof currentCustomer.addresses === 'string' ? JSON.parse(currentCustomer.addresses || '[]') : []
    );
    const updatedAddresses = addresses.filter(a => a.id !== id);
    await updateCustomerData({ addresses: updatedAddresses });
  };

  const setDefaultAddress = async (id) => {
    const addresses = Array.isArray(currentCustomer.addresses) ? currentCustomer.addresses : (
      typeof currentCustomer.addresses === 'string' ? JSON.parse(currentCustomer.addresses || '[]') : []
    );
    const updatedAddresses = addresses.map(a => ({ ...a, isDefault: a.id === id }));
    await updateCustomerData({ addresses: updatedAddresses });
  };

  const handleLogout = () => {
    localStorage.removeItem('ecommerce_current_customer');
    navigate('/ecommerce/live');
  };
  
  const submitRating = () => {
    alert('¡Gracias por calificar tu orden!');
    setRatingModal({ isOpen: false, orderId: null, rating: 0, comment: '' });
  };

  if (!currentCustomer) return null;

  const parsedFavorites = Array.isArray(currentCustomer.favorites) ? currentCustomer.favorites : (
    typeof currentCustomer.favorites === 'string' ? JSON.parse(currentCustomer.favorites || '[]') : []
  );
  
  const parsedWishlist = Array.isArray(currentCustomer.wishlist) ? currentCustomer.wishlist : (
    typeof currentCustomer.wishlist === 'string' ? JSON.parse(currentCustomer.wishlist || '[]') : []
  );

  const parsedAddresses = Array.isArray(currentCustomer.addresses) ? currentCustomer.addresses : (
    typeof currentCustomer.addresses === 'string' ? JSON.parse(currentCustomer.addresses || '[]') : []
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navbar Minimalista */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/ecommerce/live')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <ShoppingBag size={20} />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">Axon<span className="text-indigo-600">Market</span></span>
          </div>
          
          <button 
            onClick={() => navigate('/ecommerce/live')}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={18} /> Volver al Marketplace
          </button>
        </div>
      </nav>

      {/* Hero Header */}
      <div className="bg-indigo-600 px-6 py-12 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className="absolute -top-[50%] -right-[10%] w-[50%] h-[200%] bg-white/10 rotate-12 blur-3xl rounded-full"></div>
         </div>
         <div className="max-w-5xl mx-auto relative z-10 flex flex-col md:flex-row items-center gap-6">
           <div className="w-24 h-24 bg-white text-indigo-600 rounded-full flex items-center justify-center text-4xl font-black shadow-xl border-4 border-indigo-400 shrink-0">
             {currentCustomer.name.charAt(0).toUpperCase()}
           </div>
           <div className="text-center md:text-left">
             <h1 className="text-3xl font-extrabold text-white tracking-tight">{currentCustomer.name}</h1>
             <p className="text-indigo-200 text-sm font-medium mt-1">{currentCustomer.email}</p>
           </div>
         </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Panel Izquierdo: Menú */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('datos')}
              className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl font-bold transition-colors ${activeTab === 'datos' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <User size={18} /> Mi Perfil
            </button>
            <button 
              onClick={() => setActiveTab('direcciones')}
              className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl font-bold transition-colors ${activeTab === 'direcciones' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <MapPin size={18} /> Direcciones
            </button>
            <button 
              onClick={() => setActiveTab('pedidos')}
              className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl font-bold transition-colors ${activeTab === 'pedidos' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <History size={18} /> Mis Pedidos
            </button>
            <button 
              onClick={() => setActiveTab('wishlist')}
              className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl font-bold transition-colors ${activeTab === 'wishlist' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Package size={18} /> Guardados
            </button>
            <button 
              onClick={() => setActiveTab('favoritas')}
              className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl font-bold transition-colors ${activeTab === 'favoritas' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Heart size={18} /> Tiendas Favoritas
            </button>
            <div className="h-[1px] bg-slate-100 my-2"></div>
            <button 
              onClick={() => setActiveTab('ajustes')}
              className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl font-bold transition-colors ${activeTab === 'ajustes' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Settings size={18} /> Ajustes
            </button>
            <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl text-red-600 hover:bg-red-50 font-bold transition-colors">
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Panel Derecho: Contenido */}
        <div className="md:col-span-3">
          <AnimatePresence mode="wait">
            
            {/* TABS: DATOS */}
            {activeTab === 'datos' && (
              <motion.div 
                key="datos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-extrabold text-slate-900">Información Personal</h2>
                  {!isEditingProfile && (
                    <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full text-sm font-bold hover:bg-indigo-100 transition-colors">
                      <Edit3 size={16} /> Editar
                    </button>
                  )}
                </div>

                {!isEditingProfile ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-2"><User size={14} /> Nombre Completo</label>
                      <p className="text-slate-900 font-semibold text-lg">{currentCustomer.name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-2"><FileText size={14} /> Documento (CI/RUT)</label>
                      <p className="text-slate-900 font-semibold text-lg">{currentCustomer.docId || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-2"><Phone size={14} /> Teléfono</label>
                      <p className="text-slate-900 font-semibold text-lg">{currentCustomer.phone || '-'}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nombre Completo</label>
                      <input type="text" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Documento</label>
                        <input type="text" value={profileForm.docId} onChange={e => setProfileForm({...profileForm, docId: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono</label>
                        <input type="tel" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all" />
                      </div>
                    </div>
                    <div className="pt-6 flex gap-4 border-t border-slate-100">
                      <button type="button" onClick={() => setIsEditingProfile(false)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                      <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20">Guardar Cambios</button>
                    </div>
                  </form>
                )}
              </motion.div>
            )}
            
            {/* TABS: DIRECCIONES */}
            {activeTab === 'direcciones' && (
              <motion.div key="direcciones" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Libreta de Direcciones</h2>
                    <p className="text-slate-500 text-sm">Gestiona tus direcciones de entrega.</p>
                  </div>
                  {!isAddingAddress && (
                     <button onClick={() => setIsAddingAddress(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
                       <Plus size={16} /> Nueva Dirección
                     </button>
                  )}
                </div>

                {isAddingAddress && (
                  <form onSubmit={handleAddAddress} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mb-6 space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nombre (Ej: Casa, Oficina)</label>
                      <input type="text" required value={newAddressName} onChange={e => setNewAddressName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Dirección Completa</label>
                      <input type="text" required value={newAddress} onChange={e => setNewAddress(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all" />
                    </div>
                    <div className="flex gap-4 pt-2">
                      <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700">Guardar Dirección</button>
                      <button type="button" onClick={() => setIsAddingAddress(false)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200">Cancelar</button>
                    </div>
                  </form>
                )}

                {parsedAddresses.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 border border-slate-200 border-dashed text-center">
                    <MapPin size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">No tienes direcciones</h3>
                    <p className="text-slate-500 text-sm mt-2">Añade una dirección para facilitar tu próxima compra.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {parsedAddresses.map(addr => (
                      <div key={addr.id} className={`bg-white rounded-2xl p-5 border ${addr.isDefault ? 'border-indigo-500 shadow-sm' : 'border-slate-200'} relative`}>
                        {addr.isDefault && (
                          <span className="absolute top-4 right-4 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase px-2 py-1 rounded-md">Por defecto</span>
                        )}
                        <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2"><MapPin size={16} className={addr.isDefault ? "text-indigo-600" : "text-slate-400"} /> {addr.name}</h4>
                        <p className="text-slate-600 text-sm mb-4 leading-relaxed pr-12">{addr.address}</p>
                        
                        <div className="flex items-center gap-3">
                          {!addr.isDefault && (
                            <button onClick={() => setDefaultAddress(addr.id)} className="text-indigo-600 text-sm font-bold hover:underline">Hacer principal</button>
                          )}
                          <button onClick={() => removeAddress(addr.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg ml-auto"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TABS: PEDIDOS */}
            {activeTab === 'pedidos' && (
              <motion.div key="pedidos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Historial de Pedidos</h2>
                <p className="text-slate-500 text-sm mb-6">Revisa el estado de tus compras anteriores y deja reseñas.</p>
                
                {loadingOrders ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
                ) : orders.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 border border-slate-200 border-dashed text-center">
                    <Package size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">No tienes pedidos</h3>
                    <p className="text-slate-500 text-sm mt-2">Tus futuras compras aparecerán aquí.</p>
                    <button onClick={() => navigate('/ecommerce/live')} className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold">Explorar Marketplace</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map(order => (
                      <div key={order.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold font-mono">{order.id}</span>
                            <span className="text-sm text-slate-500 flex items-center gap-1"><Clock size={14}/> {order.date}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                              order.status === 'Completado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {order.status === 'Completado' && <CheckCircle size={14} />} {order.status}
                            </span>
                          </div>
                          
                          <div className="space-y-3">
                            {order.items && order.items.map(item => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span className="font-medium text-slate-700">{item.quantity}x {item.name}</span>
                                <span className="text-slate-500">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="w-full md:w-64 bg-slate-50 p-4 rounded-2xl flex flex-col justify-between shrink-0 border border-slate-100">
                          <div>
                            <div className="text-xs text-slate-500 font-bold uppercase mb-1">Total del Pedido</div>
                            <div className="text-2xl font-black text-indigo-600">${order.total.toFixed(2)}</div>
                          </div>
                          <div className="space-y-2 mt-4">
                            <button className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:border-indigo-600 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                              Ver Tienda <ChevronRight size={16} />
                            </button>
                            {(order.status === 'Completado' || order.status === 'Entregado') && (
                              <button 
                                onClick={() => setRatingModal({ isOpen: true, orderId: order.id, rating: 0, comment: '' })}
                                className="w-full py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                              >
                                <Star size={16} /> Calificar Compra
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TABS: PRODUCTOS GUARDADOS (WISHLIST) */}
            {activeTab === 'wishlist' && (
              <motion.div key="wishlist" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Productos Guardados</h2>
                <p className="text-slate-500 text-sm mb-6">Tus artículos favoritos listos para cuando quieras comprar.</p>
                
                {parsedWishlist.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 border border-slate-200 border-dashed text-center">
                    <Package size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">Tu lista está vacía</h3>
                    <p className="text-slate-500 text-sm mt-2">Guarda productos haciendo clic en el corazón mientras navegas por las tiendas.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {parsedWishlist.map(product => (
                      <div key={product.productId} className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm flex flex-col group">
                        <div className="h-40 w-full relative bg-slate-100">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.productName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={40}/></div>
                          )}
                          <button 
                            onClick={() => removeWishlist(product.productId)}
                            className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                          >
                            <Heart size={16} fill="currentColor" />
                          </button>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-wide truncate">{product.storeName}</div>
                            <h4 className="font-bold text-slate-900 leading-tight mb-2 line-clamp-2">{product.productName}</h4>
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <span className="font-black text-indigo-600 text-lg">${product.productPrice?.toFixed(2)}</span>
                            <button 
                              onClick={() => navigate(`/ecommerce/live/${product.storeSlug}`)}
                              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
                            >
                              Ver Tienda
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TABS: FAVORITAS */}
            {activeTab === 'favoritas' && (
              <motion.div key="favoritas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Tiendas Favoritas</h2>
                <p className="text-slate-500 text-sm mb-6">Tus negocios preferidos para un acceso rápido.</p>
                
                {parsedFavorites.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 border border-slate-200 border-dashed text-center">
                    <Heart size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">Aún no tienes favoritas</h3>
                    <p className="text-slate-500 text-sm mt-2">Navega por el marketplace y guarda las tiendas que más te gusten.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {parsedFavorites.map(store => (
                      <div key={store.slug} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-indigo-300 transition-colors group cursor-pointer" onClick={() => navigate(`/ecommerce/live/${store.slug}`)}>
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                           <Store size={24} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{store.name}</h4>
                          <span className="text-xs text-slate-500 mt-1 block">Toca para visitar</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFavorite(store.slug); }}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Heart size={20} fill="currentColor" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TABS: AJUSTES */}
            {activeTab === 'ajustes' && (
              <motion.div key="ajustes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Configuración y Soporte</h2>
                <p className="text-slate-500 text-sm mb-6">Administra la seguridad de tu cuenta y obtén ayuda.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Seguridad */}
                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                      <Settings size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Seguridad de la cuenta</h3>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">Actualiza tu contraseña periódicamente para mantener tu cuenta segura.</p>
                    <button className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors">
                      Cambiar Contraseña
                    </button>
                  </div>
                  
                  {/* Centro de Ayuda */}
                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                      <HelpCircle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Centro de Ayuda</h3>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">¿Tienes problemas con un pedido? Consulta nuestras preguntas frecuentes.</p>
                    <button className="px-5 py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl text-sm hover:bg-blue-100 transition-colors">
                      Ir a Preguntas Frecuentes
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
      
      {/* RATING MODAL */}
      {ratingModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
            <button onClick={() => setRatingModal({ isOpen: false, orderId: null, rating: 0, comment: '' })} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24}/></button>
            <h3 className="text-2xl font-black text-slate-900 mb-2 text-center">Calificar Pedido</h3>
            <p className="text-slate-500 text-sm text-center mb-6">¿Qué tal te pareció tu experiencia de compra y los productos recibidos?</p>
            
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setRatingModal({...ratingModal, rating: star})}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star size={32} fill={ratingModal.rating >= star ? '#F59E0B' : 'transparent'} className={ratingModal.rating >= star ? 'text-amber-500' : 'text-slate-300'} />
                </button>
              ))}
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Comentarios (Opcional)</label>
              <textarea 
                rows="3" 
                value={ratingModal.comment}
                onChange={(e) => setRatingModal({...ratingModal, comment: e.target.value})}
                placeholder="Escribe tu reseña aquí..."
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-600"
              ></textarea>
            </div>
            
            <button 
              onClick={submitRating}
              disabled={ratingModal.rating === 0}
              className={`w-full py-3 rounded-xl font-bold transition-all ${ratingModal.rating > 0 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              Enviar Calificación
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
