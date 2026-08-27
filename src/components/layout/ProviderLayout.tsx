/**
 * # ProviderLayout
 *
 * Dashboard shell for all authenticated provider pages.
 *
 * Renders a teal/blue themed sidebar with primary navigation
 * (Inicio, Mi perfil de proveedor, Vehículos, Operadores, Documentos,
 * Configuración) and disabled "Próximamente" items (Solicitudes,
 * Cotizaciones, Reservas, Rutas, Shuttles, Finanzas). The top bar
 * shows the provider name, a Cliente ↔ Proveedor context switcher, and
 * a user menu with sign-out.
 *
 * On mobile the sidebar collapses behind a hamburger button and slides
 * in as an overlay.
 *
 * Uses the terminology "Proveedor" rather than "Empresa" generically,
 * since a provider may be either an individual or a company.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Bus,
  LayoutDashboard,
  UserCircle,
  Car,
  Users,
  FileText,
  Settings,
  ClipboardList,
  FileSpreadsheet,
  CalendarCheck,
  Route,
  Plane,
  Wallet,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Repeat,
} from 'lucide-react';

import { Link, useRoute } from '@/lib/router';
import { useAuth } from '@/context/AuthContext';
import { useProvider } from '@/hooks/useProvider';
import type { LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ *
 * Nav model
 * ------------------------------------------------------------------ */

/** A single sidebar navigation entry. */
interface NavItem {
  /** Destination path (used only when `disabled` is false). */
  to: string;
  /** Display label. */
  label: string;
  /** Lucide icon component. */
  icon: LucideIcon;
  /** Whether the feature is disabled / upcoming. */
  disabled?: boolean;
  /** Trailing badge text for disabled items. */
  badge?: string;
}

/** Primary navigation (enabled). */
const PRIMARY_NAV: NavItem[] = [
  { to: '/provider', label: 'Inicio', icon: LayoutDashboard },
  { to: '/provider/perfil', label: 'Mi perfil de proveedor', icon: UserCircle },
  { to: '/provider/vehiculos', label: 'Vehículos', icon: Car },
  { to: '/provider/operadores', label: 'Operadores', icon: Users },
  { to: '/provider/documentos', label: 'Documentos', icon: FileText },
  { to: '/provider/configuracion', label: 'Configuración', icon: Settings },
];

/** Upcoming navigation (disabled with "Próximamente" badge). */
const UPCOMING_NAV: NavItem[] = [
  { to: '/provider/solicitudes', label: 'Solicitudes', icon: ClipboardList, disabled: true, badge: 'Próximamente' },
  { to: '/provider/cotizaciones', label: 'Cotizaciones', icon: FileSpreadsheet, disabled: true, badge: 'Próximamente' },
  { to: '/provider/reservas', label: 'Reservas', icon: CalendarCheck, disabled: true, badge: 'Próximamente' },
  { to: '/provider/rutas', label: 'Rutas', icon: Route, disabled: true, badge: 'Próximamente' },
  { to: '/provider/shuttles', label: 'Shuttles', icon: Plane, disabled: true, badge: 'Próximamente' },
  { to: '/provider/finanzas', label: 'Finanzas', icon: Wallet, disabled: true, badge: 'Próximamente' },
];

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/**
 * Determine whether a nav item is active for the current path.
 *
 * The "Inicio" item (`/provider`) is active only on the exact path;
 * other items are active when the current path starts with the item's
 * destination.
 */
function isActive(currentPath: string, item: NavItem): boolean {
  if (item.to === '/provider') {
    return currentPath === '/provider';
  }
  return currentPath === item.to || currentPath.startsWith(`${item.to}/`);
}

/**
 * Derive a display name for the provider (trade name > legal name >
 * first+last name > fallback).
 */
function providerDisplayName(provider: {
  trade_name: string | null;
  legal_name: string | null;
  first_name: string | null;
  last_name: string | null;
}): string {
  if (provider.trade_name) return provider.trade_name;
  if (provider.legal_name) return provider.legal_name;
  const full: string = `${provider.first_name ?? ''} ${provider.last_name ?? ''}`.trim();
  return full || 'Mi proveedor';
}

/* ------------------------------------------------------------------ *
 * ProviderLayout
 * ------------------------------------------------------------------ */

interface ProviderLayoutProps {
  children: ReactNode;
}

/**
 * Provider dashboard shell: sidebar + top bar + content slot.
 */
