/**
 * # PublicLayout
 *
 * Shared chrome for all public (unauthenticated) RoutesRed pages.
 *
 * Renders a navy/blue navigation bar with the RoutesRed logo and
 * primary links, a responsive mobile menu, a content slot, and a
 * footer. Disabled links (upcoming features) are rendered as inert
 * spans with a muted style and a small "Próximamente" hint.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Menu,
  X,
  LogIn,
  UserPlus,
  ChevronRight,
  Globe,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

import { Link, useRoute } from '@/lib/router';

/* ------------------------------------------------------------------ *
 * Nav model
 * ------------------------------------------------------------------ */

interface NavItem {
  to: string;
  label: string;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio' },
  { to: '/transportadoras', label: 'Transportadoras' },
  { to: '/cotizar', label: 'Cotizar', disabled: true },
  { to: '/rutas', label: 'Rutas', disabled: true },
  { to: '/aeropuertos', label: 'Aeropuertos', disabled: true },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { to: '/login', label: 'Iniciar sesión' },
  { to: '/registro', label: 'Registrarse' },
];

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function isActive(currentPath: string, item: NavItem): boolean {
  if (item.to === '/') return currentPath === '/';
  return currentPath === item.to || currentPath.startsWith(`${item.to}/`);
}

/* ------------------------------------------------------------------ *
 * Logo
 * ------------------------------------------------------------------ */

