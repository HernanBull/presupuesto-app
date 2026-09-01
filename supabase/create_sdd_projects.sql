-- Ejecuta este código en el editor SQL de tu panel de Supabase

CREATE TABLE IF NOT EXISTS public.sdd_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL UNIQUE, -- Asume que tienes una forma de vincularlo a tu workspace
    public_token UUID NOT NULL DEFAULT gen_random_uuid(),
    client_name TEXT,
    project_name TEXT,
    current_step TEXT DEFAULT 'constitucion',
    tasks_total INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_data JSONB DEFAULT '[]'::jsonb,
    messages JSONB DEFAULT '[]'::jsonb, -- Canal de conversacion
    deliverable_links JSONB DEFAULT '[]'::jsonb, -- Enlaces a entregables
    client_code TEXT, -- Nuevo campo para el código de login
    maintenance_data JSONB DEFAULT '{"status": "inactive", "next_date": null, "logs": []}'::jsonb, -- Datos de soporte
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Si ya creaste la tabla anteriormente, ejecuta este comando para agregar la nueva columna:
-- ALTER TABLE public.sdd_projects ADD COLUMN IF NOT EXISTS tasks_data JSONB DEFAULT '[]'::jsonb;
-- ALTER TABLE public.sdd_projects ADD COLUMN IF NOT EXISTS client_code TEXT;
-- ALTER TABLE public.sdd_projects ADD COLUMN IF NOT EXISTS maintenance_data JSONB DEFAULT '{"status": "inactive", "next_date": null, "logs": []}'::jsonb;


-- Políticas RLS (Row Level Security)
ALTER TABLE public.sdd_projects ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública a cualquiera (para el portal del cliente)
CREATE POLICY "Allow public read access with token"
ON public.sdd_projects FOR SELECT USING (true);

-- Permitir actualización pública (para que el cliente pueda enviar mensajes por el chat)
CREATE POLICY "Allow client to update chat"
ON public.sdd_projects FOR UPDATE USING (true);

-- Permitir a usuarios autenticados insertar/actualizar
CREATE POLICY "Allow authenticated users to insert/update"
ON public.sdd_projects FOR ALL USING (auth.role() = 'authenticated');
