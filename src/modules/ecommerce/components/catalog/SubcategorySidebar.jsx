import React from 'react';
import { LayoutGrid, Sparkles } from 'lucide-react';

export const SubcategorySidebar = ({
  subcategories = [],
  selectedSubcategoryId = 'ALL',
  onSelectSubcategory,
  productCounts = {},
  totalCount = 0,
  activeAccentColor = '#E11D48',
  maxHeight = 'calc(100vh - 210px)',
  style = {}
}) => {
  return (
    <aside
      className="axon-subcategory-sidebar-scroll"
      style={{
        width: 125,
        minWidth: 125,
        maxWidth: 125,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '10px 0',
        overflowY: 'auto',
        overflowX: 'hidden',
        maxHeight: maxHeight,
        height: '100%',
        boxSizing: 'border-box',
        userSelect: 'none',
        flexShrink: 0,
        scrollbarWidth: 'thin',
        scrollbarColor: '#CBD5E1 transparent',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        ...style
      }}
    >
      <style>
        {`
          .axon-subcategory-sidebar-scroll::-webkit-scrollbar {
            width: 5px;
            display: block !important;
          }
          .axon-subcategory-sidebar-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .axon-subcategory-sidebar-scroll::-webkit-scrollbar-thumb {
            background-color: #CBD5E1;
            border-radius: 9999px;
          }
          .axon-subcategory-sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background-color: #94A3B8;
          }
        `}
      </style>

      {/* 1. BOTÓN "ALL" */}
      <button
        type="button"
        onClick={() => onSelectSubcategory && onSelectSubcategory('ALL')}
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 8px',
          border: 'none',
          backgroundColor: selectedSubcategoryId === 'ALL' ? '#FFF5F5' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          marginBottom: 8
        }}
        onMouseEnter={(e) => {
          if (selectedSubcategoryId !== 'ALL') {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedSubcategoryId !== 'ALL') {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {/* Barra vertical activa en el borde derecho */}
        {selectedSubcategoryId === 'ALL' && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '15%',
              bottom: '15%',
              width: 3.5,
              borderRadius: '4px 0 0 4px',
              backgroundColor: activeAccentColor
            }}
          />
        )}

        {/* Círculo con Icono Grid */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            backgroundColor: selectedSubcategoryId === 'ALL' ? '#FFE4E6' : '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: selectedSubcategoryId === 'ALL' ? activeAccentColor : '#64748B',
            border: selectedSubcategoryId === 'ALL' ? `2px solid ${activeAccentColor}` : '1.5px solid #E2E8F0',
            boxShadow: selectedSubcategoryId === 'ALL' ? '0 2px 6px rgba(225, 29, 72, 0.18)' : 'none',
            transition: 'all 0.15s ease',
            marginBottom: 6
          }}
        >
          <LayoutGrid size={22} strokeWidth={selectedSubcategoryId === 'ALL' ? 2.5 : 2} />
        </div>

        {/* Etiqueta "All" */}
        <span
          style={{
            fontSize: '12px',
            fontWeight: selectedSubcategoryId === 'ALL' ? 700 : 500,
            color: selectedSubcategoryId === 'ALL' ? '#0F172A' : '#475569',
            textAlign: 'center',
            lineHeight: 1.2
          }}
        >
          All
        </span>

        {/* Contador */}
        {totalCount > 0 && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: '#94A3B8',
              marginTop: 2,
              fontFamily: 'monospace'
            }}
          >
            ({totalCount})
          </span>
        )}
      </button>

      {/* Línea divisoria muy sutil */}
      <div
        style={{
          width: '70%',
          height: 1,
          backgroundColor: '#F1F5F9',
          margin: '4px 0 10px 0'
        }}
      />

      {/* 2. LISTADO DE SUBCATEGORÍAS HIJAS */}
      {subcategories.map((subcat) => {
        const isSelected = selectedSubcategoryId === subcat.id;
        const count = productCounts[subcat.id];

        return (
          <button
            key={subcat.id}
            type="button"
            onClick={() => onSelectSubcategory && onSelectSubcategory(subcat.id)}
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 8px',
              border: 'none',
              backgroundColor: isSelected ? '#FFF5F5' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              marginBottom: 8
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {/* Barra vertical activa en el borde derecho */}
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '15%',
                  bottom: '15%',
                  width: 3.5,
                  borderRadius: '4px 0 0 4px',
                  backgroundColor: activeAccentColor
                }}
              />
            )}

            {/* Thumbnail Circular con Imagen o Iniciales */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isSelected ? `2.5px solid ${activeAccentColor}` : '1.5px solid #E2E8F0',
                boxShadow: isSelected ? '0 2px 8px rgba(225, 29, 72, 0.22)' : '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease',
                marginBottom: 6,
                flexShrink: 0
              }}
            >
              {subcat.imageUrl ? (
                <img
                  src={subcat.imageUrl}
                  alt={subcat.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: subcat.color ? `${subcat.color}15` : '#F1F5F9',
                    color: subcat.color || activeAccentColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '16px'
                  }}
                >
                  {subcat.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Nombre de la Subcategoría */}
            <span
              style={{
                fontSize: '11px',
                fontWeight: isSelected ? 700 : 500,
                color: isSelected ? '#0F172A' : '#475569',
                textAlign: 'center',
                lineHeight: 1.25,
                maxWidth: 105,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                textOverflow: 'ellipsis'
              }}
              title={subcat.name}
            >
              {subcat.name}
            </span>

            {/* Conteo de artículos */}
            {typeof count === 'number' && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: isSelected ? activeAccentColor : '#94A3B8',
                  marginTop: 2,
                  fontFamily: 'monospace'
                }}
              >
                ({count})
              </span>
            )}
          </button>
        );
      })}

      {subcategories.length === 0 && (
        <div
          style={{
            padding: '20px 10px',
            textAlign: 'center',
            color: '#94A3B8',
            fontSize: '11px',
            lineHeight: 1.4
          }}
        >
          <Sparkles size={16} color="#CBD5E1" style={{ margin: '0 auto 6px auto', display: 'block' }} />
          <span>General</span>
        </div>
      )}
    </aside>
  );
};
export default SubcategorySidebar;
