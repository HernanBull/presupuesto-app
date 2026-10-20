-- ==============================================================================
-- FASE 1: SEGURIDAD ANTI-PIRATERÍA, HUELLA DE HARDWARE Y CONTROL SUPERADMIN
-- Archivo: Presupuesto/supabase/fase_1_seguridad_antipirateria_superadmin.sql
-- 100% IDEMPOTENTE Y COMPATIBLE CON TABLAS EXISTENTES
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. EXTENDER TABLA WORKSPACES (COMERCIOS)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'api_key'
    ) THEN
        ALTER TABLE public.workspaces ADD COLUMN api_key TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'api_key_status'
    ) THEN
        ALTER TABLE public.workspaces ADD COLUMN api_key_status TEXT DEFAULT 'ACTIVE';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'api_key_created_at'
    ) THEN
        ALTER TABLE public.workspaces ADD COLUMN api_key_created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'max_terminals'
    ) THEN
        ALTER TABLE public.workspaces ADD COLUMN max_terminals INT DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'is_pos_enabled'
    ) THEN
        ALTER TABLE public.workspaces ADD COLUMN is_pos_enabled BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workspaces_api_key ON public.workspaces(api_key);

-- ------------------------------------------------------------------------------
-- 2. ASEGURAR O ACTUALIZAR TABLA store_terminals
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_code VARCHAR(50) NOT NULL DEFAULT 'CAJA-1',
    hardware_fingerprint VARCHAR(100) NOT NULL,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'store_terminals' AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE public.store_terminals ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'store_terminals' AND column_name = 'store_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.store_terminals ALTER COLUMN store_id DROP NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'store_terminals' AND column_name = 'machine_name'
    ) THEN
        ALTER TABLE public.store_terminals ADD COLUMN machine_name VARCHAR(150);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'store_terminals' AND column_name = 'motherboard_serial'
    ) THEN
        ALTER TABLE public.store_terminals ADD COLUMN motherboard_serial VARCHAR(150);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'store_terminals' AND column_name = 'cpu_id'
    ) THEN
        ALTER TABLE public.store_terminals ADD COLUMN cpu_id VARCHAR(150);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'store_terminals' AND column_name = 'disk_serial'
    ) THEN
        ALTER TABLE public.store_terminals ADD COLUMN disk_serial VARCHAR(150);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'store_terminals' AND column_name = 'os_platform'
    ) THEN
        ALTER TABLE public.store_terminals ADD COLUMN os_platform VARCHAR(50) DEFAULT 'win32';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'store_terminals' AND column_name = 'revocation_reason'
    ) THEN
        ALTER TABLE public.store_terminals ADD COLUMN revocation_reason TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'store_terminals' AND column_name = 'last_seen_at'
    ) THEN
        ALTER TABLE public.store_terminals ADD COLUMN last_seen_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'store_terminals' AND column_name = 'authorized_by'
    ) THEN
        ALTER TABLE public.store_terminals ADD COLUMN authorized_by VARCHAR(100) DEFAULT 'SUPERADMIN';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'store_terminals' AND column_name = 'authorized_at'
    ) THEN
        ALTER TABLE public.store_terminals ADD COLUMN authorized_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'store_terminals' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.store_terminals ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'store_terminals' AND column_name = 'store_id'
    ) THEN
        UPDATE public.store_terminals 
        SET workspace_id = store_id 
        WHERE workspace_id IS NULL AND store_id IS NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_store_terminals_hw ON public.store_terminals(hardware_fingerprint);
CREATE INDEX IF NOT EXISTS idx_store_terminals_workspace ON public.store_terminals(workspace_id);

