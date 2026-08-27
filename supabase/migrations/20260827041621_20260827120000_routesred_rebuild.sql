-- =============================================================
-- 1. Drop existing schema
-- =============================================================
DROP SCHEMA IF EXISTS routesred CASCADE;

-- =============================================================
-- 2. Recreate schema + updated_at helper
-- =============================================================
CREATE SCHEMA routesred;

GRANT USAGE ON SCHEMA routesred TO anon, authenticated;

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
-- 3a. vehicle_types
-- =============================================================
CREATE TABLE routesred.vehicle_types (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  name         text NOT NULL,
  description  text,
  icon         text,
  min_capacity integer CHECK (min_capacity >= 1),
  max_capacity integer CHECK (max_capacity >= 1),
  sort_order   integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vt_max_ge_min CHECK (max_capacity IS NULL OR min_capacity IS NULL OR max_capacity >= min_capacity)
);

ALTER TABLE routesred.vehicle_types ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER vehicle_types_updated_at
  BEFORE UPDATE ON routesred.vehicle_types
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

GRANT SELECT ON routesred.vehicle_types TO anon, authenticated;

CREATE POLICY "public_read_vehicle_types"
  ON routesred.vehicle_types FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO routesred.vehicle_types (code, name, description, min_capacity, max_capacity, active, sort_order)
VALUES
  ('car',            'Car',            'Automovil sedan estandar',                    1,  4,  true, 1),
  ('suv',            'SUV',            'Vehiculo utilitario deportivo',               1,  7,  true, 2),
  ('van',            'Van',            'Van de pasajeros',                            1, 15,  true, 3),
  ('sprinter',       'Sprinter',       'Mercedes Sprinter o similar',                 1, 19,  true, 4),
  ('minibus',        'Minibus',        'Microbus de mediana capacidad',              16, 35,  true, 5),
  ('bus',            'Bus',            'Autobus estandar',                           36, 55,  true, 6),
  ('executive_bus',  'Executive Bus',  'Autobus ejecutivo de lujo',                  36, 55,  true, 7),
  ('other',          'Other',          'Otro tipo de vehiculo no clasificado',     null, null, true, 99)
ON CONFLICT (code) DO NOTHING;

-- =============================================================
-- 3b. amenities
-- =============================================================
CREATE TABLE routesred.amenities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  name         text NOT NULL,
  description  text,
  icon         text,
  active       boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE routesred.amenities ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER amenities_updated_at
  BEFORE UPDATE ON routesred.amenities
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

GRANT SELECT ON routesred.amenities TO anon, authenticated;

CREATE POLICY "public_read_amenities"
  ON routesred.amenities FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO routesred.amenities (code, name, description, active, sort_order)
VALUES
  ('air_conditioning',     'Air Conditioning',     'Aire acondicionado',                true, 1),
  ('wifi',                 'WiFi',                 'Conexion WiFi a bordo',             true, 2),
  ('usb',                  'USB',                  'Puertos de carga USB',              true, 3),
  ('usb_c',                'USB-C',                'Puertos de carga USB-C',            true, 4),
  ('restroom',             'Restroom',             'Sanitario a bordo',                 true, 5),
  ('entertainment_screen', 'Entertainment Screen', 'Pantallas de entretenimiento',      true, 6),
  ('seat_belts',           'Seat Belts',           'Cinturones de seguridad',           true, 7),
  ('gps',                  'GPS',                  'Sistema de navegacion GPS',         true, 8),
  ('luggage_space',        'Luggage Space',        'Espacio de equipaje',               true, 9),
  ('accessibility',        'Accessibility',        'Accesibilidad para sillas de ruedas', true, 10),
  ('reclining_seats',      'Reclining Seats',      'Asientos reclinables',              true, 11),
  ('power_outlets',        'Power Outlets',        'Enchufes de corriente',             true, 12)
ON CONFLICT (code) DO NOTHING;

-- =============================================================
-- 3c. airports
-- =============================================================
CREATE TABLE routesred.airports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iata_code    text,
  icao_code    text,
  name         text NOT NULL,
  city         text NOT NULL,
  state        text,
  country      text NOT NULL DEFAULT 'Mexico',
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

CREATE TRIGGER airports_updated_at
  BEFORE UPDATE ON routesred.airports
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

GRANT SELECT ON routesred.airports TO anon, authenticated;

CREATE POLICY "public_read_airports"
  ON routesred.airports FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO routesred.airports (iata_code, icao_code, name, city, state, coordinates, timezone, active)
