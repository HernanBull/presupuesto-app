-- Script para añadir latitud y longitud a la tabla store_profiles
-- Ejecuta este script en el editor SQL de tu panel de Supabase

ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS map_address text;

-- Si deseas agregar un índice geoespacial básico para acelerar búsquedas
CREATE INDEX IF NOT EXISTS idx_workspaces_lat_lng ON workspaces(latitude, longitude);

-- Comentario para recordar
COMMENT ON COLUMN workspaces.latitude IS 'Latitud de la ubicación de la tienda para el mapa de escaneo';
COMMENT ON COLUMN workspaces.longitude IS 'Longitud de la ubicación de la tienda para el mapa de escaneo';
