/**
 * # LoginPage
 *
 * RoutesRed login with email/password, Turnstile CAPTCHA,
 * pre-login risk check, OAuth (Google/Azure), and anti-enumeration.
 *
 * Flow: check-login-risk → Turnstile → signInWithPassword →
 * is_active check → register_platform_access → redirect.
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
  ShieldAlert,
} from 'lucide-react';

import { Link, useRoute } from '@/lib/router';
import { useAuth } from '@/context/AuthContext';
import {
  supabase,
  computeDeviceFingerprint,
  checkLoginRisk,
  signInWithEmail,
  registerPlatformAccess,
  signInWithGoogle,
  signInWithAzure,
  fetchOAuthToggles,
  type OAuthToggles,
} from '@/lib/supabase';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import { useTurnstileEnabled } from '@/hooks/useTurnstileEnabled';
import type { UserPlatform } from '@/types';

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

export function LoginPage(): ReactNode {
  const { signIn } = useAuth();
  const { navigate } = useRoute();
  const { turnstileEnabled, loading: turnstileLoading } = useTurnstileEnabled();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [oauthToggles, setOauthToggles] = useState<OAuthToggles | null>(null);
  const [oauthLoading, setOauthLoading] = useState<boolean>(false);

  // Load OAuth toggles once
  if (!oauthToggles && !oauthLoading) {
    setOauthLoading(true);
    void fetchOAuthToggles().then((toggles: OAuthToggles): void => {
      setOauthToggles(toggles);
      setOauthLoading(false);
    });
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitError(null);

    const errors: FieldErrors = validateFields(email, password);
    setFieldErrors(errors);
    if (errors.email || errors.password) return;

    if (turnstileEnabled && !turnstileToken) {
      setSubmitError('Completa el verificador de seguridad.');
      return;
    }

    setLoading(true);
    const cleanEmail: string = email.trim();

    // Pre-login risk check
    const fingerprint: string = computeDeviceFingerprint();
    const risk = await checkLoginRisk(cleanEmail, fingerprint);

    if (risk?.ip_blocked) {
      setSubmitError('Demasiados intentos fallidos desde tu red. Intenta más tarde.');
      setLoading(false);
      return;
    }

    if (risk?.delay_ms && risk.delay_ms > 0) {
      await new Promise((resolve: (v: void) => void): void => {
        setTimeout(resolve, risk.delay_ms);
      });
    }

    // Sign in with captcha token if available
    const result = await signInWithEmail(cleanEmail, password, turnstileToken || undefined);

    if (!result.ok) {
      if (result.userBlocked) {
        setSubmitError('Su cuenta ha sido bloqueada. Contacta al soporte.');
      } else {
        setSubmitError(
          'El correo o la contraseña son incorrectos. Verifica tus datos e inténtalo de nuevo.'
        );
      }
      setLoading(false);
      setTurnstileToken('');
      return;
    }

    // Login succeeded — register platform access
    try {
      const platformRow = await registerPlatformAccess();
      if (platformRow && platformRow.onboarding_completed) {
        navigate('/', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch {
      navigate('/onboarding', { replace: true });
    }
  };

  const handleGoogle = async (): Promise<void> => {
    void signInWithGoogle();
  };

  const handleAzure = async (): Promise<void> => {
    void signInWithAzure();
  };

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

        {submitError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
          >
            {submitError.includes('bloqueada') ? (
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            )}
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">
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
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">
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

          {/* Remember me + forgot password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-rr-navy-600 focus:ring-rr-navy-400"
              />
              Recordarme
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-rr-navy-700 transition-colors hover:text-rr-navy-900"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Turnstile */}
          {turnstileEnabled && !turnstileLoading && (
            <div className="flex justify-center">
              <TurnstileWidget
                onToken={(token: string) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken('')}
                onError={() => setTurnstileToken('')}
              />
            </div>
          )}

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

        {/* OAuth divider + buttons */}
        {oauthToggles && (oauthToggles.google || oauthToggles.azure) && (
          <>
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">o</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-2.5">
              {oauthToggles.google && (
                <button
                  type="button"
                  onClick={() => void handleGoogle()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuar con Google
                </button>
              )}
              {oauthToggles.azure && (
                <button
                  type="button"
                  onClick={() => void handleAzure()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 23 23">
                    <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                  </svg>
                  Continuar con Microsoft
                </button>
              )}
            </div>
          </>
        )}

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
