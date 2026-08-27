/*
# RoutesRed — Provider RLS Policies

Adds RLS policies for transport_providers and transport_provider_users.
*/

-- transport_providers SELECT
DROP POLICY IF EXISTS "tp_select_members" ON routesred.transport_providers;
CREATE POLICY "tp_select_members"
  ON routesred.transport_providers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = transport_providers.id
      AND tpu.user_id = auth.uid() AND tpu.status = 'active'
    )
    OR public.is_super_admin()
  );

-- transport_providers UPDATE
DROP POLICY IF EXISTS "tp_update_members" ON routesred.transport_providers;
CREATE POLICY "tp_update_members"
  ON routesred.transport_providers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = transport_providers.id
      AND tpu.user_id = auth.uid() AND tpu.status = 'active'
      AND tpu.role IN ('owner', 'administrator')
    )
    OR public.is_super_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = transport_providers.id
      AND tpu.user_id = auth.uid() AND tpu.status = 'active'
      AND tpu.role IN ('owner', 'administrator')
    )
    OR public.is_super_admin()
  );

-- transport_provider_users SELECT
DROP POLICY IF EXISTS "tpu_select_members" ON routesred.transport_provider_users;
CREATE POLICY "tpu_select_members"
  ON routesred.transport_provider_users FOR SELECT TO authenticated
  USING (
    transport_provider_users.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu2
      WHERE tpu2.transport_provider_id = transport_provider_users.transport_provider_id
      AND tpu2.user_id = auth.uid() AND tpu2.status = 'active'
    )
    OR public.is_super_admin()
  );

-- transport_provider_users INSERT
DROP POLICY IF EXISTS "tpu_insert_admins" ON routesred.transport_provider_users;
CREATE POLICY "tpu_insert_admins"
  ON routesred.transport_provider_users FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu2
      WHERE tpu2.transport_provider_id = transport_provider_users.transport_provider_id
      AND tpu2.user_id = auth.uid() AND tpu2.status = 'active'
      AND tpu2.role IN ('owner', 'administrator')
    )
    OR public.is_super_admin()
  );

-- transport_provider_users UPDATE
DROP POLICY IF EXISTS "tpu_update_admins" ON routesred.transport_provider_users;
CREATE POLICY "tpu_update_admins"
  ON routesred.transport_provider_users FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu2
      WHERE tpu2.transport_provider_id = transport_provider_users.transport_provider_id
      AND tpu2.user_id = auth.uid() AND tpu2.status = 'active'
      AND tpu2.role IN ('owner', 'administrator')
    )
    OR public.is_super_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu2
      WHERE tpu2.transport_provider_id = transport_provider_users.transport_provider_id
      AND tpu2.user_id = auth.uid() AND tpu2.status = 'active'
      AND tpu2.role IN ('owner', 'administrator')
    )
    OR public.is_super_admin()
  );

-- transport_provider_users DELETE
DROP POLICY IF EXISTS "tpu_delete_owner" ON routesred.transport_provider_users;
CREATE POLICY "tpu_delete_owner"
  ON routesred.transport_provider_users FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu2
      WHERE tpu2.transport_provider_id = transport_provider_users.transport_provider_id
      AND tpu2.user_id = auth.uid() AND tpu2.status = 'active'
      AND tpu2.role = 'owner'
    )
    OR public.is_super_admin()
  );