export function ProviderLayout({ children }: ProviderLayoutProps): ReactNode {
  const { path } = useRoute();
  const { user, signOut } = useAuth();
  const { provider, loading } = useProvider();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  // Close the mobile sidebar and user menu whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [path]);

  const closeMobile = useCallback((): void => {
    setMobileOpen(false);
  }, []);

  const handleSignOut = useCallback(async (): Promise<void> => {
    await signOut();
    window.location.hash = '#/';
  }, [signOut]);

  const providerName: string = provider
    ? providerDisplayName(provider)
    : loading
      ? 'Cargando…'
      : 'Sin proveedor';

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ---- Sidebar (desktop + mobile drawer) ---- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-slate-200 bg-rr-navy-900 transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
            <Link to="/" className="flex items-center gap-2.5" aria-label="RoutesRed inicio">
              <img
                src="/images/routesred-logo.png"
                alt="RoutesRed"
                className="h-9 w-9 rounded-lg object-cover"
              />
              <span className="flex flex-col leading-none">
                <span className="text-base font-extrabold tracking-tight text-white">
                  Routes<span className="text-rr-red-500">Red</span>
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Panel de proveedor
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={closeMobile}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Navegación de proveedor">
            <div className="space-y-1">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Gestión
              </p>
              {PRIMARY_NAV.map((item: NavItem) => (
                <SidebarLink key={item.to} item={item} currentPath={path} onNavigate={closeMobile} />
              ))}
            </div>

            <div className="space-y-1">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Operación
              </p>
              {UPCOMING_NAV.map((item: NavItem) => (
                <SidebarLink key={item.to} item={item} currentPath={path} onNavigate={closeMobile} />
              ))}
            </div>
          </nav>

          {/* Sidebar footer */}
          <div className="border-t border-white/10 p-4">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Volver al sitio
            </Link>
          </div>
        </div>
      </aside>

      {/* ---- Mobile overlay ---- */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* ---- Main column ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6">
          {/* Left: mobile toggle + provider name */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((v: boolean) => !v)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2.5">
              <img
                src="/images/routesred-logo.png"
                alt="RoutesRed"
                className="hidden h-9 w-9 rounded-lg object-cover sm:flex"
              />
              <div className="leading-tight">
                <p className="text-sm font-semibold text-rr-navy-900">{providerName}</p>
                <p className="text-xs text-slate-400">Panel de proveedor</p>
              </div>
            </div>
          </div>

          {/* Right: context switcher + user menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Context switcher Cliente ↔ Proveedor */}
            <ContextSwitcher current="provider" />

            {/* User menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v: boolean) => !v)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rr-navy-100 text-xs font-bold text-rr-navy-700">
                  {(user?.email ?? '?').charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[160px] truncate sm:block">
                  {user?.email ?? 'Usuario'}
                </span>
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    role="menu"
                    className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                  >
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {user?.email ?? 'Usuario'}
                      </p>
                      <p className="text-xs text-slate-400">Proveedor</p>
                    </div>
                    <Link
                      to="/provider/configuracion"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      role="menuitem"
                    >
                      <Settings className="h-4 w-4 text-slate-400" />
                      Configuración
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Sidebar link
 * ------------------------------------------------------------------ */

interface SidebarLinkProps {
  item: NavItem;
  currentPath: string;
  onNavigate: () => void;
}

/** A single sidebar navigation row. */
function SidebarLink({ item, currentPath, onNavigate }: SidebarLinkProps): ReactNode {
  const active: boolean = isActive(currentPath, item);
  const Icon: LucideIcon = item.icon;

  if (item.disabled) {
    return (
      <span
        className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500"
        title={item.badge ?? 'Próximamente'}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {item.badge}
          </span>
        )}
      </span>
    );
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-rr-red-600 text-white'
          : 'text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon
        className={`h-5 w-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400'}`}
      />
      <span className="flex-1">{item.label}</span>
      {active && <span className="h-1.5 w-1.5 rounded-full bg-rr-red-300" />}
    </Link>
  );
}

/* ------------------------------------------------------------------ *
 * Context switcher
 * ------------------------------------------------------------------ */

interface ContextSwitcherProps {
  current: 'client' | 'provider';
}

/**
 * A compact Cliente ↔ Proveedor toggle. When the user is on the
 * provider dashboard, switching to "Cliente" navigates to the client
 * home; otherwise it would go to the provider dashboard.
 */
function ContextSwitcher({ current }: ContextSwitcherProps): ReactNode {
  const { navigate } = useRoute();

  const handleSwitch = useCallback((): void => {
    if (current === 'provider') {
      navigate('/');
    } else {
      navigate('/provider');
    }
  }, [current, navigate]);

  return (
    <button
      type="button"
      onClick={handleSwitch}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
      title="Cambiar entre vista de cliente y proveedor"
    >
      <Repeat className="h-3.5 w-3.5 text-rr-red-500" />
      <span
        className={
          current === 'client' ? 'font-semibold text-rr-navy-700' : 'text-slate-400'
        }
      >
        Cliente
      </span>
      <span className="text-slate-300">/</span>
      <span
        className={
          current === 'provider' ? 'font-semibold text-rr-navy-700' : 'text-slate-400'
        }
      >
        Proveedor
      </span>
    </button>
  );
}
