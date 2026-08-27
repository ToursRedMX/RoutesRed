/**
 * # ProviderProfile
 *
 * Edit page for an existing transport provider. Renders the same
 * fields as the registration form, plus a provider-type badge and an
 * optional agency-linking section (link to a ToursRed agency when the
 * user has one).
 *
 * Saves via a direct `UPDATE` on `routesred.transport_providers` (the
 * RLS policy `tp_update_members` permits owner/administrator edits).
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  User as UserIcon,
  Building2,
  Save,
  Loader2,
  CheckCircle2,
  Link2,
  ExternalLink,
} from 'lucide-react';

import { useRoute } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { useProvider } from '@/hooks/useProvider';
import {
  Badge,
  ErrorBanner,
  Field,
  PageSpinner,
  inputClass,
} from '@/components/provider/ui';
import type { ProviderType, TransportProvider } from '@/types';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** Editable subset of the provider row. */
interface ProfileFormState {
  first_name: string;
  last_name: string;
  legal_name: string;
  legal_representative: string;
  trade_name: string;
  rfc: string;
  phone: string;
  email: string;
  website: string;
  state: string;
  city: string;
  address: string;
  postal_code: string;
  description: string;
}

/** Map a provider row into the editable form state. */
function providerToForm(p: TransportProvider): ProfileFormState {
  return {
    first_name: p.first_name ?? '',
    last_name: p.last_name ?? '',
    legal_name: p.legal_name ?? '',
    legal_representative: p.legal_representative ?? '',
    trade_name: p.trade_name ?? '',
    rfc: p.rfc ?? '',
    phone: p.phone ?? '',
    email: p.email ?? '',
    website: p.website ?? '',
    state: p.state ?? '',
    city: p.city ?? '',
    address: p.address ?? '',
    postal_code: p.postal_code ?? '',
    description: p.description ?? '',
  };
}

/* ------------------------------------------------------------------ *
 * ProviderProfile
 * ------------------------------------------------------------------ */

export function ProviderProfile(): ReactNode {
  const { navigate } = useRoute();
  const { provider, loading, error, refresh } = useProvider();

  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);

  // Populate the form once the provider loads.
  useEffect(() => {
    if (provider) {
      setForm(providerToForm(provider));
    } else {
      setForm(null);
    }
  }, [provider]);

  const updateField = useCallback(
    (field: keyof ProfileFormState, value: string): void => {
      setForm((prev: ProfileFormState | null) =>
        prev ? { ...prev, [field]: value } : prev,
      );
      setSaved(false);
    },
    [],
  );

  const handleSave = useCallback(async (): Promise<void> => {
    if (!provider || !form) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    const { error: updateError } = await supabase
      .from('transport_providers')
      .update({
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        legal_name: form.legal_name || null,
        legal_representative: form.legal_representative || null,
        trade_name: form.trade_name || null,
        rfc: form.rfc || null,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        state: form.state || null,
        city: form.city || null,
        address: form.address || null,
        postal_code: form.postal_code || null,
        description: form.description || null,
      })
      .eq('id', provider.id);

    setSaving(false);
    if (updateError) {
      setSaveError(updateError.message);
      return;
    }
    setSaved(true);
    void refresh();
  }, [provider, form, refresh]);

  if (loading) {
    return <PageSpinner label="Cargando perfil…" />;
  }

  if (error) {
    return (
      <div className="max-w-2xl">
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (!provider || !form) {
    return (
      <div className="max-w-2xl">
        <ErrorBanner message="No tienes un proveedor registrado." />
        <button
          type="button"
          onClick={() => navigate('/provider/registro')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Registrar proveedor
        </button>
      </div>
    );
  }

  const providerType: ProviderType = provider.provider_type;

  return (
    <div className="space-y-8">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rr-navy-700 to-rr-navy-900 text-white shadow-lg shadow-rr-navy-500/20">
            {providerType === 'company' ? (
              <Building2 className="h-6 w-6" />
            ) : (
              <UserIcon className="h-6 w-6" />
            )}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Mi perfil de proveedor
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge className="bg-rr-navy-100 text-rr-navy-700">
                {providerType === 'company' ? 'Empresa' : 'Persona física'}
              </Badge>
              <span className="text-sm text-slate-400">
                Slug: {provider.slug}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Error ---- */}
      {saveError && (
        <ErrorBanner message={saveError} />
      )}

      {/* ---- Success toast ---- */}
      {saved && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Cambios guardados correctamente.
        </div>
      )}

      {/* ---- Form ---- */}
      <form
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          void handleSave();
        }}
        className="space-y-6"
      >
        {/* Type-specific */}
        {providerType === 'individual' ? (
          <FormSection title="Información personal">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre" required>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateField('first_name', e.target.value)
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
                    updateField('last_name', e.target.value)
                  }
                  className={inputClass}
                  required
                />
              </Field>
            </div>
          </FormSection>
        ) : (
          <FormSection title="Información de la empresa">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Razón social" required>
                <input
                  type="text"
                  value={form.legal_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateField('legal_name', e.target.value)
                  }
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Representante legal">
                <input
                  type="text"
                  value={form.legal_representative}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateField('legal_representative', e.target.value)
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </FormSection>
        )}

        {/* Commercial */}
        <FormSection title="Información comercial">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre comercial">
              <input
                type="text"
                value={form.trade_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('trade_name', e.target.value)
                }
                className={inputClass}
              />
            </Field>
            <Field label="RFC">
              <input
                type="text"
                value={form.rfc}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('rfc', e.target.value.toUpperCase())
                }
                className={inputClass}
              />
            </Field>
          </div>
        </FormSection>

        {/* Contact */}
        <FormSection title="Contacto">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Teléfono">
              <input
                type="tel"
                value={form.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('phone', e.target.value)
                }
                className={inputClass}
              />
            </Field>
            <Field label="Correo electrónico">
              <input
                type="email"
                value={form.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('email', e.target.value)
                }
                className={inputClass}
              />
            </Field>
            {providerType === 'company' && (
              <Field label="Sitio web">
                <input
                  type="url"
                  value={form.website}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateField('website', e.target.value)
                  }
                  className={inputClass}
                />
              </Field>
            )}
          </div>
        </FormSection>

        {/* Location */}
        <FormSection title="Ubicación">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Estado">
              <input
                type="text"
                value={form.state}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('state', e.target.value)
                }
                className={inputClass}
              />
            </Field>
            <Field label="Ciudad">
              <input
                type="text"
                value={form.city}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('city', e.target.value)
                }
                className={inputClass}
              />
            </Field>
            <Field label="Dirección">
              <input
                type="text"
                value={form.address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('address', e.target.value)
                }
                className={inputClass}
              />
            </Field>
            <Field label="Código postal">
              <input
                type="text"
                value={form.postal_code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('postal_code', e.target.value)
                }
                className={inputClass}
              />
            </Field>
          </div>
        </FormSection>

        {/* Description */}
        <FormSection title="Descripción">
          <Field label="Descripción del proveedor">
            <textarea
              value={form.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                updateField('description', e.target.value)
              }
              className={`${inputClass} min-h-[100px] resize-y`}
              rows={4}
            />
          </Field>
        </FormSection>

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-rr-navy-500/20 transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar cambios
              </>
            )}
          </button>
        </div>
      </form>

      {/* ---- Agency linking ---- */}
      <AgencyLinking providerId={provider.id} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Agency linking (optional)
 * ------------------------------------------------------------------ */

