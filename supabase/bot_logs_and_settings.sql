-- 1. Crear la tabla de logs del bot
CREATE TABLE IF NOT EXISTS public.bot_logs (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
    message TEXT NOT NULL,
    details JSONB
);

-- Habilitar RLS (Opcional pero recomendado, por ahora lo dejamos público para lectura del admin)
ALTER TABLE public.bot_logs ENABLE ROW LEVEL SECURITY;

-- Política para que los admins puedan ver los logs
CREATE POLICY "Admins can view bot logs" ON public.bot_logs
    FOR SELECT USING (true);

-- Política para que cualquiera pueda insertar (la Edge Function usará Service Role, así que pasa el RLS de todas formas)
CREATE POLICY "Anyone can insert bot logs" ON public.bot_logs
    FOR INSERT WITH CHECK (true);

-- 2. Insertar los valores por defecto en platform_settings para los interruptores
INSERT INTO public.platform_settings (key, value)
VALUES 
    ('bot_maintenance_mode', 'false'),
    ('bot_accept_orders', 'true')
ON CONFLICT (key) DO NOTHING;