VALUES
  ('MEX', 'MMMX', 'Aeropuerto Internacional de la Ciudad de Mexico',     'Ciudad de Mexico',    'Ciudad de Mexico',    public.ST_MakePoint(-99.0721, 19.4363)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('NLU', 'MMSM', 'Aeropuerto Internacional Felipe Angeles',              'Santa Lucia',          'Estado de Mexico',     public.ST_MakePoint(-99.0167, 19.7411)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('CUN', 'MMUN', 'Aeropuerto Internacional de Cancun',                   'Cancun',              'Quintana Roo',         public.ST_MakePoint(-86.8771, 21.0365)::public.geography(Point,4326), 'America/Cancun',      true),
  ('GDL', 'MMGL', 'Aeropuerto Internacional de Guadalajara',              'Guadalajara',         'Jalisco',              public.ST_MakePoint(-103.3111, 20.5218)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('MTY', 'MMMY', 'Aeropuerto Internacional de Monterrey',                'Monterrey',           'Nuevo Leon',           public.ST_MakePoint(-100.1058, 25.7785)::public.geography(Point,4326), 'America/Monterrey',   true),
  ('TIJ', 'MMTJ', 'Aeropuerto Internacional de Tijuana',                  'Tijuana',             'Baja California',      public.ST_MakePoint(-116.9706, 32.5411)::public.geography(Point,4326), 'America/Tijuana',     true),
  ('SJD', 'MMSD', 'Aeropuerto Internacional de Los Cabos',                'San Jose del Cabo',   'Baja California Sur',  public.ST_MakePoint(-109.7211, 23.1518)::public.geography(Point,4326), 'America/Mazatlan',    true),
  ('PVR', 'MMPR', 'Aeropuerto Internacional de Puerto Vallarta',          'Puerto Vallarta',     'Jalisco',              public.ST_MakePoint(-105.2543, 20.6801)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('MID', 'MMMD', 'Aeropuerto Internacional de Merida',                   'Merida',              'Yucatan',              public.ST_MakePoint(-89.6536, 20.9370)::public.geography(Point,4326), 'America/Merida',      true),
  ('OAX', 'MMOX', 'Aeropuerto Internacional de Oaxaca',                   'Oaxaca',              'Oaxaca',               public.ST_MakePoint(-96.7264, 16.9999)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('BJX', 'MMLO', 'Aeropuerto Internacional del Bajio',                   'Silao',               'Guanajuato',           public.ST_MakePoint(-101.4826, 20.9935)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('QRO', 'MMQT', 'Aeropuerto Intercontinental de Queretaro',             'Queretaro',           'Queretaro',            public.ST_MakePoint(-100.1856, 20.6173)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('PBC', 'MMPB', 'Aeropuerto Internacional de Puebla',                   'Puebla',              'Puebla',               public.ST_MakePoint(-98.3715, 19.1581)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('VER', 'MMVR', 'Aeropuerto Internacional de Veracruz',                 'Veracruz',            'Veracruz',             public.ST_MakePoint(-96.1875, 19.1459)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('HMO', 'MMHO', 'Aeropuerto Internacional de Hermosillo',               'Hermosillo',          'Sonora',               public.ST_MakePoint(-111.0394, 29.0959)::public.geography(Point,4326), 'America/Hermosillo',  true),
  ('CUU', 'MMCU', 'Aeropuerto Internacional de Chihuahua',                'Chihuahua',           'Chihuahua',            public.ST_MakePoint(-105.9697, 28.7029)::public.geography(Point,4326), 'America/Chihuahua',   true),
  ('CJS', 'MMCS', 'Aeropuerto Internacional de Ciudad Juarez',             'Ciudad Juarez',       'Chihuahua',            public.ST_MakePoint(-106.4288, 31.6361)::public.geography(Point,4326), 'America/Ciudad_Juarez', true),
  ('LAP', 'MMLP', 'Aeropuerto Internacional de La Paz',                   'La Paz',              'Baja California Sur',  public.ST_MakePoint(-110.3625, 24.0737)::public.geography(Point,4326), 'America/Mazatlan',    true),
  ('ZIH', 'MMZH', 'Aeropuerto Internacional de Ixtapa-Zihuatanejo',        'Zihuatanejo',         'Guerrero',             public.ST_MakePoint(-101.4607, 17.6016)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('ACA', 'MMAA', 'Aeropuerto Internacional de Acapulco',                 'Acapulco',            'Guerrero',             public.ST_MakePoint(-99.7543, 16.7571)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('HUX', 'MMHT', 'Aeropuerto Internacional de Huatulco',                 'Huatulco',            'Oaxaca',               public.ST_MakePoint(-96.0258, 15.7754)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('TGZ', 'MMTG', 'Aeropuerto Internacional de Tuxtla Gutierrez',          'Tuxtla Gutierrez',    'Chiapas',              public.ST_MakePoint(-93.0224, 16.5638)::public.geography(Point,4326), 'America/Mexico_City', true),
  ('TLC', 'MMTO', 'Aeropuerto Internacional de Toluca',                   'Toluca',              'Estado de Mexico',     public.ST_MakePoint(-99.5662, 19.3370)::public.geography(Point,4326), 'America/Mexico_City', true)
ON CONFLICT DO NOTHING;

-- =============================================================
-- 3d. document_types
-- =============================================================
CREATE TABLE routesred.document_types (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE,
  name           text NOT NULL,
  description    text,
  icon           text,
  required       boolean NOT NULL DEFAULT false,
  applies_to     text NOT NULL CHECK (applies_to IN ('provider', 'vehicle', 'driver')),
  provider_types text[] NOT NULL DEFAULT ARRAY['individual', 'company'] CHECK (
    provider_types <@ ARRAY['individual', 'company']::text[]
  ),
  has_expiry     boolean NOT NULL DEFAULT false,
  active         boolean NOT NULL DEFAULT true,
  sort_order     integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE routesred.document_types ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER document_types_updated_at
  BEFORE UPDATE ON routesred.document_types
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

GRANT SELECT ON routesred.document_types TO anon, authenticated;

CREATE POLICY "document_types_public_read"
  ON routesred.document_types FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO routesred.document_types (code, name, description, required, applies_to, provider_types, has_expiry, sort_order)
VALUES
  ('provider_rfc_proof',         'Comprobante de RFC',              'Documento que acredita el RFC del proveedor.',     true,  'provider', ARRAY['individual','company'], false, 1),
  ('provider_id',                'Identificacion oficial',           'INE/IFE o pasaporte del representante.',           true,  'provider', ARRAY['individual','company'], true, 2),
  ('provider_address_proof',     'Comprobante de domicilio',         'Comprobante de domicilio reciente.',               false, 'provider', ARRAY['individual','company'], false, 3),
  ('provider_tax_status',        'Constancia de situacion fiscal',   'Constancia emitida por el SAT.',                    true,  'provider', ARRAY['individual','company'], false, 4),
  ('provider_insurance',         'Poliza de seguro',                 'Poliza de seguro de responsabilidad civil.',        true,  'provider', ARRAY['individual','company'], true, 5),
  ('provider_logo',              'Logotipo',                         'Logotipo del proveedor para perfil publico.',       false, 'provider', ARRAY['individual','company'], false, 6),
  ('provider_legal_representative', 'Poder legal del representante', 'Poder notarial del representante legal.',          true,  'provider', ARRAY['company'], false, 7),
  ('vehicle_registration',       'Tarjeta de circulacion',           'Tarjeta de circulacion del vehiculo.',              true,  'vehicle',  ARRAY['individual','company'], true, 10),
  ('vehicle_insurance',          'Seguro del vehiculo',              'Poliza de seguro del vehiculo.',                    true,  'vehicle',  ARRAY['individual','company'], true, 11),
  ('vehicle_technical',          'Verificacion tecnica',             'Verificacion tecnica mecanica.',                    false, 'vehicle',  ARRAY['individual','company'], true, 12),
  ('driver_licence',             'Licencia de conducir',             'Licencia de conducir del operador.',                true,  'driver',   ARRAY['individual','company'], true, 20),
  ('driver_id',                  'Identificacion del operador',      'Identificacion oficial del operador.',              true,  'driver',   ARRAY['individual','company'], false, 21),
  ('driver_medical',             'Examen medico',                    'Examen medico del operador.',                       false, 'driver',   ARRAY['individual','company'], true, 22)
ON CONFLICT (code) DO NOTHING;

-- =============================================================
-- 4. transport_providers
-- =============================================================
CREATE TABLE routesred.transport_providers (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_type          text NOT NULL DEFAULT 'company',
  first_name             text,
  last_name              text,
  legal_name             text,
  legal_representative   text,
  trade_name             text,
  slug                   text NOT NULL UNIQUE,
  rfc                    text,
  description            text,
  logo_url               text,
  cover_image_url        text,
  phone                  text,
  email                  text,
  website                text,
  country_code           text NOT NULL DEFAULT 'MX',
  state                  text,
  city                   text,
  address                text,
  postal_code            text,
  coordinates            public.geography(Point, 4326),
  status                 text NOT NULL DEFAULT 'draft',
  verification_status    text NOT NULL DEFAULT 'unverified',
  rating_average         numeric(3,2) NOT NULL DEFAULT 0,
  rating_count           integer NOT NULL DEFAULT 0,
  completed_services_count integer NOT NULL DEFAULT 0,
  active                 boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tp_provider_type_check CHECK (provider_type IN ('individual', 'company')),
  CONSTRAINT tp_status_check CHECK (status IN ('draft', 'pending_review', 'active', 'suspended', 'rejected', 'inactive')),
  CONSTRAINT tp_verification_check CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  CONSTRAINT tp_rating_check CHECK (rating_average >= 0 AND rating_average <= 5),
  CONSTRAINT tp_rating_count_check CHECK (rating_count >= 0),
  CONSTRAINT tp_completed_check CHECK (completed_services_count >= 0),
  CONSTRAINT tp_slug_reserved CHECK (slug NOT IN (
    'new', 'create', 'admin', 'api', 'login', 'registro', 'provider',
    'providers', 'transportadoras', 'rutas', 'cotizar', 'aeropuertos',
    'account', 'settings'
  ))
);

CREATE INDEX IF NOT EXISTS tp_owner_idx ON routesred.transport_providers (owner_user_id);
CREATE INDEX IF NOT EXISTS tp_status_idx ON routesred.transport_providers (status);
CREATE INDEX IF NOT EXISTS tp_verification_idx ON routesred.transport_providers (verification_status);
CREATE INDEX IF NOT EXISTS tp_active_idx ON routesred.transport_providers (active);

ALTER TABLE routesred.transport_providers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER tp_updated_at BEFORE UPDATE ON routesred.transport_providers
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

REVOKE INSERT, UPDATE, DELETE ON routesred.transport_providers FROM authenticated;
GRANT SELECT ON routesred.transport_providers TO authenticated;

CREATE OR REPLACE FUNCTION routesred.protect_provider_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  v_is_admin := public.is_super_admin();

  IF NOT v_is_admin THEN
    IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
      RAISE EXCEPTION 'Not allowed to modify owner_user_id' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Not allowed to modify status' USING ERRCODE = '42501';
    END IF;
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      RAISE EXCEPTION 'Not allowed to modify verification_status' USING ERRCODE = '42501';
    END IF;
    IF NEW.rating_average IS DISTINCT FROM OLD.rating_average THEN
      RAISE EXCEPTION 'Not allowed to modify rating_average' USING ERRCODE = '42501';
    END IF;
    IF NEW.rating_count IS DISTINCT FROM OLD.rating_count THEN
      RAISE EXCEPTION 'Not allowed to modify rating_count' USING ERRCODE = '42501';
    END IF;
    IF NEW.completed_services_count IS DISTINCT FROM OLD.completed_services_count THEN
      RAISE EXCEPTION 'Not allowed to modify completed_services_count' USING ERRCODE = '42501';
    END IF;
    IF NEW.active IS DISTINCT FROM OLD.active THEN
      RAISE EXCEPTION 'Not allowed to modify active flag' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_provider_fields
  BEFORE UPDATE ON routesred.transport_providers
  FOR EACH ROW EXECUTE FUNCTION routesred.protect_provider_fields();

-- =============================================================
-- 5. transport_provider_users
-- =============================================================
CREATE TABLE routesred.transport_provider_users (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_provider_id  uuid NOT NULL REFERENCES routesred.transport_providers(id) ON DELETE CASCADE,
  user_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                   text NOT NULL,
  status                 text NOT NULL DEFAULT 'active',
  invited_by             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at              timestamptz NOT NULL DEFAULT now(),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tpu_role_check CHECK (role IN ('owner', 'administrator', 'dispatcher', 'finance', 'operator_manager', 'viewer')),
  CONSTRAINT tpu_status_check CHECK (status IN ('active', 'inactive', 'invited')),
  CONSTRAINT tpu_unique UNIQUE (transport_provider_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS tpu_single_owner
  ON routesred.transport_provider_users (transport_provider_id)
  WHERE role = 'owner' AND status = 'active';

CREATE INDEX IF NOT EXISTS tpu_user_idx ON routesred.transport_provider_users (user_id);
CREATE INDEX IF NOT EXISTS tpu_provider_idx ON routesred.transport_provider_users (transport_provider_id);

ALTER TABLE routesred.transport_provider_users ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER tpu_updated_at BEFORE UPDATE ON routesred.transport_provider_users
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

REVOKE INSERT, UPDATE, DELETE ON routesred.transport_provider_users FROM authenticated;
GRANT SELECT ON routesred.transport_provider_users TO authenticated;

CREATE OR REPLACE FUNCTION routesred.protect_last_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
DECLARE
  v_other_owners integer;
  v_provider_id uuid;
BEGIN
  v_provider_id := COALESCE(NEW.transport_provider_id, OLD.transport_provider_id);

  IF (TG_OP = 'DELETE' AND OLD.role = 'owner' AND OLD.status = 'active')
     OR (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND OLD.status = 'active'
         AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status))
  THEN
    SELECT count(*) INTO v_other_owners
    FROM routesred.transport_provider_users
    WHERE transport_provider_id = v_provider_id
      AND role = 'owner'
      AND status = 'active'
      AND id <> COALESCE(NEW.id, OLD.id);

    IF v_other_owners = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last active owner. Use transfer_provider_ownership() instead.'
        USING ERRCODE = 'P2003';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_last_owner
  BEFORE UPDATE OR DELETE ON routesred.transport_provider_users
  FOR EACH ROW EXECUTE FUNCTION routesred.protect_last_owner();

-- =============================================================
-- 6. Helper functions
-- =============================================================
CREATE OR REPLACE FUNCTION routesred.is_provider_member(p_provider_id uuid, p_roles text[] DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  IF p_roles IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM routesred.transport_provider_users
      WHERE transport_provider_id = p_provider_id
        AND user_id = v_uid
        AND status = 'active'
    );
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM routesred.transport_provider_users
    WHERE transport_provider_id = p_provider_id
      AND user_id = v_uid
      AND status = 'active'
      AND role = ANY(p_roles)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.is_provider_member(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION routesred.is_provider_member(uuid, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION routesred.get_user_provider_role(p_provider_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT role INTO v_role FROM routesred.transport_provider_users
  WHERE transport_provider_id = p_provider_id
    AND user_id = v_uid
    AND status = 'active';
  RETURN v_role;
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.get_user_provider_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION routesred.get_user_provider_role(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION routesred.is_provider_admin(p_provider_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
BEGIN
  RETURN routesred.is_provider_member(p_provider_id, ARRAY['owner', 'administrator']);
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.is_provider_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION routesred.is_provider_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION routesred.is_provider_owner(p_provider_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
BEGIN
  RETURN routesred.is_provider_member(p_provider_id, ARRAY['owner']);
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.is_provider_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION routesred.is_provider_owner(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION routesred.is_provider_operator(p_provider_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
BEGIN
  RETURN routesred.is_provider_member(p_provider_id, ARRAY['owner', 'administrator', 'operator_manager']);
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.is_provider_operator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION routesred.is_provider_operator(uuid) TO authenticated;

-- =============================================================
-- 7. RLS policies for transport_providers
-- =============================================================
CREATE POLICY "tp_select_members"
  ON routesred.transport_providers FOR SELECT TO authenticated
  USING (
    routesred.is_provider_member(id)
    OR public.is_super_admin()
  );

-- =============================================================
-- 8. RLS policies for transport_provider_users
-- =============================================================
CREATE POLICY "tpu_select_members"
  ON routesred.transport_provider_users FOR SELECT TO authenticated
  USING (
    transport_provider_users.user_id = auth.uid()
    OR routesred.is_provider_member(transport_provider_id)
    OR public.is_super_admin()
  );

-- =============================================================
-- 9. RPC: create_provider()
-- =============================================================
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
  v_reserved text[] := ARRAY['new','create','admin','api','login','registro','provider','providers','transportadoras','rutas','cotizar','aeropuertos','account','settings'];
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_provider_type NOT IN ('individual', 'company') THEN
    RAISE EXCEPTION 'provider_type must be ''individual'' or ''company''' USING ERRCODE = '23514';
  END IF;

  IF p_provider_type = 'individual' THEN
    IF NULLIF(p_first_name, '') IS NULL OR NULLIF(p_last_name, '') IS NULL THEN
      RAISE EXCEPTION 'Individual providers require both first_name and last_name' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF p_provider_type = 'company' AND NULLIF(p_legal_name, '') IS NULL THEN
    RAISE EXCEPTION 'Company providers require legal_name' USING ERRCODE = '23514';
  END IF;

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

  v_slug := v_base;
  IF v_slug = ANY(v_reserved) THEN
    v_slug := v_base || '-1';
  END IF;
  WHILE EXISTS (SELECT 1 FROM routesred.transport_providers tp WHERE tp.slug = v_slug) LOOP
    v_slug := v_base || '-' || lpad((random() * 999)::int::text, 3, '0');
  END LOOP;

  INSERT INTO routesred.transport_providers (
    owner_user_id, provider_type, first_name, last_name, legal_name,
    trade_name, legal_representative, slug, rfc, description,
    phone, email, website, state, city, address, postal_code, country_code,
    status, verification_status
  ) VALUES (
    v_owner, p_provider_type, p_first_name, p_last_name, p_legal_name,
    p_trade_name, p_legal_representative, v_slug, p_rfc, p_description,
    p_phone, p_email, p_website, p_state, p_city, p_address, p_postal_code, p_country_code,
    'draft', 'unverified'
  ) RETURNING id INTO v_provider_id;

  INSERT INTO routesred.transport_provider_users (
    transport_provider_id, user_id, role, status, invited_by
  ) VALUES (
    v_provider_id, v_owner, 'owner', 'active', v_owner
  );

  RETURN v_provider_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.create_provider FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION routesred.create_provider TO authenticated;

-- =============================================================
-- 10. RPC: update_provider_profile()
-- =============================================================
CREATE OR REPLACE FUNCTION routesred.update_provider_profile(
  p_provider_id uuid,
  p_trade_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_cover_image_url text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_coordinates_lat double precision DEFAULT NULL,
  p_coordinates_lng double precision DEFAULT NULL
) RETURNS routesred.transport_providers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
DECLARE
  v_row routesred.transport_providers;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT (routesred.is_provider_admin(p_provider_id) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'Only provider administrators can update the profile' USING ERRCODE = '42501';
  END IF;

  UPDATE routesred.transport_providers
  SET
    trade_name      = COALESCE(p_trade_name, trade_name),
    description     = COALESCE(p_description, description),
    logo_url        = COALESCE(p_logo_url, logo_url),
    cover_image_url = COALESCE(p_cover_image_url, cover_image_url),
    phone           = COALESCE(p_phone, phone),
    email           = COALESCE(p_email, email),
    website         = COALESCE(p_website, website),
    state           = COALESCE(p_state, state),
    city            = COALESCE(p_city, city),
    address         = COALESCE(p_address, address),
    postal_code     = COALESCE(p_postal_code, postal_code),
    coordinates     = CASE
      WHEN p_coordinates_lat IS NOT NULL AND p_coordinates_lng IS NOT NULL
      THEN public.ST_MakePoint(p_coordinates_lng, p_coordinates_lat)::public.geography(Point, 4326)
      ELSE coordinates
    END
  WHERE id = p_provider_id
  RETURNING * INTO v_row;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'Provider not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.update_provider_profile FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION routesred.update_provider_profile TO authenticated;

-- =============================================================
-- 11. RPC: update_provider_document()
-- =============================================================
CREATE OR REPLACE FUNCTION routesred.update_provider_document(
  p_document_id uuid,
  p_file_name text DEFAULT NULL,
  p_storage_path text DEFAULT NULL,
  p_storage_bucket text DEFAULT NULL,
  p_mime_type text DEFAULT NULL,
  p_file_size bigint DEFAULT NULL,
  p_document_number text DEFAULT NULL,
  p_issued_at date DEFAULT NULL,
  p_expires_at date DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
DECLARE
  v_provider_id uuid;
  v_uid uuid := auth.uid();
  v_doc_applies_to text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT transport_provider_id INTO v_provider_id
  FROM routesred.provider_documents
  WHERE id = p_document_id;

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Document not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT dt.applies_to INTO v_doc_applies_to
  FROM routesred.provider_documents pd
  JOIN routesred.document_types dt ON dt.id = pd.document_type_id
  WHERE pd.id = p_document_id;

  IF v_doc_applies_to = 'provider' THEN
    IF NOT (routesred.is_provider_admin(v_provider_id) OR public.is_super_admin()) THEN
      RAISE EXCEPTION 'Provider documents can only be updated by owner or administrator' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT (routesred.is_provider_operator(v_provider_id) OR public.is_super_admin()) THEN
      RAISE EXCEPTION 'Vehicle/driver documents can only be updated by operators' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE routesred.provider_documents
  SET
    file_name       = COALESCE(p_file_name, file_name),
    storage_path    = COALESCE(p_storage_path, storage_path),
    storage_bucket  = COALESCE(p_storage_bucket, storage_bucket),
    mime_type       = COALESCE(p_mime_type, mime_type),
    file_size       = COALESCE(p_file_size, file_size),
    document_number = COALESCE(p_document_number, document_number),
    issued_at       = COALESCE(p_issued_at, issued_at),
    expires_at      = COALESCE(p_expires_at, expires_at)
  WHERE id = p_document_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.update_provider_document FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION routesred.update_provider_document TO authenticated;

-- =============================================================
-- 12. Platform access RPCs
-- =============================================================
CREATE OR REPLACE FUNCTION routesred.register_platform_access()
RETURNS public.user_platforms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, routesred
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.user_platforms;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.user_platforms
  WHERE user_id = v_uid AND platform = 'routesred';

  IF v_row IS NULL THEN
    INSERT INTO public.user_platforms (user_id, platform, status, registration_source, registered_at, last_access_at, onboarding_completed)
    VALUES (v_uid, 'routesred', 'active', 'routesred', now(), now(), false)
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.user_platforms SET last_access_at = now() WHERE id = v_row.id
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.register_platform_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION routesred.register_platform_access() TO authenticated;

CREATE OR REPLACE FUNCTION routesred.complete_onboarding()
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

  UPDATE public.user_platforms
  SET onboarding_completed = true
  WHERE user_id = v_uid AND platform = 'routesred';

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.complete_onboarding() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION routesred.complete_onboarding() TO authenticated;

CREATE OR REPLACE FUNCTION routesred.touch_platform_access()
RETURNS void
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
  UPDATE public.user_platforms SET last_access_at = now()
  WHERE user_id = v_uid AND platform = 'routesred';
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.touch_platform_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION routesred.touch_platform_access() TO authenticated;

-- =============================================================
-- 13. Vehicles
-- =============================================================
CREATE TABLE routesred.vehicles (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_provider_id  uuid NOT NULL REFERENCES routesred.transport_providers(id) ON DELETE CASCADE,
  vehicle_type_id        uuid NOT NULL REFERENCES routesred.vehicle_types(id),
  internal_code          text,
  make                   text,
  model                  text,
  year                   integer CHECK (year IS NULL OR (year >= 1900 AND year <= 2100)),
  plate                  text,
  vin                    text,
  color                  text,
  capacity               integer CHECK (capacity IS NULL OR capacity > 0),
  luggage_capacity       integer CHECK (luggage_capacity IS NULL OR luggage_capacity >= 0),
  description            text,
  primary_image_url      text,
  coordinates            public.geography(Point, 4326),
  status                 text NOT NULL DEFAULT 'draft',
  active                 boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicles_status_check CHECK (status IN ('draft', 'active', 'maintenance', 'unavailable', 'inactive', 'retired'))
);

CREATE INDEX IF NOT EXISTS idx_vehicles_provider ON routesred.vehicles(transport_provider_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON routesred.vehicles(status);

ALTER TABLE routesred.vehicles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON routesred.vehicles
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

REVOKE DELETE ON routesred.vehicles FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON routesred.vehicles TO authenticated;

CREATE POLICY "vehicles_select_members"
  ON routesred.vehicles FOR SELECT TO authenticated
  USING (
    routesred.is_provider_member(transport_provider_id)
    OR public.is_super_admin()
  );

CREATE POLICY "vehicles_insert_members"
  ON routesred.vehicles FOR INSERT TO authenticated
  WITH CHECK (
    routesred.is_provider_operator(transport_provider_id)
    OR public.is_super_admin()
  );

CREATE POLICY "vehicles_update_members"
  ON routesred.vehicles FOR UPDATE TO authenticated
  USING (
    routesred.is_provider_operator(transport_provider_id)
    OR public.is_super_admin()
  )
  WITH CHECK (
    routesred.is_provider_operator(transport_provider_id)
    OR public.is_super_admin()
  );

-- =============================================================
-- 14. vehicle_images
-- =============================================================
CREATE TABLE routesred.vehicle_images (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id     uuid NOT NULL REFERENCES routesred.vehicles(id) ON DELETE CASCADE,
  storage_bucket text NOT NULL,
  storage_path   text NOT NULL,
  file_name      text NOT NULL,
  mime_type      text,
  file_size      bigint,
  sort_order     integer NOT NULL DEFAULT 0,
  is_primary     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle ON routesred.vehicle_images(vehicle_id);

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_images_single_primary
  ON routesred.vehicle_images (vehicle_id)
  WHERE is_primary = true;

ALTER TABLE routesred.vehicle_images ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_vehicle_images_updated_at
  BEFORE UPDATE ON routesred.vehicle_images
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

CREATE OR REPLACE FUNCTION routesred.ensure_single_primary_image()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE routesred.vehicle_images
    SET is_primary = false
    WHERE vehicle_id = NEW.vehicle_id
      AND id <> NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.ensure_single_primary_image() FROM PUBLIC, anon;

CREATE TRIGGER trg_ensure_single_primary
  BEFORE INSERT OR UPDATE ON routesred.vehicle_images
  FOR EACH ROW EXECUTE FUNCTION routesred.ensure_single_primary_image();

CREATE OR REPLACE FUNCTION routesred.validate_vehicle_image_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
DECLARE
  v_provider_id uuid;
BEGIN
  IF NEW.storage_bucket <> 'routesred-public' THEN
    RAISE EXCEPTION 'Vehicle image storage_bucket must be routesred-public' USING ERRCODE = '42501';
  END IF;

  SELECT transport_provider_id INTO v_provider_id
  FROM routesred.vehicles WHERE id = NEW.vehicle_id;
  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Vehicle not found for image' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (NEW.storage_path LIKE 'providers/' || v_provider_id::text || '/vehicles/' || NEW.vehicle_id::text || '/%') THEN
    RAISE EXCEPTION 'Vehicle image storage_path must be under providers/{pid}/vehicles/{vid}/' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.validate_vehicle_image_storage() FROM PUBLIC, anon;

CREATE TRIGGER trg_validate_vehicle_image_storage
  BEFORE INSERT OR UPDATE ON routesred.vehicle_images
  FOR EACH ROW EXECUTE FUNCTION routesred.validate_vehicle_image_storage();

GRANT SELECT, INSERT, UPDATE, DELETE ON routesred.vehicle_images TO authenticated;

CREATE POLICY "vehicle_images_select_members"
  ON routesred.vehicle_images FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.vehicles v
      WHERE v.id = vehicle_images.vehicle_id
        AND (routesred.is_provider_member(v.transport_provider_id) OR public.is_super_admin())
    )
  );

CREATE POLICY "vehicle_images_insert_members"
  ON routesred.vehicle_images FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routesred.vehicles v
      WHERE v.id = vehicle_images.vehicle_id
        AND (routesred.is_provider_operator(v.transport_provider_id) OR public.is_super_admin())
    )
  );

CREATE POLICY "vehicle_images_update_members"
  ON routesred.vehicle_images FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.vehicles v
      WHERE v.id = vehicle_images.vehicle_id
        AND (routesred.is_provider_operator(v.transport_provider_id) OR public.is_super_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routesred.vehicles v
      WHERE v.id = vehicle_images.vehicle_id
        AND (routesred.is_provider_operator(v.transport_provider_id) OR public.is_super_admin())
    )
  );

CREATE POLICY "vehicle_images_delete_members"
  ON routesred.vehicle_images FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.vehicles v
      WHERE v.id = vehicle_images.vehicle_id
        AND (routesred.is_provider_operator(v.transport_provider_id) OR public.is_super_admin())
    )
  );

-- =============================================================
-- 15. vehicle_amenities
-- =============================================================
CREATE TABLE routesred.vehicle_amenities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES routesred.vehicles(id) ON DELETE CASCADE,
  amenity_id uuid NOT NULL REFERENCES routesred.amenities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, amenity_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_amenities_vehicle ON routesred.vehicle_amenities(vehicle_id);

ALTER TABLE routesred.vehicle_amenities ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON routesred.vehicle_amenities TO anon;
GRANT SELECT, INSERT, DELETE ON routesred.vehicle_amenities TO authenticated;

CREATE POLICY "vehicle_amenities_select_members"
  ON routesred.vehicle_amenities FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.vehicles v
      WHERE v.id = vehicle_amenities.vehicle_id
        AND (routesred.is_provider_member(v.transport_provider_id) OR public.is_super_admin())
    )
  );

CREATE POLICY "vehicle_amenities_insert_members"
  ON routesred.vehicle_amenities FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routesred.vehicles v
      WHERE v.id = vehicle_amenities.vehicle_id
        AND (routesred.is_provider_operator(v.transport_provider_id) OR public.is_super_admin())
    )
  );

CREATE POLICY "vehicle_amenities_delete_members"
  ON routesred.vehicle_amenities FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.vehicles v
      WHERE v.id = vehicle_amenities.vehicle_id
        AND (routesred.is_provider_operator(v.transport_provider_id) OR public.is_super_admin())
    )
  );

-- =============================================================
-- 16. drivers
-- =============================================================
CREATE TABLE routesred.drivers (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_provider_id  uuid NOT NULL REFERENCES routesred.transport_providers(id) ON DELETE CASCADE,
  user_id                uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name             text NOT NULL,
  last_name              text NOT NULL,
  phone                  text,
  email                  text,
  license_number         text,
  license_type           text,
  license_expiry         date,
  photo_url              text,
  notes                  text,
  status                 text NOT NULL DEFAULT 'active',
  active                 boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT drivers_status_check CHECK (status IN ('active', 'inactive', 'suspended', 'expired_documents'))
);

CREATE INDEX IF NOT EXISTS idx_drivers_provider ON routesred.drivers(transport_provider_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON routesred.drivers(status);

ALTER TABLE routesred.drivers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON routesred.drivers
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

REVOKE DELETE ON routesred.drivers FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON routesred.drivers TO authenticated;

CREATE POLICY "drivers_select_members"
  ON routesred.drivers FOR SELECT TO authenticated
  USING (
    routesred.is_provider_member(transport_provider_id)
    OR public.is_super_admin()
  );

CREATE POLICY "drivers_insert_members"
  ON routesred.drivers FOR INSERT TO authenticated
  WITH CHECK (
    routesred.is_provider_operator(transport_provider_id)
    OR public.is_super_admin()
  );

CREATE POLICY "drivers_update_members"
  ON routesred.drivers FOR UPDATE TO authenticated
  USING (
    routesred.is_provider_operator(transport_provider_id)
    OR public.is_super_admin()
  )
  WITH CHECK (
    routesred.is_provider_operator(transport_provider_id)
    OR public.is_super_admin()
  );

-- =============================================================
-- 17. provider_documents
-- =============================================================
CREATE TABLE routesred.provider_documents (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_provider_id  uuid NOT NULL REFERENCES routesred.transport_providers(id) ON DELETE CASCADE,
  document_type_id       uuid NOT NULL REFERENCES routesred.document_types(id) ON DELETE RESTRICT,
  vehicle_id             uuid REFERENCES routesred.vehicles(id) ON DELETE CASCADE,
  driver_id              uuid REFERENCES routesred.drivers(id) ON DELETE CASCADE,
  file_name              text NOT NULL,
  storage_bucket         text NOT NULL,
  storage_path           text NOT NULL,
  mime_type              text,
  file_size              bigint,
  document_number        text,
  issued_at              date,
  expires_at             date,
  status                 text NOT NULL DEFAULT 'pending',
  reviewed_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at            timestamptz,
  rejection_reason       text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pd_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_pd_provider ON routesred.provider_documents(transport_provider_id);
CREATE INDEX IF NOT EXISTS idx_pd_type ON routesred.provider_documents(document_type_id);
CREATE INDEX IF NOT EXISTS idx_pd_vehicle ON routesred.provider_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_pd_driver ON routesred.provider_documents(driver_id);

ALTER TABLE routesred.provider_documents ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_pd_updated_at
  BEFORE UPDATE ON routesred.provider_documents
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

REVOKE UPDATE ON routesred.provider_documents FROM authenticated;
GRANT SELECT, INSERT, DELETE ON routesred.provider_documents TO authenticated;

CREATE OR REPLACE FUNCTION routesred.protect_document_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    IF NEW.status <> 'pending' THEN
      RAISE EXCEPTION 'Documents can only be inserted with status pending' USING ERRCODE = '42501';
    END IF;
    IF NEW.reviewed_by IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot set reviewed_by on insert' USING ERRCODE = '42501';
    END IF;
    IF NEW.reviewed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot set reviewed_at on insert' USING ERRCODE = '42501';
    END IF;
    IF NEW.rejection_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot set rejection_reason on insert' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.protect_document_insert() FROM PUBLIC, anon;

CREATE TRIGGER trg_protect_doc_insert
  BEFORE INSERT ON routesred.provider_documents
  FOR EACH ROW EXECUTE FUNCTION routesred.protect_document_insert();

CREATE OR REPLACE FUNCTION routesred.protect_document_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Not allowed to modify document administrative fields' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.protect_document_admin_fields() FROM PUBLIC, anon;

CREATE TRIGGER trg_protect_doc_admin
  BEFORE UPDATE ON routesred.provider_documents
  FOR EACH ROW EXECUTE FUNCTION routesred.protect_document_admin_fields();

CREATE OR REPLACE FUNCTION routesred.validate_provider_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
DECLARE
  v_doc_type routesred.document_types;
  v_provider routesred.transport_providers;
  v_vehicle_provider uuid;
  v_driver_provider uuid;
BEGIN
  SELECT * INTO v_doc_type FROM routesred.document_types WHERE id = NEW.document_type_id;
  IF v_doc_type IS NULL THEN
    RAISE EXCEPTION 'Document type not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_provider FROM routesred.transport_providers WHERE id = NEW.transport_provider_id;
  IF v_provider IS NULL THEN
    RAISE EXCEPTION 'Provider not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (v_provider.provider_type = ANY(v_doc_type.provider_types)) THEN
    RAISE EXCEPTION 'Document type % is not applicable to provider type %',
      v_doc_type.code, v_provider.provider_type USING ERRCODE = '42501';
  END IF;

  IF NEW.storage_bucket <> 'routesred-private' THEN
    RAISE EXCEPTION 'Document storage_bucket must be routesred-private' USING ERRCODE = '42501';
  END IF;

  IF v_doc_type.applies_to = 'provider' THEN
    IF NEW.vehicle_id IS NOT NULL OR NEW.driver_id IS NOT NULL THEN
      RAISE EXCEPTION 'Provider documents must not have vehicle_id or driver_id' USING ERRCODE = '42501';
    END IF;
    IF NOT (NEW.storage_path LIKE 'providers/' || NEW.transport_provider_id::text || '/documents/%') THEN
      RAISE EXCEPTION 'Provider document storage_path must be under providers/{pid}/documents/' USING ERRCODE = '42501';
    END IF;
  ELSIF v_doc_type.applies_to = 'vehicle' THEN
    IF NEW.vehicle_id IS NULL THEN
      RAISE EXCEPTION 'Vehicle documents require vehicle_id' USING ERRCODE = '42501';
    END IF;
    IF NEW.driver_id IS NOT NULL THEN
      RAISE EXCEPTION 'Vehicle documents must not have driver_id' USING ERRCODE = '42501';
    END IF;
    SELECT transport_provider_id INTO v_vehicle_provider FROM routesred.vehicles WHERE id = NEW.vehicle_id;
    IF v_vehicle_provider IS NULL OR v_vehicle_provider <> NEW.transport_provider_id THEN
      RAISE EXCEPTION 'Vehicle does not belong to this provider' USING ERRCODE = '42501';
    END IF;
    IF NOT (NEW.storage_path LIKE 'providers/' || NEW.transport_provider_id::text || '/vehicles/' || NEW.vehicle_id::text || '/documents/%') THEN
      RAISE EXCEPTION 'Vehicle document storage_path must be under providers/{pid}/vehicles/{vid}/documents/' USING ERRCODE = '42501';
    END IF;
  ELSIF v_doc_type.applies_to = 'driver' THEN
    IF NEW.driver_id IS NULL THEN
      RAISE EXCEPTION 'Driver documents require driver_id' USING ERRCODE = '42501';
    END IF;
    IF NEW.vehicle_id IS NOT NULL THEN
      RAISE EXCEPTION 'Driver documents must not have vehicle_id' USING ERRCODE = '42501';
    END IF;
    SELECT transport_provider_id INTO v_driver_provider FROM routesred.drivers WHERE id = NEW.driver_id;
    IF v_driver_provider IS NULL OR v_driver_provider <> NEW.transport_provider_id THEN
      RAISE EXCEPTION 'Driver does not belong to this provider' USING ERRCODE = '42501';
    END IF;
    IF NOT (NEW.storage_path LIKE 'providers/' || NEW.transport_provider_id::text || '/drivers/' || NEW.driver_id::text || '/documents/%') THEN
      RAISE EXCEPTION 'Driver document storage_path must be under providers/{pid}/drivers/{did}/documents/' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION routesred.validate_provider_document() FROM PUBLIC, anon;

CREATE TRIGGER trg_validate_provider_document
  BEFORE INSERT OR UPDATE ON routesred.provider_documents
  FOR EACH ROW EXECUTE FUNCTION routesred.validate_provider_document();

CREATE POLICY "pd_select_members"
  ON routesred.provider_documents FOR SELECT TO authenticated
  USING (
    routesred.is_provider_member(transport_provider_id)
    OR public.is_super_admin()
  );

CREATE POLICY "pd_insert_members"
  ON routesred.provider_documents FOR INSERT TO authenticated
  WITH CHECK (
    (
      (
        EXISTS (
          SELECT 1 FROM routesred.document_types dt
          WHERE dt.id = provider_documents.document_type_id
            AND dt.applies_to = 'provider'
        )
        AND routesred.is_provider_admin(transport_provider_id)
      )
      OR (
        EXISTS (
          SELECT 1 FROM routesred.document_types dt
          WHERE dt.id = provider_documents.document_type_id
            AND dt.applies_to IN ('vehicle', 'driver')
        )
        AND routesred.is_provider_operator(transport_provider_id)
      )
    )
    OR public.is_super_admin()
  );

CREATE POLICY "pd_delete_members"
  ON routesred.provider_documents FOR DELETE TO authenticated
  USING (
    routesred.is_provider_admin(transport_provider_id)
    OR public.is_super_admin()
  );

-- =============================================================
-- 18. provider_agency_links (conditional)
-- =============================================================
DO $do_pal$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agencies') THEN
    CREATE TABLE routesred.provider_agency_links (
      id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      transport_provider_id  uuid NOT NULL REFERENCES routesred.transport_providers(id) ON DELETE CASCADE,
      agency_id              uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
      status                 text NOT NULL DEFAULT 'active',
      linked_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at             timestamptz NOT NULL DEFAULT now(),
      updated_at             timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT pal_status_check CHECK (status IN ('active', 'inactive', 'pending')),
      CONSTRAINT pal_unique UNIQUE (transport_provider_id, agency_id)
    );

    CREATE INDEX IF NOT EXISTS idx_pal_provider ON routesred.provider_agency_links(transport_provider_id);
    CREATE INDEX IF NOT EXISTS idx_pal_agency ON routesred.provider_agency_links(agency_id);

    ALTER TABLE routesred.provider_agency_links ENABLE ROW LEVEL SECURITY;

    CREATE TRIGGER trg_pal_updated_at
      BEFORE UPDATE ON routesred.provider_agency_links
      FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

    GRANT SELECT ON routesred.provider_agency_links TO authenticated;

    CREATE POLICY "pal_select_members"
      ON routesred.provider_agency_links FOR SELECT TO authenticated
      USING (
        routesred.is_provider_member(transport_provider_id)
        OR public.is_super_admin()
      );
  ELSE
    RAISE NOTICE 'public.agencies does not exist; provider_agency_links table skipped';
  END IF;
END $do_pal$;

-- =============================================================
-- 19. RPC: link_provider_agency() (conditional)
-- =============================================================
DO $do_lpa$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'routesred' AND table_name = 'provider_agency_links') THEN
    CREATE OR REPLACE FUNCTION routesred.link_provider_agency(
      p_provider_id uuid,
      p_agency_id uuid
    ) RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = routesred, public
    AS $func$
    DECLARE
      v_link_id uuid;
      v_uid uuid := auth.uid();
      v_agency_owner uuid;
    BEGIN
      IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
      END IF;

      IF NOT (routesred.is_provider_admin(p_provider_id) OR public.is_super_admin()) THEN
        RAISE EXCEPTION 'Only provider administrators can link agencies' USING ERRCODE = '42501';
      END IF;

      SELECT user_id INTO v_agency_owner FROM public.agencies WHERE id = p_agency_id;
      IF v_agency_owner IS NULL THEN
        RAISE EXCEPTION 'Agency not found' USING ERRCODE = 'P0002';
      END IF;
      IF v_agency_owner <> v_uid AND NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Only the agency owner can link to a provider' USING ERRCODE = '42501';
      END IF;

      INSERT INTO routesred.provider_agency_links (transport_provider_id, agency_id, status, linked_by)
      VALUES (p_provider_id, p_agency_id, 'active', v_uid)
      ON CONFLICT (transport_provider_id, agency_id) DO UPDATE
        SET status = 'active', updated_at = now()
      RETURNING id INTO v_link_id;

      RETURN v_link_id;
    END;
    $func$;

    REVOKE EXECUTE ON FUNCTION routesred.link_provider_agency(uuid, uuid) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION routesred.link_provider_agency(uuid, uuid) TO authenticated;
  ELSE
    RAISE NOTICE 'provider_agency_links table does not exist; link_provider_agency() skipped';
  END IF;
END $do_lpa$;

-- =============================================================
-- 20. Public read RPCs
-- =============================================================
REVOKE SELECT ON routesred.transport_providers FROM anon;
REVOKE SELECT ON routesred.vehicles FROM anon;

CREATE OR REPLACE FUNCTION routesred.get_public_transport_providers()
RETURNS TABLE (
  slug text,
  trade_name text,
  description text,
  logo_url text,
  cover_image_url text,
  phone text,
  email text,
  website text,
  city text,
  state text,
  rating_average numeric,
  rating_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tp.slug, tp.trade_name, tp.description, tp.logo_url, tp.cover_image_url,
    tp.phone, tp.email, tp.website, tp.city, tp.state, tp.rating_average, tp.rating_count
  FROM routesred.transport_providers tp
  WHERE tp.status = 'active' AND tp.verification_status = 'verified' AND tp.active = true
  ORDER BY tp.rating_average DESC NULLS LAST, tp.trade_name;
END;
$$;

GRANT EXECUTE ON FUNCTION routesred.get_public_transport_providers() TO anon, authenticated;

CREATE OR REPLACE FUNCTION routesred.get_public_transport_provider_by_slug(p_slug text)
RETURNS TABLE (
  slug text, trade_name text, description text, logo_url text, cover_image_url text,
  phone text, email text, website text, city text, state text,
  rating_average numeric, rating_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tp.slug, tp.trade_name, tp.description, tp.logo_url, tp.cover_image_url,
    tp.phone, tp.email, tp.website, tp.city, tp.state, tp.rating_average, tp.rating_count
  FROM routesred.transport_providers tp
  WHERE tp.slug = p_slug AND tp.status = 'active' AND tp.verification_status = 'verified' AND tp.active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION routesred.get_public_transport_provider_by_slug(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION routesred.get_public_vehicles(p_provider_slug text DEFAULT NULL)
RETURNS TABLE (
  id uuid, provider_slug text, provider_display_name text,
  make text, model text, year integer, capacity integer, luggage_capacity integer,
  description text, primary_image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = routesred, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id, tp.slug,
    COALESCE(tp.trade_name, tp.legal_name, tp.first_name || ' ' || tp.last_name),
    v.make, v.model, v.year, v.capacity, v.luggage_capacity, v.description, v.primary_image_url
  FROM routesred.vehicles v
  JOIN routesred.transport_providers tp ON tp.id = v.transport_provider_id
  WHERE tp.status = 'active' AND tp.verification_status = 'verified' AND tp.active = true
    AND v.status = 'active' AND v.active = true
    AND (p_provider_slug IS NULL OR tp.slug = p_provider_slug)
  ORDER BY tp.slug, v.make, v.model;
END;
$$;

GRANT EXECUTE ON FUNCTION routesred.get_public_vehicles(text) TO anon, authenticated;

-- =============================================================
-- 21. Views (internal-only, security_invoker)
-- =============================================================
CREATE VIEW routesred.public_transport_providers
WITH (security_invoker = true) AS
SELECT slug, trade_name, description, logo_url, cover_image_url, phone, email, website, city, state, rating_average, rating_count
FROM routesred.transport_providers
WHERE status = 'active' AND verification_status = 'verified' AND active = true;

GRANT SELECT ON routesred.public_transport_providers TO authenticated;

CREATE VIEW routesred.public_vehicles
WITH (security_invoker = true) AS
SELECT v.id, tp.slug AS provider_slug,
  COALESCE(tp.trade_name, tp.legal_name, tp.first_name || ' ' || tp.last_name) AS provider_display_name,
  v.make, v.model, v.year, v.capacity, v.luggage_capacity, v.description, v.primary_image_url
FROM routesred.vehicles v
JOIN routesred.transport_providers tp ON tp.id = v.transport_provider_id
WHERE tp.status = 'active' AND tp.verification_status = 'verified' AND tp.active = true
  AND v.status = 'active' AND v.active = true;

GRANT SELECT ON routesred.public_vehicles TO authenticated;

-- =============================================================
-- 22. Storage buckets + policies
-- =============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('routesred-public', 'routesred-public', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('routesred-private', 'routesred-private', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

DROP POLICY IF EXISTS "rr_public_read" ON storage.objects;
DROP POLICY IF EXISTS "rr_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "rr_public_update" ON storage.objects;
DROP POLICY IF EXISTS "rr_public_delete" ON storage.objects;
DROP POLICY IF EXISTS "rr_private_read" ON storage.objects;
DROP POLICY IF EXISTS "rr_private_insert" ON storage.objects;
DROP POLICY IF EXISTS "rr_private_update" ON storage.objects;
DROP POLICY IF EXISTS "rr_private_delete" ON storage.objects;

CREATE POLICY "routesred_public_select"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'routesred-public');

-- Storage INSERT/UPDATE/DELETE policies use storage.foldername() with
-- [1]=providers, [2]=pid, [3]=resource_type, [4]=resource_id
-- All EXISTS wrapped in single AND block with user_id and status='active'

CREATE POLICY "routesred_public_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'routesred-public'
    AND EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.user_id = auth.uid() AND tpu.status = 'active' AND (
        ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'profile' AND tpu.role IN ('owner', 'administrator'))
        OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'vehicles' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.vehicles v WHERE v.id::text = (storage.foldername(objects.name))[4] AND v.transport_provider_id = tpu.transport_provider_id)))
        OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'drivers' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.drivers d WHERE d.id::text = (storage.foldername(objects.name))[4] AND d.transport_provider_id = tpu.transport_provider_id)))
      )
    )
  );

CREATE POLICY "routesred_public_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'routesred-public'
    AND EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.user_id = auth.uid() AND tpu.status = 'active' AND (
        ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'profile' AND tpu.role IN ('owner', 'administrator'))
        OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'vehicles' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.vehicles v WHERE v.id::text = (storage.foldername(objects.name))[4] AND v.transport_provider_id = tpu.transport_provider_id)))
        OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'drivers' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.drivers d WHERE d.id::text = (storage.foldername(objects.name))[4] AND d.transport_provider_id = tpu.transport_provider_id)))
      )
    )
  )
  WITH CHECK (
    bucket_id = 'routesred-public'
    AND EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.user_id = auth.uid() AND tpu.status = 'active' AND (
        ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'profile' AND tpu.role IN ('owner', 'administrator'))
        OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'vehicles' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.vehicles v WHERE v.id::text = (storage.foldername(objects.name))[4] AND v.transport_provider_id = tpu.transport_provider_id)))
        OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'drivers' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.drivers d WHERE d.id::text = (storage.foldername(objects.name))[4] AND d.transport_provider_id = tpu.transport_provider_id)))
      )
    )
  );

