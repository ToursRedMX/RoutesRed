-- ============================================================================
-- routesred.vehicles
-- A vehicle owned by a transport provider.
-- ============================================================================
CREATE TABLE IF NOT EXISTS routesred.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_provider_id uuid NOT NULL REFERENCES routesred.transport_providers(id) ON DELETE CASCADE,
  vehicle_type_id uuid NOT NULL REFERENCES routesred.vehicle_types(id),
  internal_code text,
  make text,
  model text,
  year integer,
  plate text,
  vin text,
  color text,
  capacity integer,
  luggage_capacity integer,
  description text,
  primary_image_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','maintenance','retired')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_provider ON routesred.vehicles(transport_provider_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON routesred.vehicles(status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION routesred.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON routesred.vehicles;
CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON routesred.vehicles
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

-- RLS
ALTER TABLE routesred.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicles_select_members
  ON routesred.vehicles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = vehicles.transport_provider_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
    ) OR public.is_super_admin()
  );

CREATE POLICY vehicles_insert_members
  ON routesred.vehicles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = vehicles.transport_provider_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
        AND tpu.role IN ('owner','administrator','operator_manager')
    ) OR public.is_super_admin()
  );

CREATE POLICY vehicles_update_members
  ON routesred.vehicles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = vehicles.transport_provider_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
        AND tpu.role IN ('owner','administrator','operator_manager')
    ) OR public.is_super_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = vehicles.transport_provider_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
        AND tpu.role IN ('owner','administrator','operator_manager')
    ) OR public.is_super_admin()
  );

CREATE POLICY vehicles_delete_members
  ON routesred.vehicles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = vehicles.transport_provider_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
        AND tpu.role IN ('owner','administrator')
    ) OR public.is_super_admin()
  );

-- ============================================================================
-- routesred.vehicle_amenities (join table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS routesred.vehicle_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES routesred.vehicles(id) ON DELETE CASCADE,
  amenity_id uuid NOT NULL REFERENCES routesred.amenities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, amenity_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_amenities_vehicle ON routesred.vehicle_amenities(vehicle_id);

ALTER TABLE routesred.vehicle_amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicle_amenities_select_members
  ON routesred.vehicle_amenities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM routesred.vehicles v
      JOIN routesred.transport_provider_users tpu
        ON tpu.transport_provider_id = v.transport_provider_id
      WHERE v.id = vehicle_amenities.vehicle_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
    ) OR public.is_super_admin()
  );

CREATE POLICY vehicle_amenities_insert_members
  ON routesred.vehicle_amenities FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM routesred.vehicles v
      JOIN routesred.transport_provider_users tpu
        ON tpu.transport_provider_id = v.transport_provider_id
      WHERE v.id = vehicle_amenities.vehicle_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
        AND tpu.role IN ('owner','administrator','operator_manager')
    ) OR public.is_super_admin()
  );

CREATE POLICY vehicle_amenities_delete_members
  ON routesred.vehicle_amenities FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM routesred.vehicles v
      JOIN routesred.transport_provider_users tpu
        ON tpu.transport_provider_id = v.transport_provider_id
      WHERE v.id = vehicle_amenities.vehicle_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
        AND tpu.role IN ('owner','administrator','operator_manager')
    ) OR public.is_super_admin()
  );
