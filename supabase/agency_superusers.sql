-- ==============================================================================
-- TABLA DE SUPERUSUARIOS / DIRECTORES DE AGENCIA DE DELIVERY (ENMINUTOS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.delivery_agency_superusers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_user_id TEXT UNIQUE NOT NULL,      -- ID numérico de Telegram (ej. '123456789')
    full_name TEXT NOT NULL,                     -- Nombre del Director / Dueño
    phone TEXT,                                  -- Teléfono de contacto
    agency_name TEXT DEFAULT 'EnMinutos (EM)',   -- Agencia asignada
    role TEXT DEFAULT 'owner',                   -- 'owner' (Dueño) | 'manager' (Supervisor) | 'auditor'
    is_active BOOLEAN DEFAULT true,              -- Estado activo/inactivo
    alert_on_accidents BOOLEAN DEFAULT true,     -- Recibir alertas si un chofer se accidenta
    alert_on_delays BOOLEAN DEFAULT true,        -- Recibir alertas si un pedido supera 40 min
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_agency_superusers_tg 
ON public.delivery_agency_superusers(telegram_user_id);

CREATE INDEX IF NOT EXISTS idx_agency_superusers_active 
ON public.delivery_agency_superusers(is_active);

-- Políticas RLS
ALTER TABLE public.delivery_agency_superusers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin can manage delivery_agency_superusers" 
ON public.delivery_agency_superusers
FOR ALL USING (true) WITH CHECK (true);
