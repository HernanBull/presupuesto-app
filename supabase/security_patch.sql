-- 1. Revocar el acceso público indiscriminado a la tabla
DROP POLICY IF EXISTS "Allow public read access with token" ON public.sdd_projects;

-- 2. Crear una política más restrictiva (Solo permitir leer si el código coincide)
-- Sin embargo, como el cliente es anónimo, la mejor forma de proteger es usar un Stored Procedure (RPC)
-- y deshabilitar completamente el acceso de lectura pública a la tabla.
DROP POLICY IF EXISTS "Allow read only via RPC or Auth" ON public.sdd_projects;
CREATE POLICY "Allow read only via RPC or Auth"
ON public.sdd_projects FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Crear la función RPC segura para el login del cliente
CREATE OR REPLACE FUNCTION verify_client_code(code_input TEXT)
RETURNS TABLE (
  id UUID,
  client_code TEXT,
  mfa_enabled BOOLEAN,
  mfa_secret TEXT,
  project_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, 
    p.client_code, 
    p.mfa_enabled, 
    p.mfa_secret, 
    p.project_name
  FROM 
    public.sdd_projects p
  WHERE 
    p.client_code = code_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear la función RPC para establecer el secreto MFA de forma segura
CREATE OR REPLACE FUNCTION setup_client_mfa(code_input TEXT, new_secret TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.sdd_projects
  SET mfa_enabled = true, mfa_secret = new_secret
  WHERE client_code = code_input AND mfa_enabled = false;
  
  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
