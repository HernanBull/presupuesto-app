-- ==============================================================================
-- SCRIPT DE MIGRACIÓN: SISTEMA DE RED SOCIAL INTERACTIVA (AXON MARKET)
-- Tablas para: Seguidores de Tiendas, Likes, Comentarios y Guardados en Favoritos
-- ==============================================================================

-- 1. SEGUIDORES DE COMERCIOS (FOLLOWERS)
CREATE TABLE IF NOT EXISTS ecommerce_store_followers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(workspace_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_store_followers_ws ON ecommerce_store_followers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_store_followers_cust ON ecommerce_store_followers(customer_id);

-- 2. ME GUSTA EN PUBLICACIONES Y VITRINAS (POST LIKES)
CREATE TABLE IF NOT EXISTS ecommerce_post_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id text NOT NULL, -- Permite IDs de noticias o slugs/IDs de vitrinas
  workspace_id uuid,     -- ID del comercio para métricas rápidas
  customer_id uuid NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(post_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON ecommerce_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_cust ON ecommerce_post_likes(customer_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_ws ON ecommerce_post_likes(workspace_id);

-- 3. COMENTARIOS EN PUBLICACIONES (POST COMMENTS)
CREATE TABLE IF NOT EXISTS ecommerce_post_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id text NOT NULL,
  workspace_id uuid,
  customer_id uuid NOT NULL,
  customer_name text NOT NULL,
  customer_avatar text,
  content text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON ecommerce_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_ws ON ecommerce_post_comments(workspace_id);

-- 4. GUARDADOS / MARCADORES DE PUBLICACIONES (POST SAVES)
CREATE TABLE IF NOT EXISTS ecommerce_post_saves (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id text NOT NULL,
  workspace_id uuid,
  customer_id uuid NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(post_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_post_saves_cust ON ecommerce_post_saves(customer_id);
CREATE INDEX IF NOT EXISTS idx_post_saves_post ON ecommerce_post_saves(post_id);

-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

ALTER TABLE ecommerce_store_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecommerce_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecommerce_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecommerce_post_saves ENABLE ROW LEVEL SECURITY;

-- Lectura pública para todos
CREATE POLICY "Seguidores visibles públicamente" ON ecommerce_store_followers FOR SELECT USING (true);
CREATE POLICY "Likes visibles públicamente" ON ecommerce_post_likes FOR SELECT USING (true);
CREATE POLICY "Comentarios visibles públicamente" ON ecommerce_post_comments FOR SELECT USING (true);
CREATE POLICY "Guardados visibles por suscriptores" ON ecommerce_post_saves FOR SELECT USING (true);

-- Inserción, actualización y eliminación abierta para clientes registrados
CREATE POLICY "Gestionar seguidores" ON ecommerce_store_followers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Gestionar likes" ON ecommerce_post_likes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Gestionar comentarios" ON ecommerce_post_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Gestionar guardados" ON ecommerce_post_saves FOR ALL USING (true) WITH CHECK (true);