-- ------------------------------------------------------------------------------
-- 3. TABLA DE LOGS DE AUDITORÍA DE SEGURIDAD (security_audit_logs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    hardware_fingerprint VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_hw ON public.security_audit_logs(hardware_fingerprint);
CREATE INDEX IF NOT EXISTS idx_security_logs_ws ON public.security_audit_logs(workspace_id);

-- ------------------------------------------------------------------------------
-- 4. RPC: VERIFICACIÓN INSTANTÁNEA DE HARDWARE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_terminal_hardware(
    p_api_key TEXT,
    p_hardware_fingerprint TEXT,
    p_machine_name TEXT DEFAULT NULL,
    p_extra_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_workspace RECORD;
    v_terminal RECORD;
BEGIN
    IF p_api_key IS NULL OR p_hardware_fingerprint IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'code', 'INVALID_PARAMETERS',
            'message', 'API Key y Huella de Hardware son obligatorios.'
        );
    END IF;

    SELECT id, name, status, api_key_status, max_terminals, is_pos_enabled
    INTO v_workspace
    FROM public.workspaces
    WHERE api_key = TRIM(p_api_key);

    IF NOT FOUND THEN
        INSERT INTO public.security_audit_logs(hardware_fingerprint, event_type, details)
        VALUES (p_hardware_fingerprint, 'INVALID_API_KEY', jsonb_build_object('api_key', p_api_key, 'extra', p_extra_info));

        RETURN jsonb_build_object(
            'valid', false,
            'code', 'INVALID_API_KEY',
            'message', 'La API Key suministrada no existe o es inválida.'
        );
    END IF;

    IF v_workspace.api_key_status != 'ACTIVE' OR v_workspace.is_pos_enabled = FALSE THEN
        RETURN jsonb_build_object(
            'valid', false,
            'code', 'COMMERCE_SUSPENDED',
            'message', 'El acceso a AxonPOS para este comercio se encuentra suspendido o revocado por el SuperAdmin.'
        );
    END IF;

    SELECT id, terminal_code, status, machine_name
    INTO v_terminal
    FROM public.store_terminals
    WHERE (workspace_id = v_workspace.id OR (workspace_id IS NULL AND store_id = v_workspace.id))
      AND hardware_fingerprint = TRIM(p_hardware_fingerprint);

    IF FOUND THEN
        IF v_terminal.status != 'ACTIVE' THEN
            INSERT INTO public.security_audit_logs(workspace_id, hardware_fingerprint, event_type, details)
            VALUES (v_workspace.id, p_hardware_fingerprint, 'REVOKED_ATTEMPT', jsonb_build_object('terminal_id', v_terminal.id));

            RETURN jsonb_build_object(
                'valid', false,
                'code', 'TERMINAL_REVOKED',
                'message', 'Esta terminal física ha sido desactivada o revocada por el SuperAdmin.'
            );
        END IF;

        UPDATE public.store_terminals
        SET last_seen_at = NOW(),
            machine_name = COALESCE(p_machine_name, machine_name),
            updated_at = NOW()
        WHERE id = v_terminal.id;

        INSERT INTO public.security_audit_logs(workspace_id, hardware_fingerprint, event_type, details)
        VALUES (v_workspace.id, p_hardware_fingerprint, 'LOGIN_SUCCESS', jsonb_build_object('terminal_code', v_terminal.terminal_code));

        RETURN jsonb_build_object(
            'valid', true,
            'code', 'AUTHORIZED',
            'message', 'Terminal verificada y autorizada con éxito.',
            'workspaceId', v_workspace.id,
            'workspaceName', v_workspace.name,
            'terminalCode', v_terminal.terminal_code,
            'hardwareFingerprint', p_hardware_fingerprint
        );
    ELSE
        INSERT INTO public.security_audit_logs(workspace_id, hardware_fingerprint, event_type, details)
        VALUES (v_workspace.id, p_hardware_fingerprint, 'UNAUTHORIZED_HW', jsonb_build_object('machine_name', p_machine_name, 'extra', p_extra_info));

        RETURN jsonb_build_object(
            'valid', false,
            'code', 'HARDWARE_NOT_AUTHORIZED',
            'message', 'Este equipo físico no está registrado en el Panel SuperAdmin para este comercio.',
            'workspaceId', v_workspace.id,
            'workspaceName', v_workspace.name,
            'hardwareFingerprint', p_hardware_fingerprint
        );
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. RPC: GENERAR O ROTAR API KEY (EXCLUSIVO SUPERADMIN)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.superadmin_generate_workspace_api_key(
    p_workspace_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_raw_key TEXT;
    v_prefix TEXT := 'ak_live_axon_';
BEGIN
    v_raw_key := v_prefix || encode(gen_random_bytes(24), 'hex');

    UPDATE public.workspaces
    SET api_key = v_raw_key,
        api_key_status = 'ACTIVE',
        api_key_created_at = NOW()
    WHERE id = p_workspace_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Comercio no encontrado.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'apiKey', v_raw_key,
        'workspaceId', p_workspace_id
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. RPC: AUTORIZAR TERMINAL FÍSICA DESDE SUPERADMIN (ROBUSTO Y SIN CONFLICTO)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.superadmin_authorize_terminal(
    p_workspace_id UUID,
    p_hardware_fingerprint TEXT,
    p_terminal_code TEXT DEFAULT 'CAJA-1',
    p_machine_name TEXT DEFAULT 'Terminal-PC',
    p_motherboard TEXT DEFAULT NULL,
    p_cpu TEXT DEFAULT NULL,
    p_disk TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_max_terminals INT;
    v_current_count INT;
    v_terminal_id UUID;
BEGIN
    SELECT COALESCE(max_terminals, 1) INTO v_max_terminals
    FROM public.workspaces
    WHERE id = p_workspace_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Comercio no encontrado.');
    END IF;

    SELECT COUNT(*) INTO v_current_count
    FROM public.store_terminals
    WHERE (workspace_id = p_workspace_id OR store_id = p_workspace_id)
      AND status = 'ACTIVE'
      AND hardware_fingerprint != TRIM(p_hardware_fingerprint);

    IF v_current_count >= v_max_terminals THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Límite de terminales alcanzado (%s de %s cajas). Aumente el límite de terminales en el comercio antes de autorizar otra PC.', v_current_count, v_max_terminals)
        );
    END IF;

    SELECT id INTO v_terminal_id
    FROM public.store_terminals
    WHERE (workspace_id = p_workspace_id OR (workspace_id IS NULL AND store_id = p_workspace_id))
      AND hardware_fingerprint = TRIM(p_hardware_fingerprint);

    IF FOUND THEN
        UPDATE public.store_terminals
        SET status = 'ACTIVE',
            workspace_id = p_workspace_id,
            terminal_code = TRIM(p_terminal_code),
            machine_name = TRIM(p_machine_name),
            motherboard_serial = COALESCE(p_motherboard, motherboard_serial),
            cpu_id = COALESCE(p_cpu, cpu_id),
            disk_serial = COALESCE(p_disk, disk_serial),
            authorized_by = 'SUPERADMIN',
            authorized_at = NOW(),
            updated_at = NOW()
        WHERE id = v_terminal_id;
    ELSE
        INSERT INTO public.store_terminals (
            workspace_id,
            terminal_code,
            hardware_fingerprint,
            machine_name,
            motherboard_serial,
            cpu_id,
            disk_serial,
            status,
            authorized_by,
            authorized_at,
            last_seen_at
        )
        VALUES (
            p_workspace_id,
            TRIM(p_terminal_code),
            TRIM(p_hardware_fingerprint),
            TRIM(p_machine_name),
            p_motherboard,
            p_cpu,
            p_disk,
            'ACTIVE',
            'SUPERADMIN',
            NOW(),
            NOW()
        )
        RETURNING id INTO v_terminal_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'terminalId', v_terminal_id,
        'workspaceId', p_workspace_id,
        'hardwareFingerprint', TRIM(p_hardware_fingerprint),
        'terminalCode', TRIM(p_terminal_code)
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. RPC: KILL SWITCH REMOTO PARA TERMINAL
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.superadmin_revoke_terminal(
    p_terminal_id UUID,
    p_reason TEXT DEFAULT 'Revocada por SuperAdmin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.store_terminals
    SET status = 'REVOKED',
        revocation_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_terminal_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Terminal no encontrada.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Terminal revocada con éxito.');
END;
$$;
