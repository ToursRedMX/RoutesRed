import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ClipboardList,
  Clock,
  Users,
  Calendar,
  Send,
  Check,
  X,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useProvider } from '@/hooks/useProvider';
import { useRoute } from '@/lib/router';
import type {
  ProviderQuoteInviteDTO,
  QuoteDetailForProviderDTO,
  Vehicle,
  QuoteTripType,
  QuoteBidStatus,
} from '@/types';
import {
  TRIP_TYPE_LABELS,
  QUOTE_INVITE_STATUS_LABELS,
  QUOTE_INVITE_STATUS_BADGE,
  QUOTE_BID_STATUS_LABELS,
  QUOTE_BID_STATUS_BADGE,
  QuoteBadge,
  QuoteSpinner,
  QuoteErrorBanner,
  formatCurrency,
  formatTimeRemaining,
} from '@/components/quote/ui';

const inputClass = 'block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-rr-navy-500 focus:outline-none focus:ring-2 focus:ring-rr-navy-500/20';

export function ProviderQuoteInboxPage(): ReactNode {
  const { provider, loading: providerLoading } = useProvider();
  const { navigate } = useRoute();

  const [invites, setInvites] = useState<ProviderQuoteInviteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<QuoteDetailForProviderDTO | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Bid form state
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [terms, setTerms] = useState('');

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase.rpc('get_provider_quote_invites_routesred');
    if (err) { setError(err.message); }
    else setInvites((data as ProviderQuoteInviteDTO[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchInvites(); }, [fetchInvites]);

  const fetchDetail = useCallback(async (reqId: string) => {
    const { data, error: err } = await supabase.rpc('get_quote_detail_for_provider_routesred', {
      p_quote_request_id: reqId,
    });
    if (err) { setError(err.message); return; }
    setDetail((data as QuoteDetailForProviderDTO[])?.[0] ?? null);

    const { data: vData } = await supabase
      .from('vehicles')
      .select('*')
      .eq('transport_provider_id', provider?.id ?? '')
      .eq('status', 'active')
      .eq('active', true)
      .order('capacity', { ascending: false });
    if (vData) setVehicles(vData as Vehicle[]);
  }, [provider]);

  const handleExpand = useCallback((reqId: string) => {
    if (expandedId === reqId) {
      setExpandedId(null);
      setDetail(null);
    } else {
      setExpandedId(reqId);
      setSelectedVehicles([]);
      setPrice('');
      setEstimatedTime('');
      setTerms('');
      void fetchDetail(reqId);
    }
  }, [expandedId, fetchDetail]);

  const handleSubmitBid = useCallback(async (reqId: string) => {
    if (!price || selectedVehicles.length === 0) return;
    setActionLoading(true);
    setError(null);
    const { error: err } = await supabase.rpc('submit_quote_bid_routesred', {
      p_quote_request_id: reqId,
      p_total_cents: Math.round(parseFloat(price) * 100),
      p_vehicle_ids: selectedVehicles,
      p_estimated_time_text: estimatedTime || null,
      p_terms: terms || null,
    });
    if (err) { setError(err.message); setActionLoading(false); return; }
    setActionLoading(false);
    setExpandedId(null);
    setDetail(null);
    void fetchInvites();
  }, [price, selectedVehicles, estimatedTime, terms, fetchInvites]);

  const handleDecline = useCallback(async (reqId: string) => {
    setActionLoading(true);
    const { error: err } = await supabase.rpc('decline_quote_invite_routesred', {
      p_quote_request_id: reqId,
    });
    if (err) { setError(err.message); setActionLoading(false); return; }
    setActionLoading(false);
    setExpandedId(null);
    setDetail(null);
    void fetchInvites();
  }, [fetchInvites]);

  const handleWithdraw = useCallback(async (reqId: string) => {
    if (!detail?.existing_bid_id) return;
    setActionLoading(true);
    const { error: err } = await supabase.rpc('withdraw_quote_bid_routesred', {
      p_quote_bid_id: detail.existing_bid_id,
    });
    if (err) { setError(err.message); setActionLoading(false); return; }
    setActionLoading(false);
    setExpandedId(null);
    setDetail(null);
    void fetchInvites();
  }, [detail, fetchInvites]);

  if (providerLoading || loading) return <QuoteSpinner label="Cargando solicitudes…" />;

  if (!provider) {
    return (
      <div className="px-4 py-8">
        <QuoteErrorBanner message="No tienes una transportadora asociada." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-rr-navy-900">Solicitudes de cotización</h1>
        <p className="mt-1 text-sm text-slate-500">Bandeja de solicitudes activas donde tu transportadora fue invitada a participar.</p>
      </div>

      {error && <div className="mb-4"><QuoteErrorBanner message={error} /></div>}

      {invites.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
          <ClipboardList className="h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-lg font-semibold text-rr-navy-900">No hay solicitudes activas</h3>
          <p className="mt-1 text-sm text-slate-500">Cuando un usuario publique una solicitud que coincida con tus vehículos, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map(inv => {
            const isExpanded = expandedId === inv.quote_request_id;
            return (
              <div key={inv.quote_request_id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Card header */}
                <button
                  type="button"
                  onClick={() => handleExpand(inv.quote_request_id)}
                  className="flex w-full items-center justify-between p-5 text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-rr-navy-900">{TRIP_TYPE_LABELS[inv.trip_type]}</h3>
                      <QuoteBadge className={QUOTE_INVITE_STATUS_BADGE[inv.invite_status]}>
                        {QUOTE_INVITE_STATUS_LABELS[inv.invite_status]}
                      </QuoteBadge>
                      {inv.bid_status && (
                        <QuoteBadge className={QUOTE_BID_STATUS_BADGE[inv.bid_status as QuoteBidStatus]}>
                          {QUOTE_BID_STATUS_LABELS[inv.bid_status as QuoteBidStatus]}
                        </QuoteBadge>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {inv.passenger_count} pax</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(inv.service_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="flex items-center gap-1 text-amber-600"><Clock className="h-3.5 w-3.5" /> {formatTimeRemaining(inv.expires_at)}</span>
                      {inv.vehicle_type_name && <span className="font-medium text-slate-600">{inv.vehicle_type_name}</span>}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </button>

                {/* Expanded detail */}
                {isExpanded && detail && (
                  <div className="border-t border-slate-100 p-5">
                    {detail.notes && <p className="mb-3 text-sm text-slate-600">{detail.notes}</p>}
                    {detail.budget_cents && (
                      <p className="mb-3 text-sm text-slate-500">Presupuesto referencial: <span className="font-medium text-slate-700">{formatCurrency(detail.budget_cents)}</span></p>
                    )}

                    {/* If already has a bid */}
                    {detail.existing_bid_id && detail.existing_bid_status !== 'withdrawn' ? (
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Ya enviaste una cotización</p>
                          <p className="text-xs text-slate-500">Estado: {QUOTE_BID_STATUS_LABELS[detail.existing_bid_status as QuoteBidStatus]}</p>
                        </div>
                        {detail.existing_bid_status === 'pending' && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => void handleWithdraw(inv.quote_request_id)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            Retirar cotización
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Vehicle selection */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Selecciona los vehículos a ofrecer</label>
                          <div className="mt-2 space-y-2">
                            {vehicles.map(v => {
                              const selected = selectedVehicles.includes(v.id);
                              const capacitySum = selectedVehicles
                                .map(id => vehicles.find(vv => vv.id === id)?.capacity ?? 0)
                                .reduce((a, b) => a + b, 0);
                              return (
                                <label
                                  key={v.id}
                                  className={`flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                                    selected ? 'border-rr-navy-500 bg-navy-50' : 'border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => {
                                      setSelectedVehicles(prev =>
                                        selected ? prev.filter(id => id !== v.id) : [...prev, v.id]
                                      );
                                    }}
                                    className="text-rr-navy-600"
                                  />
                                  <div className="flex-1 text-sm">
                                    <span className="font-medium text-slate-800">{v.make} {v.model}</span>
                                    <span className="ml-2 text-slate-500">{v.capacity} pax</span>
                                    {v.plate && <span className="ml-2 text-slate-400">{v.plate}</span>}
                                  </div>
                                </label>
                              );
                            })}
                            {vehicles.length === 0 && (
                              <p className="text-sm text-slate-400">No tienes vehículos activos. Agrega vehículos en la sección de Vehículos.</p>
                            )}
                          </div>
                          {selectedVehicles.length > 0 && (
                            <p className="mt-2 text-xs text-slate-500">
                              Capacidad total: {selectedVehicles.map(id => vehicles.find(v => v.id === id)?.capacity ?? 0).reduce((a, b) => a + b, 0)} pax
                              {inv.passenger_count > selectedVehicles.map(id => vehicles.find(v => v.id === id)?.capacity ?? 0).reduce((a, b) => a + b, 0) && (
                                <span className="text-amber-600 font-medium"> — Insuficiente para {inv.passenger_count} pax</span>
                              )}
                            </p>
                          )}
                        </div>

                        {/* Price + terms */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-sm font-medium text-slate-700">Precio total (MXN) <span className="text-rr-red-500">*</span></label>
                            <input
                              type="number"
                              min={0}
                              placeholder="0.00"
                              value={price}
                              onChange={e => setPrice(e.target.value)}
                              className={`mt-1.5 ${inputClass}`}
                            />
                            <p className="mt-1 text-xs text-slate-400">La plataforma retiene una comisión del 15%.</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700">Tiempo estimado</label>
                            <input
                              type="text"
                              placeholder="Ej. 2 horas 30 min"
                              value={estimatedTime}
                              onChange={e => setEstimatedTime(e.target.value)}
                              className={`mt-1.5 ${inputClass}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Términos y condiciones</label>
                          <textarea
                            rows={2}
                            placeholder="Incluye políticas de cancelación, equipaje, etc."
                            value={terms}
                            onChange={e => setTerms(e.target.value)}
                            className={`mt-1.5 ${inputClass}`}
                          />
                        </div>

                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => void handleDecline(inv.quote_request_id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <X className="h-4 w-4" /> Rechazar invitación
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading || !price || selectedVehicles.length === 0}
                            onClick={() => void handleSubmitBid(inv.quote_request_id)}
                            className="inline-flex items-center gap-2 rounded-lg bg-rr-navy-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rr-navy-700 disabled:opacity-50"
                          >
                            {actionLoading ? 'Enviando…' : <><Send className="h-4 w-4" /> Enviar cotización</>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
