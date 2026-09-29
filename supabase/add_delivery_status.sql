-- ==============================================================================
-- Migración para actualizar el esquema de Repartidores (Delivery Drivers)
-- Agrega la columna de estado para el sistema de turnos.
-- ==============================================================================

-- 1. Agregar la columna 'status' a la tabla delivery_drivers
ALTER TABLE public.delivery_drivers 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'descansando';

-- 2. Asegurarse de que los repartidores existentes tengan un estado por defecto
UPDATE public.delivery_drivers 
SET status = 'descansando' 
WHERE status IS NULL;
