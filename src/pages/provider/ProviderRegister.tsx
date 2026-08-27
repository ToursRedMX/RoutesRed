/**
 * # ProviderRegister
 *
 * Registration flow for a new transport provider.
 *
 * Reads `provider_type` (`individual` | `company`) from the URL query
 * string. If absent, step 1 shows a type-selection screen. Step 2
 * renders the details form — different fields for individual vs
 * company providers — and calls the `routesred.create_provider` RPC on
 * submit. On success it redirects to `/provider` (the dashboard).
 *
 * Progress can be saved as a draft: the "Guardar y salir" button
 * creates the provider with the current form values (status stays
 * `draft`), same as the primary submit; the difference is purely UX.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  User as UserIcon,
  Building2,
  Loader2,
  Save,
  Bus,
} from 'lucide-react';

import { Link, useRoute } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProvider } from '@/hooks/useProvider';
import { ErrorBanner, Field, inputClass } from '@/components/provider/ui';
import type { ProviderType } from '@/types';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** Shared form fields across both provider types. */
interface ProviderFormState {
  provider_type: ProviderType;
  // Individual
  first_name: string;
  last_name: string;
  // Company
  legal_name: string;
  legal_representative: string;
  // Shared
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

/** Initial empty form for an individual provider. */
const INDIVIDUAL_INITIAL: ProviderFormState = {
  provider_type: 'individual',
  first_name: '',
  last_name: '',
  legal_name: '',
  legal_representative: '',
  trade_name: '',
  rfc: '',
  phone: '',
  email: '',
  website: '',
  state: '',
  city: '',
  address: '',
  postal_code: '',
  description: '',
};

/** Initial empty form for a company provider. */
const COMPANY_INITIAL: ProviderFormState = {
  provider_type: 'company',
  first_name: '',
  last_name: '',
  legal_name: '',
  legal_representative: '',
  trade_name: '',
  rfc: '',
  phone: '',
  email: '',
  website: '',
  state: '',
  city: '',
  address: '',
  postal_code: '',
  description: '',
};

/* ------------------------------------------------------------------ *
 * ProviderRegister
 * ------------------------------------------------------------------ */

export function ProviderRegister(): ReactNode {
  const { query, navigate } = useRoute();
  const { user } = useAuth();
  const { provider, loading: providerLoading } = useProvider();

  // Determine the provider type from the query string.
  const queryType: string | undefined = query.provider_type;
  const initialType: ProviderType | null = useMemo(() => {
    if (queryType === 'individual') return 'individual';
    if (queryType === 'company') return 'company';
    return null;
  }, [queryType]);

  const [form, setForm] = useState<ProviderFormState>(
    initialType === 'company' ? COMPANY_INITIAL : INDIVIDUAL_INITIAL,
  );

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // If the user already owns a provider, redirect to the dashboard.
  useEffect(() => {
    if (!providerLoading && provider) {
      navigate('/provider', { replace: true });
    }
  }, [providerLoading, provider, navigate]);

  // Pre-fill email from the auth user.
  useEffect(() => {
    if (user?.email && !form.email) {
      setForm((prev: ProviderFormState) => ({ ...prev, email: user.email ?? '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ---- Field update helper ---- */
  const updateField = useCallback(
    (field: keyof ProviderFormState, value: string): void => {
      setForm((prev: ProviderFormState) => ({ ...prev, [field]: value }));
    },
    [],
  );

  /* ---- Submit ---- */
  const handleSubmit = useCallback(
    async (mode: 'save' | 'submit'): Promise<void> => {
      setError(null);
      setSubmitting(true);
      try {
        const { error: rpcError } = await supabase.rpc('create_provider', {
          p_provider_type: form.provider_type,
          p_first_name: form.first_name || null,
          p_last_name: form.last_name || null,
          p_legal_name: form.legal_name || null,
          p_trade_name: form.trade_name || null,
          p_legal_representative: form.legal_representative || null,
          p_rfc: form.rfc || null,
          p_description: form.description || null,
          p_phone: form.phone || null,
          p_email: form.email || null,
          p_website: form.website || null,
          p_state: form.state || null,
          p_city: form.city || null,
          p_address: form.address || null,
          p_postal_code: form.postal_code || null,
          p_country_code: 'MX',
        });

        if (rpcError) {
          setError(rpcError.message);
          setSubmitting(false);
          return;
        }

        // Redirect to the dashboard on success.
        navigate('/provider', { replace: true });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error inesperado. Inténtalo de nuevo.',
        );
        setSubmitting(false);
      }
    },
    [form, navigate],
  );

  /* ---- Step 1: type selection ---- */
  if (!initialType) {
    return (
      <TypeSelection
        onSelect={(t: ProviderType) => {
          navigate(`/provider/registro?provider_type=${encodeURIComponent(t)}`, {
            replace: true,
          });
          setForm(t === 'company' ? COMPANY_INITIAL : INDIVIDUAL_INITIAL);
        }}
      />
    );
  }

  /* ---- Step 2: details form ---- */
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-16">
      {/* Back link */}
      <Link
        to="/provider/registro"
        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
          // Clear the query param to go back to type selection.
          e.preventDefault();
          navigate('/provider/registro', { replace: true });
        }}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-rr-navy-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Cambiar tipo de proveedor
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rr-navy-700 to-rr-navy-900 text-white shadow-lg shadow-rr-navy-500/20">
          {initialType === 'company' ? <Building2 className="h-6 w-6" /> : <UserIcon className="h-6 w-6" />}
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {initialType === 'company' ? 'Registrar empresa' : 'Registrar proveedor individual'}
          </h1>
          <p className="text-sm text-slate-500">
            Completa la información de tu proveedor. Podrás editarla más adelante.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} />
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          void handleSubmit('submit');
        }}
        className="space-y-6"
      >
        {/* Type-specific section */}
        {initialType === 'individual' ? (
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
                  placeholder="Juan"
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
                  placeholder="Pérez"
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
                  placeholder="Transportes Ejemplo S.A. de C.V."
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
                  placeholder="Nombre del representante legal"
                />
              </Field>
            </div>
          </FormSection>
        )}

        {/* Commercial info */}
        <FormSection title="Información comercial">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre comercial" hint="Cómo aparece tu marca públicamente.">
              <input
                type="text"
                value={form.trade_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('trade_name', e.target.value)
                }
                className={inputClass}
                placeholder="Transportes Ejemplo"
              />
            </Field>
            <Field label="RFC" required>
              <input
                type="text"
                value={form.rfc}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('rfc', e.target.value.toUpperCase())
                }
                className={inputClass}
                placeholder="EPE120101AB1"
                required
              />
            </Field>
          </div>
        </FormSection>

