/**
 * # OnboardingPage
 *
 * Post-registration onboarding page presented after a user logs in or
 * signs up for the first time.
 *
 * Offers two non-exclusive paths:
 * 1. **Contratar transporte** (client) — calls
 *    `routesred.complete_onboarding('routesred')` and redirects to `/`.
 * 2. **Ofrecer servicios de transporte** (provider) — reveals a
 *    sub-question asking whether the user will operate as a person
 *    (`individual`) or a company (`company`), then redirects to
 *    `/provider/registro?provider_type=<type>`.
 *
 * Both options can be used: the page notes that the user may also offer
 * services later regardless of the choice made here.
 *
 * @packageDocumentation
 */

import { useState, type ReactNode } from 'react';
import {
  Bus,
  Briefcase,
  User as UserIcon,
  Building2,
  ArrowRight,
  Loader2,
  ArrowLeft,
  Info,
  AlertCircle,
} from 'lucide-react';

import { Link, useRoute } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import type { ProviderType } from '@/types';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** Which top-level onboarding option the user is exploring. */
type OnboardingChoice = 'client' | 'provider' | null;

/* ------------------------------------------------------------------ *
 * OnboardingPage
 * ------------------------------------------------------------------ */

export function OnboardingPage(): ReactNode {
  const { navigate } = useRoute();

  const [choice, setChoice] = useState<OnboardingChoice>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /* ---- Client path ---- */
  const handleClient = async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc('complete_onboarding', {
        p_platform: 'routesred',
      });
      if (rpcError) {
        setError('No se pudo completar el onboarding. Inténtalo de nuevo.');
        setLoading(false);
        return;
      }
      navigate('/', { replace: true });
    } catch {
      setError('Error de conexión. Verifica tu internet e inténtalo de nuevo.');
      setLoading(false);
    }
  };

  /* ---- Provider sub-question ---- */
  const handleProviderType = (providerType: ProviderType): void => {
    navigate(`/provider/registro?provider_type=${encodeURIComponent(providerType)}`, {
      replace: true,
    });
  };

  /* ---- Provider sub-question screen ---- */
  if (choice === 'provider') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
        <button
          type="button"
          onClick={() => setChoice(null)}
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-rr-navy-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>

        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            ¿Como ofrecerás tus servicios?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Elige la opción que mejor describa cómo operas. Podrás actualizar esta información
            más adelante.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Persona física */}
          <button
            type="button"
            onClick={() => handleProviderType('individual')}
            disabled={loading}
            className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-rr-navy-200 hover:shadow-xl hover:shadow-rr-navy-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rr-navy-700 to-rr-navy-900 text-white shadow-lg transition-transform group-hover:scale-110">
              <UserIcon className="h-7 w-7" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Como persona física</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Operas como individuo independiente, sin una empresa constituida. Ideal para
              conductores y pequeños operadores.
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-rr-navy-700 transition-colors group-hover:text-rr-navy-900">
              Continuar
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>

          {/* Empresa */}
          <button
            type="button"
            onClick={() => handleProviderType('company')}
            disabled={loading}
            className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-rr-navy-200 hover:shadow-xl hover:shadow-rr-navy-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rr-navy-600 to-rr-navy-800 text-white shadow-lg transition-transform group-hover:scale-110">
              <Building2 className="h-7 w-7" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Como empresa</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Operas como persona moral con RFC y razón social. Ideal para transportadoras
              constituidas y flotillas.
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

  /* ---- Main choice screen ---- */
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-rr-navy-200 bg-rr-navy-50 px-4 py-1.5 text-sm font-medium text-rr-navy-700">
          Bienvenido a RoutesRed
        </span>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          ¿Qué te trae a RoutesRed?
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Elige cómo quieres empezar. Ambas opciones están disponibles para tu cuenta: podrás
          contratar y ofrecer transporte cuando lo necesites.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mx-auto mt-8 flex max-w-md items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Contratar transporte */}
        <button
          type="button"
          onClick={() => void handleClient()}
          disabled={loading}
          className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-rr-navy-200 hover:shadow-xl hover:shadow-rr-navy-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rr-navy-700 to-rr-navy-600 text-white shadow-lg transition-transform group-hover:scale-110">
            <Bus className="h-7 w-7" />
          </span>
          <h2 className="text-xl font-bold text-slate-900">Contratar transporte</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Busca y cotiza servicios de transporte privado, rutas interurbanas y shuttles de
            aeropuerto. Compara opciones y elige la mejor para ti.
          </p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-rr-navy-700 transition-colors group-hover:text-rr-navy-900">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando…
              </>
            ) : (
              <>
                Empezar a cotizar
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </span>
        </button>

        {/* Ofrecer servicios */}
        <button
          type="button"
          onClick={() => setChoice('provider')}
          disabled={loading}
          className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-rr-navy-200 hover:shadow-xl hover:shadow-rr-navy-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rr-navy-600 to-rr-navy-800 text-white shadow-lg transition-transform group-hover:scale-110">
            <Briefcase className="h-7 w-7" />
          </span>
          <h2 className="text-xl font-bold text-slate-900">Ofrecer servicios de transporte</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Registra tu transportadora, publica tus vehículos y recibe solicitudes de clientes
            y agencias. Crece tu negocio en la plataforma.
          </p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-rr-navy-700 transition-colors group-hover:text-rr-navy-900">
            Registrar mi transportadora
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </button>
      </div>

      {/* Non-exclusive note */}
      <div className="mx-auto mt-10 flex max-w-2xl items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-rr-red-500" />
        <span>
          Ambas opciones están disponibles para tu cuenta. Si eliges contratar transporte ahora,
          podrás registrar tu transportadora más adelante desde tu panel.
        </span>
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-rr-navy-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Explorar RoutesRed sin elegir
        </Link>
      </div>
    </div>
  );
}
