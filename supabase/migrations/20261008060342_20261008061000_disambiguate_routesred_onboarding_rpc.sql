/*
# Disambiguate RoutesRed onboarding RPCs

1. Purpose
- Fixes the HTTP 400 response returned when a signed-in user completes onboarding.
- The database contained two `complete_onboarding` functions: one with no arguments and one with an optional text argument. The optional argument made the no-argument API call ambiguous.

2. Function change
- Keeps `routesred.complete_onboarding()` as the canonical no-argument function used by the web app.
- Recreates `routesred.complete_onboarding(text)` without a default value, so it is selected only when the caller explicitly supplies `p_platform`.
- Both functions continue to require an authenticated user and only complete the RoutesRed platform onboarding record.

3. Security
- Preserves SECURITY DEFINER behavior and the existing authenticated EXECUTE grants.
- Does not change tables, rows, or user data.
*/

DROP FUNCTION IF EXISTS routesred.complete_onboarding(text);

CREATE FUNCTION routesred.complete_onboarding(p_platform text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, routesred
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_platform IS NULL OR p_platform <> 'routesred' THEN
    RAISE EXCEPTION 'Invalid platform: %. Only routesred is allowed.', p_platform;
  END IF;

  RETURN routesred.complete_onboarding();
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.complete_onboarding(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION routesred.complete_onboarding(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION routesred.complete_onboarding() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION routesred.complete_onboarding() TO authenticated;