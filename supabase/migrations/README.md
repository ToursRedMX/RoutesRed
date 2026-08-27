# RoutesRed Migration History

## Active migration

### `20260827120000_routesred_rebuild.sql`
**Full schema rebuild** — replaces all 11 previous migrations with a single
security-hardened migration. This file is written for review only and has
**not been applied** to the database. After approval it will be executed via
`apply_migration`.

Key changes from the original schema (v2 with corrections):

1. **Public read via RPCs only** — `get_public_transport_providers()`,
   `get_public_transport_provider_by_slug()`, `get_public_vehicles()` return
   only public DTO columns. `anon` has no direct SELECT on
   `transport_providers` or `vehicles`, so `SELECT rfc FROM ...` is denied.
   Views with `security_invoker` are internal-only (not granted to anon).

2. **Column-level protection** — `REVOKE INSERT, UPDATE, DELETE` on
   `transport_providers` from `authenticated`. A defensive trigger blocks
   changes to `owner_user_id`, `status`, `verification_status`,
   `rating_average`, `rating_count`, `completed_services_count`, `active`.
   Commercial edits go through `update_provider_profile()` RPC only.

3. **Membership mutations only via RPC** — `REVOKE INSERT, UPDATE, DELETE` on
   `transport_provider_users`. `create_provider()` inserts the owner using
   SECURITY DEFINER privileges. No `set_config`/GUC bypass.

4. **Last-owner protection** — trigger `protect_last_owner` fires
   `BEFORE UPDATE OR DELETE` and blocks any operation that would leave a
   provider with zero active owners.

5. **Storage policies with correct foldername semantics** —
   `storage.foldername(objects.name)` returns `[1]=providers, [2]=pid,
   [3]=resource_type, [4]=resource_id`. All EXISTS use a single AND block
   wrapping all OR branches so `user_id` and `status='active'` apply to every
   branch. Nested IDOR validates vehicle/driver belongs to provider from `[2]`.

6. **Idempotent buckets** — INSERT ... ON CONFLICT DO UPDATE, so buckets are
   created if missing or updated if existing.

7. **Document INSERT protection** — trigger blocks INSERT with `status != 'pending'`
   or any admin field (`reviewed_by`, `reviewed_at`, `rejection_reason`).
   Validation trigger checks `document_types.applies_to`, `provider_types`,
   and `vehicle_id`/`driver_id` coherence.

8. **provider_agency_links** — `link_provider_agency()` requires provider admin
   AND agency owner. Staff not authorized in Phase 1.

9. **Platform RPCs** — `register_platform_access()`, `complete_onboarding()`,
   `touch_platform_access()` operate exclusively on `platform='routesred'`.
   No parameters, no `naturestayred`, no arbitrary `registration_source`.

10. **All SECURITY DEFINER functions** get `REVOKE FROM PUBLIC, anon` before
    granting only to the necessary role.

11. **Schema privileges** — `GRANT USAGE ON SCHEMA routesred` to `anon` and
    `authenticated`, plus `GRANT SELECT` on all catalog tables.

12. **PostGIS** — uses `extensions.geography(Point, 4326)` and
    `extensions.ST_MakePoint`.

13. **Vehicles constraints** — `capacity > 0`, `luggage_capacity >= 0`,
    `year` between 1900 and 2100.

14. **Seeds corrected** — RFC proof and tax status apply to `individual` AND
    `company`. Company-exclusive documents (legal representative power) separated.

15. **create_provider()** — individual requires `first_name` AND `last_name`
    (not OR). Slug generator checks reserved words and auto-generates valid variant.

16. **Audit deferred** — TODO documented. No parallel table, no
    `tenant_type='system'`.

## Superseded migrations (kept for history, not re-applied)

| File | Purpose |
|------|---------|
| `20260827002649_routesred_schema_and_catalogs.sql` | Initial schema + vehicle_types + amenities |
| `20260827002805_install_postgis.sql` | Install PostGIS extension |
| `20260827002832_routesred_airports.sql` | Airports catalog (23 Mexican airports) |
| `20260827002954_routesred_users_and_platforms.sql` | users table + user_platforms + helper functions |
| `20260827003101_routesred_provider_tables.sql` | transport_providers + transport_provider_users |
| `20260827003213_routesred_provider_helpers.sql` | is_provider_member + get_user_provider_role |
| `20260827003223_routesred_provider_policies.sql` | RLS policies for providers + memberships |
| `20260827005306_create_provider_rpc.sql` | create_provider() RPC |
| `20260827005321_create_vehicles.sql` | vehicles + vehicle_amenities |
| `20260827005332_create_drivers.sql` | drivers |
| `20260827005351_create_documents.sql` | document_types + provider_documents |

These 11 migrations are **superseded** by `20260827120000_routesred_rebuild.sql`.
The rebuild drops and recreates the entire `routesred` schema, so the original
migrations should not be re-run on a fresh database. The rebuild migration is
self-contained and includes all seed data (vehicle types, amenities, airports,
document types).

## Storage buckets

The buckets `routesred-public` and `routesred-private` are created if they
don't exist or updated idempotently if they do (INSERT ... ON CONFLICT DO UPDATE).
The 8 old `rr_*` policies are replaced with 8 new `routesred_*` policies.
