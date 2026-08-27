/**
 * # ProviderDetailPage
 *
 * Placeholder detail page for a single transportadora, reached via
 * `/transportadoras/:slug`. Reads the `slug` param from the router.
 *
 * @packageDocumentation
 */

import { type ReactNode } from 'react';
import { Bus, ArrowLeft, ShieldCheck, MapPin, Star, Car, Users, Clock } from 'lucide-react';

import { Link, useRoute } from '@/lib/router';

export function ProviderDetailPage(): ReactNode {
  const { params } = useRoute();
  const slug: string = params['slug'] ?? '';

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        to="/transportadoras"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-rr-red-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al directorio
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white card-shadow">
        {/* Cover */}
        <div className="relative h-48 bg-gradient-to-br from-rr-navy-800 to-rr-navy-900">
          <div className="absolute inset-0 flex items-center justify-center">
            <Bus className="h-16 w-16 text-white/20" />
          </div>
        </div>

        {/* Header */}
        <div className="border-b border-slate-100 p-8">
          <div className="flex items-center gap-4">
            <span className="-mt-12 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rr-navy-700 to-rr-navy-900 text-white shadow-lg ring-4 ring-white">
              <Bus className="h-8 w-8" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-rr-navy-900">
                  {slug || 'Transportadora'}
                </h1>
                <ShieldCheck className="h-5 w-5 text-rr-red-500" />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  México
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                  Próximamente
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          <StatBox icon={<Car className="h-5 w-5" />} label="Vehículos" value="—" />
          <StatBox icon={<Users className="h-5 w-5" />} label="Capacidad" value="—" />
          <StatBox icon={<Clock className="h-5 w-5" />} label="Disponibilidad" value="24/7" />
        </div>

        {/* Body */}
        <div className="p-8">
          <p className="text-sm leading-relaxed text-slate-500">
            El perfil detallado de la transportadora estará disponible próximamente.
            Podrás ver su flotilla, servicios, calificaciones de clientes y solicitar
            cotizaciones en tiempo real.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-rr-navy-50 px-5 py-2.5 text-sm font-semibold text-rr-navy-500">
              Solicitar cotización
              <span className="rounded-full bg-rr-navy-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rr-navy-400">
                Pronto
              </span>
            </span>
            <Link
              to="/transportadoras"
              className="btn-ghost"
            >
              Ver otras transportadoras
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Stat box
 * ------------------------------------------------------------------ */

interface StatBoxProps {
  icon: ReactNode;
  label: string;
  value: string;
}

function StatBox({ icon, label, value }: StatBoxProps): ReactNode {
  return (
    <div className="flex flex-col items-center gap-1 py-5">
      <span className="text-rr-navy-400">{icon}</span>
      <span className="text-lg font-bold text-rr-navy-900">{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
