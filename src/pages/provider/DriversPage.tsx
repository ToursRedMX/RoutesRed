/**
 * # DriversPage
 *
 * Driver (operator) management for a transport provider.
 *
 * - Lists drivers as cards (name, licence, status).
 * - "Add driver" opens an inline modal form.
 * - Edit an existing driver via the same form.
 * - Soft delete sets `status = 'terminated'` and `active = false`.
 * - Driver form fields: first_name, last_name, phone, email,
 *   license_number (stored as `licence_number`), license_type
 *   (`licence_type`), license_expiration (`licence_expiry`).
 *
 * Driver data is private — the RLS policy `drivers_select_members`
 * restricts reads to active provider members only.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Phone,
  Mail,
  IdCard,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useProvider } from '@/hooks/useProvider';
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Field,
  PageSpinner,
  DRIVER_STATUS_BADGE,
  DRIVER_STATUS_LABELS,
  inputClass,
} from '@/components/provider/ui';
import type { Driver, DriverStatus, LicenceType } from '@/types';

/* ------------------------------------------------------------------ *
 * Form state
 * ------------------------------------------------------------------ */

/** Editable driver fields (friendly UI names). */
interface DriverFormState {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  license_number: string;
  license_type: string;
  license_expiration: string;
  status: DriverStatus;
  notes: string;
}

const EMPTY_FORM: DriverFormState = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  license_number: '',
  license_type: '',
  license_expiration: '',
  status: 'active',
  notes: '',
};

/** Convert a DB driver row into form state. */
function rowToForm(d: Driver): DriverFormState {
  return {
    first_name: d.first_name,
    last_name: d.last_name,
    phone: d.phone ?? '',
    email: d.email ?? '',
    license_number: d.licence_number ?? '',
    license_type: d.licence_type ?? '',
    license_expiration: d.licence_expiry ?? '',
    status: d.status,
    notes: d.notes ?? '',
  };
}

/** Convert form state into a DB row payload. */
function formToRow(
  form: DriverFormState,
  providerId: string,
): Record<string, unknown> {
  return {
    transport_provider_id: providerId,
    first_name: form.first_name,
    last_name: form.last_name,
    phone: form.phone || null,
    email: form.email || null,
    licence_number: form.license_number || null,
    licence_type: (form.license_type || null) as LicenceType | null,
    licence_expiry: form.license_expiration || null,
    status: form.status,
    active: form.status === 'active',
    notes: form.notes || null,
  };
}

/** Licence type options for the dropdown. */
const LICENCE_TYPES: Array<{ value: LicenceType; label: string }> = [
  { value: 'a', label: 'A — Motocicleta' },
  { value: 'a1', label: 'A1 — Motocicleta liviana' },
  { value: 'b', label: 'B — Automóvil' },
  { value: 'b1', label: 'B1 — Automóvil particular' },
  { value: 'c', label: 'C — Carga' },
  { value: 'c1', label: 'C1 — Carga liviana' },
  { value: 'd', label: 'D — Pasajeros' },
  { value: 'd1', label: 'D1 — Pasajeros liviano' },
  { value: 'e', label: 'E — Articulado' },
  { value: 'e1', label: 'E1 — Articulado liviano' },
];

/* ------------------------------------------------------------------ *
 * DriversPage
 * ------------------------------------------------------------------ */

