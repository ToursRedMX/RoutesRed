/*
# RoutesRed — Base Users Table + Helper Functions + User Platforms

## Overview
Creates the shared users profile table, admin helper functions, and user_platforms
for tracking platform membership across the ecosystem (toursred, routesred, naturestayred).

## New Tables
- `public.users`: id (uuid PK -> auth.users), email, first_name, last_name, phone,
  avatar_url, role, is_super_admin, is_active, is_approved, timestamps
- `public.user_platforms`: id, user_id, platform, status, registration_source,
  registered_at, last_access_at, onboarding_completed, timestamps

## Functions
1. `public.is_super_admin()` — checks if current user is super admin
2. `public.is_admin()` — checks if current user has admin role
3. `routesred.register_platform_access(platform, source)` — registers first access
4. `routesred.complete_onboarding(platform)` — marks onboarding complete
5. `routesred.touch_platform_access(platform)` — updates last_access_at

## Security
- `public.users`: RLS — users read/update own; admins read all
- `public.user_platforms`: RLS deny-by-default — users read own; admins read all; mutations only via RPC
- No direct INSERT/UPDATE/DELETE on user_platforms for authenticated users

## Notes
- Functions created BEFORE policies that reference them
- `public.users.role` CHECK includes ToursRed roles + 'transport_provider'
- Email synced from auth.users via trigger
*/

-- =============================================================
-- 1. Helper functions (must exist before policies reference them)
-- =============================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND is_super_admin = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND (is_super_admin = true OR role = 'admin')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- =============================================================
-- 2. public.users (shared profile table)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text,
  first_name      text,
  last_name       text,
  phone           text,
  avatar_url      text,
  role            text NOT NULL DEFAULT 'traveler',
  is_super_admin  boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  is_approved     boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_role_check CHECK (role IN ('traveler', 'agency', 'admin', 'accountant', 'account_executive', 'transport_provider'))
);

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_user_email_trigger ON public.users;
CREATE TRIGGER sync_user_email_trigger
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_email();

DROP POLICY IF EXISTS "users_read_own" ON public.users;
CREATE POLICY "users_read_own"
  ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_super_admin());

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================================================
-- 3. public.user_platforms
-- =============================================================
CREATE TABLE IF NOT EXISTS public.user_platforms (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform             text NOT NULL,
  status               text NOT NULL DEFAULT 'active',
  registration_source  text NOT NULL DEFAULT 'routesred',
  registered_at        timestamptz NOT NULL DEFAULT now(),
  last_access_at       timestamptz,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_platforms_platform_check CHECK (platform IN ('toursred', 'routesred', 'naturestayred')),
  CONSTRAINT user_platforms_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT user_platforms_source_check CHECK (registration_source IN ('toursred', 'routesred', 'naturestayred', 'system'))
);

CREATE UNIQUE INDEX IF NOT EXISTS user_platforms_user_platform_unique
  ON public.user_platforms (user_id, platform);

CREATE INDEX IF NOT EXISTS user_platforms_platform_idx
  ON public.user_platforms (platform);

ALTER TABLE public.user_platforms ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS user_platforms_updated_at ON public.user_platforms;
CREATE TRIGGER user_platforms_updated_at
  BEFORE UPDATE ON public.user_platforms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "users_read_own_platforms" ON public.user_platforms;
CREATE POLICY "users_read_own_platforms"
  ON public.user_platforms FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin());

-- =============================================================
-- 4. SECURITY DEFINER functions for platform access
-- =============================================================
CREATE OR REPLACE FUNCTION routesred.register_platform_access(p_platform text, p_source text DEFAULT 'routesred')
RETURNS public.user_platforms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, routesred
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.user_platforms;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_platform NOT IN ('routesred', 'naturestayred') THEN
    RAISE EXCEPTION 'Can only register routesred or naturestayred from this function';
  END IF;

  SELECT * INTO v_row FROM public.user_platforms WHERE user_id = v_uid AND platform = p_platform;

  IF v_row IS NULL THEN
    INSERT INTO public.user_platforms (user_id, platform, status, registration_source, registered_at, last_access_at, onboarding_completed)
    VALUES (v_uid, p_platform, 'active', p_source, now(), now(), false)
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.user_platforms SET last_access_at = now() WHERE id = v_row.id
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION routesred.register_platform_access(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION routesred.complete_onboarding(p_platform text DEFAULT 'routesred')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, routesred
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_platform NOT IN ('routesred', 'naturestayred') THEN
    RAISE EXCEPTION 'Invalid platform';
  END IF;

  UPDATE public.user_platforms
  SET onboarding_completed = true
  WHERE user_id = v_uid AND platform = p_platform;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION routesred.complete_onboarding(text) TO authenticated;

CREATE OR REPLACE FUNCTION routesred.touch_platform_access(p_platform text DEFAULT 'routesred')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, routesred
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.user_platforms SET last_access_at = now()
  WHERE user_id = v_uid AND platform = p_platform;
END;
$$;

GRANT EXECUTE ON FUNCTION routesred.touch_platform_access(text) TO authenticated;
