/**
 * # ProvidersPage
 *
 * Placeholder directory page listing transportadoras.
 *
 * @packageDocumentation
 */

import { type ReactNode } from 'react';
import { Search, Bus, ShieldCheck, MapPin, Star, ArrowRight } from 'lucide-react';

import { Link } from '@/lib/router';

export function ProvidersPage(): ReactNode {
  return (
    <div>
      {/* ---- Page header ---- */}
      <div className="bg-gradient-to-br from-rr-navy-900 to-rr-navy-800 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-sm font-medium text-rr-red-400">
            <Bus className="h-4 w-4" />
            Directorio
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Transportadoras verificadas
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-300">
            Explora y compara las transportadoras registradas en RoutesRed.
            Filtra por ubicación, tipo de servicio y capacidad.
          </p>
        </div>
      </div>

      {/* ---- Search bar (decorative, coming soon) ---- */}
      <div className="mx-auto -mt-8 max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 card-shadow">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            disabled
            placeholder="Busca por ciudad, estado o nombre de transportadora…"
            className="flex-1 bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
          />
          <span className="hidden rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-400 sm:block">
            Próximamente
          </span>
        </div>
      </div>

      {/* ---- Empty state ---- */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-rr-navy-400 card-shadow">
            <Search className="h-8 w-8" />
          </span>
          <h2 className="text-lg font-semibold text-rr-navy-900">
            Directorio en construcción
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500">
            Pronto podrás explorar y comparar transportadoras verificadas con
            fotos, vehículos, calificaciones y cotizaciones en tiempo real.
          </p>

          {/* Preview cards (static, illustrative) */}
          <div className="mt-10 grid w-full max-w-4xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
            <PreviewCard name="Transportes del Norte" location="Monterrey, NL" rating="4.9" />
            <PreviewCard name="Autobuses Express" location="Guadalajara, JAL" rating="4.7" />
            <PreviewCard name="Shuttle Aeropuerto CDMX" location="Ciudad de México" rating="4.8" />
          </div>

          <Link
            to="/registro"
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-rr-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rr-red-600/25 transition-all hover:bg-rr-red-700 hover:-translate-y-0.5"
          >
            Regístrate como transportadora
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Preview card (static, illustrative)
 * ------------------------------------------------------------------ */

interface PreviewCardProps {
  name: string;
  location: string;
  rating: string;
}

function PreviewCard({ name, location, rating }: PreviewCardProps): ReactNode {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left card-shadow opacity-70 transition-opacity hover:opacity-100">
      <div className="flex h-28 items-center justify-center bg-gradient-to-br from-rr-navy-100 to-rr-navy-200">
        <Bus className="h-10 w-10 text-rr-navy-400" />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-rr-red-500" />
          <span className="text-xs font-medium text-rr-red-600">Verificada</span>
        </div>
        <h3 className="mt-1.5 text-sm font-bold text-rr-navy-900">{name}</h3>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {location}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-400" />
            {rating}
          </span>
        </div>
      </div>
    </div>
  );
}
