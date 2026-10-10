-- Añadir la columna 'subcategory' a la tabla de productos de E-commerce
ALTER TABLE public.ecommerce_products 
ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT 'General';

-- (Opcional) Si existe una vista o política que necesite actualizarse, se haría aquí.
-- Por ahora, con añadir la columna es suficiente para soportar el nuevo diseño.
