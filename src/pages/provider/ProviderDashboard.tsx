/**
 * # ProviderDashboard
 *
 * Home page of the provider dashboard. Shows a summary of the
 * provider's account status, verification status, pending documents,
 * vehicle count, driver count, and quick-action cards linking to the
 * main management pages.
 *
 * If the user has no provider yet, redirects to `/provider/registro`.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  Car,
  Users,
  ArrowRight,
  UserCircle,
  ClipboardList,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useRoute } from '@/lib/router';
import { useProvider } from '@/hooks/useProvider';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Badge,
  ErrorBanner,
  PageSpinner,
  PROVIDER_STATUS_BADGE,
  PROVIDER_STATUS_LABELS,
  VERIFICATION_STATUS_BADGE,
  VERIFICATION_STATUS_LABELS,
} from '@/components/provider/ui';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** Counts fetched for the dashboard summary. */
interface DashboardCounts {
  vehicles: number;
  drivers: number;
  pendingDocuments: number;
}

/* ------------------------------------------------------------------ *
 * ProviderDashboard
 * ------------------------------------------------------------------ */

export function ProviderDashboard(): ReactNode {
  const { navigate } = useRoute();
  const { user } = useAuth();
  const { provider, loading, error } = useProvider();
  const [counts, setCounts] = useState<DashboardCounts>({
    vehicles: 0,
    drivers: 0,
    pendingDocuments: 0,
  });
  const [countsLoading, setCountsLoading] = useState<boolean>(true);

  // Redirect to registration when there is no provider.
  useEffect(() => {
    if (!loading && !provider) {
      navigate('/provider/registro', { replace: true });
    }
  }, [loading, provider, navigate]);

  // Fetch vehicle / driver / document counts once we have a provider.
  const fetchCounts = useCallback(
    async (providerId: string): Promise<void> => {
      setCountsLoading(true);
      const [vehiclesRes, driversRes, docsRes] = await Promise.all([
        supabase
          .from('vehicles')
          .select('id', { count: 'exact', head: true })
          .eq('transport_provider_id', providerId),
        supabase
          .from('drivers')
          .select('id', { count: 'exact', head: true })
          .eq('transport_provider_id', providerId),
        supabase
          .from('provider_documents')
          .select('id', { count: 'exact', head: true })
          .eq('transport_provider_id', providerId)
          .eq('verification_status', 'pending'),
      ]);

      setCounts({
        vehicles: vehiclesRes.count ?? 0,
        drivers: driversRes.count ?? 0,
        pendingDocuments: docsRes.count ?? 0,
      });
      setCountsLoading(false);
    },
    [],
  );

  useEffect(() => {
    if (provider) {
      void fetchCounts(provider.id);
    } else {
      setCounts({ vehicles: 0, drivers: 0, pendingDocuments: 0 });
      setCountsLoading(false);
    }
  }, [provider, fetchCounts]);

  if (loading) {
    return <PageSpinner label="Cargando tu panel…" />;
  }

  if (error) {
    return (
      <div className="max-w-2xl">
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (!provider) {
    // The redirect effect handles this; render nothing meaningful here.
    return null;
  }

  return (
    <div className="space-y-8">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-rr-navy-900">
          Hola{provider.first_name ? `, ${provider.first_name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Este es el resumen de tu cuenta de proveedor en RoutesRed.
        </p>
      </div>

      {/* ---- Status banner ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatusCard
          icon={provider.status === 'active' ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
          label="Estado de la cuenta"
          value={
            <Badge className={PROVIDER_STATUS_BADGE[provider.status]}>
              {PROVIDER_STATUS_LABELS[provider.status]}
            </Badge>
          }
        />
        <StatusCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Verificación"
          value={
            <Badge className={VERIFICATION_STATUS_BADGE[provider.verification_status]}>
              {VERIFICATION_STATUS_LABELS[provider.verification_status]}
            </Badge>
          }
        />
      </div>

      {/* ---- Counts ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CountCard
          icon={<FileText className="h-5 w-5" />}
          label="Documentos pendientes"
          value={countsLoading ? '…' : String(counts.pendingDocuments)}
          to="/provider/documentos"
          accent="amber"
        />
        <CountCard
          icon={<Car className="h-5 w-5" />}
          label="Vehículos"
          value={countsLoading ? '…' : String(counts.vehicles)}
          to="/provider/vehiculos"
          accent="teal"
        />
        <CountCard
          icon={<Users className="h-5 w-5" />}
          label="Operadores"
          value={countsLoading ? '…' : String(counts.drivers)}
          to="/provider/operadores"
          accent="sky"
        />
      </div>

      {/* ---- Quick actions ---- */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-rr-navy-900">Acciones rápidas</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            icon={UserCircle}
            title="Editar perfil"
            description="Actualiza la información de tu proveedor."
            to="/provider/perfil"
          />
          <QuickAction
            icon={Car}
            title="Agregar vehículo"
            description="Registra un nuevo vehículo en tu flotilla."
            to="/provider/vehiculos"
          />
          <QuickAction
            icon={Users}
            title="Agregar operador"
            description="Registra un nuevo conductor."
            to="/provider/operadores"
          />
          <QuickAction
            icon={FileText}
            title="Subir documentos"
            description="Completa tu verificación con los documentos requeridos."
            to="/provider/documentos"
          />
          <QuickAction
            icon={ClipboardList}
            title="Solicitudes"
            description="Gestiona las solicitudes de servicio entrantes."
            to="/provider/solicitudes"
            disabled
          />
          <QuickAction
            icon={Wallet}
            title="Finanzas"
            description="Consulta tus ingresos y reportes."
            to="/provider/finanzas"
            disabled
          />
        </div>
      </div>

      {/* ---- Onboarding hint for draft providers ---- */}
      {provider.status === 'draft' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900">
                Completa tu registro para activar tu cuenta
              </h3>
              <p className="mt-1 text-sm text-amber-700">
                Tu cuenta está en estado borrador. Completa tu perfil y sube los
                documentos requeridos para solicitar la activación.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/provider/perfil')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
                >
                  Completar perfil
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/provider/documentos')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50"
                >
                  Subir documentos
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Signed-in user footer ---- */}
      <p className="text-xs text-slate-400">
        Sesión: {user?.email ?? '—'}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Status card
 * ------------------------------------------------------------------ */

interface StatusCardProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}

function StatusCard({ icon, label, value }: StatusCardProps): ReactNode {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rr-navy-50 text-rr-navy-500">
        {icon}
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
        <div className="mt-1">{value}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Count card
 * ------------------------------------------------------------------ */

interface CountCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  to: string;
  accent: 'amber' | 'teal' | 'sky';
}

const COUNT_CARD_ACCENT: Record<CountCardProps['accent'], string> = {
  amber: 'bg-amber-50 text-amber-600',
  teal: 'bg-rr-navy-50 text-rr-navy-600',
  sky: 'bg-rr-navy-100 text-rr-navy-600',
};

function CountCard({ icon, label, value, to, accent }: CountCardProps): ReactNode {
  const { navigate } = useRoute();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-rr-navy-200 hover:card-shadow-hover"
    >
      <div className="flex items-center gap-4">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${COUNT_CARD_ACCENT[accent]}`}
        >
          {icon}
        </span>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs font-medium text-slate-500">{label}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-rr-red-500" />
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Quick action
 * ------------------------------------------------------------------ */

interface QuickActionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  disabled?: boolean;
}

function QuickAction({ icon: Icon, title, description, to, disabled }: QuickActionProps): ReactNode {
  const { navigate } = useRoute();

  if (disabled) {
    return (
      <div className="flex flex-col rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 opacity-70">
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-300 shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="text-sm font-semibold text-slate-500">{title}</h3>
        <p className="mt-1 text-xs text-slate-400">{description}</p>
        <span className="mt-3 inline-flex w-fit rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Próximamente
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-rr-navy-200 hover:card-shadow-hover"
    >
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rr-navy-700 to-rr-navy-900 text-white shadow-sm transition-transform group-hover:scale-110">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-sm font-semibold text-rr-navy-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-rr-red-600 transition-colors group-hover:text-rr-red-700">
        Ir
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
