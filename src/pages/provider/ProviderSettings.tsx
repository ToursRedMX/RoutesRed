/**
 * # ProviderSettings
 *
 * Basic settings page for a transport provider. Currently shows
 * account-level information (provider type, slug, status, member role)
 * and a placeholder for future settings sections (notifications,
 * team members, danger zone).
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  User as UserIcon,
  Bell,
  Users,
  ShieldAlert,
  LogOut,
} from 'lucide-react';

import { useRoute } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProvider } from '@/hooks/useProvider';
import {
  Badge,
  ErrorBanner,
  PageSpinner,
  PROVIDER_STATUS_BADGE,
  PROVIDER_STATUS_LABELS,
} from '@/components/provider/ui';
import type { ProviderMemberRole } from '@/types';

/* ------------------------------------------------------------------ *
 * ProviderSettings
 * ------------------------------------------------------------------ */

export function ProviderSettings(): ReactNode {
  const { user, signOut } = useAuth();
  const { navigate } = useRoute();
  const { provider, loading, error } = useProvider();

  const [memberRole, setMemberRole] = useState<ProviderMemberRole | null>(null);

  // Fetch the current user's membership role for this provider.
  useEffect(() => {
    let active: boolean = true;
    void (async () => {
      if (!user || !provider) {
        setMemberRole(null);
        return;
      }
      const { data, error: memberError } = await supabase
        .from('transport_provider_users')
        .select('role')
        .eq('transport_provider_id', provider.id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!active) return;
      if (!memberError && data) {
        setMemberRole((data as { role: ProviderMemberRole }).role);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, provider]);

  const handleSignOut = useCallback(async (): Promise<void> => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  if (loading) {
    return <PageSpinner label="Cargando configuración…" />;
  }

  if (error) {
    return (
      <div className="max-w-2xl">
        <ErrorBanner message={error} />
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
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rr-navy-700 to-rr-navy-900 text-white shadow-lg shadow-rr-navy-500/20">
          <SettingsIcon className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configuración</h1>
          <p className="text-sm text-slate-500">
            Ajustes de tu cuenta de proveedor.
          </p>
        </div>
      </div>

      {/* ---- Account info ---- */}
      <SettingsSection title="Información de la cuenta" icon={
        provider.provider_type === 'company'
          ? <Building2 className="h-5 w-5" />
          : <UserIcon className="h-5 w-5" />
      }>
        <dl className="divide-y divide-slate-100">
          <InfoRow label="Tipo de proveedor">
            <Badge className="bg-rr-navy-100 text-rr-navy-700">
              {provider.provider_type === 'company' ? 'Empresa' : 'Persona física'}
            </Badge>
          </InfoRow>
          <InfoRow label="Slug público">
            <span className="font-mono text-sm text-slate-700">{provider.slug}</span>
          </InfoRow>
          <InfoRow label="Estado">
            <Badge className={PROVIDER_STATUS_BADGE[provider.status]}>
              {PROVIDER_STATUS_LABELS[provider.status]}
            </Badge>
          </InfoRow>
          <InfoRow label="Tu rol">
            <span className="text-sm capitalize text-slate-700">
              {memberRole ?? '—'}
            </span>
          </InfoRow>
          <InfoRow label="Correo de sesión">
            <span className="text-sm text-slate-700">{user?.email ?? '—'}</span>
          </InfoRow>
        </dl>
      </SettingsSection>

      {/* ---- Notifications (placeholder) ---- */}
      <SettingsSection title="Notificaciones" icon={<Bell className="h-5 w-5" />}>
        <div className="space-y-3">
          <NotificationToggle
            label="Nuevas solicitudes"
            description="Recibe un correo cuando llegue una nueva solicitud."
            defaultChecked
          />
          <NotificationToggle
            label="Documentos por vencer"
            description="Aviso antes del vencimiento de documentos."
            defaultChecked
          />
          <NotificationToggle
            label="Resumen semanal"
            description="Reporte semanal de actividad."
          />
        </div>
      </SettingsSection>

      {/* ---- Team (placeholder) ---- */}
      <SettingsSection title="Equipo" icon={<Users className="h-5 w-5" />}>
        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/40 p-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Miembros del proveedor</p>
            <p className="text-xs text-slate-400">
              Invita a más personas para gestionar tu proveedor.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-400"
            title="Próximamente"
          >
            Invitar
            <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] uppercase tracking-wide">
              Pronto
            </span>
          </button>
        </div>
      </SettingsSection>

      {/* ---- Danger zone ---- */}
      <SettingsSection title="Zona de peligro" icon={<ShieldAlert className="h-5 w-5" />}>
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
          <div>
            <p className="text-sm font-medium text-red-700">Cerrar sesión</p>
            <p className="text-xs text-red-500">
              Sal de tu cuenta en este dispositivo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </div>
      </SettingsSection>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Settings section
 * ------------------------------------------------------------------ */

interface SettingsSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

function SettingsSection({ title, icon, children }: SettingsSectionProps): ReactNode {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
          {icon}
        </span>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Info row
 * ------------------------------------------------------------------ */

interface InfoRowProps {
  label: string;
  children: ReactNode;
}

function InfoRow({ label, children }: InfoRowProps): ReactNode {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Notification toggle
 * ------------------------------------------------------------------ */

interface NotificationToggleProps {
  label: string;
  description: string;
  defaultChecked?: boolean;
}

function NotificationToggle({
  label,
  description,
  defaultChecked,
}: NotificationToggleProps): ReactNode {
  const [checked, setChecked] = useState<boolean>(defaultChecked ?? false);

  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-100 p-3.5">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => setChecked((v: boolean) => !v)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-rr-red-500' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}
