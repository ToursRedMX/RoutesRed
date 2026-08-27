/**
 * # DocumentsPage
 *
 * Document management for a transport provider.
 *
 * - Lists required document types, filtered by the provider's type.
 * - Shows status (pending/approved/rejected/expired) for each uploaded
 *   document.
 * - Upload button creates a `provider_documents` record with a
 *   `file_url` (stored in Supabase Storage).
 * - Replace an existing document by uploading a new version.
 * - Shows expiry dates when the document type tracks expiry.
 * - Groups documents into three sections: provider documents, vehicle
 *   documents, and driver documents.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  FileText,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Car,
  Users,
  Building2,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useProvider } from '@/hooks/useProvider';
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Field,
  PageSpinner,
  DOCUMENT_STATUS_BADGE,
  DOCUMENT_STATUS_LABELS,
  inputClass,
} from '@/components/provider/ui';
import type {
  DocumentType,
  DocumentVerificationStatus,
  ProviderDocument,
  Vehicle,
  Driver,
} from '@/types';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** A document type enriched with its latest uploaded document. */
interface DocumentTypeWithDoc {
  type: DocumentType;
  doc: ProviderDocument | null;
}

/* ------------------------------------------------------------------ *
 * DocumentsPage
 * ------------------------------------------------------------------ */

