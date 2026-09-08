import React, { useState } from 'react';
import { ShoppingCart, Clock, Package, Truck, CheckCircle2, Search, Filter, Eye, ChevronRight } from 'lucide-react';

const initialOrders = [
  { id: 'ORD-1042', customer: 'Carlos López', date: 'Hoy, 10:30 AM', total: 145.50, items: 3, status: 'Pendiente' },
  { id: 'ORD-1043', customer: 'María García', date: 'Hoy, 09:15 AM', total: 89.99, items: 1, status: 'Pendiente' },
  { id: 'ORD-1040', customer: 'Laura M.', date: 'Ayer, 16:45 PM', total: 320.00, items: 4, status: 'Preparando' },
  { id: 'ORD-1039', customer: 'Andrés F.', date: 'Ayer, 11:20 AM', total: 45.00, items: 1, status: 'Enviado' },
  { id: 'ORD-1035', customer: 'Sofía V.', date: 'Hace 2 días', total: 210.00, items: 2, status: 'Entregado' },
];

export default function OrdersManager() {
  const [orders, setOrders] = useState(initialOrders);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal de detalles
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Drag and Drop State
  const [draggedOrderId, setDraggedOrderId] = useState(null);

  const columns = [
    { id: 'Pendiente', title: 'Nuevos Pedidos', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30' },
    { id: 'Preparando', title: 'En Preparación', icon: Package, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/30' },
    { id: 'Enviado', title: 'Enviados', icon: Truck, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10', border: 'border-violet-200 dark:border-violet-500/30' },
    { id: 'Entregado', title: 'Entregados', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/30' },
  ];

  const handleDragStart = (e, id) => {
    setDraggedOrderId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    if (draggedOrderId) {
      setOrders(orders.map(order => 
        order.id === draggedOrderId ? { ...order, status: targetStatus } : order
      ));
      setDraggedOrderId(null);
    }
  };

  const moveOrder = (id, newStatus) => {
    setOrders(orders.map(order => 
      order.id === id ? { ...order, status: newStatus } : order
    ));
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            Gestión de Pedidos <span className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 text-xs px-2 py-0.5 rounded-full font-black uppercase">Kanban Flow</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Arrastra y suelta las tarjetas para actualizar el estado del envío.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar pedido o cliente..."
            className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-shadow dark:text-white shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {columns.map(col => {
          const colOrders = filteredOrders.filter(o => o.status === col.id);
          
          return (
            <div 
              key={col.id} 
              className={`bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border ${col.border} flex flex-col h-full min-h-[600px]`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className={`p-4 border-b ${col.border} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <col.icon size={18} className={col.color} />
                  <h3 className="font-bold text-slate-800 dark:text-white">{col.title}</h3>
                </div>
                <span className={`text-xs font-black px-2 py-1 rounded-lg ${col.bg} ${col.color}`}>
                  {colOrders.length}
                </span>
              </div>
              
              <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto">
                {colOrders.map(order => (
                  <div 
                    key={order.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order.id)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm cursor-grab active:cursor-grabbing hover:border-violet-300 dark:hover:border-violet-700 transition-colors group relative"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{order.id}</span>
                      <span className="text-sm font-black text-slate-800 dark:text-white">${order.total.toFixed(2)}</span>
                    </div>
                    
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">{order.customer}</p>
                    <p className="text-xs text-slate-500 mb-4">{order.items} {order.items === 1 ? 'artículo' : 'artículos'} • {order.date}</p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 flex items-center gap-1"
                      >
                        <Eye size={14} /> Ver Detalles
                      </button>
                      
                      {/* Mobile quick-move buttons (hidden on desktop drag & drop) */}
                      <div className="lg:hidden flex gap-1">
                         {col.id !== 'Entregado' && (
                           <button 
                             onClick={() => {
                               const nextIdx = columns.findIndex(c => c.id === col.id) + 1;
                               if(columns[nextIdx]) moveOrder(order.id, columns[nextIdx].id);
                             }}
                             className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
                           >
                             <ChevronRight size={14} />
                           </button>
                         )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {colOrders.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl opacity-50">
                    <p className="text-xs font-medium text-slate-500">Arrastra pedidos aquí</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Detalles del Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}></div>
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl relative z-10 border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
              <div>
                <h3 className="font-black text-lg text-slate-800 dark:text-white">Pedido {selectedOrder.id}</h3>
                <p className="text-xs text-slate-500">{selectedOrder.date}</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                columns.find(c => c.id === selectedOrder.status)?.bg
              } ${columns.find(c => c.id === selectedOrder.status)?.color}`}>
                {selectedOrder.status}
              </span>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Cliente</h4>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedOrder.customer}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">correo.falso@example.com</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">+34 600 000 000</p>
              </div>
              
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Resumen ({selectedOrder.items} arts.)</h4>
                <div className="space-y-2">
                  {/* Mock items */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 dark:text-slate-300">Camiseta de Algodón x2</span>
                    <span className="font-bold text-slate-800 dark:text-white">$59.98</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 dark:text-slate-300">Envío Estándar</span>
                    <span className="font-bold text-slate-800 dark:text-white">$5.00</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-base">
                    <span className="font-bold text-slate-800 dark:text-white">Total Pagado</span>
                    <span className="font-black text-violet-600 dark:text-violet-400">${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl text-sm font-bold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
