/**
 * # LandingPage
 *
 * Public marketing landing page for RoutesRed.
 *
 * Sections:
 * 1. Hero — full-bleed highway background, slogan, CTAs.
 * 2. Product cards — the three upcoming products with "Próximamente" badges.
 * 3. Trust strip — stats / differentiators.
 * 4. Final CTA — registration call to action.
 *
 * Design: navy/red palette from the official logo, mobile-first,
 * subtle entrance animations via Tailwind utilities.
 *
 * @packageDocumentation
 */

import { type ReactNode } from 'react';
import {
  Bus,
  Route,
  Plane,
  ArrowRight,
  UserPlus,
  CheckCircle2,
  Shield,
  Clock,
  Star,
  Sparkles,
  Quote,
  MapPin,
  Navigation,
} from 'lucide-react';

import { Link } from '@/lib/router';

/* ------------------------------------------------------------------ *
 * Constants
 * ------------------------------------------------------------------ */

const HERO_IMAGE =
  'https://images.pexels.com/photos/18568374/pexels-photo-18568374.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop';

const CTA_IMAGE =
  'https://images.pexels.com/photos/38433023/pexels-photo-38433023.jpeg?auto=compress&cs=tinysrgb&w=1920&h=600&fit=crop';

/* ------------------------------------------------------------------ *
 * Data
 * ------------------------------------------------------------------ */

interface ProductCard {
  icon: typeof Bus;
  title: string;
  description: string;
  features: string[];
}

const PRODUCTS: ProductCard[] = [
  {
    icon: Bus,
    title: 'Transporte privado',
    description:
      'Solicita y recibe cotizaciones de múltiples transportadoras en un solo lugar. Compara precios, vehículos y amenidades en minutos.',
    features: [
      'Cotización instantánea',
      'Múltiples proveedores',
      'Comparación lado a lado',
    ],
  },
  {
    icon: Route,
    title: 'Rutas',
    description:
      'Transporte entre ciudades con horarios publicados y asientos reservables. Conectamos destinos de manera confiable.',
    features: [
      'Rutas interurbanas',
      'Reserva de asientos',
      'Horarios en tiempo real',
    ],
  },
  {
    icon: Plane,
    title: 'Aeropuerto',
    description:
      'Shuttles privados y compartidos desde y hacia los principales aeropuertos de México. Llega a tiempo, sin estrés.',
    features: [
      '23 aeropuertos cubiertos',
      'Servicio privado o compartido',
      'Seguimiento de vuelo',
    ],
  },
];

interface Stat {
  value: string;
  label: string;
}

const STATS: Stat[] = [
  { value: '23', label: 'Aeropuertos conectados' },
  { value: '500+', label: 'Transportadoras' },
  { value: '100K+', label: 'Viajes cotizados' },
  { value: '4.8', label: 'Calificación promedio' },
];

/* ------------------------------------------------------------------ *
 * LandingPage
 * ------------------------------------------------------------------ */

