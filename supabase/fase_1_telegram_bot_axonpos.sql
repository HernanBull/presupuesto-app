-- ==============================================================================
-- FASE 1: MIGRACIÓN SQL PARA INTEGRACIÓN DEL BOT DE TELEGRAM CON AXONPOS
-- Proyecto: AxonPOS ↔ AxonMarket (@DeliveryAxonbot)
-- Fecha: 2026-10-20
-- Ejecutar en: Supabase SQL Editor (https://iafhbrjeterrhtpctwqb.supabase.co)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENDER TABLA DE PEDIDOS E-COMMERCE (ecommerce_orders_v2)
-- Agrega soporte para datos del repartidor asignado, punto de recogida y estado de subasta
-- ------------------------------------------------------------------------------
ALTER TABLE public.ecommerce_orders_v2
ADD COLUMN IF NOT EXISTS delivery_driver_id TEXT,
ADD COLUMN IF NOT EXISTS delivery_driver_name TEXT,
ADD COLUMN IF NOT EXISTS delivery_driver_phone TEXT,
ADD COLUMN IF NOT EXISTS delivery_driver_moto TEXT,
ADD COLUMN IF NOT EXISTS delivery_driver_code TEXT,
ADD COLUMN IF NOT EXISTS pickup_store_name TEXT,
ADD COLUMN IF NOT EXISTS pickup_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_telegram_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_telegram_status TEXT DEFAULT 'idle', -- 'idle' | 'broadcasted' | 'assigned' | 'aborted'
ADD COLUMN IF NOT EXISTS delivery_abort_reason TEXT;

-- Índice para búsquedas ultrarrápidas de órdenes por repartidor
CREATE INDEX IF NOT EXISTS idx_orders_delivery_driver 
ON public.ecommerce_orders_v2 (delivery_driver_id);

-- Índice para filtrar órdenes según estado de subasta de Telegram
CREATE INDEX IF NOT EXISTS idx_orders_telegram_status 
ON public.ecommerce_orders_v2 (delivery_telegram_status);

-- ------------------------------------------------------------------------------
-- 2. EXTENDER TABLAS DE VIAJES PENDIENTES Y ACTIVOS (MULTI-TENANT POR TIENDA)
-- ------------------------------------------------------------------------------
ALTER TABLE public.delivery_pending_trips
ADD COLUMN IF NOT EXISTS workspace_id TEXT;

CREATE INDEX IF NOT EXISTS idx_pending_trips_workspace 
ON public.delivery_pending_trips (workspace_id);

ALTER TABLE public.delivery_active_trips
ADD COLUMN IF NOT EXISTS workspace_id TEXT,
ADD COLUMN IF NOT EXISTS driver_name TEXT,
ADD COLUMN IF NOT EXISTS driver_phone TEXT,
ADD COLUMN IF NOT EXISTS driver_moto TEXT;

CREATE INDEX IF NOT EXISTS idx_active_trips_workspace 
ON public.delivery_active_trips (workspace_id);

-- ------------------------------------------------------------------------------
-- 3. EXTENDER TABLA DE COMERCIOS (workspaces) PARA CONFIGURACIÓN DE TELEGRAM
-- ------------------------------------------------------------------------------
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS telegram_group_id TEXT,
ADD COLUMN IF NOT EXISTS telegram_auto_dispatch BOOLEAN DEFAULT false;

-- ------------------------------------------------------------------------------
-- 4. VALORES POR DEFECTO Y PARÁMETROS GLOBALES EN platform_settings
-- ------------------------------------------------------------------------------
INSERT INTO public.platform_settings (key, value)
VALUES 
    ('delivery_telegram_bot_username', 'DeliveryAxonbot'),
    ('delivery_telegram_auto_dispatch', 'false')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. VERIFICACIÓN DE HABILITACIÓN DE REALTIME
-- Asegurar que los cambios en estas tablas se emitan por WebSocket
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'ecommerce_orders_v2'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE ecommerce_orders_v2;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'delivery_active_trips'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE delivery_active_trips;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignorar si la publicación no existe en entornos locales
END $$;
