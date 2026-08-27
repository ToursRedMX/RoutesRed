-- ============================================================================
-- routesred.document_types (catalog)
-- ============================================================================
CREATE TABLE IF NOT EXISTS routesred.document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  required boolean NOT NULL DEFAULT false,
  applies_to_vehicle boolean NOT NULL DEFAULT false,
  applies_to_driver boolean NOT NULL DEFAULT false,
  has_expiry boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_document_types_updated_at ON routesred.document_types;
CREATE TRIGGER trg_document_types_updated_at
  BEFORE UPDATE ON routesred.document_types
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

-- Public read for the catalog.
ALTER TABLE routesred.document_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_types_public_read
  ON routesred.document_types FOR SELECT TO anon, authenticated
  USING (true);

-- Seed document types.
INSERT INTO routesred.document_types (code, name, description, required, applies_to_vehicle, applies_to_driver, has_expiry, sort_order) VALUES
  ('provider_rfc_proof', 'Comprobante de RFC', 'Documento que acredita el RFC del proveedor.', true, false, false, false, 1),
  ('provider_id', 'Identificación oficial', 'INE/IFE o pasaporte del representante.', true, false, false, true, 2),
  ('provider_address_proof', 'Comprobante de domicilio', 'Comprobante de domicilio reciente.', false, false, false, false, 3),
  ('provider_tax_status', 'Constancia de situación fiscal', 'Constancia emitida por el SAT.', true, false, false, false, 4),
  ('provider_insurance', 'Póliza de seguro', 'Póliza de seguro de responsabilidad civil.', true, false, false, true, 5),
  ('provider_logo', 'Logotipo', 'Logotipo del proveedor para perfil público.', false, false, false, false, 6),
  ('vehicle_registration', 'Tarjeta de circulación', 'Tarjeta de circulación del vehículo.', true, true, false, true, 10),
  ('vehicle_insurance', 'Seguro del vehículo', 'Póliza de seguro del vehículo.', true, true, false, true, 11),
  ('vehicle_technical', 'Verificación técnica', 'Verificación técnica mecánica.', false, true, false, true, 12),
  ('driver_licence', 'Licencia de conducir', 'Licencia de conducir del operador.', true, false, true, true, 20),
  ('driver_id', 'Identificación del operador', 'Identificación oficial del operador.', true, false, true, false, 21),
  ('driver_medical', 'Examen médico', 'Examen médico del operador.', false, false, true, true, 22)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- routesred.provider_documents
-- A document uploaded by a provider for verification.
-- ============================================================================
CREATE TABLE IF NOT EXISTS routesred.provider_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_provider_id uuid NOT NULL REFERENCES routesred.transport_providers(id) ON DELETE CASCADE,
  document_type_id uuid NOT NULL REFERENCES routesred.document_types(id) ON DELETE RESTRICT,
  vehicle_id uuid REFERENCES routesred.vehicles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES routesred.drivers(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  mime_type text,
  file_size bigint,
  issue_date date,
  expiry_date date,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','approved','rejected','expired')),
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_documents_provider ON routesred.provider_documents(transport_provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_documents_type ON routesred.provider_documents(document_type_id);
CREATE INDEX IF NOT EXISTS idx_provider_documents_vehicle ON routesred.provider_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_provider_documents_driver ON routesred.provider_documents(driver_id);

DROP TRIGGER IF EXISTS trg_provider_documents_updated_at ON routesred.provider_documents;
CREATE TRIGGER trg_provider_documents_updated_at
  BEFORE UPDATE ON routesred.provider_documents
  FOR EACH ROW EXECUTE FUNCTION routesred.set_updated_at();

ALTER TABLE routesred.provider_documents ENABLE ROW LEVEL SECURITY;

-- Provider members can see their documents.
CREATE POLICY provider_documents_select_members
  ON routesred.provider_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = provider_documents.transport_provider_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
    ) OR public.is_super_admin()
  );

-- Provider members can upload/replace documents.
CREATE POLICY provider_documents_insert_members
  ON routesred.provider_documents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = provider_documents.transport_provider_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
        AND tpu.role IN ('owner','administrator','operator_manager')
    ) OR public.is_super_admin()
  );

CREATE POLICY provider_documents_update_members
  ON routesred.provider_documents FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = provider_documents.transport_provider_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
        AND tpu.role IN ('owner','administrator','operator_manager')
    ) OR public.is_super_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = provider_documents.transport_provider_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
        AND tpu.role IN ('owner','administrator','operator_manager')
    ) OR public.is_super_admin()
  );

CREATE POLICY provider_documents_delete_members
  ON routesred.provider_documents FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routesred.transport_provider_users tpu
      WHERE tpu.transport_provider_id = provider_documents.transport_provider_id
        AND tpu.user_id = auth.uid()
        AND tpu.status = 'active'
        AND tpu.role IN ('owner','administrator')
    ) OR public.is_super_admin()
  );
