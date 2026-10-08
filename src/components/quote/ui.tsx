import { type ReactNode } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import type {
  QuoteRequestStatus,
  QuoteBidStatus,
  QuoteInviteStatus,
  QuoteTripType,
} from '@/types';

export const TRIP_TYPE_LABELS: Record<QuoteTripType, string> = {
  airport: 'Aeropuerto',
  intercity: 'Interurbano',
  event: 'Evento',
  tour: 'Recorrido',
  other: 'Otro',
};

export const QUOTE_REQUEST_STATUS_LABELS: Record<QuoteRequestStatus, string> = {
  draft: 'Borrador',
  open: 'Abierta',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
  expired: 'Expirada',
};

export const QUOTE_REQUEST_STATUS_BADGE: Record<QuoteRequestStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  open: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  expired: 'bg-slate-100 text-slate-500',
};

export const QUOTE_BID_STATUS_LABELS: Record<QuoteBidStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  withdrawn: 'Retirada',
  expired: 'Expirada',
};

export const QUOTE_BID_STATUS_BADGE: Record<QuoteBidStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-slate-100 text-slate-500',
  withdrawn: 'bg-slate-100 text-slate-500',
  expired: 'bg-slate-100 text-slate-500',
};

export const QUOTE_INVITE_STATUS_LABELS: Record<QuoteInviteStatus, string> = {
  invited: 'Invitada',
  participating: 'Participando',
  declined: 'Rechazada',
  expired: 'Expirada',
};

export const QUOTE_INVITE_STATUS_BADGE: Record<QuoteInviteStatus, string> = {
  invited: 'bg-amber-100 text-amber-700',
  participating: 'bg-blue-100 text-blue-700',
  declined: 'bg-slate-100 text-slate-500',
  expired: 'bg-slate-100 text-slate-500',
};

export function QuoteBadge({ className, children }: { className: string; children: ReactNode }): ReactNode {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function QuoteSpinner({ label }: { label?: string }): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin text-rr-navy-500" />
      {label && <p className="mt-3 text-sm">{label}</p>}
    </div>
  );
}

export function QuoteErrorBanner({ message }: { message: string }): ReactNode {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function formatCurrency(cents: number, currency: string = 'mxn'): string {
  const symbol = currency.toLowerCase() === 'mxn' ? '$' : currency.toUpperCase() + ' ';
  return symbol + (cents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatTimeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return '—';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expirada';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 1) return `${hours}h ${mins}m restantes`;
  return `${mins}m restantes`;
}
