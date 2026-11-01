import React from 'react';
import { Star, Plus, Minus, Package, AlertCircle } from 'lucide-react';

export const VisualProductCard = ({
  product,
  activeExchangeRate = 888.89,
  quantityInCart = 0,
  onAddToCart,
  onUpdateCartQuantity,
  onClickCard,
  activeAccentColor = '#E11D48'
}) => {
  const isOutOfStock = product.trackInventory && product.currentStock <= 0;
  const isLowStock = product.trackInventory && product.currentStock > 0 && product.currentStock <= product.minStock;

  const priceUsd = Number(product.priceUsd ?? product.price ?? 0);
  const vesPrice = priceUsd * activeExchangeRate;
  const wholesaleUsd = product.wholesaleBestRateUsd ? Number(product.wholesaleBestRateUsd) : null;
  const wholesaleVes = wholesaleUsd ? wholesaleUsd * activeExchangeRate : null;

  const formatVes = (amount) => {
    return 'Bs. ' + Number(amount || 0).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleAddClick = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onAddToCart && onAddToCart(product, 1);
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    if (onUpdateCartQuantity) {
      onUpdateCartQuantity(product, 1);
    } else if (onAddToCart) {
      onAddToCart(product, 1);
    }
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (onUpdateCartQuantity) {
      onUpdateCartQuantity(product, -1);
    }
  };

  // Calcular precio unitario referencial si tiene packInfo
  const getUnitReferencePrice = () => {
    if (!product.packInfo) return null;
    const match = product.packInfo.match(/(\d+)\s*(pc|un|kg|gm|pack)/i);
    if (match && Number(match[1]) > 1) {
      const units = Number(match[1]);
      const unitPrice = priceUsd / units;
      return `$${unitPrice.toFixed(2)}/${match[2].toLowerCase()}`;
    }
    return null;
  };

  const unitRefPrice = getUnitReferencePrice();

  return (
    <div
      onClick={() => onClickCard && onClickCard(product)}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: onClickCard ? 'pointer' : 'default',
        position: 'relative',
        boxSizing: 'border-box',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
        e.currentTarget.style.borderColor = '#CBD5E1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
        e.currentTarget.style.borderColor = '#E2E8F0';
      }}
    >
      {/* 1. CONTENEDOR DE IMAGEN CON OVERLAY Y BOTÓN + ADD */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '80%', // Aspect ratio 5:4
          backgroundColor: '#F8FAFC',
          overflow: 'hidden'
        }}
      >
        {/* Imagen del Producto */}
        {product.imageUrl || product.image ? (
          <img
            src={product.imageUrl || product.image}
            alt={product.name}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease'
            }}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.parentElement.querySelector('.sin-foto-placeholder');
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}

        {/* Fallback "Sin Foto" con ícono 3D Package si no hay foto o falla */}
        <div
          className="sin-foto-placeholder"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: (product.imageUrl || product.image) ? 'none' : 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94A3B8',
            backgroundColor: '#F1F5F9'
          }}
        >
          <Package size={34} strokeWidth={1.5} color="#94A3B8" />
          <span style={{ fontSize: '11px', marginTop: 4, fontWeight: 500, color: '#94A3B8' }}>Sin Foto</span>
        </div>

        {/* 1.1 SÍMBOLO DIETARIO (VEG / NON-VEG) */}
        {product.dietaryType && product.dietaryType !== 'NONE' && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              width: 15,
              height: 15,
              backgroundColor: '#FFFFFF',
              borderRadius: '3px',
              border: product.dietaryType === 'VEG' ? '1.5px solid #16A34A' : '1.5px solid #DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
            }}
            title={product.dietaryType === 'VEG' ? 'Producto Vegetariano' : 'Producto Cárnico'}
          >
            {product.dietaryType === 'VEG' ? (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: '#16A34A'
                }}
              />
            ) : (
              <span
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderBottom: '6px solid #DC2626'
                }}
              />
            )}
          </div>
        )}

        {/* 1.2 BOTÓN FLOTANTE "ADD +" O INCREMENTADOR EN ESQUINA INFERIOR DERECHA */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            zIndex: 3
          }}
        >
          {quantityInCart > 0 ? (
            // Contador activo con botones - y +
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: activeAccentColor,
                borderRadius: '8px',
                color: '#FFFFFF',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                overflow: 'hidden',
                height: 30
              }}
            >
              <button
                type="button"
                onClick={handleDecrement}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#FFFFFF',
                  width: 26,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '0 6px',
                  minWidth: 16,
                  textAlign: 'center'
                }}
              >
                {quantityInCart}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#FFFFFF',
                  width: 26,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            // Botón inicial estilo Hyperpure: fondo blanco con texto de color
            <button
              type="button"
              onClick={handleAddClick}
              disabled={isOutOfStock}
              style={{
                backgroundColor: '#FFFFFF',
                color: isOutOfStock ? '#94A3B8' : activeAccentColor,
                border: isOutOfStock ? '1px solid #CBD5E1' : `1.5px solid ${activeAccentColor}`,
                borderRadius: '8px',
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.12)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isOutOfStock) {
                  e.currentTarget.style.backgroundColor = activeAccentColor;
                  e.currentTarget.style.color = '#FFFFFF';
                }
              }}
              onMouseLeave={(e) => {
                if (!isOutOfStock) {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.color = activeAccentColor;
                }
              }}
            >
              <span>ADD</span>
              <Plus size={13} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Badge de Agotado si stock <= 0 */}
        {isOutOfStock && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626',
              fontWeight: 700,
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Agotado
          </div>
        )}
      </div>

      {/* 2. CUERPO DE INFORMACIÓN DEL PRODUCTO */}
      <div
        style={{
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'space-between',
          gap: 6
        }}
      >
        {/* 2.1 Título del Producto */}
        <h4
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: '#1E293B',
            lineHeight: 1.35,
            height: 35,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            textOverflow: 'ellipsis'
          }}
          title={product.name}
        >
          {product.name}
        </h4>

        {/* 2.2 Fila de Empaque y Calificación (⭐ 4.8) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            fontSize: '11px'
          }}
        >
          {/* Empaque o piezas */}
          {product.packInfo ? (
            <span
              style={{
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 600,
                fontSize: '11px',
                maxWidth: 110,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {product.packInfo.split('|')[0]?.trim()}
            </span>
          ) : (
            <span style={{ color: '#64748B' }}>1 {product.unit || 'unit'}</span>
          )}

          {/* Calificación */}
          {product.rating ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                color: '#475569',
                fontWeight: 600
              }}
            >
              <Star size={11} fill="#F59E0B" color="#F59E0B" />
              <span>{Number(product.rating).toFixed(1)}</span>
              {product.ratingCount && (
                <span style={{ color: '#94A3B8', fontWeight: 400 }}>({product.ratingCount})</span>
              )}
            </div>
          ) : null}
        </div>

        {/* 2.3 Bloque de Precios Bimonetarios */}
        <div style={{ marginTop: 2 }}>
          {/* Precio Principal en USD y VES */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: '#0F172A',
                fontFamily: 'monospace'
              }}
            >
              ${priceUsd.toFixed(2)}
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748B',
                fontFamily: 'monospace'
              }}
            >
              {formatVes(vesPrice)}
            </span>
          </div>

          {/* Desglose Unitario Referencial */}
          {unitRefPrice && (
            <div
              style={{
                fontSize: '11px',
                color: '#64748B',
                marginTop: 1
              }}
            >
              {unitRefPrice}
            </div>
          )}
        </div>

        {/* 2.4 Píldora de Tarifa Mayorista ("Best Rate") */}
        {wholesaleUsd ? (
          <div
            style={{
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              padding: '3px 7px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              width: 'fit-content',
              marginTop: 2
            }}
          >
            <span>🟢 ${wholesaleUsd.toFixed(2)} Mayor</span>
            {wholesaleVes && (
              <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 500 }}>
                ({formatVes(wholesaleVes)})
              </span>
            )}
          </div>
        ) : null}

        {/* 2.5 Advertencia de Stock Bajo */}
        {isLowStock && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#D97706',
              fontSize: '10px',
              fontWeight: 600,
              marginTop: 2
            }}
          >
            <AlertCircle size={11} />
            <span>Quedan solo {product.currentStock} {product.unit || 'unid'}s</span>
          </div>
        )}
      </div>
    </div>
  );
};
export default VisualProductCard;
