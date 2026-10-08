/*
# Fix quote publication vehicle filter

1. Purpose
- Fixes publication of customer quote requests when the system looks for compatible transport providers.
- The publication function referenced a non-existent `vehicles.active` column, causing PostgreSQL error 42703.

2. Modified function
- `routesred.publish_quote_request_routesred(uuid)` now uses the existing `vehicles.status = 'active'` field in both vehicle capacity queries.
- Provider filters continue to require active and verified transport providers.
- Quote invitations, request status, expiration, and event behavior remain unchanged.

3. Data and security
- No tables, columns, rows, or policies are changed.
- The function remains SECURITY DEFINER, requires an authenticated user, verifies request ownership, and preserves the existing API contract.
*/

CREATE OR REPLACE FUNCTION routesred.publish_quote_request_routesred(p_quote_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req routesred.quote_requests%ROWTYPE;
  v_vehicle_type_id uuid;
  v_pax integer;
  v_provider_id uuid;
  v_capacity_sum integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_req
  FROM routesred.quote_requests
  WHERE id = p_quote_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote request not found';
  END IF;

  IF v_req.user_id != v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_req.status != 'draft' THEN
    RAISE EXCEPTION 'Only draft requests can be published';
  END IF;

  UPDATE routesred.quote_requests
  SET status = 'open',
      published_at = now(),
      expires_at = now() + interval '72 hours'
  WHERE id = p_quote_request_id;

  v_vehicle_type_id := v_req.vehicle_type_id;
  v_pax := v_req.passenger_count;

  IF v_vehicle_type_id IS NOT NULL THEN
    FOR v_provider_id IN
      SELECT DISTINCT v.transport_provider_id
      FROM routesred.vehicles v
      INNER JOIN routesred.transport_providers tp ON tp.id = v.transport_provider_id
      WHERE v.vehicle_type_id = v_vehicle_type_id
        AND v.status = 'active'
        AND tp.status = 'active'
        AND tp.verification_status = 'verified'
        AND tp.active = true
    LOOP
      SELECT COALESCE(SUM(v.capacity), 0) INTO v_capacity_sum
      FROM routesred.vehicles v
      WHERE v.transport_provider_id = v_provider_id
        AND v.vehicle_type_id = v_vehicle_type_id
        AND v.status = 'active';

      IF v_capacity_sum >= v_pax THEN
        INSERT INTO routesred.quote_invites (quote_request_id, transport_provider_id, status, invited_at)
        VALUES (p_quote_request_id, v_provider_id, 'invited', now())
        ON CONFLICT (quote_request_id, transport_provider_id) DO NOTHING;
      END IF;
    END LOOP;
  ELSE
    FOR v_provider_id IN
      SELECT tp.id
      FROM routesred.transport_providers tp
      WHERE tp.status = 'active'
        AND tp.verification_status = 'verified'
        AND tp.active = true
    LOOP
      SELECT COALESCE(SUM(v.capacity), 0) INTO v_capacity_sum
      FROM routesred.vehicles v
      WHERE v.transport_provider_id = v_provider_id
        AND v.status = 'active';

      IF v_capacity_sum >= v_pax THEN
        INSERT INTO routesred.quote_invites (quote_request_id, transport_provider_id, status, invited_at)
        VALUES (p_quote_request_id, v_provider_id, 'invited', now())
        ON CONFLICT (quote_request_id, transport_provider_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO routesred.quote_events (quote_request_id, event_type, actor_user_id, metadata)
  VALUES (
    p_quote_request_id,
    'published',
    v_uid,
    jsonb_build_object('expires_at', now() + interval '72 hours')
  );
END;
$$;