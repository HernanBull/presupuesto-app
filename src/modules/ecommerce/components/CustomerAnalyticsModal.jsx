import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, DollarSign, ShoppingBag, PiggyBank, Package, Star } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

export default function CustomerAnalyticsModal({ isOpen, onClose, currentCustomer }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalSaved: 0, // Estimated or calculated from discounts
    totalOrders: 0,
    topCategories: {},
    recentOrders: []
  });

  useEffect(() => {
    if (isOpen && currentCustomer) {
      fetchAnalytics();
    }
  }, [isOpen, currentCustomer]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch user's orders
      const { data: orders, error } = await supabase
        .from('ecommerce_orders_v2')
        .select('total, status, items, date')
        .eq('customer_id', currentCustomer.id)
        .eq('status', 'Entregado'); // Only count completed orders for spent metrics

      if (error) throw error;

      let spent = 0;
      let orderCount = orders ? orders.length : 0;
      let categories = {};

      if (orders) {
        orders.forEach(order => {
          spent += (Number(order.total) || 0);
          
          // Parse items to get categories (if available) or just count items
          try {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            if (Array.isArray(items)) {
              items.forEach(item => {
                const cat = item.category || 'Varios';
                categories[cat] = (categories[cat] || 0) + (Number(item.price) * Number(item.quantity) || 0);
              });
            }
          } catch (e) {
            console.error("Error parsing items for analytics", e);
          }
        });
      }

      // Estimate savings: let's assume a standard 5% saving on platform vs traditional 
      // or calculate from a real discount field if it existed.
      let estimatedSavings = spent * 0.05; 

      setStats({
        totalSpent: spent,
        totalSaved: estimatedSavings,
        totalOrders: orderCount,
        topCategories: categories,
        recentOrders: orders ? orders.slice(0, 3) : [] // top 3 recent
      });
    } catch (err) {
      console.error('Error fetching customer analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedCategories = Object.entries(stats.topCategories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3); // top 3

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-end">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}
        />
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-zinc-950 border-t md:border-l border-white/10 w-full md:max-w-md h-[90vh] md:h-full absolute bottom-0 md:relative rounded-t-[2rem] md:rounded-none z-10 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
            <h2 className="text-xl font-light text-white flex items-center gap-3 tracking-wide">
              <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-amber-500" size={16} />
              </div>
              Mis <strong className="font-bold">Estadísticas</strong>
            </h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-white hover:bg-white/10 rounded-full p-2 transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-zinc-950">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 space-y-4">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-zinc-500 text-sm font-medium">Calculando tus métricas...</p>
              </div>
            ) : (
              <>
                {/* Main KPI: Total Spent */}
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="flex items-center gap-3 mb-2 relative z-10">
                    <DollarSign size={16} className="text-zinc-400" />
                    <span className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Total Invertido</span>
                  </div>
                  <h3 className="text-4xl font-black text-white relative z-10">${stats.totalSpent.toFixed(2)}</h3>
                  <p className="text-zinc-500 text-xs mt-1 relative z-10">Gastado en todo el ecosistema</p>
                </div>

                {/* Secondary KPIs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <PiggyBank size={14} className="text-green-400" />
                      <span className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold">Ahorro Estimado</span>
                    </div>
                    <h4 className="text-xl font-bold text-green-400">${stats.totalSaved.toFixed(2)}</h4>
                  </div>
                  <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingBag size={14} className="text-amber-500" />
                      <span className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold">Pedidos</span>
                    </div>
                    <h4 className="text-xl font-bold text-white">{stats.totalOrders}</h4>
                  </div>
                </div>

                {/* Categories */}
                {sortedCategories.length > 0 && (
                  <div>
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                      <Package size={16} className="text-amber-500"/> En qué gastas más
                    </h3>
                    <div className="space-y-4 bg-zinc-900/30 rounded-2xl p-5 border border-white/5">
                      {sortedCategories.map(([cat, amount], index) => {
                        const percentage = stats.totalSpent > 0 ? (amount / stats.totalSpent) * 100 : 0;
                        return (
                          <div key={cat} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-zinc-300">{cat}</span>
                              <span className="text-amber-500">${amount.toFixed(2)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-amber-500 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {stats.totalOrders === 0 && (
                  <div className="text-center py-10 bg-zinc-900/20 rounded-2xl border border-white/5">
                    <span className="text-4xl block mb-2">🛍️</span>
                    <p className="text-zinc-400 text-sm">Aún no has realizado compras.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
