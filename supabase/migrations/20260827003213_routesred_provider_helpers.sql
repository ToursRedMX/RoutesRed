/*
# RoutesRed — Provider Helper Functions

Creates is_provider_member and get_user_provider_role helper functions.
*/

CREATE OR REPLACE FUNCTION routesred.is_provider_member(p_provider_id uuid, p_roles text[] DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO routesred, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  IF p_roles IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM routesred.transport_provider_users
      WHERE transport_provider_id = p_provider_id
      AND user_id = v_uid AND status = 'active'
    );
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM routesred.transport_provider_users
    WHERE transport_provider_id = p_provider_id
    AND user_id = v_uid AND status = 'active' AND role = ANY(p_roles)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION routesred.is_provider_member(uuid, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION routesred.get_user_provider_role(p_provider_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO routesred, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT role INTO v_role FROM routesred.transport_provider_users
  WHERE transport_provider_id = p_provider_id AND user_id = v_uid AND status = 'active';
  RETURN v_role;
END;
$$;

GRANT EXECUTE ON FUNCTION routesred.get_user_provider_role(uuid) TO authenticated;
