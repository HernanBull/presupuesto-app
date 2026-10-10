-- Ejecuta este script en el SQL Editor de tu Dashboard de Supabase

-- 1. Crear tabla de roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'user'))
);

-- 2. Configurar RLS (Row Level Security) para la tabla user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Crear política para que un usuario pueda leer su propio rol
CREATE POLICY "Users can read own role" ON public.user_roles
    FOR SELECT
    USING (auth.uid() = user_id);


INSERT INTO public.user_roles (user_id, role)
VALUES ('d629676d-7840-4ec7-9544-45f56e500ffc', 'superadmin')
ON CONFLICT (user_id) DO UPDATE SET role = 'superadmin';


CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'superadmin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
