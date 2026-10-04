-- Habilitar la extensión de pg_cron si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Eliminar el job si ya existe (para poder correr el script varias veces sin error)
SELECT cron.unschedule('cleanup-unverified-users');

-- Crear el Cron Job que corre todos los días a la medianoche (00:00)
SELECT cron.schedule(
  'cleanup-unverified-users', -- Nombre de la tarea
  '0 0 * * *',                -- Expresión cron (todos los días a las 00:00)
  $$ 
    -- Eliminar usuarios de auth.users que no han confirmado su correo
    -- y cuya cuenta fue creada hace más de 24 horas.
    -- Nota: Al eliminar de auth.users, el registro en ecommerce_customers
    -- se eliminará automáticamente si la tabla tiene ON DELETE CASCADE.
    DELETE FROM auth.users 
    WHERE email_confirmed_at IS NULL 
      AND created_at < NOW() - INTERVAL '24 hours';
  $$
);
