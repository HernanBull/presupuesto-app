-- 1. Agregar contadores a la tabla de repartidores
ALTER TABLE public.delivery_drivers 
ADD COLUMN IF NOT EXISTS total_trips INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earned NUMERIC DEFAULT 0.0;

-- 2. Guardar registro del repartidor en el pedido
ALTER TABLE public.ecommerce_orders_v2
ADD COLUMN IF NOT EXISTS delivery_driver_id TEXT;

-- 3. Configurar una tarifa base de pago por delivery por defecto (ej: $2.00)
-- Esto lo podrá cambiar el SuperAdmin en el futuro si lo desea.
INSERT INTO public.platform_settings (key, value)
VALUES ('delivery_base_fee', '2.00')
ON CONFLICT (key) DO NOTHING;
