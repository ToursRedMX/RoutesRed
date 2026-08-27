/**
 * # Provider UI helpers
 *
 * Small presentational primitives shared across the provider dashboard
 * pages: status badges, status label text, and spinner/empty-state
 * components.
 *
 * @packageDocumentation
 */

import { type ReactNode } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

import type {
  DocumentVerificationStatus,
  DriverStatus,
  ProviderStatus,
  VerificationStatus,
  VehicleStatus,
} from '@/types';

/* ------------------------------------------------------------------ *
 * Status label maps (Spanish)
 * ------------------------------------------------------------------ */

export const PROVIDER_STATUS_LABELS: Record<ProviderStatus, string> = {
  draft: 'Borrador',
  pending_review: 'En revisión',
  active: 'Activo',
  suspended: 'Suspendido',
  rejected: 'Rechazado',
  inactive: 'Inactivo',
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  unverified: 'Sin verificar',
  pending: 'En verificación',
  verified: 'Verificado',
  rejected: 'Rechazado',
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  draft: 'Borrador',
  active: 'Activo',
  maintenance: 'Mantenimiento',
  retired: 'Retirado',
};

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  on_leave: 'De licencia',
  terminated: 'Dado de baja',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentVerificationStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  expired: 'Vencido',
};

/* ------------------------------------------------------------------ *
 * Badge colour maps
 * ------------------------------------------------------------------ */

export const PROVIDER_STATUS_BADGE: Record<ProviderStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending_review: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
  inactive: 'bg-slate-100 text-slate-500',
};

export const VERIFICATION_STATUS_BADGE: Record<VerificationStatus, string> = {
  unverified: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-700',
  verified: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export const VEHICLE_STATUS_BADGE: Record<VehicleStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-emerald-100 text-emerald-700',
  maintenance: 'bg-amber-100 text-amber-700',
  retired: 'bg-slate-100 text-slate-500',
};

export const DRIVER_STATUS_BADGE: Record<DriverStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-500',
  on_leave: 'bg-amber-100 text-amber-700',
  terminated: 'bg-red-100 text-red-700',
};

export const DOCUMENT_STATUS_BADGE: Record<DocumentVerificationStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-slate-100 text-slate-500',
};

/* ------------------------------------------------------------------ *
 * Badge component
 * ------------------------------------------------------------------ */

interface BadgeProps {
  className: string;
  children: ReactNode;
}

export function Badge({ className, children }: BadgeProps): ReactNode {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Spinner
 * ------------------------------------------------------------------ */

export function PageSpinner({ label }: { label?: string }): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin text-rr-navy-500" />
      {label && <p className="mt-3 text-sm">{label}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Empty state
 * ------------------------------------------------------------------ */

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-rr-navy-400 card-shadow">
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-rr-navy-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Error banner
 * ------------------------------------------------------------------ */

export function ErrorBanner({ message }: { message: string }): ReactNode {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Form field primitives
 * ------------------------------------------------------------------ */

interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}

export function Field({ label, children, hint, required }: FieldProps): ReactNode {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rr-red-500">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </label>
  );
}

export const inputClass: string =
  'block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-rr-navy-500 focus:outline-none focus:ring-2 focus:ring-rr-navy-500/20 disabled:cursor-not-allowed disabled:bg-slate-50';
