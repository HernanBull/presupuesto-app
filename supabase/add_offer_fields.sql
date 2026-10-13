-- Migración: Agregar campos de Ofertas Flash a ecommerce_products
-- Permite que el comerciante marque productos como oferta y defina precio rebajado
-- Estos campos son leídos directamente por PublicStore.jsx para mostrar la vitrina

-- Flag booleano: indica si el producto está actualmente en oferta
ALTER TABLE ecommerce_products
  ADD COLUMN IF NOT EXISTS is_offer BOOLEAN DEFAULT FALSE;

-- Precio de oferta (precio rebajado visible al comprador en vitrina)
ALTER TABLE ecommerce_products
  ADD COLUMN IF NOT EXISTS discount_price NUMERIC(12, 2) DEFAULT 0;

-- Índice para mejorar el filtrado de productos en oferta (opcional pero recomendado)
CREATE INDEX IF NOT EXISTS idx_ecommerce_products_is_offer
  ON ecommerce_products (workspace_id, is_offer)
  WHERE is_offer = TRUE;
