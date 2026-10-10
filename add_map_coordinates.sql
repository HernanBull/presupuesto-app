-- Script para añadir latitud y longitud a la tabla store_profiles
-- Ejecuta este script en el editor SQL de tu panel de Supabase

ALTER TABLE store_profiles 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS map_address text;

-- Si deseas agregar un índice geoespacial básico para acelerar búsquedas
CREATE INDEX IF NOT EXISTS idx_store_profiles_lat_lng ON store_profiles(latitude, longitude);

-- Comentario para recordar
COMMENT ON COLUMN store_profiles.latitude IS 'Latitud de la ubicación de la tienda para el mapa de escaneo';
COMMENT ON COLUMN store_profiles.longitude IS 'Longitud de la ubicación de la tienda para el mapa de escaneo';
