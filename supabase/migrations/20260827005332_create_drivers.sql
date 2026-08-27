-- ============================================================================
-- routesred.drivers
-- A driver employed by or contracted to a provider. Private to the provider.
-- ============================================================================
CREATE TABLE IF NOT EXISTS routesred.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_provider_id uuid NOT NULL REFERENCES routesred.transport_providers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text,
  licence_number text,
  licence_type text CHECK (licence_type IN ('a','a1','b','b1','c','c1','d','d1','e','e1')),
  licence_expiry date,
  photo_url text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','on_leave','terminated')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drivers_provider ON routesred.drivers(transport_provider_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON routesred.drivers(status);

DROP TRIGGER IF EXISTS trg_drivers_updated_at ON routesred.drivers;
CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON routesred.drivers
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

ALTER TABLE routesred.drivers ENABLE ROW LEVEL SECURITY;

-- Driver data is private: only provider members can see it.
CREATE POLICY drivers_select_members
  ON routesred.drivers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = drivers.transport_provider_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
    ) OR public.is_super_admin()
  );

CREATE POLICY drivers_insert_members
  ON routesred.drivers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = drivers.transport_provider_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
        AND tpu.role IN ('owner','administrator','operator_manager')
    ) OR public.is_super_admin()
  );

CREATE POLICY drivers_update_members
  ON routesred.drivers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = drivers.transport_provider_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
        AND tpu.role IN ('owner','administrator','operator_manager')
    ) OR public.is_super_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = drivers.transport_provider_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
        AND tpu.role IN ('owner','administrator','operator_manager')
    ) OR public.is_super_admin()
  );

CREATE POLICY drivers_delete_members
  ON routesred.drivers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = drivers.transport_provider_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
        AND tpu.role IN ('owner','administrator')
    ) OR public.is_super_admin()
  );
