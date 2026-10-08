import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Plane,
  MapPin,
  Users,
  Calendar,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Send,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRoute } from '@/lib/router';
import type { VehicleType, QuoteTripType, QuoteStopType, Airport } from '@/types';
import { TRIP_TYPE_LABELS, QuoteErrorBanner, QuoteSpinner } from '@/components/quote/ui';

const inputClass = 'block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-rr-navy-500 focus:outline-none focus:ring-2 focus:ring-rr-navy-500/20';

interface StopForm {
  stop_type: QuoteStopType;
  address: string;
  airport_id: string | null;
  scheduled_time: string;
}

const STEPS = [
  { label: 'Tipo de viaje', icon: Plane },
  { label: 'Vehículo y pasajeros', icon: Users },
  { label: 'Fecha y hora', icon: Calendar },
  { label: 'Itinerario', icon: MapPin },
  { label: 'Presupuesto y notas', icon: FileText },
  { label: 'Resumen', icon: Check },
] as const;

const TRIP_TYPES: QuoteTripType[] = ['airport', 'intercity', 'event', 'tour', 'other'];

export function QuoteRequestPage(): ReactNode {
  const { user } = useAuth();
  const { navigate } = useRoute();
  const [step, setStep] = useState(0);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tripType, setTripType] = useState<QuoteTripType>('airport');
  const [vehicleTypeId, setVehicleTypeId] = useState<string>('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [serviceDate, setServiceDate] = useState('');
  const [serviceTime, setServiceTime] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [stops, setStops] = useState<StopForm[]>([
    { stop_type: 'origin', address: '', airport_id: null, scheduled_time: '' },
    { stop_type: 'destination', address: '', airport_id: null, scheduled_time: '' },
  ]);

  useEffect(() => {
    (async () => {
      const [vtRes, apRes] = await Promise.all([
        supabase.schema('routesred').from('vehicle_types').select('*').eq('active', true).order('sort_order'),
        supabase.schema('routesred').from('airports').select('*').eq('active', true).order('city'),
      ]);
      if (vtRes.data) setVehicleTypes(vtRes.data);
      if (apRes.data) setAirports(apRes.data);
      setLoading(false);
    })();
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 0: return true;
      case 1: return passengerCount >= 1;
      case 2: return serviceDate !== '' && serviceTime !== '';
      case 3: return stops.every(s => s.address.trim() !== '');
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  }, [step, passengerCount, serviceDate, serviceTime, stops]);

  const handlePublish = useCallback(async (): Promise<void> => {
    if (!user) return;
    setSubmitting(true);
    setError(null);

    try {
      const serviceDateTime = new Date(`${serviceDate}T${serviceTime}`).toISOString();
      const stopsJson = stops.map((s, i) => ({
        stop_order: i,
        stop_type: s.stop_type,
        address: s.address,
        scheduled_time: s.scheduled_time ? new Date(`${serviceDate}T${s.scheduled_time}`).toISOString() : null,
      }));

      const { data: reqId, error: createErr } = await supabase.schema('routesred').rpc('create_quote_request_routesred', {
        p_trip_type: tripType,
        p_passenger_count: passengerCount,
        p_service_date: serviceDateTime,
        p_vehicle_type_id: vehicleTypeId || null,
        p_budget_cents: budget ? Math.round(parseFloat(budget) * 100) : null,
        p_notes: notes || null,
        p_stops: stopsJson,
      });

      if (createErr) throw createErr;
      if (!reqId) throw new Error('No se pudo crear la solicitud');

      const { error: pubErr } = await supabase.schema('routesred').rpc('publish_quote_request_routesred', {
        p_quote_request_id: reqId,
      });
      if (pubErr) throw pubErr;

      navigate(`/cotizar/${reqId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al publicar la solicitud');
    } finally {
      setSubmitting(false);
    }
  }, [user, tripType, passengerCount, serviceDate, serviceTime, vehicleTypeId, budget, notes, stops, navigate]);

  if (loading) return <QuoteSpinner label="Cargando…" />;

  const canGoNext = canProceed();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-rr-navy-900">Solicitar cotización</h1>
      <p className="mt-1 text-sm text-slate-500">
        Completa los datos de tu viaje. Las transportadoras con vehículos compatibles recibirán una invitación a cotizar.
        Tendrás 72 horas para recibir y elegir la mejor oferta.
      </p>

      {/* Stepper */}
      <div className="mt-8 flex items-center justify-between">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <div key={s.label} className="flex flex-1 items-center">
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                active ? 'bg-rr-red-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 rounded-full ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-sm font-medium text-rr-navy-700">{STEPS[step].label}</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && <div className="mb-4"><QuoteErrorBanner message={error} /></div>}

        {/* Step 0: Trip type */}
        {step === 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">¿Qué tipo de viaje necesitas?</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TRIP_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTripType(t)}
                  className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                    tripType === t ? 'border-rr-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Plane className="h-5 w-5 text-slate-400" />
                  <span className="text-sm font-medium text-slate-800">{TRIP_TYPE_LABELS[t]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Vehicle + passengers */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">Tipo de vehículo preferido</label>
              <select
                value={vehicleTypeId}
                onChange={e => setVehicleTypeId(e.target.value)}
                className={`mt-1.5 ${inputClass}`}
              >
                <option value="">Sin preferencia</option>
                {vehicleTypes.map(vt => (
                  <option key={vt.id} value={vt.id}>{vt.name} ({vt.min_capacity ?? '?'}–{vt.max_capacity ?? '?'} pax)</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">Si no seleccionas, todas las transportadoras con capacidad suficiente serán invitadas.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Número de pasajeros <span className="text-rr-red-500">*</span></label>
              <input
                type="number"
                min={1}
                value={passengerCount}
                onChange={e => setPassengerCount(Math.max(1, parseInt(e.target.value) || 1))}
                className={`mt-1.5 ${inputClass}`}
              />
            </div>
          </div>
        )}

        {/* Step 2: Date + time */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Fecha del servicio <span className="text-rr-red-500">*</span></label>
                <input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} className={`mt-1.5 ${inputClass}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Hora de salida <span className="text-rr-red-500">*</span></label>
                <input type="time" value={serviceTime} onChange={e => setServiceTime(e.target.value)} className={`mt-1.5 ${inputClass}`} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Itinerary */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-700">Paradas del itinerario</p>
            {stops.map((stop, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <select
                    value={stop.stop_type}
                    onChange={e => {
                      const next = [...stops];
                      next[i] = { ...stop, stop_type: e.target.value as QuoteStopType };
                      setStops(next);
                    }}
                    className={`w-32 ${inputClass}`}
                  >
                    <option value="origin">Origen</option>
                    <option value="destination">Destino</option>
                    <option value="stopover">Escala</option>
                  </select>
                  {stops.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setStops(stops.filter((_, idx) => idx !== i))}
                      className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {tripType === 'airport' && (
                  <div className="mt-3">
                    <select
                      value={stop.airport_id ?? ''}
                      onChange={e => {
                        const ap = airports.find(a => a.id === e.target.value);
                        const next = [...stops];
                        next[i] = { ...stop, airport_id: e.target.value || null, address: ap ? `${ap.name} (${ap.iata_code})` : stop.address };
                        setStops(next);
                      }}
                      className={inputClass}
                    >
                      <option value="">Dirección personalizada</option>
                      {airports.map(ap => (
                        <option key={ap.id} value={ap.id}>{ap.city} — {ap.name} ({ap.iata_code})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Dirección completa"
                    value={stop.address}
                    onChange={e => {
                      const next = [...stops];
                      next[i] = { ...stop, address: e.target.value };
                      setStops(next);
                    }}
                    className={inputClass}
                  />
                </div>
                <div className="mt-3">
                  <input
                    type="time"
                    value={stop.scheduled_time}
                    onChange={e => {
                      const next = [...stops];
                      next[i] = { ...stop, scheduled_time: e.target.value };
                      setStops(next);
                    }}
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setStops([...stops, { stop_type: 'stopover', address: '', airport_id: null, scheduled_time: '' }])}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" /> Añadir escala
            </button>
          </div>
        )}

        {/* Step 4: Budget + notes */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">Presupuesto aproximado (MXN)</label>
              <input
                type="number"
                min={0}
                placeholder="Opcional"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                className={`mt-1.5 ${inputClass}`}
              />
              <p className="mt-1 text-xs text-slate-400">Si lo indicas, las transportadoras lo verán como referencia.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Notas adicionales</label>
              <textarea
                rows={4}
                placeholder="Cualquier detalle relevante: equipaje, asientos infantiles, paradas específicas, etc."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className={`mt-1.5 ${inputClass}`}
              />
            </div>
          </div>
        )}

        {/* Step 5: Summary */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Tipo de viaje</span><span className="font-medium text-slate-800">{TRIP_TYPE_LABELS[tripType]}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Vehículo</span><span className="font-medium text-slate-800">{vehicleTypes.find(vt => vt.id === vehicleTypeId)?.name ?? 'Sin preferencia'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Pasajeros</span><span className="font-medium text-slate-800">{passengerCount}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Fecha y hora</span><span className="font-medium text-slate-800">{serviceDate} {serviceTime}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Presupuesto</span><span className="font-medium text-slate-800">{budget ? `$${budget} MXN` : 'No indicado'}</span></div>
              <div className="border-t border-slate-200 pt-3">
                <span className="text-slate-500">Itinerario ({stops.length} paradas)</span>
                <ol className="mt-2 space-y-1">
                  {stops.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-700">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rr-navy-100 text-xs font-bold text-rr-navy-700">{i + 1}</span>
                      <span>{s.address || '—'}</span>
                    </li>
                  ))}
                </ol>
              </div>
              {notes && <div className="border-t border-slate-200 pt-3"><span className="text-slate-500">Notas: </span><span className="text-slate-700">{notes}</span></div>}
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Al publicar, las transportadoras compatibles recibirán una invitación por correo.
              Tendrás <strong>72 horas</strong> para recibir cotizaciones y elegir la mejor opción.
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-6 flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" /> Atrás
            </button>
          ) : <div />}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rr-navy-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rr-navy-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handlePublish()}
              className="inline-flex items-center gap-2 rounded-lg bg-rr-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rr-red-700 disabled:opacity-50"
            >
              {submitting ? 'Publicando…' : <>Publicar solicitud <Send className="h-4 w-4" /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
