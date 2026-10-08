import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Clock,
  Users,
  Calendar,
  Star,
  Check,
  X,
  AlertCircle,
  MapPin,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useRoute } from '@/lib/router';
import type { QuoteBidForUserDTO, UserQuoteRequestDTO, QuoteRequestStop } from '@/types';
import {
  TRIP_TYPE_LABELS,
  QUOTE_REQUEST_STATUS_LABELS,
  QUOTE_REQUEST_STATUS_BADGE,
  QUOTE_BID_STATUS_LABELS,
  QUOTE_BID_STATUS_BADGE,
  QuoteBadge,
  QuoteSpinner,
  QuoteErrorBanner,
  formatCurrency,
  formatTimeRemaining,
} from '@/components/quote/ui';

const CANCEL_REASONS = [
  'Cotizaciones fuera de presupuesto',
  'Ya conseguí transporte por otro medio',
  'Tiempos de respuesta muy largos',
  'Otro motivo',
];

export function QuoteDetailPage(): ReactNode {
  const { params, navigate } = useRoute();
  const requestId = params?.id as string | undefined;

  const [request, setRequest] = useState<UserQuoteRequestDTO | null>(null);
  const [stops, setStops] = useState<QuoteRequestStop[]>([]);
  const [bids, setBids] = useState<QuoteBidForUserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  const fetchData = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);

    const { data: reqs, error: reqErr } = await supabase.schema('routesred').rpc('get_user_quote_requests_routesred');
    if (reqErr) { setError(reqErr.message); setLoading(false); return; }
    const req = (reqs as UserQuoteRequestDTO[])?.find(r => r.id === requestId) ?? null;
    setRequest(req);

    if (req) {
      const { data: stopsData } = await supabase
        .schema('routesred')
        .from('quote_request_stops')
        .select('*')
        .eq('quote_request_id', requestId)
        .order('stop_order');
      if (stopsData) setStops(stopsData as QuoteRequestStop[]);

      const { data: bidsData, error: bidsErr } = await supabase.schema('routesred').rpc('get_quote_bids_for_user_routesred', {
        p_quote_request_id: requestId,
      });
      if (bidsErr) { setError(bidsErr.message); }
      else setBids((bidsData as QuoteBidForUserDTO[]) ?? []);
    }
    setLoading(false);
  }, [requestId]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleAccept = useCallback(async (bidId: string): Promise<void> => {
    setActionLoading(true);
    setError(null);
    const { error: err } = await supabase.schema('routesred').rpc('accept_quote_bid_routesred', { p_quote_bid_id: bidId });
    if (err) { setError(err.message); setActionLoading(false); return; }
    await fetchData();
    setActionLoading(false);
  }, [fetchData]);

  const handleCancel = useCallback(async (): Promise<void> => {
    if (!requestId) return;
    setActionLoading(true);
    const reason = cancelReason === 'Otro motivo' ? customReason : cancelReason;
    const { error: err } = await supabase.schema('routesred').rpc('cancel_quote_request_routesred', {
      p_quote_request_id: requestId,
      p_cancel_reason: reason,
    });
    if (err) { setError(err.message); setActionLoading(false); return; }
    setShowCancel(false);
    await fetchData();
    setActionLoading(false);
  }, [requestId, cancelReason, customReason, fetchData]);

  if (loading) return <QuoteSpinner label="Cargando solicitud…" />;

  if (!request) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <QuoteErrorBanner message="No se encontró la solicitud o no tienes acceso." />
        <button onClick={() => navigate('/cotizar')} className="mt-4 text-sm font-medium text-rr-navy-600 hover:underline">
          Volver a cotizar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <button onClick={() => navigate('/account')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Mis solicitudes
      </button>

      {error && <div className="mt-4"><QuoteErrorBanner message={error} /></div>}

      {/* Request summary */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-rr-navy-900">
              {TRIP_TYPE_LABELS[request.trip_type]} · {request.passenger_count} pasajeros
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {request.vehicle_type_name ?? 'Sin preferencia de vehículo'}
            </p>
          </div>
          <QuoteBadge className={QUOTE_REQUEST_STATUS_BADGE[request.status]}>
            {QUOTE_REQUEST_STATUS_LABELS[request.status]}
          </QuoteBadge>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4 text-slate-400" />
            {new Date(request.service_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="h-4 w-4 text-slate-400" />
            {request.passenger_count} pasajeros
          </div>
          {request.status === 'open' && (
            <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
              <Clock className="h-4 w-4" />
              {formatTimeRemaining(request.expires_at)}
            </div>
          )}
        </div>

        {/* Stops */}
        {stops.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Itinerario</p>
            <ol className="mt-2 space-y-2">
              {stops.map((s, i) => (
                <li key={s.id} className="flex items-start gap-3 text-sm">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-rr-navy-100 text-xs font-bold text-rr-navy-700">{i + 1}</span>
                  <div>
                    <span className="font-medium capitalize text-slate-700">{s.stop_type === 'stopover' ? 'Escala' : s.stop_type === 'origin' ? 'Origen' : 'Destino'}: </span>
                    <span className="text-slate-600">{s.address}</span>
                    {s.scheduled_time && <span className="ml-2 text-xs text-slate-400">{new Date(s.scheduled_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {request.status === 'open' && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowCancel(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4" /> Cancelar subasta
            </button>
          </div>
        )}
      </div>

      {/* Bids */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-rr-navy-900">
          Cotizaciones recibidas {bids.length > 0 && <span className="text-slate-400">({bids.length})</span>}
        </h2>

        {bids.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              {request.status === 'open'
                ? 'Aún no se han recibido cotizaciones. Las transportadoras tienen tiempo hasta que expire la ventana de 72 horas.'
                : 'No se recibieron cotizaciones para esta solicitud.'}
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {bids.map(bid => (
              <div key={bid.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-rr-navy-900">{bid.provider_display_name}</h3>
                      <QuoteBadge className={QUOTE_BID_STATUS_BADGE[bid.status]}>
                        {QUOTE_BID_STATUS_LABELS[bid.status]}
                      </QuoteBadge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-400" />
                        {bid.provider_rating_average > 0 ? `${bid.provider_rating_average.toFixed(1)} (${bid.provider_rating_count})` : 'Sin reseñas'}
                      </span>
                      <span>{bid.vehicle_count} {bid.vehicle_count > 1 ? 'vehículos' : 'vehículo'}</span>
                      {bid.is_combination && <span className="text-blue-600 font-medium">Combinación de unidades</span>}
                      {bid.estimated_time_text && <span>{bid.estimated_time_text}</span>}
                    </div>
                    {bid.terms && <p className="mt-2 text-sm text-slate-600">{bid.terms}</p>}
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-rr-navy-900">{formatCurrency(bid.total_cents, bid.currency)}</p>
                    <p className="text-xs text-slate-400">Total a pagar</p>
                  </div>
                </div>

                {bid.status === 'pending' && request.status === 'open' && (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void handleAccept(bid.id)}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" /> Aceptar y pagar
                    </button>
                  </div>
                )}
                {bid.status === 'accepted' && (
                  <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                    Cotización aceptada. Procede al pago para recibir los datos de contacto de la transportadora.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowCancel(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-rr-navy-900">Cancelar subasta</h3>
            <p className="mt-1 text-sm text-slate-500">Indica el motivo de la cancelación. Las transportadoras participantes serán notificadas.</p>
            <div className="mt-4 space-y-2">
              {CANCEL_REASONS.map(r => (
                <label key={r} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={cancelReason === r} onChange={() => setCancelReason(r)} className="text-rr-red-600" />
                  {r}
                </label>
              ))}
            </div>
            {cancelReason === 'Otro motivo' && (
              <textarea
                rows={2}
                placeholder="Describe el motivo"
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                className="mt-3 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rr-navy-500 focus:outline-none focus:ring-2 focus:ring-rr-navy-500/20"
              />
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCancel(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cerrar</button>
              <button
                type="button"
                disabled={actionLoading || (cancelReason === 'Otro motivo' && !customReason.trim())}
                onClick={() => void handleCancel()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Cancelando…' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
