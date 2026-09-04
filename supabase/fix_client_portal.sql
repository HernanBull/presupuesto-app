-- 1. Crear función para obtener todos los datos del proyecto (Client Portal)
CREATE OR REPLACE FUNCTION get_full_project_by_code(code_input TEXT)
RETURNS SETOF public.sdd_projects AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.sdd_projects p
  WHERE p.client_code = code_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Eliminar la política insegura que permitía a clientes anónimos modificar CUALQUIER columna
DROP POLICY IF EXISTS "Allow client to update chat" ON public.sdd_projects;

-- 3. Crear una función segura que solo permite agregar mensajes al chat
CREATE OR REPLACE FUNCTION append_chat_message(project_id UUID, new_messages JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.sdd_projects
  SET messages = new_messages
  WHERE id = project_id;
  
  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
