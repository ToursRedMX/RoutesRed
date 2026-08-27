/*
# RoutesRed — Airports Catalog

## Overview
Creates `routesred.airports` with PostGIS geography columns and seeds 23 Mexican airports.

## New Table
- `routesred.airports`: id, iata_code, icao_code, name, city, state, country,
  country_code, coordinates (geography(Point,4326)), timezone, active, timestamps

## Security
- RLS enabled, public SELECT (anon + authenticated).

## Notes
- PostGIS installed in `public` schema.
- Partial unique indexes on iata_code and icao_code (WHERE NOT NULL).
- Coordinates verified against public aviation data.
*/

CREATE TABLE IF NOT EXISTS routesred.airports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iata_code    text,
  icao_code    text,
  name         text NOT NULL,
  city         text NOT NULL,
  state        text,
  country      text NOT NULL DEFAULT 'México',
  country_code text NOT NULL DEFAULT 'MX',
  coordinates  public.geography(Point, 4326),
  timezone     text,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS airports_iata_unique
  ON routesred.airports (iata_code) WHERE iata_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS airports_icao_unique
  ON routesred.airports (icao_code) WHERE icao_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS airports_active_idx ON routesred.airports (active);

ALTER TABLE routesred.airports ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS airports_updated_at ON routesred.airports;
CREATE TRIGGER airports_updated_at
  BEFORE UPDATE ON routesred.airports
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

DROP POLICY IF EXISTS "public_read_airports" ON routesred.airports;
CREATE POLICY "public_read_airports"
  ON routesred.airports FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO routesred.airports (iata_code, icao_code, name, city, state, coordinates, timezone, active)
VALUES
  ('MEX', 'MMMX', 'Aeropuerto Internacional de la Ciudad de México',     'Ciudad de México',    'Ciudad de México',    public.ST_MakePoint(-99.0721, 19.4363)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('NLU', 'MMSM', 'Aeropuerto Internacional Felipe Ángeles',              'Santa Lucía',          'Estado de México',     public.ST_MakePoint(-99.0167, 19.7411)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('CUN', 'MMUN', 'Aeropuerto Internacional de Cancún',                   'Cancún',              'Quintana Roo',         public.ST_MakePoint(-86.8771, 21.0365)::public.geography(Point,4326), 'America/Cancun',      true),
  ('GDL', 'MMGL', 'Aeropuerto Internacional de Guadalajara',              'Guadalajara',         'Jalisco',              public.ST_MakePoint(-103.3111, 20.5218)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('MTY', 'MMMY', 'Aeropuerto Internacional de Monterrey',                'Monterrey',           'Nuevo León',           public.ST_MakePoint(-100.1058, 25.7785)::public.geography(Point,4326), 'America/Monterrey',   true),
  ('TIJ', 'MMTJ', 'Aeropuerto Internacional de Tijuana',                  'Tijuana',             'Baja California',      public.ST_MakePoint(-116.9706, 32.5411)::public.geography(Point,4326), 'America/Tijuana',     true),
  ('SJD', 'MMSD', 'Aeropuerto Internacional de Los Cabos',                'San José del Cabo',   'Baja California Sur',  public.ST_MakePoint(-109.7211, 23.1518)::public.geography(Point,4326), 'America/Mazatlan',    true),
  ('PVR', 'MMPR', 'Aeropuerto Internacional de Puerto Vallarta',          'Puerto Vallarta',     'Jalisco',              public.ST_MakePoint(-105.2543, 20.6801)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('MID', 'MMMD', 'Aeropuerto Internacional de Mérida',                   'Mérida',              'Yucatán',              public.ST_MakePoint(-89.6536, 20.9370)::public.geography(Point,4326), 'America/Merida',      true),
  ('OAX', 'MMOX', 'Aeropuerto Internacional de Oaxaca',                   'Oaxaca',              'Oaxaca',               public.ST_MakePoint(-96.7264, 16.9999)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('BJX', 'MMLO', 'Aeropuerto Internacional del Bajío',                   'Silao',               'Guanajuato',           public.ST_MakePoint(-101.4826, 20.9935)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('QRO', 'MMQT', 'Aeropuerto Intercontinental de Querétaro',             'Querétaro',           'Querétaro',            public.ST_MakePoint(-100.1856, 20.6173)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('PBC', 'MMPB', 'Aeropuerto Internacional de Puebla',                   'Puebla',              'Puebla',               public.ST_MakePoint(-98.3715, 19.1581)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('VER', 'MMVR', 'Aeropuerto Internacional de Veracruz',                 'Veracruz',            'Veracruz',             public.ST_MakePoint(-96.1875, 19.1459)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('HMO', 'MMHO', 'Aeropuerto Internacional de Hermosillo',               'Hermosillo',          'Sonora',               public.ST_MakePoint(-111.0394, 29.0959)::public.geography(Point,4326), 'America/Hermosillo',  true),
  ('CUU', 'MMCU', 'Aeropuerto Internacional de Chihuahua',                'Chihuahua',           'Chihuahua',            public.ST_MakePoint(-105.9697, 28.7029)::public.geography(Point,4326), 'America/Chihuahua',   true),
  ('CJS', 'MMCS', 'Aeropuerto Internacional de Ciudad Juárez',             'Ciudad Juárez',       'Chihuahua',            public.ST_MakePoint(-106.4288, 31.6361)::public.geography(Point,4326), 'America/Ciudad_Juarez', true),
  ('LAP', 'MMLP', 'Aeropuerto Internacional de La Paz',                   'La Paz',              'Baja California Sur',  public.ST_MakePoint(-110.3625, 24.0737)::public.geography(Point,4326), 'America/Mazatlan',    true),
  ('ZIH', 'MMZH', 'Aeropuerto Internacional de Ixtapa-Zihuatanejo',        'Zihuatanejo',         'Guerrero',             public.ST_MakePoint(-101.4607, 17.6016)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('ACA', 'MMAA', 'Aeropuerto Internacional de Acapulco',                 'Acapulco',            'Guerrero',             public.ST_MakePoint(-99.7543, 16.7571)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('HUX', 'MMHT', 'Aeropuerto Internacional de Huatulco',                 'Huatulco',            'Oaxaca',               public.ST_MakePoint(-96.0258, 15.7754)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('TGZ', 'MMTG', 'Aeropuerto Internacional de Tuxtla Gutiérrez',          'Tuxtla Gutiérrez',    'Chiapas',              public.ST_MakePoint(-93.0224, 16.5638)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('TLC', 'MMTO', 'Aeropuerto Internacional de Toluca',                   'Toluca',              'Estado de México',     public.ST_MakePoint(-99.5662, 19.3370)::public.geography(Point,4326), 'America/Mexico_City', true)
ON CONFLICT DO NOTHING;
