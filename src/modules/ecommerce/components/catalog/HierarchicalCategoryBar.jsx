import React, { useState, useEffect, useMemo } from 'react';
import { LayoutGrid, ChevronDown, Sparkles, Search, X, Check, FolderTree } from 'lucide-react';

export const HierarchicalCategoryBar = ({
  categories = [],
  selectedCategoryId = 'ALL',
  onSelectCategory,
  productCounts = {},
  showAllOption = true,
  totalProductsCount = 0
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Encontrar la categoría actualmente seleccionada
  const selectedCategory = useMemo(() => {
    if (selectedCategoryId === 'ALL') return null;
    return categories.find((cat) => cat.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  // Filtrado reactivo de categorías en el modal
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase().trim();
    return categories.filter((cat) => (cat.name || '').toLowerCase().includes(query));
  }, [categories, searchQuery]);

  const closeModal = () => {
    setIsModalOpen(false);
    setSearchQuery('');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleSelect = (catId) => {
    onSelectCategory && onSelectCategory(catId);
    closeModal();
  };

  return (
    <>
      {/* BARRA PRINCIPAL COMPACTA Y MODERNA */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-2 sm:p-2.5 w-full shadow-2xs gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* BOTÓN PRINCIPAL PARA ABRIR EL CUADRO DE CATEGORÍAS */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            title="Abrir panel con todas las categorías en cuadrícula"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-950 dark:text-orange-200 hover:bg-orange-100 transition-all cursor-pointer font-bold text-xs sm:text-sm shrink-0"
          >
            <LayoutGrid size={16} className="text-orange-600 shrink-0" />
            <span>Categorías</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-orange-500 text-white leading-none">
              {categories.length}
            </span>
            <ChevronDown size={14} className="text-orange-600 shrink-0" />
          </button>

          {/* Categoría Seleccionada Pill (si no es ALL) */}
          {selectedCategory && (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold truncate">
              <span className="truncate">{selectedCategory.name}</span>
              <button
                type="button"
                onClick={() => onSelectCategory && onSelectCategory('ALL')}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CON TODAS LAS CATEGORÍAS ORGANIZADAS */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '960px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABECERA DEL CUADRO */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #F1F5F9',
                backgroundColor: '#FAFAFA'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: '#FFF7ED',
                    color: '#EA580C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #FFEDD5',
                    flexShrink: 0
                  }}
                >
                  <LayoutGrid size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
                    Departamentos y Categorías
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
                    Selecciona una categoría para filtrar el inventario ({filteredCategories.length} de {categories.length} categorías)
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#64748B',
                    cursor: 'pointer',
                    padding: 8,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* BÚSQUEDA RÁPIDA DENTRO DEL PANEL */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  padding: '8px 12px'
                }}
              >
                <Search size={16} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="Buscar categoría..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    outline: 'none',
                    fontSize: 13,
                    color: '#0F172A',
                    width: '100%'
                  }}
                />
              </div>
            </div>

            {/* CUADRÍCULA DE CATEGORÍAS */}
            <div
              style={{
                padding: '20px',
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 12
              }}
            >
              {/* Opción "Todos los Departamentos" */}
              <button
                type="button"
                onClick={() => handleSelect('ALL')}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: selectedCategoryId === 'ALL' ? '2px solid #EA580C' : '1px solid #E2E8F0',
                  backgroundColor: selectedCategoryId === 'ALL' ? '#FFF7ED' : '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left'
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: '#FFEDD5',
                    color: '#EA580C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 14,
                    flexShrink: 0
                  }}
                >
                  *
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Todos los Departamentos</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{totalProductsCount} productos</div>
                </div>
              </button>

              {/* Categorías filtradas */}
              {filteredCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                const count = productCounts[cat.id] ?? 0;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelect(cat.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: isSelected ? '2px solid #EA580C' : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? '#FFF7ED' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      textAlign: 'left'
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: cat.color ? `${cat.color}20` : '#F1F5F9',
                        color: cat.color || '#EA580C',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 14,
                        flexShrink: 0
                      }}
                    >
                      {cat.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{cat.name}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{count} productos</div>
                    </div>
                  </button>
                );
              })}

              {filteredCategories.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFF7ED', color: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                    <FolderTree size={24} />
                  </div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#0F172A' }}>
                    {searchQuery ? 'No se encontraron categorías' : 'Sin categorías registradas aún'}
                  </p>
                  <p style={{ margin: '4px 0 16px 0', fontSize: 12, color: '#64748B' }}>
                    {searchQuery ? 'Prueba con otro término de búsqueda.' : 'Organiza tus categorías en Inventario ➔ Categorías del Catálogo.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default HierarchicalCategoryBar;
