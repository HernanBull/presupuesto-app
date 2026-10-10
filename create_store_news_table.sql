-- Crear tabla para el Boletín de Noticias de la tienda
CREATE TABLE IF NOT EXISTS ecommerce_store_news (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  status text DEFAULT 'Publicado' CHECK (status IN ('Publicado', 'Borrador')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de Seguridad (RLS)
ALTER TABLE ecommerce_store_news ENABLE ROW LEVEL SECURITY;

-- Los usuarios públicos pueden ver las noticias 'Publicadas' de cualquier tienda
CREATE POLICY "Noticias públicas visibles para todos" ON ecommerce_store_news
  FOR SELECT USING (status = 'Publicado');

-- Solo el dueño del workspace o administradores pueden gestionar sus propias noticias
-- (Ajusta la política de inserción/actualización de acuerdo al manejo de roles de tu aplicación)
-- Asumiendo una política simple donde los usuarios autenticados pueden manejar su workspace_id
CREATE POLICY "Comerciantes pueden gestionar sus noticias" ON ecommerce_store_news
  FOR ALL USING (auth.role() = 'authenticated');
