ALTER TABLE public.sdd_projects ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE public.sdd_projects ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
