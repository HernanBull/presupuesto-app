-- ==============================================================================
-- FIX RLS & SOPORTE MULTIMEDIA (FOTOS Y VIDEOS) PARA AXON MARKET
-- Tabla: ecommerce_store_news
-- Ejecutar en el SQL Editor de tu proyecto Supabase (Dashboard -> SQL Editor)
-- ==============================================================================

-- 1. Crear tabla si no existía
CREATE TABLE IF NOT EXISTS ecommerce_store_news (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  media_type text DEFAULT 'image', -- 'image' o 'video'
  status text DEFAULT 'Publicado',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Asegurar que la columna media_type exista para soportar videos y fotos
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ecommerce_store_news' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE ecommerce_store_news ADD COLUMN media_type text DEFAULT 'image';
  END IF;
END $$;

-- 3. Habilitar RLS
ALTER TABLE ecommerce_store_news ENABLE ROW LEVEL SECURITY;

-- 4. Política de Lectura Pública (Clientes, Feed TikTok, Vitrina)
DROP POLICY IF EXISTS "Publicaciones visibles públicamente" ON ecommerce_store_news;
DROP POLICY IF EXISTS "Lectura publica noticias" ON ecommerce_store_news;
CREATE POLICY "Publicaciones visibles públicamente" 
  ON ecommerce_store_news FOR SELECT 
  USING (true);

-- 5. Política de Gestión Total (Inserción, Edición y Eliminación para Comerciantes)
-- Permite insertar con la anon key sin ser bloqueado por RLS
DROP POLICY IF EXISTS "Gestionar noticias comerciantes" ON ecommerce_store_news;
DROP POLICY IF EXISTS "Permitir insertar noticias a comerciantes" ON ecommerce_store_news;
DROP POLICY IF EXISTS "Permitir actualizar noticias a comerciantes" ON ecommerce_store_news;
DROP POLICY IF EXISTS "Permitir eliminar noticias a comerciantes" ON ecommerce_store_news;

CREATE POLICY "Gestionar noticias comerciantes" 
  ON ecommerce_store_news FOR ALL 
  USING (true) 
  WITH CHECK (true);