interface AgencyLinkingProps {
  providerId: string;
}

/**
 * Shows the current ToursRed agency links for this provider and a
 * placeholder to create a new one. For now this is a read-only preview
 * because the agency-link creation flow is out of scope.
 */
function AgencyLinking({ providerId }: AgencyLinkingProps): ReactNode {
  const [links, setLinks] = useState<Array<{ id: string; agency_user_id: string; status: string }>>([]);
  const [loadingLinks, setLoadingLinks] = useState<boolean>(true);

  useEffect(() => {
    let active: boolean = true;
    void (async () => {
      setLoadingLinks(true);
      const { data, error: linkError } = await supabase
        .from('provider_agency_links')
        .select('id, agency_user_id, status')
        .eq('transport_provider_id', providerId)
        .order('created_at', { ascending: false });

      if (!active) return;
      if (!linkError && data) {
        setLinks(data as Array<{ id: string; agency_user_id: string; status: string }>);
      }
      setLoadingLinks(false);
    })();
    return () => {
      active = false;
    };
  }, [providerId]);

  return (
    <FormSection title="Vínculo con agencias ToursRed">
      <p className="text-sm text-slate-500">
        Conecta tu proveedor con agencias de ToursRed para recibir reservas y
        comisiones.
      </p>

      {loadingLinks ? (
        <p className="text-sm text-slate-400">Cargando vínculos…</p>
      ) : links.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4">
          <Link2 className="h-5 w-5 text-slate-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600">
              Sin vínculos de agencia
            </p>
            <p className="text-xs text-slate-400">
              Cuando una agencia te invite o tú invites una, aparecerá aquí.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-400"
            title="Próximamente"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Invitar agencia
            <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] uppercase tracking-wide">
              Pronto
            </span>
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {links.map((link) => (
            <li key={link.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Link2 className="h-4 w-4 text-rr-red-500" />
                <span className="text-sm font-medium text-slate-700">
                  Agencia {link.agency_user_id.slice(0, 8)}…
                </span>
              </div>
              <Badge
                className={
                  link.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }
              >
                {link.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </FormSection>
  );
}

/* ------------------------------------------------------------------ *
 * Form section
 * ------------------------------------------------------------------ */

interface FormSectionProps {
  title: string;
  children: ReactNode;
}

function FormSection({ title, children }: FormSectionProps): ReactNode {
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <legend className="px-2 text-sm font-semibold text-slate-900">{title}</legend>
      <div className="mt-2 space-y-4">{children}</div>
    </fieldset>
  );
}
