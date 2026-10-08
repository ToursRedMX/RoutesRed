/*
# Allow authenticated API access to the RoutesRed schema

1. Purpose
- Fixes the `permission denied for schema routesred` error shown when an authenticated user registers as a transport provider.
- Allows Supabase's browser API client to resolve functions and public catalog tables in the `routesred` schema.

2. Schema access
- Grants USAGE on `routesred` to `anon` and `authenticated`.
- Schema usage does not grant access to private provider or user records by itself.

3. Function access
- The existing `routesred.create_provider` function remains restricted to authenticated users.
- The function remains SECURITY DEFINER and validates the caller with `auth.uid()`.

4. Table access
- Grants SELECT only on intentionally public catalog tables used by the frontend: airports, amenities, document_types, and vehicle_types.
- Provider, membership, quote, and user tables are not made directly readable by this change; their existing RLS and RPC controls remain in force.
*/

GRANT USAGE ON SCHEMA routesred TO anon, authenticated;

GRANT SELECT ON TABLE
  routesred.airports,
  routesred.amenities,
  routesred.document_types,
  routesred.vehicle_types
TO anon, authenticated;