export function LandingPage(): ReactNode {
  return (
    <div className="overflow-hidden">
      <Hero />
      <ProductSection />
      <TrustStrip />
      <FinalCTA />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Hero
 * ------------------------------------------------------------------ */

function Hero(): ReactNode {
  return (
    <section className="relative isolate flex min-h-[88vh] items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        <img
          src={HERO_IMAGE}
          alt="Carretera al atardecer"
          className="h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 hero-overlay" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8 lg:pb-28 lg:pt-28">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="mb-6 inline-flex animate-fade-in-down items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-rr-red-400" />
            Plataforma de transporte en México
          </div>

          {/* Slogan */}
          <h1 className="animate-fade-in-up text-4xl font-extrabold leading-[1.1] tracking-tight text-white text-balance sm:text-5xl lg:text-6xl">
            Movemos personas,
            <br />
            <span className="text-rr-red-400">conectamos destinos.</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 max-w-2xl animate-fade-in-up text-lg leading-relaxed text-slate-200 sm:text-xl">
            Cotiza transporte privado, reserva rutas interurbanas y programa
            shuttles de aeropuerto — todo desde una sola plataforma.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex animate-fade-in-up flex-col items-start gap-4 sm:flex-row">
            <Link
              to="/registro"
              className="btn-primary w-full sm:w-auto"
            >
              <UserPlus className="h-5 w-5" />
              Crear cuenta gratis
            </Link>

            <span
              className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-7 py-3 text-base font-semibold text-slate-300 backdrop-blur-sm sm:w-auto"
              title="Próximamente"
            >
              <ArrowRight className="h-5 w-5" />
              Solicitar cotización
              <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                Pronto
              </span>
            </span>
          </div>

          {/* Quick assurance */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-rr-red-400" />
              Sin costo de registro
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-rr-red-400" />
              Transportadoras verificadas
            </span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-fade-in">
        <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/30 p-1.5">
          <div className="h-2 w-1 rounded-full bg-white/60" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Product section
 * ------------------------------------------------------------------ */

function ProductSection(): ReactNode {
  return (
    <section className="bg-white py-20 sm:py-28" id="productos">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-rr-navy-50 px-4 py-1.5 text-sm font-medium text-rr-navy-700">
            <Navigation className="h-4 w-4" />
            Nuestros servicios
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-rr-navy-900 sm:text-4xl">
            Una plataforma, tres soluciones
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Diseñado para viajeros, agencias y transportadoras. Elige el servicio
            que necesitas y nosotros nos encargamos del resto.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {PRODUCTS.map((product: ProductCard, index: number) => (
            <ProductCardItem key={product.title} product={product} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Product card
 * ------------------------------------------------------------------ */

interface ProductCardProps {
  product: ProductCard;
  index: number;
}

function ProductCardItem({ product, index }: ProductCardProps): ReactNode {
  const Icon = product.icon;
  const delay = 0.15 * (index + 1);

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 card-shadow transition-all duration-300 hover:-translate-y-1 hover:border-rr-navy-200 hover:card-shadow-hover animate-fade-in-up"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Badge */}
      <span className="absolute right-5 top-5 rounded-full bg-rr-navy-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-rr-navy-500">
        Próximamente
      </span>

      {/* Icon */}
      <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rr-navy-700 to-rr-navy-900 text-white shadow-lg transition-transform group-hover:scale-110">
        <Icon className="h-7 w-7" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-rr-navy-900">{product.title}</h3>

      {/* Description */}
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {product.description}
      </p>

      {/* Features */}
      <ul className="mt-6 space-y-2.5">
        {product.features.map((feature: string) => (
          <li key={feature} className="flex items-center gap-2.5 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-rr-red-500" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Trust strip
 * ------------------------------------------------------------------ */

function TrustStrip(): ReactNode {
  return (
    <section className="bg-gradient-to-b from-white to-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map((stat: Stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl font-extrabold text-rr-navy-900 sm:text-5xl">
                <span className="text-rr-red-600">{stat.value}</span>
              </div>
              <div className="mt-2 text-sm font-medium text-slate-500">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Differentiators */}
        <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-3">
          <Differentiator
            icon={Shield}
            title="Transportadoras verificadas"
            description="Validamos documentos, seguros y permisos de cada proveedor antes de listarlos."
          />
          <Differentiator
            icon={Clock}
            title="Cotización en minutos"
            description="Olvídate de las llamadas y correos. Recibe propuestas de múltiples proveedores en un solo lugar."
          />
          <Differentiator
            icon={Star}
            title="Reseñas reales"
            description="Calificaciones de viajeros que ya utilizaron el servicio. Tú decides con información."
          />
        </div>

        {/* Testimonial */}
        <div className="mx-auto mt-20 max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 card-shadow sm:p-10">
          <Quote className="mx-auto h-8 w-8 text-rr-red-400" />
          <p className="mt-4 text-center text-lg font-medium leading-relaxed text-slate-700">
            "Con RoutesRed pudimos comparar cinco transportadoras para nuestro
            traslado corporativo y elegir la mejor opción en menos de diez minutos."
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rr-navy-600 to-rr-navy-800" />
            <div className="text-left">
              <div className="text-sm font-semibold text-rr-navy-900">María González</div>
              <div className="text-xs text-slate-500">Coordinadora de eventos</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Differentiator
 * ------------------------------------------------------------------ */

interface DifferentiatorProps {
  icon: typeof Shield;
  title: string;
  description: string;
}

function Differentiator({ icon, title, description }: DifferentiatorProps): ReactNode {
  const Icon = icon;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-rr-navy-50 text-rr-navy-700">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-rr-navy-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Final CTA
 * ------------------------------------------------------------------ */

function FinalCTA(): ReactNode {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-rr-navy-900/20">
          {/* Background */}
          <img
            src={CTA_IMAGE}
            alt="Carretera entre bosques"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-rr-navy-900/92 to-rr-navy-800/85" />

          <div className="relative px-6 py-16 text-center sm:px-12 sm:py-20">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl text-balance">
              Comienza a mover personas hoy
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-200">
              Crea tu cuenta gratuita y mantente al tanto del lanzamiento de cada
              producto. Sin compromiso, sin costos ocultos.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/registro"
                className="btn-primary"
              >
                <UserPlus className="h-5 w-5" />
                Crear cuenta gratis
              </Link>
              <Link
                to="/transportadoras"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:w-auto"
              >
                Ver transportadoras
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