function Logo({ variant = 'dark' }: { variant?: 'dark' | 'light' }): ReactNode {
  const textColor = variant === 'light' ? 'text-white' : 'text-rr-navy-800';
  return (
    <Link to="/" className="flex items-center gap-2.5 group" aria-label="RoutesRed inicio">
      <img
        src="/images/routesred-logo.png"
        alt="RoutesRed"
        className="h-11 w-11 rounded-lg object-cover transition-transform group-hover:scale-105"
      />
      <span className={`text-lg font-extrabold tracking-tight ${textColor}`}>
        Routes<span className="text-rr-red-600">Red</span>
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ *
 * Nav link
 * ------------------------------------------------------------------ */

interface NavLinkProps {
  item: NavItem;
  currentPath: string;
  onNavigate?: () => void;
}

function NavLink({ item, currentPath, onNavigate }: NavLinkProps): ReactNode {
  const active = isActive(currentPath, item);

  if (item.disabled) {
    return (
      <span
        className="inline-flex items-center gap-1.5 cursor-not-allowed text-sm font-medium text-slate-400"
        title="Próximamente"
      >
        {item.label}
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Pronto
        </span>
      </span>
    );
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`relative text-sm font-medium transition-colors ${
        active
          ? 'text-rr-red-600'
          : 'text-slate-600 hover:text-rr-red-600'
      }`}
    >
      {item.label}
      {active && (
        <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-rr-red-500" />
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ *
 * PublicLayout
 * ------------------------------------------------------------------ */

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps): ReactNode {
  const { path } = useRoute();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);

  const closeMobile = useCallback((): void => setMobileOpen(false), []);

  // Detect scroll for navbar style change
  useEffect((): (() => void) => {
    const onScroll = (): void => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* ---- Header ---- */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 shadow-sm backdrop-blur-md'
            : 'bg-white/80 backdrop-blur-sm'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegación principal">
            {NAV_ITEMS.map((item: NavItem) => (
              <NavLink key={item.to} item={item} currentPath={path} />
            ))}
          </nav>

          {/* Desktop account actions */}
          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-rr-navy-700"
            >
              <LogIn className="h-4 w-4" />
              Iniciar sesión
            </Link>
            <Link
              to="/registro"
              className="inline-flex items-center gap-1.5 rounded-xl bg-rr-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-rr-red-600/20 transition-all hover:bg-rr-red-700 hover:shadow-lg hover:shadow-rr-red-600/30"
            >
              <UserPlus className="h-4 w-4" />
              Registrarse
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen((v: boolean) => !v)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-rr-navy-700 transition-colors hover:bg-slate-100 lg:hidden"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* ---- Mobile menu ---- */}
        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white lg:hidden">
            <nav className="mx-auto max-w-7xl space-y-1 px-4 py-3 sm:px-6" aria-label="Navegación móvil">
              {NAV_ITEMS.map((item: NavItem) => (
                <MobileLink key={item.to} item={item} currentPath={path} onNavigate={closeMobile} />
              ))}
              <div className="my-2 h-px bg-slate-100" />
              {ACCOUNT_ITEMS.map((item: NavItem) => (
                <MobileLink key={item.to} item={item} currentPath={path} onNavigate={closeMobile} />
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ---- Content ---- */}
      <main className="flex-1">{children}</main>

      {/* ---- Footer ---- */}
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Mobile link
 * ------------------------------------------------------------------ */

interface MobileLinkProps {
  item: NavItem;
  currentPath: string;
  onNavigate: () => void;
}

function MobileLink({ item, currentPath, onNavigate }: MobileLinkProps): ReactNode {
  const active = isActive(currentPath, item);

  if (item.disabled) {
    return (
      <span className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400">
        {item.label}
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Pronto
        </span>
      </span>
    );
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-rr-navy-50 text-rr-navy-700'
          : 'text-slate-700 hover:bg-slate-50 hover:text-rr-navy-700'
      }`}
    >
      {item.label}
      <ChevronRight className="h-4 w-4 opacity-50" />
    </Link>
  );
}

/* ------------------------------------------------------------------ *
 * Footer
 * ------------------------------------------------------------------ */

function Footer(): ReactNode {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-rr-navy-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <img
                src="/images/routesred-logo.png"
                alt="RoutesRed"
                className="h-10 w-10 rounded-lg object-cover"
              />
              <span className="text-lg font-extrabold tracking-tight text-white">
                Routes<span className="text-rr-red-500">Red</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Movemos personas, conectamos destinos. La plataforma de transporte
              privado y logística de México.
            </p>
          </div>

          {/* Productos */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Productos
            </h3>
            <ul className="mt-4 space-y-3">
              <FooterLink to="/cotizar" label="Cotizar transporte" disabled />
              <FooterLink to="/rutas" label="Rutas interurbanas" disabled />
              <FooterLink to="/aeropuertos" label="Shuttles de aeropuerto" disabled />
            </ul>
          </div>

          {/* Plataforma */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Plataforma
            </h3>
            <ul className="mt-4 space-y-3">
              <FooterLink to="/transportadoras" label="Directorio de transportadoras" />
              <FooterLink to="/registro" label="Crear cuenta" />
              <FooterLink to="/login" label="Iniciar sesión" />
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Contacto
            </h3>
            <ul className="mt-4 space-y-3">
              <li className="flex items-center gap-2 text-sm text-slate-400">
                <Mail className="h-4 w-4 text-rr-red-500" />
                hola@routesred.com
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-400">
                <Phone className="h-4 w-4 text-rr-red-500" />
                +52 55 0000 0000
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-400">
                <MapPin className="h-4 w-4 text-rr-red-500" />
                México
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">
            © {year} RoutesRed. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <span className="cursor-default transition-colors hover:text-slate-300">Términos de servicio</span>
            <span className="cursor-default transition-colors hover:text-slate-300">Privacidad</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ *
 * Footer link
 * ------------------------------------------------------------------ */

interface FooterLinkProps {
  to: string;
  label: string;
  disabled?: boolean;
}

function FooterLink({ to, label, disabled }: FooterLinkProps): ReactNode {
  if (disabled) {
    return (
      <li>
        <span className="text-sm text-slate-500">
          {label}
          <span className="ml-1.5 rounded bg-white/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            Pronto
          </span>
        </span>
      </li>
    );
  }
  return (
    <li>
      <Link to={to} className="text-sm text-slate-400 transition-colors hover:text-white">
        {label}
      </Link>
    </li>
  );
}
