import React, { useState, useEffect, useMemo } from 'react';
import { LayoutGrid, ChevronDown, Sparkles, Search, X, Check } from 'lucide-react';

export const HierarchicalCategoryBar = ({
  categories = [],
  selectedCategoryId = 'ALL',
  onSelectCategory,
  productCounts = {},
  showAllOption = true,
  totalProductsCount = 0,
  sortBy = 'name',
  onSortChange
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
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '8px 14px',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          gap: 12,
          flexWrap: 'wrap',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          {/* BOTÓN PRINCIPAL PARA ABRIR EL CUADRO DE CATEGORÍAS */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            title="Abrir panel con todas las categorías en cuadrícula"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: '10px',
              backgroundColor: '#FFF7ED',
              border: '1.5px solid #FDBA74',
              color: '#9A3412',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 1px 3px rgba(234, 88, 12, 0.08)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FFEDD5';
              e.currentTarget.style.borderColor = '#FB923C';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(234, 88, 12, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFF7ED';
              e.currentTarget.style.borderColor = '#FDBA74';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(234, 88, 12, 0.08)';
            }}
          >
            <LayoutGrid size={18} color="#EA580C" />
            <span>Ver Todas las Categorías</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '1px 7px',
                borderRadius: '10px',
                backgroundColor: '#EA580C',
                color: '#FFFFFF'
              }}
            >
              {categories.length}
            </span>
            <ChevronDown size={16} color="#EA580C" />
          </button>

        </div>

        {/* SELECTOR DE ORDENAMIENTO */}
        {onSortChange && (
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <select
              value={sortBy || 'name'}
              onChange={(e) => onSortChange(e.target.value)}
              title="Ordenar catálogo"
              style={{
                height: 34,
                padding: '0 10px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <option value="name">Ordenar: Nombre (A-Z)</option>
              <option value="price_asc">Precio: Menor a Mayor</option>
              <option value="price_desc">Precio: Mayor a Menor</option>
            </select>
          </div>
        )}
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
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default HierarchicalCategoryBar;