CREATE POLICY "routesred_public_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'routesred-public'
    AND EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.user_id = auth.uid() AND tpu.status = 'active' AND (
        ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'profile' AND tpu.role IN ('owner', 'administrator'))
        OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'vehicles' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.vehicles v WHERE v.id::text = (storage.foldername(objects.name))[4] AND v.transport_provider_id = tpu.transport_provider_id)))
        OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'drivers' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.drivers d WHERE d.id::text = (storage.foldername(objects.name))[4] AND d.transport_provider_id = tpu.transport_provider_id)))
      )
    )
  );

-- Private bucket policies (same structure + documents resource type)
CREATE POLICY "routesred_private_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'routesred-private'
    AND (
      EXISTS (
        SELECT 1 FROM routesred.transport_provider_users tpu
        WHERE tpu.user_id = auth.uid() AND tpu.status = 'active' AND (
          ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'profile' AND tpu.role IN ('owner', 'administrator'))
          OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'documents' AND tpu.role IN ('owner', 'administrator'))
          OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'vehicles' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.vehicles v WHERE v.id::text = (storage.foldername(objects.name))[4] AND v.transport_provider_id = tpu.transport_provider_id)))
          OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'drivers' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.drivers d WHERE d.id::text = (storage.foldername(objects.name))[4] AND d.transport_provider_id = tpu.transport_provider_id)))
        )
      )
      OR public.is_super_admin()
    )
  );

