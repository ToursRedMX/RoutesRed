/**
 * # ResetPasswordPage
 *
 * New-password form landed from the email reset link.
 *
 * The Supabase email redirect lands the user on `/reset-password` with a
 * recovery token in the URL; `detectSessionInUrl` in the Supabase client
 * consumes it and establishes a session, so `supabase.auth.updateUser`
 * can be called directly via {@link useAuth}.`updatePassword`.
 *
 * Handles expired/invalid tokens by detecting the absence of a session
 * and surfacing a clear error with a link to request a new reset link.
 *
 * @packageDocumentation
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  KeyRound,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
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

const MIN_PASSWORD_LENGTH: number = 8;

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

function validatePasswords(password: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!password) {
    errors.password = 'Ingresa una nueva contraseña.';
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (!confirmPassword) {
    errors.confirmPassword = 'Confirma tu nueva contraseña.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden.';
  }
  return errors;
}

/* ------------------------------------------------------------------ *
 * ResetPasswordPage
 * ------------------------------------------------------------------ */

export function ResetPasswordPage(): ReactNode {
  const { updatePassword } = useAuth();
  const { navigate } = useRoute();

  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitError(null);

    const errors: FieldErrors = validatePasswords(password, confirmPassword);
    setFieldErrors(errors);
    if (errors.password || errors.confirmPassword) {
      return;
    }

    // Guard against an expired/invalid recovery token: if there is no
    // active session, updateUser would fail with a confusing error.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setSubmitError(
        'El enlace de recuperación ha expirado o no es válido. Solicita uno nuevo para restablecer tu contraseña.'
      );
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);

    if (!result.ok) {
      const lower: string = (result.error ?? '').toLowerCase();
      if (lower.includes('session') || lower.includes('token') || lower.includes('expired')) {
        setSubmitError(
          'El enlace de recuperación ha expirado o no es válido. Solicita uno nuevo para restablecer tu contraseña.'
        );
      } else {
        setSubmitError(result.error ?? 'No se pudo actualizar la contraseña. Inténtalo de nuevo.');
      }
      return;
    }

    setDone(true);
  };

  /* ---- Success screen ---- */
  if (done) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rr-navy-50">
            <CheckCircle2 className="h-7 w-7 text-rr-navy-700" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Contraseña actualizada</h1>
          <p className="mt-3 text-sm text-slate-600">
            Tu contraseña se ha restablecido correctamente. Ya puedes iniciar sesión con tu nueva
            contraseña.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-rr-navy-500/20 transition-all hover:shadow-lg hover:shadow-rr-red-600/30"
          >
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  /* ---- Form ---- */
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <Link
        to="/login"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-rr-navy-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a iniciar sesión
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rr-navy-700 to-rr-navy-900 text-white">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nueva contraseña</h1>
            <p className="text-sm text-slate-500">Elige una contraseña nueva y segura</p>
          </div>
        </div>

        {submitError && (
          <div
            role="alert"
            className="mb-5 flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
            {submitError.includes('expirado') && (
              <Link
                to="/forgot-password"
                className="ml-6 font-semibold text-red-800 underline hover:text-red-900"
              >
                Solicitar un nuevo enlace
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* New password */}
          <div>
            <label
              htmlFor="reset-password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Nueva contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="reset-password"
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
                aria-describedby={fieldErrors.password ? 'reset-password-error' : undefined}
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
              <p id="reset-password-error" className="mt-1.5 text-xs text-red-600">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label
              htmlFor="reset-confirm"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Confirmar contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="reset-confirm"
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
                aria-describedby={fieldErrors.confirmPassword ? 'reset-confirm-error' : undefined}
                className={`w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  fieldErrors.confirmPassword
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-slate-300 focus:border-rr-navy-500 focus:ring-rr-navy-400'
                }`}
                placeholder="Repite tu nueva contraseña"
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
              <p id="reset-confirm-error" className="mt-1.5 text-xs text-red-600">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-rr-navy-500/20 transition-all hover:shadow-lg hover:shadow-rr-red-600/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Actualizando…
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Restablecer contraseña
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
