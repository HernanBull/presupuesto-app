import React, { useState, useEffect } from 'react';
import { X, Percent, Store, Clock } from 'lucide-react';

const categories = [
  'Víveres', 'Proteínas', 'Charcutería y Lácteos', 'Frutas y Verduras',
  'Panadería y Dulces', 'Bebidas y Licores', 'Snacks y Golosinas',
  'Cuidado Personal', 'Limpieza del Hogar', 'Ropa y Calzado',
  'Repuestos para Carros', 'Repuestos para Motos', 'Herramientas y Ferretería',
  'Tecnología y Celulares', 'Hogar y Electrodomésticos'
];

export default function MapFiltersModal({ isOpen, onClose, filters, setFilters }) {
  const [activeTab, setActiveTab] = useState('ofertas');
  
  // Local state for filters before applying
  const [localFilters, setLocalFilters] = useState({
     ofertas: [],
     categorias: [],
     abiertoAhora: false
  });

  useEffect(() => {
    if (isOpen && filters) {
       setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#111111] animate-in slide-in-from-bottom duration-200">
      {/* Header */}
      <div className="flex items-center px-4 py-4 border-b border-zinc-800">
        <button onClick={onClose} className="p-2 -ml-2 text-white">
          <X size={24} />
        </button>
        <h2 className="flex-1 text-center text-lg font-bold text-white mr-8">Filtro</h2>
      </div>

      {/* Body with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-24 bg-[#1a1a1a] flex flex-col border-r border-zinc-800 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('ofertas')}
            className={`flex flex-col items-center justify-center p-4 gap-2 transition-colors ${activeTab === 'ofertas' ? 'bg-[#222] border-l-4 border-white text-white' : 'text-zinc-500 border-l-4 border-transparent'}`}
          >
            <Percent size={20} />
            <span className="text-[11px] font-medium">Ofertas</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('categorias')}
            className={`flex flex-col items-center justify-center p-4 gap-2 transition-colors ${activeTab === 'categorias' ? 'bg-[#222] border-l-4 border-white text-white' : 'text-zinc-500 border-l-4 border-transparent'}`}
          >
            <Store size={20} />
            <span className="text-[11px] font-medium text-center leading-tight">Categorías</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('horarios')}
            className={`flex flex-col items-center justify-center p-4 gap-2 transition-colors ${activeTab === 'horarios' ? 'bg-[#222] border-l-4 border-white text-white' : 'text-zinc-500 border-l-4 border-transparent'}`}
          >
            <Clock size={20} />
            <span className="text-[11px] font-medium">Horarios</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#111111] overflow-y-auto p-5 pb-24">
          
          {activeTab === 'ofertas' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-white mb-2">Ofertas</h3>
              <p className="text-sm text-zinc-400 mb-6">Comercios con ofertas activas</p>
              
              <div className="space-y-3">
                {['Combos', 'Descuentos', '2x1'].map(offer => (
                  <label key={offer} className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-[#1a1a1a] cursor-pointer">
                    <span className="text-white font-medium">{offer}</span>
                    <input type="checkbox" className="w-5 h-5 accent-amber-500 rounded bg-zinc-800 border-zinc-700" 
                      checked={localFilters.ofertas?.includes(offer)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLocalFilters({...localFilters, ofertas: [...(localFilters.ofertas || []), offer]});
                        } else {
                          setLocalFilters({...localFilters, ofertas: (localFilters.ofertas || []).filter(o => o !== offer)});
                        }
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'categorias' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-white mb-2">Categorías</h3>
              <p className="text-sm text-zinc-400 mb-6">Tipo de establecimiento o comercio</p>
              
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => {
                      if (localFilters.categorias?.includes(cat)) {
                        setLocalFilters({...localFilters, categorias: (localFilters.categorias || []).filter(c => c !== cat)});
                      } else {
                        setLocalFilters({...localFilters, categorias: [...(localFilters.categorias || []), cat]});
                      }
                    }}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      localFilters.categorias?.includes(cat) 
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' 
                        : 'bg-[#1a1a1a] border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'horarios' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-white mb-2">Horarios</h3>
              <p className="text-sm text-zinc-400 mb-6">Disponibilidad del comercio</p>
              
              <label className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-[#1a1a1a] cursor-pointer">
                <span className="text-white font-medium">Abierto ahora</span>
                <input type="checkbox" className="w-5 h-5 accent-amber-500 rounded bg-zinc-800 border-zinc-700" 
                  checked={localFilters.abiertoAhora}
                  onChange={(e) => setLocalFilters({...localFilters, abiertoAhora: e.target.checked})}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#111111] border-t border-zinc-800 flex gap-4">
        <button 
          onClick={() => setLocalFilters({ ofertas: [], categorias: [], abiertoAhora: false })}
          className="flex-1 py-4 bg-[#1a1a1a] hover:bg-[#222] transition-colors text-zinc-300 font-bold rounded-xl border border-zinc-800"
        >
          Limpiar
        </button>
        <button 
          onClick={() => {
             if(setFilters) setFilters(localFilters);
             onClose();
          }}
          className="flex-[2] py-4 bg-white hover:bg-zinc-200 transition-colors text-black font-bold rounded-xl"
        >
          Mostrar resultados
        </button>
      </div>
    </div>
  );
}