        {/* Contact info */}
        <FormSection title="Contacto">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Teléfono" required>
              <input
                type="tel"
                value={form.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('phone', e.target.value)
                }
                className={inputClass}
                placeholder="+52 55 1234 5678"
                required
              />
            </Field>
            <Field label="Correo electrónico" required>
              <input
                type="email"
                value={form.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('email', e.target.value)
                }
                className={inputClass}
                placeholder="contacto@ejemplo.com"
                required
              />
            </Field>
            {initialType === 'company' && (
              <Field label="Sitio web">
                <input
                  type="url"
                  value={form.website}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateField('website', e.target.value)
                  }
                  className={inputClass}
                  placeholder="https://ejemplo.com"
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
                placeholder="Ciudad de México"
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
                placeholder="CDMX"
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
                placeholder="Av. Reforma 123"
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
                placeholder="06600"
              />
            </Field>
          </div>
        </FormSection>

        {/* Description */}
        <FormSection title="Descripción">
          <Field label="Descripción del proveedor" hint="Cuéntales a los clientes sobre tus servicios.">
            <textarea
              value={form.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                updateField('description', e.target.value)
              }
              className={`${inputClass} min-h-[100px] resize-y`}
              placeholder="Servicios de transporte privado, traslados aeropuerto, rutas interurbanas…"
              rows={4}
            />
          </Field>
        </FormSection>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => void handleSubmit('save')}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Guardar borrador
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-rr-navy-500/20 transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                Crear proveedor
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Type selection (step 1)
 * ------------------------------------------------------------------ */

interface TypeSelectionProps {
  onSelect: (type: ProviderType) => void;
}

/** Step 1: choose individual vs company. */
function TypeSelection({ onSelect }: TypeSelectionProps): ReactNode {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-rr-navy-200 bg-rr-navy-50 px-4 py-1.5 text-sm font-medium text-rr-navy-700">
          <Bus className="h-4 w-4" />
          Registrar proveedor
        </span>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          ¿Cómo ofrecerás tus servicios?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
          Elige la opción que mejor describa cómo operas. Podrás actualizar esta
          información más adelante.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Individual */}
        <button
          type="button"
          onClick={() => onSelect('individual')}
          className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-rr-navy-200 hover:shadow-xl hover:shadow-rr-navy-500/10"
        >
          <span className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rr-navy-700 to-rr-navy-900 text-white shadow-lg transition-transform group-hover:scale-110">
            <UserIcon className="h-7 w-7" />
          </span>
          <h2 className="text-xl font-bold text-slate-900">Como persona física</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Operas como individuo independiente, sin una empresa constituida. Ideal
            para conductores y pequeños operadores.
          </p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-rr-navy-700 transition-colors group-hover:text-rr-navy-900">
            Continuar
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </button>

        {/* Company */}
        <button
          type="button"
          onClick={() => onSelect('company')}
          className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-rr-navy-200 hover:shadow-xl hover:shadow-rr-navy-500/10"
        >
          <span className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rr-navy-600 to-rr-navy-800 text-white shadow-lg transition-transform group-hover:scale-110">
            <Building2 className="h-7 w-7" />
          </span>
          <h2 className="text-xl font-bold text-slate-900">Como empresa</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Operas como persona moral con RFC y razón social. Ideal para
            transportadoras constituidas y flotillas.
          </p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-rr-navy-700 transition-colors group-hover:text-rr-navy-900">
            Continuar
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Form section
 * ------------------------------------------------------------------ */

interface FormSectionProps {
  title: string;
  children: ReactNode;
}

/** A titled grouping of form fields inside a card. */
function FormSection({ title, children }: FormSectionProps): ReactNode {
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <legend className="px-2 text-sm font-semibold text-slate-900">{title}</legend>
      <div className="mt-2 space-y-4">{children}</div>
    </fieldset>
  );
}
