-- Ejecutar en el SQL Editor de Supabase
ALTER TABLE ecommerce_customers
ADD COLUMN IF NOT EXISTS profile_pic text,
ADD COLUMN IF NOT EXISTS favorites jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS addresses jsonb DEFAULT '[]'::jsonb;
