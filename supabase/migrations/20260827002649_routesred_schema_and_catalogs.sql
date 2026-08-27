/*
# RoutesRed — Schema and Base Catalogs

## Overview
Creates the `routesred` schema for the RoutesRed transport platform, along with
its first two catalog tables: `vehicle_types` and `amenities`. Both catalogs are
seeded with initial data. RLS is enabled and public read policies are created so
that any visitor (anon or authenticated) can browse the catalogs.

## New Objects
1. Schema `routesred`
2. Table `routesred.vehicle_types`
   - Catalog of vehicle categories (Car, SUV, Van, Sprinter, Minibus, Bus, Executive Bus, Other)
   - Columns: id, code (unique stable internal code), name, description, icon (optional),
     min_capacity (optional), max_capacity (optional), active, sort_order, created_at, updated_at
3. Table `routesred.amenities`
   - Catalog of vehicle amenities (WiFi, USB, A/C, etc.)
   - Columns: id, code (unique), name, description, icon (optional), active, sort_order, created_at, updated_at

## Security
- RLS enabled on both tables.
- Public SELECT policies (anon + authenticated) for both catalogs — these are intentionally public reference data.
- No INSERT/UPDATE/DELETE policies for anon or authenticated — only admins can modify catalogs (via service role or future admin policies).

## Notes
- The schema is created with `IF NOT EXISTS` for idempotency.
- `updated_at` is maintained by a trigger.
- Seed data uses stable internal codes; UI labels can be shown in Spanish.
*/

-- =============================================================
-- 1. Create schema
-- =============================================================
CREATE SCHEMA IF NOT EXISTS routesred;

-- =============================================================
-- 2. updated_at helper function (schema-local)
-- =============================================================
CREATE OR REPLACE FUNCTION routesred.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- =============================================================
-- 3. vehicle_types
-- =============================================================
CREATE TABLE IF NOT EXISTS routesred.vehicle_types (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  name         text NOT NULL,
  description  text,
  icon         text,
  min_capacity integer,
  max_capacity integer,
  active       boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE routesred.vehicle_types ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS vehicle_types_updated_at ON routesred.vehicle_types;
CREATE TRIGGER vehicle_types_updated_at
  BEFORE UPDATE ON routesred.vehicle_types
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

-- Public read
DROP POLICY IF EXISTS "public_read_vehicle_types" ON routesred.vehicle_types;
CREATE POLICY "public_read_vehicle_types"
  ON routesred.vehicle_types FOR SELECT
  TO anon, authenticated
  USING (true);

-- =============================================================
-- 4. amenities
-- =============================================================
CREATE TABLE IF NOT EXISTS routesred.amenities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  name         text NOT NULL,
  description  text,
  icon         text,
  active       boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE routesred.amenities ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS amenities_updated_at ON routesred.amenities;
CREATE TRIGGER amenities_updated_at
  BEFORE UPDATE ON routesred.amenities
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

-- Public read
DROP POLICY IF EXISTS "public_read_amenities" ON routesred.amenities;
CREATE POLICY "public_read_amenities"
  ON routesred.amenities FOR SELECT
  TO anon, authenticated
  USING (true);

-- =============================================================
-- 5. Seed vehicle_types
-- =============================================================
INSERT INTO routesred.vehicle_types (code, name, description, min_capacity, max_capacity, active, sort_order)
VALUES
  ('car',            'Car',            'Automóvil sedán estándar',                    1,  4,  true, 1),
  ('suv',            'SUV',            'Vehículo utilitario deportivo',               1,  7,  true, 2),
  ('van',            'Van',            'Van de pasajeros',                            1, 15,  true, 3),
  ('sprinter',       'Sprinter',       'Mercedes Sprinter o similar',                 1, 19,  true, 4),
  ('minibus',        'Minibus',        'Microbús de mediana capacidad',              16, 35,  true, 5),
  ('bus',            'Bus',            'Autobús estándar',                           36, 55,  true, 6),
  ('executive_bus',  'Executive Bus',  'Autobús ejecutivo de lujo',                  36, 55,  true, 7),
  ('other',          'Other',          'Otro tipo de vehículo no clasificado',     null, null, true, 99)
ON CONFLICT (code) DO NOTHING;

-- =============================================================
-- 6. Seed amenities
-- =============================================================
INSERT INTO routesred.amenities (code, name, description, active, sort_order)
VALUES
  ('air_conditioning',     'Air Conditioning',     'Aire acondicionado',                true, 1),
  ('wifi',                 'WiFi',                 'Conexión WiFi a bordo',             true, 2),
  ('usb',                  'USB',                  'Puertos de carga USB',              true, 3),
  ('usb_c',                'USB-C',                'Puertos de carga USB-C',            true, 4),
  ('restroom',             'Restroom',             'Sanitario a bordo',                 true, 5),
  ('entertainment_screen', 'Entertainment Screen', 'Pantallas de entretenimiento',      true, 6),
  ('seat_belts',           'Seat Belts',           'Cinturones de seguridad',           true, 7),
  ('gps',                  'GPS',                  'Sistema de navegación GPS',         true, 8),
  ('luggage_space',        'Luggage Space',        'Espacio de equipaje',               true, 9),
  ('accessibility',        'Accessibility',        'Accesibilidad para sillas de ruedas', true, 10),
  ('reclining_seats',      'Reclining Seats',      'Asientos reclinables',              true, 11),
  ('power_outlets',        'Power Outlets',        'Enchufes de corriente',             true, 12)
ON CONFLICT (code) DO NOTHING;
