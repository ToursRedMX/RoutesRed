/**
 * # VehiclesPage
 *
 * Vehicle management for a transport provider.
 *
 * - Lists vehicles as cards (image, name, type, capacity, status).
 * - "Add vehicle" opens an inline modal form.
 * - Edit an existing vehicle via the same form.
 * - Soft delete sets `status = 'retired'` and `active = false`.
 * - Vehicle form fields: internal_name (stored as `internal_code`),
 *   vehicle_type_id, brand (`make`), model, year, license_plate
 *   (`plate`), capacity, luggage_capacity, description.
 * - Amenities selector (checkboxes from the amenities catalog).
 *
 * Field-name mapping: the UI uses friendly names (brand, license_plate,
 * internal_name) while the database columns use `make`, `plate`, and
 * `internal_code` respectively. The mapping happens in
 * {@link formToRow} / {@link rowToForm}.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Car,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Users as UsersIcon,
  Briefcase,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useProvider } from '@/hooks/useProvider';
import {
  Badge,
  EmptyState,
  ErrorBanner,
  Field,
  PageSpinner,
  VEHICLE_STATUS_BADGE,
  VEHICLE_STATUS_LABELS,
  inputClass,
} from '@/components/provider/ui';
import type {
  Amenity,
  Vehicle,
  VehicleStatus,
  VehicleType,
} from '@/types';

/* ------------------------------------------------------------------ *
 * Form state
 * ------------------------------------------------------------------ */

/** Editable vehicle fields (friendly UI names). */
interface VehicleFormState {
  internal_name: string;
  vehicle_type_id: string;
  brand: string;
  model: string;
  year: string;
  license_plate: string;
  capacity: string;
  luggage_capacity: string;
  description: string;
  status: VehicleStatus;
  amenityIds: string[];
}

const EMPTY_FORM: VehicleFormState = {
  internal_name: '',
  vehicle_type_id: '',
  brand: '',
  model: '',
  year: '',
  license_plate: '',
  capacity: '',
  luggage_capacity: '',
  description: '',
  status: 'draft',
  amenityIds: [],
};

/** Convert a DB vehicle row + amenities into form state. */
function rowToForm(
  v: Vehicle,
  amenityIds: string[],
): VehicleFormState {
  return {
    internal_name: v.internal_code ?? '',
    vehicle_type_id: v.vehicle_type_id,
    brand: v.make ?? '',
    model: v.model ?? '',
    year: v.year !== null ? String(v.year) : '',
    license_plate: v.plate ?? '',
    capacity: v.capacity !== null ? String(v.capacity) : '',
    luggage_capacity: v.luggage_capacity !== null ? String(v.luggage_capacity) : '',
    description: v.description ?? '',
    status: v.status,
    amenityIds,
  };
}

/** Convert form state into a DB row payload. */
function formToRow(
  form: VehicleFormState,
  providerId: string,
): Record<string, unknown> {
  return {
    transport_provider_id: providerId,
    vehicle_type_id: form.vehicle_type_id || null,
    internal_code: form.internal_name || null,
    make: form.brand || null,
    model: form.model || null,
    year: form.year ? Number(form.year) : null,
    plate: form.license_plate || null,
    capacity: form.capacity ? Number(form.capacity) : null,
    luggage_capacity: form.luggage_capacity ? Number(form.luggage_capacity) : null,
    description: form.description || null,
    status: form.status,
    active: form.status === 'active',
  };
}

/* ------------------------------------------------------------------ *
 * VehiclesPage
 * ------------------------------------------------------------------ */