export function DriversPage(): ReactNode {
  const { provider, loading: providerLoading, error: providerError } = useProvider();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);

  // Modal state.
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DriverFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* ---- Fetch drivers ---- */
  const fetchDrivers = useCallback(
    async (providerId: string): Promise<void> => {
      setListLoading(true);
      setListError(null);

      const { data, error: queryError } = await supabase
        .from('drivers')
        .select('*')
        .eq('transport_provider_id', providerId)
        .order('created_at', { ascending: false });

      if (queryError) {
        setListError(queryError.message);
        setDrivers([]);
        setListLoading(false);
        return;
      }

      setDrivers((data as Driver[]) ?? []);
      setListLoading(false);
    },
    [],
  );

  useEffect(() => {
    if (provider) {
      void fetchDrivers(provider.id);
    } else if (!providerLoading) {
      setDrivers([]);
      setListLoading(false);
    }
  }, [provider, providerLoading, fetchDrivers]);

  /* ---- Modal helpers ---- */
  const openAdd = useCallback((): void => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((d: Driver): void => {
    setEditingId(d.id);
    setForm(rowToForm(d));
    setFormError(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback((): void => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }, []);

  const updateField = useCallback(
    (field: keyof DriverFormState, value: string): void => {
      setForm((prev: DriverFormState) => ({ ...prev, [field]: value }));
    },
    [],
  );

  /* ---- Save ---- */
  const handleSave = useCallback(async (): Promise<void> => {
    if (!provider) return;
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError('El nombre y los apellidos son obligatorios.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const row: Record<string, unknown> = formToRow(form, provider.id);

    if (editingId) {
      const { error: updateError } = await supabase
        .from('drivers')
        .update(row)
        .eq('id', editingId);

      if (updateError) {
        setFormError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from('drivers')
        .insert(row);

      if (insertError) {
        setFormError(insertError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    closeModal();
    void fetchDrivers(provider.id);
  }, [provider, form, editingId, closeModal, fetchDrivers]);

  /* ---- Soft delete ---- */
  const handleDelete = useCallback(
    async (d: Driver): Promise<void> => {
      if (!provider) return;
      const { error: deleteError } = await supabase
        .from('drivers')
        .update({ status: 'terminated', active: false })
        .eq('id', d.id);

      if (deleteError) {
        setListError(deleteError.message);
        return;
      }
      void fetchDrivers(provider.id);
    },
    [provider, fetchDrivers],
  );

  /* ---- Render ---- */
  if (providerLoading || (listLoading && drivers.length === 0)) {
    return <PageSpinner label="Cargando operadores…" />;
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

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Operadores</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona los conductores de tu proveedor. La información es privada.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-rr-navy-500/20 transition-all hover:shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Agregar operador
        </button>
      </div>

      {listError && <ErrorBanner message={listError} />}

      {/* ---- List ---- */}
      {drivers.length === 0 && !listLoading ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title="Sin operadores"
          description="Agrega tu primer conductor para empezar a asignarlo a servicios."
          action={
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Agregar operador
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.map((d: Driver) => (
            <DriverCard
              key={d.id}
              driver={d}
              onEdit={() => openEdit(d)}
              onDelete={() => void handleDelete(d)}
            />
          ))}
        </div>
      )}

      {/* ---- Modal form ---- */}
      {modalOpen && (
        <DriverModal
          form={form}
          editing={editingId !== null}
          saving={saving}
          error={formError}
          onUpdate={updateField}
          onClose={closeModal}
          onSubmit={() => void handleSave()}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Driver card
 * ------------------------------------------------------------------ */

interface DriverCardProps {
  driver: Driver;
  onEdit: () => void;
  onDelete: () => void;
}

function DriverCard({ driver, onEdit, onDelete }: DriverCardProps): ReactNode {
  const fullName: string = `${driver.first_name} ${driver.last_name}`.trim();
  const initials: string =
    `${driver.first_name.charAt(0)}${driver.last_name.charAt(0)}`.toUpperCase();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-rr-navy-700 to-rr-navy-900 text-sm font-bold text-white">
            {initials}
          </span>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{fullName}</h3>
            <Badge className={DRIVER_STATUS_BADGE[driver.status]}>
              {DRIVER_STATUS_LABELS[driver.status]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Details */}
      <dl className="mt-4 space-y-1.5 text-xs text-slate-600">
        {driver.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            <span>{driver.phone}</span>
          </div>
        )}
        {driver.email && (
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate">{driver.email}</span>
          </div>
        )}
        {driver.licence_number && (
          <div className="flex items-center gap-1.5">
            <IdCard className="h-3.5 w-3.5 text-slate-400" />
            <span className="uppercase">
              Lic. {driver.licence_number}
              {driver.licence_type ? ` (${driver.licence_type.toUpperCase()})` : ''}
            </span>
          </div>
        )}
        {driver.licence_expiry && (
          <div className="pl-5 text-slate-400">
            Vence: {driver.licence_expiry}
          </div>
        )}
      </dl>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Driver modal form
 * ------------------------------------------------------------------ */

interface DriverModalProps {
  form: DriverFormState;
  editing: boolean;
  saving: boolean;
  error: string | null;
  onUpdate: (field: keyof DriverFormState, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

function DriverModal({
  form,
  editing,
  saving,
  error,
  onUpdate,
  onClose,
  onSubmit,
}: DriverModalProps): ReactNode {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {editing ? 'Editar operador' : 'Agregar operador'}
          </h2>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre" required>
              <input
                type="text"
                value={form.first_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate('first_name', e.target.value)
                }
                className={inputClass}
                required
              />
            </Field>
            <Field label="Apellidos" required>
              <input
                type="text"
                value={form.last_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate('last_name', e.target.value)
                }
                className={inputClass}
                required
              />
            </Field>
            <Field label="Teléfono">
              <input
                type="tel"
                value={form.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate('phone', e.target.value)
                }
                className={inputClass}
                placeholder="+52 55 1234 5678"
              />
            </Field>
            <Field label="Correo electrónico">
              <input
                type="email"
                value={form.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate('email', e.target.value)
                }
                className={inputClass}
              />
            </Field>
            <Field label="Número de licencia">
              <input
                type="text"
                value={form.license_number}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate('license_number', e.target.value)
                }
                className={inputClass}
              />
            </Field>
            <Field label="Tipo de licencia">
              <select
                value={form.license_type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdate('license_type', e.target.value)
                }
                className={inputClass}
              >
                <option value="">Selecciona…</option>
                {LICENCE_TYPES.map((lt) => (
                  <option key={lt.value} value={lt.value}>
                    {lt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Vencimiento de licencia">
              <input
                type="date"
                value={form.license_expiration}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate('license_expiration', e.target.value)
                }
                className={inputClass}
              />
            </Field>
            <Field label="Estado">
              <select
                value={form.status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdate('status', e.target.value as DriverStatus)
                }
                className={inputClass}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="on_leave">De licencia</option>
                <option value="terminated">Dado de baja</option>
              </select>
            </Field>
          </div>

          <Field label="Notas" hint="Visible solo para el proveedor.">
            <textarea
              value={form.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                onUpdate('notes', e.target.value)
              }
              className={`${inputClass} min-h-[70px] resize-y`}
              rows={3}
            />
          </Field>

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
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