CREATE POLICY "routesred_private_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'routesred-private'
    AND (
      EXISTS (
        SELECT 1 FROM routesred.transport_provider_users tpu
        WHERE tpu.user_id = auth.uid() AND tpu.status = 'active' AND (
          ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'profile' AND tpu.role IN ('owner', 'administrator'))
          OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'documents' AND tpu.role IN ('owner', 'administrator'))
          OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'vehicles' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.vehicles v WHERE v.id::text = (storage.foldername(objects.name))[4] AND v.transport_provider_id = tpu.transport_provider_id)))
          OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'drivers' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.drivers d WHERE d.id::text = (storage.foldername(objects.name))[4] AND d.transport_provider_id = tpu.transport_provider_id)))
        )
      )
      OR public.is_super_admin()
    )
  );

CREATE POLICY "routesred_private_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'routesred-private'
    AND (
      EXISTS (
        SELECT 1 FROM routesred.transport_provider_users tpu
        WHERE tpu.user_id = auth.uid() AND tpu.status = 'active' AND (
          ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'profile' AND tpu.role IN ('owner', 'administrator'))
          OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'documents' AND tpu.role IN ('owner', 'administrator'))
          OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'vehicles' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.vehicles v WHERE v.id::text = (storage.foldername(objects.name))[4] AND v.transport_provider_id = tpu.transport_provider_id)))
          OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'drivers' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.drivers d WHERE d.id::text = (storage.foldername(objects.name))[4] AND d.transport_provider_id = tpu.transport_provider_id)))
        )
      )
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'routesred-private'
    AND (
      EXISTS (
        SELECT 1 FROM routesred.transport_provider_users tpu
        WHERE tpu.user_id = auth.uid() AND tpu.status = 'active' AND (
          ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'profile' AND tpu.role IN ('owner', 'administrator'))
          OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'documents' AND tpu.role IN ('owner', 'administrator'))
          OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'vehicles' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.vehicles v WHERE v.id::text = (storage.foldername(objects.name))[4] AND v.transport_provider_id = tpu.transport_provider_id)))
          OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'drivers' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.drivers d WHERE d.id::text = (storage.foldername(objects.name))[4] AND d.transport_provider_id = tpu.transport_provider_id)))
        )
      )
      OR public.is_super_admin()
    )
  );

CREATE POLICY "routesred_private_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'routesred-private'
    AND (
      EXISTS (
        SELECT 1 FROM routesred.transport_provider_users tpu
        WHERE tpu.user_id = auth.uid() AND tpu.status = 'active' AND (
          ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'profile' AND tpu.role IN ('owner', 'administrator'))
          OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'documents' AND tpu.role IN ('owner', 'administrator'))
          OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'vehicles' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.vehicles v WHERE v.id::text = (storage.foldername(objects.name))[4] AND v.transport_provider_id = tpu.transport_provider_id)))
          OR ((storage.foldername(objects.name))[1] = 'providers' AND (storage.foldername(objects.name))[2] = tpu.transport_provider_id::text AND (storage.foldername(objects.name))[3] = 'drivers' AND tpu.role IN ('owner', 'administrator', 'operator_manager') AND ((storage.foldername(objects.name))[4] IS NULL OR EXISTS (SELECT 1 FROM routesred.drivers d WHERE d.id::text = (storage.foldername(objects.name))[4] AND d.transport_provider_id = tpu.transport_provider_id)))
        )
      )
      OR public.is_super_admin()
    )
  );