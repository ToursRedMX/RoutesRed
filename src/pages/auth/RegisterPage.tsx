/**
 * # RegisterPage
 *
 * Full registration page for the RoutesRed platform.
 *
 * Fields: first name, last name, email, password, confirm password, and a
 * required terms/privacy acceptance checkbox.
 *
 * On submit:
 * 1. `signUp` via {@link useAuth} — creates `auth.users` and, if a session
 *    is returned immediately, inserts `public.users` with `role='traveler'`.
 * 2. If a session exists after signup, calls the
 *    `routesred.register_platform_access('routesred', 'routesred')` RPC.
 * 3. If email confirmation is required (no session), shows a "check your
 *    email" confirmation screen.
 *
 * If the email already exists, shows a message offering login or recovery.
 *
 * @packageDocumentation
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  UserPlus,
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

import { Link, useRoute } from '@/lib/router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

/* ------------------------------------------------------------------ *
 * Validation helpers
 * ------------------------------------------------------------------ */

const EMAIL_RE: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH: number = 8;

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

function validateFields(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!input.firstName.trim()) {
    errors.firstName = 'Ingresa tu nombre.';
  }
  if (!input.lastName.trim()) {
    errors.lastName = 'Ingresa tus apellidos.';
  }

  if (!input.email.trim()) {
    errors.email = 'Ingresa tu correo electrónico.';
  } else if (!EMAIL_RE.test(input.email.trim())) {
    errors.email = 'El correo no tiene un formato válido.';
  }

  if (!input.password) {
    errors.password = 'Ingresa una contraseña.';
  } else if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (!input.confirmPassword) {
    errors.confirmPassword = 'Confirma tu contraseña.';
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden.';
  }

  if (!input.terms) {
    errors.terms = 'Debes aceptar los términos y la política de privacidad.';
  }

  return errors;
}

/* ------------------------------------------------------------------ *
 * RegisterPage
 * ------------------------------------------------------------------ */

