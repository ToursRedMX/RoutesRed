-- routesred.create_provider RPC
-- Creates a transport provider for the calling user and links them as
-- owner via transport_provider_users. Enforces one-provider-per-user at
-- the application layer (this RPC returns the new provider id on
-- success or raises an error). Uses a SECURITY DEFINER function with a
-- locked-down search_path so the caller does not need direct INSERT
-- privileges on transport_providers / transport_provider_users.

CREATE OR REPLACE FUNCTION routesred.create_provider(
  p_provider_type text DEFAULT 'company',
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_legal_name text DEFAULT NULL,
  p_trade_name text DEFAULT NULL,
  p_legal_representative text DEFAULT NULL,
  p_rfc text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_country_code text DEFAULT 'MX'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
DECLARE
  v_provider_id uuid;
  v_slug text;
  v_base text;
  v_owner uuid := auth.uid();
BEGIN
  -- Require an authenticated caller.
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Validate provider_type.
  IF p_provider_type NOT IN ('individual', 'company') THEN
    RAISE EXCEPTION 'provider_type must be ''individual'' or ''company'''
      USING ERRCODE = '23514';
  END IF;

  -- Individual providers must have a name; companies must have a legal name.
  IF p_provider_type = 'individual' AND COALESCE(NULLIF(p_first_name, ''), NULLIF(p_last_name, '')) IS NULL THEN
    RAISE EXCEPTION 'Individual providers require first_name and last_name'
      USING ERRCODE = '23514';
  END IF;
  IF p_provider_type = 'company' AND NULLIF(p_legal_name, '') IS NULL THEN
    RAISE EXCEPTION 'Company providers require legal_name'
      USING ERRCODE = '23514';
  END IF;

  -- One provider per owner (guard against double-submit).
  IF EXISTS (
    SELECT 1 FROM routesred.transport_provider_users tpu
    WHERE tpu.user_id = v_owner AND tpu.role = 'owner' AND tpu.status = 'active'
  ) THEN
    RAISE EXCEPTION 'User already owns a provider' USING ERRCODE = '23505';
  END IF;

  -- Build a slug from trade_name / legal_name / first+last name.
  v_base := lower(coalesce(
    nullif(p_trade_name, ''),
    nullif(p_legal_name, ''),
    trim(coalesce(nullif(p_first_name, ''), '') || ' ' || coalesce(nullif(p_last_name, ''), ''))
  ));
  IF v_base IS NULL OR v_base = '' THEN
    v_base := 'provider-' || substring(v_owner::text, 1, 8);
  END IF;
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  IF v_base = '' THEN
    v_base := 'provider';
  END IF;

  -- Ensure slug uniqueness with a suffix loop.
  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM routesred.transport_providers tp WHERE tp.slug = v_slug) LOOP
    v_slug := v_base || '-' || lpad((random() * 999)::int::text, 3, '0');
  END LOOP;

  -- Insert the provider.
  INSERT INTO routesred.transport_providers (
    owner_user_id,
    provider_type,
    first_name,
    last_name,
    legal_name,
    trade_name,
    legal_representative,
    slug,
    rfc,
    description,
    phone,
    email,
    website,
    state,
    city,
    address,
    postal_code,
    country_code,
    status,
    verification_status
  ) VALUES (
    v_owner,
    p_provider_type,
    p_first_name,
    p_last_name,
    p_legal_name,
    p_trade_name,
    p_legal_representative,
    v_slug,
    p_rfc,
    p_description,
    p_phone,
    p_email,
    p_website,
    p_state,
    p_city,
    p_address,
    p_postal_code,
    p_country_code,
    'draft',
    'unverified'
  ) RETURNING id INTO v_provider_id;

  -- Link the caller as owner.
  INSERT INTO routesred.transport_provider_users (
    transport_provider_id,
    user_id,
    role,
    status,
    invited_by
  ) VALUES (
    v_provider_id,
    v_owner,
    'owner',
    'active',
    v_owner
  );

  RETURN v_provider_id;
END;
$$;

-- Only authenticated users may call create_provider.
REVOKE EXECUTE ON FUNCTION routesred.create_provider FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION routesred.create_provider TO authenticated;
