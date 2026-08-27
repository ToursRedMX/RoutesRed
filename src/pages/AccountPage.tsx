/**
 * # AccountPage
 *
 * Placeholder authenticated account page. The real account/settings
 * UI will replace this; for now it renders a minimal shell so the
 * route compiles and is reachable.
 *
 * @packageDocumentation
 */

import { type ReactNode } from 'react';
import { User, LogOut } from 'lucide-react';

import { Link, useRoute } from '@/lib/router';
import { useAuth } from '@/context/AuthContext';

export function AccountPage(): ReactNode {
  const { user, signOut } = useAuth();
  const { navigate } = useRoute();

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="text-sm font-medium text-rr-navy-700 hover:text-rr-navy-900"
          >
            ← Inicio
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rr-navy-700 to-rr-navy-900 text-white">
              <User className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Mi cuenta</h1>
              <p className="text-sm text-slate-500">
                {user?.email ?? 'Usuario autenticado'}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            La gestión de cuenta estará disponible próximamente.
          </p>
        </div>
      </div>
    </div>
  );
}
