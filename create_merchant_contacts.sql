-- Ejecuta este script en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS merchant_contacts (
  id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de seguridad (RLS)
ALTER TABLE merchant_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los comerciantes pueden ver su propio contacto"
  ON merchant_contacts FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Los comerciantes pueden insertar su propio contacto"
  ON merchant_contacts FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Los comerciantes pueden actualizar su propio contacto"
  ON merchant_contacts FOR UPDATE
  USING (auth.uid() = id);
