/**
 * # LoginPage
 *
 * Full email/password login page for the RoutesRed platform.
 *
 * Features:
 * - Email + password fields with inline validation.
 * - Show/hide password toggle.
 * - Granular error handling: invalid credentials, unverified email,
 *   network errors.
 * - "Forgot password?" link to `/forgot-password`.
 * - Link to `/registro`.
 * - After successful login, calls the `routesred.register_platform_access`
 *   RPC and redirects based on the returned `onboarding_completed` flag.
 *
 * @packageDocumentation
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  LogIn,
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { Link, useRoute } from '@/lib/router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { UserPlatform } from '@/types';

/* ------------------------------------------------------------------ *
 * Validation helpers
 * ------------------------------------------------------------------ */

/** Minimal RFC-5322-ish email pattern for client-side validation. */
const EMAIL_RE: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

function validateFields(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) {
    errors.email = 'Ingresa tu correo electrónico.';
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.email = 'El correo no tiene un formato válido.';
  }
  if (!password) {
    errors.password = 'Ingresa tu contraseña.';
  }
  return errors;
}

/**
 * Map a raw Supabase auth error message to a user-friendly Spanish string.
 *
 * Detects three classes: invalid credentials, unverified email, and
 * network failures. Anything else falls back to a generic message.
 */
function mapAuthError(rawMessage: string): string {
  const lower: string = rawMessage.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'El correo o la contraseña son incorrectos. Verifica tus datos e inténtalo de nuevo.';
  }
  if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    return 'Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada (y spam) para el enlace de verificación.';
  }
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('connection')
  ) {
    return 'Error de conexión. Verifica tu internet e inténtalo de nuevo.';
  }
  return rawMessage || 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

/* ------------------------------------------------------------------ *
 * LoginPage
 * ------------------------------------------------------------------ */

export function LoginPage(): ReactNode {
  const { signIn } = useAuth();
  const { navigate } = useRoute();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  /* ---- Submit ---- */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitError(null);

    const errors: FieldErrors = validateFields(email, password);
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      return;
    }

    setLoading(true);
    const cleanEmail: string = email.trim();

    const result = await signIn(cleanEmail, password);
    if (!result.ok) {
      setSubmitError(mapAuthError(result.error ?? ''));
      setLoading(false);
      return;
    }

    // Login succeeded — register platform access and read onboarding status.
    try {
      const { data, error } = await supabase.rpc('register_platform_access', {
        p_platform: 'routesred',
        p_source: 'routesred',
      });

      if (error) {
        // Non-fatal: default to onboarding so the user can still proceed.
        navigate('/onboarding', { replace: true });
        return;
      }

      const platformRow = data as UserPlatform | null;
      if (platformRow && platformRow.onboarding_completed) {
        navigate('/', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch {
      // Network or unexpected error — send to onboarding as a safe default.
      navigate('/onboarding', { replace: true });
    }
  };

  /* ---- Render ---- */
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-rr-navy-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rr-navy-700 to-rr-navy-900 text-white">
            <LogIn className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Iniciar sesión</h1>
            <p className="text-sm text-slate-500">Accede a tu cuenta de RoutesRed</p>
          </div>
        </div>

        {/* Global error banner */}
        {submitError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev: FieldErrors) => ({ ...prev, email: undefined }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  fieldErrors.email
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-slate-300 focus:border-rr-navy-500 focus:ring-rr-navy-400'
                }`}
                placeholder="tu@correo.com"
              />
            </div>
            {fieldErrors.email && (
              <p id="login-email-error" className="mt-1.5 text-xs text-red-600">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev: FieldErrors) => ({ ...prev, password: undefined }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                className={`w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  fieldErrors.password
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-slate-300 focus:border-rr-navy-500 focus:ring-rr-navy-400'
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v: boolean) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="login-password-error" className="mt-1.5 text-xs text-red-600">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Forgot password link */}
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-rr-navy-700 transition-colors hover:text-rr-navy-900"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rr-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-rr-red-600/20 transition-all hover:bg-rr-red-700 hover:shadow-lg hover:shadow-rr-red-600/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Iniciando sesión…
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Iniciar sesión
              </>
            )}
          </button>
        </form>

        {/* Register link */}
        <p className="mt-6 text-center text-sm text-slate-500">
          ¿No tienes cuenta?{' '}
          <Link
            to="/registro"
            className="font-semibold text-rr-navy-700 transition-colors hover:text-rr-navy-900"
          >
            Regístrate gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