export function DocumentsPage(): ReactNode {
  const { provider, loading: providerLoading, error: providerError } = useProvider();

  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [documents, setDocuments] = useState<ProviderDocument[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);

  // Upload modal state.
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<DocumentType | null>(null);
  const [modalScope, setModalScope] = useState<{ vehicleId?: string; driverId?: string } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /* ---- Fetch document types (catalog) once ---- */
  useEffect(() => {
    let active: boolean = true;
    void (async () => {
      const { data, error: catError } = await supabase
        .from('document_types')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (!active) return;
      if (catError) {
        setListError(catError.message);
        return;
      }
      setDocTypes((data as DocumentType[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  /* ---- Fetch provider documents + vehicles + drivers ---- */
  const fetchProviderData = useCallback(
    async (providerId: string): Promise<void> => {
      setDataLoading(true);
      setListError(null);

      const [docsRes, vehiclesRes, driversRes] = await Promise.all([
        supabase
          .from('provider_documents')
          .select('*')
          .eq('transport_provider_id', providerId)
          .order('created_at', { ascending: false }),
        supabase
          .from('vehicles')
          .select('id, internal_code, make, model, plate')
          .eq('transport_provider_id', providerId)
          .order('created_at', { ascending: false }),
        supabase
          .from('drivers')
          .select('id, first_name, last_name')
          .eq('transport_provider_id', providerId)
          .order('created_at', { ascending: false }),
      ]);

      if (docsRes.error) {
        setListError(docsRes.error.message);
        setDataLoading(false);
        return;
      }

      setDocuments((docsRes.data as ProviderDocument[]) ?? []);
      setVehicles((vehiclesRes.data as Vehicle[]) ?? []);
      setDrivers((driversRes.data as Driver[]) ?? []);
      setDataLoading(false);
    },
    [],
  );

  useEffect(() => {
    if (provider) {
      void fetchProviderData(provider.id);
    } else if (!providerLoading) {
      setDocuments([]);
      setVehicles([]);
      setDrivers([]);
      setDataLoading(false);
    }
  }, [provider, providerLoading, fetchProviderData]);

  /* ---- Find the latest document for a type (optionally scoped) ---- */
  const findDoc = useCallback(
    (
      typeId: string,
      vehicleId?: string,
      driverId?: string,
    ): ProviderDocument | null => {
      const matching: ProviderDocument[] = documents.filter(
        (d: ProviderDocument) =>
          d.document_type_id === typeId &&
          (vehicleId ? d.vehicle_id === vehicleId : d.vehicle_id === null) &&
          (driverId ? d.driver_id === driverId : d.driver_id === null),
      );
      // Return the most recently created.
      return matching.length > 0 ? matching[0] : null;
    },
    [documents],
  );

  /* ---- Modal helpers ---- */
  const openUpload = useCallback(
    (type: DocumentType, scope?: { vehicleId?: string; driverId?: string }): void => {
      setModalType(type);
      setModalScope(scope ?? null);
      const existing: ProviderDocument | null = findDoc(
        type.id,
        scope?.vehicleId,
        scope?.driverId,
      );
      setExpiryDate(existing?.expiry_date ?? '');
      setUploadFile(null);
      setUploadError(null);
      setModalOpen(true);
    },
    [findDoc],
  );

  const closeModal = useCallback((): void => {
    setModalOpen(false);
    setModalType(null);
    setModalScope(null);
    setUploadFile(null);
    setExpiryDate('');
    setUploadError(null);
  }, []);

  /* ---- Upload ---- */
  const handleUpload = useCallback(async (): Promise<void> => {
    if (!provider || !modalType || !uploadFile) return;
    setUploading(true);
    setUploadError(null);

    try {
      // 1. Upload the file to Supabase Storage.
      const ext: string = uploadFile.name.split('.').pop() ?? 'bin';
      const filePath: string = `${provider.id}/${modalType.id}-${Date.now()}.${ext}`;
      const { error: storageError } = await supabase.storage
        .from('provider-documents')
        .upload(filePath, uploadFile, { upsert: false });

      if (storageError) {
        setUploadError(storageError.message);
        setUploading(false);
        return;
      }

      // 2. Get the public URL.
      const { data: urlData } = supabase.storage
        .from('provider-documents')
        .getPublicUrl(filePath);
      const fileUrl: string = urlData.publicUrl;

      // 3. If there is an existing document of this type/scope, replace
      //    it (update the row). Otherwise insert a new row.
      const existing: ProviderDocument | null = findDoc(
        modalType.id,
        modalScope?.vehicleId,
        modalScope?.driverId,
      );

      const payload: Record<string, unknown> = {
        transport_provider_id: provider.id,
        document_type_id: modalType.id,
        vehicle_id: modalScope?.vehicleId ?? null,
        driver_id: modalScope?.driverId ?? null,
        file_name: uploadFile.name,
        file_url: fileUrl,
        mime_type: uploadFile.type || null,
        file_size: uploadFile.size,
        expiry_date: expiryDate || null,
        verification_status: 'pending' as DocumentVerificationStatus,
        reviewed_by: null,
        reviewed_at: null,
        review_note: null,
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from('provider_documents')
          .update(payload)
          .eq('id', existing.id);

        if (updateError) {
          setUploadError(updateError.message);
          setUploading(false);
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from('provider_documents')
          .insert(payload);

        if (insertError) {
          setUploadError(insertError.message);
          setUploading(false);
          return;
        }
      }

      setUploading(false);
      closeModal();
      void fetchProviderData(provider.id);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Error al subir el documento.',
      );
      setUploading(false);
    }
  }, [provider, modalType, modalScope, uploadFile, expiryDate, findDoc, closeModal, fetchProviderData]);

  /* ---- Render ---- */
  if (providerLoading || (dataLoading && documents.length === 0 && docTypes.length === 0)) {
    return <PageSpinner label="Cargando documentos…" />;
  }

  if (providerError) {
    return (
      <div className="max-w-2xl">
        <ErrorBanner message={providerError} />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="max-w-2xl">
        <ErrorBanner message="No tienes un proveedor registrado." />
      </div>
    );
  }

  // Group document types.
  const providerTypes: DocumentType[] = docTypes.filter(
    (t: DocumentType) => !t.applies_to_vehicle && !t.applies_to_driver,
  );
  const vehicleTypes: DocumentType[] = docTypes.filter(
    (t: DocumentType) => t.applies_to_vehicle,
  );
  const driverTypes: DocumentType[] = docTypes.filter(
    (t: DocumentType) => t.applies_to_driver,
  );

  // Pending count for the summary.
  const pendingCount: number = documents.filter(
    (d: ProviderDocument) => d.verification_status === 'pending',
  ).length;

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Documentos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sube y gestiona los documentos requeridos para tu verificación.
        </p>
      </div>

      {/* ---- Summary ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<FileText className="h-5 w-5" />}
          label="Total documentos"
          value={String(documents.length)}
          accent="slate"
        />
        <SummaryCard
          icon={<Clock className="h-5 w-5" />}
          label="Pendientes de revisión"
          value={String(pendingCount)}
          accent="amber"
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Aprobados"
          value={String(
            documents.filter((d: ProviderDocument) => d.verification_status === 'approved')
              .length,
          )}
          accent="emerald"
        />
      </div>

      {listError && <ErrorBanner message={listError} />}

      {/* ---- Provider documents ---- */}
      <DocumentGroup
        title="Documentos del proveedor"
        icon={<Building2 className="h-5 w-5" />}
        types={providerTypes}
        findDoc={(typeId: string) => findDoc(typeId)}
        onUpload={(type: DocumentType) => openUpload(type)}
      />

      {/* ---- Vehicle documents ---- */}
      <DocumentGroup
        title="Documentos de vehículos"
        icon={<Car className="h-5 w-5" />}
        types={vehicleTypes}
        emptyHint={
          vehicles.length === 0
            ? 'Agrega vehículos para gestionar sus documentos.'
            : undefined
        }
        findDoc={(typeId: string, vehicleId?: string) => findDoc(typeId, vehicleId)}
        onUpload={(type: DocumentType, scope?: { vehicleId?: string; driverId?: string }) =>
          openUpload(type, scope)
        }
        vehicles={vehicles}
      />

      {/* ---- Driver documents ---- */}
      <DocumentGroup
        title="Documentos de operadores"
        icon={<Users className="h-5 w-5" />}
        types={driverTypes}
        emptyHint={
          drivers.length === 0
            ? 'Agrega operadores para gestionar sus documentos.'
            : undefined
        }
        findDoc={(typeId: string, _vehicleId?: string, driverId?: string) =>
          findDoc(typeId, undefined, driverId)
        }
        onUpload={(type: DocumentType, scope?: { vehicleId?: string; driverId?: string }) =>
          openUpload(type, scope)
        }
        drivers={drivers}
      />

      {/* ---- Upload modal ---- */}
      {modalOpen && modalType && (
        <UploadModal
          docType={modalType}
          scope={modalScope}
          vehicles={vehicles}
          drivers={drivers}
          file={uploadFile}
          expiryDate={expiryDate}
          uploading={uploading}
          error={uploadError}
          onFileChange={setUploadFile}
          onExpiryChange={setExpiryDate}
          onClose={closeModal}
          onSubmit={() => void handleUpload()}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Summary card
 * ------------------------------------------------------------------ */

interface SummaryCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  accent: 'slate' | 'amber' | 'emerald';
}

const SUMMARY_ACCENT: Record<SummaryCardProps['accent'], string> = {
  slate: 'bg-slate-50 text-slate-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
};

function SummaryCard({ icon, label, value, accent }: SummaryCardProps): ReactNode {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${SUMMARY_ACCENT[accent]}`}
      >
        {icon}
      </span>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Document group
 * ------------------------------------------------------------------ */

interface DocumentGroupProps {
  title: string;
  icon: ReactNode;
  types: DocumentType[];
  emptyHint?: string;
  vehicles?: Vehicle[];
  drivers?: Driver[];
  findDoc: (typeId: string, vehicleId?: string, driverId?: string) => ProviderDocument | null;
  onUpload: (
    type: DocumentType,
    scope?: { vehicleId?: string; driverId?: string },
  ) => void;
}

function DocumentGroup({
  title,
  icon,
  types,
  emptyHint,
  vehicles,
  drivers,
  findDoc,
  onUpload,
}: DocumentGroupProps): ReactNode {
  if (types.length === 0) return null;

  const hasScopes: boolean =
    (vehicles !== undefined && vehicles.length > 0) ||
    (drivers !== undefined && drivers.length > 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
          {icon}
        </span>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>

      {/* Body */}
      <div className="p-5">
        {emptyHint && !hasScopes ? (
          <p className="py-4 text-center text-sm text-slate-400">{emptyHint}</p>
        ) : (
          <div className="space-y-4">
            {/* If scoped to vehicles/drivers, render per-scope rows. */}
            {hasScopes ? (
              <>
                {vehicles?.map((v: Vehicle) => {
                  const label: string =
                    [v.make, v.model].filter(Boolean).join(' ') ||
                    v.internal_code ||
                    'Vehículo';
                  return (
                    <div key={v.id} className="rounded-xl border border-slate-100 p-4">
                      <p className="mb-3 text-sm font-semibold text-slate-700">
                        {label}
                        {v.plate && (
                          <span className="ml-2 font-mono text-xs uppercase text-slate-400">
                            {v.plate}
                          </span>
                        )}
                      </p>
                      <div className="space-y-2">
                        {types.map((t: DocumentType) => {
                          const doc: ProviderDocument | null = findDoc(t.id, v.id);
                          return (
                            <DocumentRow
                              key={t.id}
                              type={t}
                              doc={doc}
                              onUpload={() => onUpload(t, { vehicleId: v.id })}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {drivers?.map((d: Driver) => {
                  const label: string = `${d.first_name} ${d.last_name}`.trim();
                  return (
                    <div key={d.id} className="rounded-xl border border-slate-100 p-4">
                      <p className="mb-3 text-sm font-semibold text-slate-700">{label}</p>
                      <div className="space-y-2">
                        {types.map((t: DocumentType) => {
                          const doc: ProviderDocument | null = findDoc(t.id, undefined, d.id);
                          return (
                            <DocumentRow
                              key={t.id}
                              type={t}
                              doc={doc}
                              onUpload={() => onUpload(t, { driverId: d.id })}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="space-y-2">
                {types.map((t: DocumentType) => {
                  const doc: ProviderDocument | null = findDoc(t.id);
                  return (
                    <DocumentRow
                      key={t.id}
                      type={t}
                      doc={doc}
                      onUpload={() => onUpload(t)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Document row
 * ------------------------------------------------------------------ */

interface DocumentRowProps {
  type: DocumentType;
  doc: ProviderDocument | null;
  onUpload: () => void;
}

function DocumentRow({ type, doc, onUpload }: DocumentRowProps): ReactNode {
  const statusIcon: ReactNode = doc
    ? doc.verification_status === 'approved'
      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      : doc.verification_status === 'rejected'
        ? <AlertTriangle className="h-4 w-4 text-red-500" />
        : doc.verification_status === 'expired'
          ? <AlertTriangle className="h-4 w-4 text-slate-400" />
          : <Clock className="h-4 w-4 text-amber-500" />
    : <FileText className="h-4 w-4 text-slate-300" />;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/40 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {statusIcon}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800">
            {type.name}
            {type.required && <span className="ml-1 text-red-500">*</span>}
          </p>
          <p className="truncate text-xs text-slate-400">
            {type.description ?? ''}
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        {/* Status */}
        {doc ? (
          <div className="flex items-center gap-2">
            <Badge className={DOCUMENT_STATUS_BADGE[doc.verification_status]}>
              {DOCUMENT_STATUS_LABELS[doc.verification_status]}
            </Badge>
            {type.has_expiry && doc.expiry_date && (
              <span className="text-xs text-slate-400">
                Vence: {doc.expiry_date}
              </span>
            )}
          </div>
        ) : (
          <Badge className="bg-slate-100 text-slate-400">Sin subir</Badge>
        )}

        {/* Action */}
        <button
          type="button"
          onClick={onUpload}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          {doc ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Reemplazar
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              Subir
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Upload modal
 * ------------------------------------------------------------------ */

interface UploadModalProps {
  docType: DocumentType;
  scope: { vehicleId?: string; driverId?: string } | null;
  vehicles: Vehicle[];
  drivers: Driver[];
  file: File | null;
  expiryDate: string;
  uploading: boolean;
  error: string | null;
  onFileChange: (file: File | null) => void;
  onExpiryChange: (date: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

function UploadModal({
  docType,
  scope,
  vehicles,
  drivers,
  file,
  expiryDate,
  uploading,
  error,
  onFileChange,
  onExpiryChange,
  onClose,
  onSubmit,
}: UploadModalProps): ReactNode {
  // Derive a human label for the scope.
  let scopeLabel: string | null = null;
  if (scope?.vehicleId) {
    const v: Vehicle | undefined = vehicles.find(
      (x: Vehicle) => x.id === scope.vehicleId,
    );
    if (v) {
      scopeLabel =
        [v.make, v.model].filter(Boolean).join(' ') || v.internal_code || 'Vehículo';
    }
  } else if (scope?.driverId) {
    const d: Driver | undefined = drivers.find(
      (x: Driver) => x.id === scope.driverId,
    );
    if (d) {
      scopeLabel = `${d.first_name} ${d.last_name}`.trim();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {findDocLabel(file ? 'Reemplazar' : 'Subir')} documento
            </h2>
            <p className="text-xs text-slate-400">
              {docType.name}
              {scopeLabel ? ` · ${scopeLabel}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-5 px-6 py-5"
        >
          {error && <ErrorBanner message={error} />}

          {docType.description && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              {docType.description}
            </p>
          )}

          <Field label="Archivo" required>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onFileChange(e.target.files?.[0] ?? null)
              }
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-rr-navy-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-rr-navy-700 hover:file:bg-rr-navy-100"
              required
            />
            <p className="mt-1 text-xs text-slate-400">
              PDF, JPG, PNG o WebP. Máximo 10&nbsp;MB.
            </p>
          </Field>

          {docType.has_expiry && (
            <Field label="Fecha de vencimiento" hint="Opcional, pero recomendada.">
              <input
                type="date"
                value={expiryDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onExpiryChange(e.target.value)
                }
                className={inputClass}
              />
            </Field>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Subiendo…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Subir documento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Tiny helper so the modal title reads "Reemplazar" vs "Subir". */
function findDocLabel(action: string): string {
  return action;
}