export function RegisterPage(): ReactNode {
  const { signUp } = useAuth();
  const { navigate } = useRoute();

  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [terms, setTerms] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [emailExists, setEmailExists] = useState<boolean>(false);
  const [confirmationDone, setConfirmationDone] = useState<boolean>(false);

  /* ---- Submit ---- */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitError(null);
    setEmailExists(false);

    const errors: FieldErrors = validateFields({
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      terms,
    });
    setFieldErrors(errors);
    if (
      errors.firstName ||
      errors.lastName ||
      errors.email ||
      errors.password ||
      errors.confirmPassword ||
      errors.terms
    ) {
      return;
    }

    setLoading(true);
    const cleanEmail: string = email.trim();

    const result = await signUp(cleanEmail, password, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      emailRedirectTo: `${window.location.origin}/#/login`,
    });

    if (!result.ok) {
      const lower: string = (result.error ?? '').toLowerCase();
      if (
        lower.includes('already') &&
        (lower.includes('registered') || lower.includes('exists') || lower.includes('in use'))
      ) {
        setEmailExists(true);
      } else {
        setSubmitError(result.error ?? 'Ocurrió un error al crear tu cuenta.');
      }
      setLoading(false);
      return;
    }

    // Non-fatal profile warning from AuthContext (rare).
    if (result.ok && result.error) {
      setSubmitError(result.error);
    }

    // Register platform access if the user is already authenticated
    // (email confirmation disabled). If confirmation is required, there is
    // no session yet, so we skip the RPC — it runs on first login.
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      try {
        await supabase.rpc('register_platform_access', {
          p_platform: 'routesred',
          p_source: 'routesred',
        });
      } catch {
        // Non-fatal; onboarding/login flow will retry.
      }
      navigate('/onboarding', { replace: true });
      return;
    }

    // No session → email confirmation required.
    setConfirmationDone(true);
    setLoading(false);
  };

  /* ---- Confirmation screen (email verification required) ---- */
  if (confirmationDone) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rr-navy-50">
            <CheckCircle2 className="h-7 w-7 text-rr-navy-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Revisa tu correo</h1>
          <p className="mt-3 text-sm text-slate-600">
            Hemos enviado un enlace de confirmación a{' '}
            <span className="font-semibold text-slate-900">{email.trim()}</span>. Haz clic en el
            enlace para activar tu cuenta y continuar.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            ¿No recibiste el correo? Revisa tu carpeta de spam.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rr-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-rr-red-600/20 transition-all hover:bg-rr-red-700 hover:shadow-lg hover:shadow-rr-red-600/30"
            >
              Ir a iniciar sesión
            </Link>
            <Link
              to="/"
              className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-rr-navy-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Form ---- */
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
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Crear cuenta</h1>
            <p className="text-sm text-slate-500">Regístrate gratis en RoutesRed</p>
          </div>
        </div>

        {/* Email-exists banner */}
        {emailExists && (
          <div
            role="alert"
            className="mb-5 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                Ya existe una cuenta con este correo. Puedes iniciar sesión o recuperar tu
                contraseña si no la recuerdas.
              </span>
            </div>
            <div className="flex flex-wrap gap-3 pl-6">
              <Link to="/login" className="font-semibold text-rr-navy-700 hover:text-rr-navy-900">
                Iniciar sesión
              </Link>
              <Link
                to="/forgot-password"
                className="font-semibold text-rr-navy-700 hover:text-rr-navy-900"
              >
                Recuperar contraseña
              </Link>
            </div>
          </div>
        )}

        {/* Generic error banner */}
        {submitError && !emailExists && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* First name */}
          <div>
            <label htmlFor="reg-firstname" className="mb-1.5 block text-sm font-medium text-slate-700">
              Nombre
            </label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="reg-firstname"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (fieldErrors.firstName) {
                    setFieldErrors((prev: FieldErrors) => ({ ...prev, firstName: undefined }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.firstName)}
                aria-describedby={fieldErrors.firstName ? 'reg-firstname-error' : undefined}
                className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  fieldErrors.firstName
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-slate-300 focus:border-rr-navy-500 focus:ring-rr-navy-400'
                }`}
                placeholder="Tu nombre"
              />
            </div>
            {fieldErrors.firstName && (
              <p id="reg-firstname-error" className="mt-1.5 text-xs text-red-600">
                {fieldErrors.firstName}
              </p>
            )}
          </div>

          {/* Last name */}
          <div>
            <label htmlFor="reg-lastname" className="mb-1.5 block text-sm font-medium text-slate-700">
              Apellidos
            </label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="reg-lastname"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (fieldErrors.lastName) {
                    setFieldErrors((prev: FieldErrors) => ({ ...prev, lastName: undefined }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.lastName)}
                aria-describedby={fieldErrors.lastName ? 'reg-lastname-error' : undefined}
                className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  fieldErrors.lastName
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-slate-300 focus:border-rr-navy-500 focus:ring-rr-navy-400'
                }`}
                placeholder="Tus apellidos"
              />
            </div>
            {fieldErrors.lastName && (
              <p id="reg-lastname-error" className="mt-1.5 text-xs text-red-600">
                {fieldErrors.lastName}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailExists(false);
                  if (fieldErrors.email) {
                    setFieldErrors((prev: FieldErrors) => ({ ...prev, email: undefined }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'reg-email-error' : undefined}
                className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  fieldErrors.email
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-slate-300 focus:border-rr-navy-500 focus:ring-rr-navy-400'
                }`}
                placeholder="tu@correo.com"
              />
            </div>
            {fieldErrors.email && (
              <p id="reg-email-error" className="mt-1.5 text-xs text-red-600">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="reg-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev: FieldErrors) => ({ ...prev, password: undefined }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'reg-password-error' : undefined}
                className={`w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  fieldErrors.password
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-slate-300 focus:border-rr-navy-500 focus:ring-rr-navy-400'
                }`}
                placeholder="Mínimo 8 caracteres"
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
              <p id="reg-password-error" className="mt-1.5 text-xs text-red-600">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label
              htmlFor="reg-confirm"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Confirmar contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="reg-confirm"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev: FieldErrors) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? 'reg-confirm-error' : undefined}
                className={`w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  fieldErrors.confirmPassword
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-slate-300 focus:border-rr-navy-500 focus:ring-rr-navy-400'
                }`}
                placeholder="Repite tu contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v: boolean) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p id="reg-confirm-error" className="mt-1.5 text-xs text-red-600">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Terms checkbox */}
          <div>
            <label className="flex items-start gap-2.5 text-sm text-slate-600">
              <input
                id="reg-terms"
                name="terms"
                type="checkbox"
                checked={terms}
                onChange={(e) => {
                  setTerms(e.target.checked);
                  if (fieldErrors.terms) {
                    setFieldErrors((prev: FieldErrors) => ({ ...prev, terms: undefined }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.terms)}
                aria-describedby={fieldErrors.terms ? 'reg-terms-error' : undefined}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rr-navy-600 focus:ring-rr-navy-400"
              />
              <span>
                Acepto los{' '}
                <span className="font-medium text-rr-navy-700">términos de servicio</span> y la{' '}
                <span className="font-medium text-rr-navy-700">política de privacidad</span> de
                RoutesRed.
              </span>
            </label>
            {fieldErrors.terms && (
              <p id="reg-terms-error" className="mt-1.5 text-xs text-red-600">
                {fieldErrors.terms}
              </p>
            )}
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
                Creando cuenta…
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Crear cuenta
              </>
            )}
          </button>
        </form>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/login"
            className="font-semibold text-rr-navy-700 transition-colors hover:text-rr-navy-900"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