export function VehiclesPage(): ReactNode {
  const { provider, loading: providerLoading, error: providerError } = useProvider();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);

  // Per-vehicle amenity map (vehicleId -> amenity ids).
  const [vehicleAmenities, setVehicleAmenities] = useState<Record<string, string[]>>({});

  // Modal state.
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* ---- Fetch catalogs (vehicle types + amenities) once ---- */
  useEffect(() => {
    let active: boolean = true;
    void (async () => {
      const [typesRes, amenitiesRes] = await Promise.all([
        supabase
          .from('vehicle_types')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('amenities')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true }),
      ]);

      if (!active) return;
      if (typesRes.data) setVehicleTypes(typesRes.data as VehicleType[]);
      if (amenitiesRes.data) setAmenities(amenitiesRes.data as Amenity[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  /* ---- Fetch vehicles ---- */
  const fetchVehicles = useCallback(
    async (providerId: string): Promise<void> => {
      setVehiclesLoading(true);
      setListError(null);

      const { data, error: queryError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('transport_provider_id', providerId)
        .order('created_at', { ascending: false });

      if (queryError) {
        setListError(queryError.message);
        setVehicles([]);
        setVehiclesLoading(false);
        return;
      }

      const rows: Vehicle[] = (data as Vehicle[]) ?? [];

      // Fetch amenities for each vehicle in a single query through the
      // join table.
      if (rows.length > 0) {
        const { data: joinData, error: joinError } = await supabase
          .from('vehicle_amenities')
          .select('vehicle_id, amenity_id')
          .in(
            'vehicle_id',
            rows.map((r: Vehicle) => r.id),
          );

        if (!joinError && joinData) {
          const map: Record<string, string[]> = {};
          for (const row of joinData as Array<{ vehicle_id: string; amenity_id: string }>) {
            if (!map[row.vehicle_id]) map[row.vehicle_id] = [];
            map[row.vehicle_id].push(row.amenity_id);
          }
          setVehicleAmenities(map);
        }
      } else {
        setVehicleAmenities({});
      }

      setVehicles(rows);
      setVehiclesLoading(false);
    },
    [],
  );

  useEffect(() => {
    if (provider) {
      void fetchVehicles(provider.id);
    } else if (!providerLoading) {
      setVehicles([]);
      setVehiclesLoading(false);
    }
  }, [provider, providerLoading, fetchVehicles]);

  /* ---- Modal helpers ---- */
  const openAdd = useCallback((): void => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback(
    (v: Vehicle): void => {
      setEditingId(v.id);
      setForm(rowToForm(v, vehicleAmenities[v.id] ?? []));
      setFormError(null);
      setModalOpen(true);
    },
    [vehicleAmenities],
  );

  const closeModal = useCallback((): void => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }, []);

  const updateField = useCallback(
    (field: keyof VehicleFormState, value: string): void => {
      setForm((prev: VehicleFormState) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const toggleAmenity = useCallback((amenityId: string): void => {
    setForm((prev: VehicleFormState) => {
      const has: boolean = prev.amenityIds.includes(amenityId);
      return {
        ...prev,
        amenityIds: has
          ? prev.amenityIds.filter((id: string) => id !== amenityId)
          : [...prev.amenityIds, amenityId],
      };
    });
  }, []);

  /* ---- Save (insert or update) ---- */
  const handleSave = useCallback(async (): Promise<void> => {
    if (!provider) return;
    setSaving(true);
    setFormError(null);

    const row: Record<string, unknown> = formToRow(form, provider.id);

    if (editingId) {
      // Update.
      const { error: updateError } = await supabase
        .from('vehicles')
        .update(row)
        .eq('id', editingId);

      if (updateError) {
        setFormError(updateError.message);
        setSaving(false);
        return;
      }

      // Sync amenities: delete existing, insert new.
      const { error: delError } = await supabase
        .from('vehicle_amenities')
        .delete()
        .eq('vehicle_id', editingId);

      if (delError) {
        setFormError(delError.message);
        setSaving(false);
        return;
      }

      if (form.amenityIds.length > 0) {
        const inserts: Array<{ vehicle_id: string; amenity_id: string }> =
          form.amenityIds.map((id: string) => ({
            vehicle_id: editingId,
            amenity_id: id,
          }));
        const { error: insError } = await supabase
          .from('vehicle_amenities')
          .insert(inserts);
        if (insError) {
          setFormError(insError.message);
          setSaving(false);
          return;
        }
      }
    } else {
      // Insert.
      const { data: inserted, error: insertError } = await supabase
        .from('vehicles')
        .insert(row)
        .select()
        .single();

      if (insertError || !inserted) {
        setFormError(insertError?.message ?? 'No se pudo crear el vehículo.');
        setSaving(false);
        return;
      }

      const newVehicle: Vehicle = inserted as Vehicle;

      if (form.amenityIds.length > 0) {
        const inserts: Array<{ vehicle_id: string; amenity_id: string }> =
          form.amenityIds.map((id: string) => ({
            vehicle_id: newVehicle.id,
            amenity_id: id,
          }));
        const { error: insError } = await supabase
          .from('vehicle_amenities')
          .insert(inserts);
        if (insError) {
          setFormError(insError.message);
          setSaving(false);
          return;
        }
      }
    }

    setSaving(false);
    closeModal();
    void fetchVehicles(provider.id);
  }, [provider, form, editingId, closeModal, fetchVehicles]);

  /* ---- Soft delete ---- */
  const handleDelete = useCallback(
    async (v: Vehicle): Promise<void> => {
      if (!provider) return;
      const { error: deleteError } = await supabase
        .from('vehicles')
        .update({ status: 'retired', active: false })
        .eq('id', v.id);

      if (deleteError) {
        setListError(deleteError.message);
        return;
      }
      void fetchVehicles(provider.id);
    },
    [provider, fetchVehicles],
  );

  /* ---- Render ---- */
  if (providerLoading || (vehiclesLoading && vehicles.length === 0)) {
    return <PageSpinner label="Cargando vehículos…" />;
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

  const typeMap: Record<string, VehicleType> = useMemo(
    () => Object.fromEntries(vehicleTypes.map((t: VehicleType) => [t.id, t])),
    [vehicleTypes],
  );

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vehículos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona la flotilla de tu proveedor.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-rr-navy-500/20 transition-all hover:shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Agregar vehículo
        </button>
      </div>

      {listError && <ErrorBanner message={listError} />}

      {/* ---- List ---- */}
      {vehicles.length === 0 && !vehiclesLoading ? (
        <EmptyState
          icon={<Car className="h-7 w-7" />}
          title="Sin vehículos"
          description="Agrega tu primer vehículo para empezar a recibir solicitudes."
          action={
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Agregar vehículo
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v: Vehicle) => {
            const type: VehicleType | undefined = typeMap[v.vehicle_type_id];
            return (
              <VehicleCard
                key={v.id}
                vehicle={v}
                typeName={type?.name ?? '—'}
                amenityNames={(vehicleAmenities[v.id] ?? [])
                  .map((id: string) => amenities.find((a: Amenity) => a.id === id)?.name)
                  .filter((n: string | undefined): n is string => Boolean(n))}
                onEdit={() => openEdit(v)}
                onDelete={() => void handleDelete(v)}
              />
            );
          })}
        </div>
      )}

      {/* ---- Modal form ---- */}
      {modalOpen && (
        <VehicleModal
          form={form}
          vehicleTypes={vehicleTypes}
          amenities={amenities}
          editing={editingId !== null}
          saving={saving}
          error={formError}
          onUpdate={updateField}
          onToggleAmenity={toggleAmenity}
          onClose={closeModal}
          onSubmit={() => void handleSave()}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Vehicle card
 * ------------------------------------------------------------------ */

interface VehicleCardProps {
  vehicle: Vehicle;
  typeName: string;
  amenityNames: string[];
  onEdit: () => void;
  onDelete: () => void;
}

function VehicleCard({
  vehicle,
  typeName,
  amenityNames,
  onEdit,
  onDelete,
}: VehicleCardProps): ReactNode {
  const title: string =
    [vehicle.make, vehicle.model].filter(Boolean).join(' ') ||
    vehicle.internal_code ||
    'Vehículo sin nombre';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      {/* Image */}
      <div className="relative h-36 bg-gradient-to-br from-slate-100 to-slate-200">
        {vehicle.primary_image_url ? (
          <img
            src={vehicle.primary_image_url}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <Car className="h-10 w-10" />
          </div>
        )}
        <span className="absolute right-3 top-3">
          <Badge className={VEHICLE_STATUS_BADGE[vehicle.status]}>
            {VEHICLE_STATUS_LABELS[vehicle.status]}
          </Badge>
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-400">{typeName}</p>

        {/* Specs */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
          {vehicle.capacity !== null && (
            <span className="inline-flex items-center gap-1">
              <UsersIcon className="h-3.5 w-3.5 text-slate-400" />
              {vehicle.capacity} pax
            </span>
          )}
          {vehicle.luggage_capacity !== null && (
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5 text-slate-400" />
              {vehicle.luggage_capacity} eq
            </span>
          )}
          {vehicle.plate && (
            <span className="inline-flex items-center gap-1">
              <span className="font-mono uppercase">{vehicle.plate}</span>
            </span>
          )}
        </div>

        {/* Amenities */}
        {amenityNames.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {amenityNames.slice(0, 4).map((name: string) => (
              <span
                key={name}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
              >
                {name}
              </span>
            ))}
            {amenityNames.length > 4 && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                +{amenityNames.length - 4}
              </span>
            )}
          </div>
        )}

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
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Vehicle modal form
 * ------------------------------------------------------------------ */

interface VehicleModalProps {
  form: VehicleFormState;
  vehicleTypes: VehicleType[];
  amenities: Amenity[];
  editing: boolean;
  saving: boolean;
  error: string | null;
  onUpdate: (field: keyof VehicleFormState, value: string) => void;
  onToggleAmenity: (amenityId: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

function VehicleModal({
  form,
  vehicleTypes,
  amenities,
  editing,
  saving,
  error,
  onUpdate,
  onToggleAmenity,
  onClose,
  onSubmit,
}: VehicleModalProps): ReactNode {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {editing ? 'Editar vehículo' : 'Agregar vehículo'}
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
            <Field label="Nombre interno" hint="Identificador para tu flotilla (ej. UNIDAD-012).">
              <input
                type="text"
                value={form.internal_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate('internal_name', e.target.value)
                }
                className={inputClass}
                placeholder="UNIDAD-012"
              />
            </Field>
            <Field label="Tipo de vehículo" required>
              <select
                value={form.vehicle_type_id}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onUpdate('vehicle_type_id', e.target.value)
                }
                className={inputClass}
                required
              >
                <option value="">Selecciona…</option>
                {vehicleTypes.map((t: VehicleType) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Marca">
              <input
                type="text"
                value={form.brand}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate('brand', e.target.value)
                }
                className={inputClass}
                placeholder="Mercedes-Benz"
              />
            </Field>
            <Field label="Modelo">
              <input
                type="text"
                value={form.model}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate('model', e.target.value)
                }
                className={inputClass}
                placeholder="Sprinter 515CDI"
              />
            </Field>
            <Field label="Año">
              <input
                type="number"
                value={form.year}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate('year', e.target.value)
                }
                className={inputClass}
                placeholder="2024"
                min="1900"
                max="2100"
              />
            </Field>
            <Field label="Placas">
              <input
                type="text"
                value={form.license_plate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate('license_plate', e.target.value.toUpperCase())
                }
                className={inputClass}
                placeholder="ABC-123"
              />
            </Field>
            <Field label="Capacidad (pasajeros)">
              <input
                type="number"
                value={form.capacity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate('capacity', e.target.value)
                }
                className={inputClass}
                placeholder="16"
                min="1"
              />
            </Field>
            <Field label="Capacidad de equipaje">
              <input
                type="number"
                value={form.luggage_capacity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onUpdate('luggage_capacity', e.target.value)
                }
                className={inputClass}
                placeholder="8"
                min="0"
              />
            </Field>
          </div>

          <Field label="Estado">
            <select
              value={form.status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                onUpdate('status', e.target.value as VehicleStatus)
              }
              className={inputClass}
            >
              <option value="draft">Borrador</option>
              <option value="active">Activo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="retired">Retirado</option>
            </select>
          </Field>

          <Field label="Descripción">
            <textarea
              value={form.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                onUpdate('description', e.target.value)
              }
              className={`${inputClass} min-h-[80px] resize-y`}
              rows={3}
            />
          </Field>

          {/* Amenities */}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Amenidades</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {amenities.map((a: Amenity) => {
                const checked: boolean = form.amenityIds.includes(a.id);
                return (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      checked
                        ? 'border-rr-navy-300 bg-rr-navy-50 text-rr-navy-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleAmenity(a.id)}
                      className="h-4 w-4 rounded border-slate-300 text-rr-navy-700 focus:ring-rr-navy-500"
                    />
                    {a.name}
                  </label>
                );
              })}
            </div>
          </div>

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
