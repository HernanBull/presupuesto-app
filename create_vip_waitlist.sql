-- Ejecuta este script en el SQL Editor de Supabase para almacenar la lista de espera del Club VIP
CREATE TABLE IF NOT EXISTS axon_vip_waitlist (
  id text PRIMARY KEY,
  phone text NOT NULL UNIQUE,
  name text,
  customer_id text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas RLS
ALTER TABLE axon_vip_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inserción pública VIP waitlist"
  ON axon_vip_waitlist FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Lectura y gestión pública o superadmin VIP waitlist"
  ON axon_vip_waitlist FOR ALL
  USING (true);
