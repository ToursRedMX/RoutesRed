/**
 * # ForgotPasswordPage
 *
 * Password-reset request page.
 *
 * Sends a reset link via `supabase.auth.resetPasswordForEmail` and shows
 * a neutral confirmation message that does not reveal whether the email
 * is registered (to prevent user enumeration).
 *
 * @packageDocumentation
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

import { Link } from '@/lib/router';
import { useAuth } from '@/context/AuthContext';

/* ------------------------------------------------------------------ *
 * Validation helpers
 * ------------------------------------------------------------------ */

const EMAIL_RE: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------------ *
 * ForgotPasswordPage
 * ------------------------------------------------------------------ */

export function ForgotPasswordPage(): ReactNode {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [sent, setSent] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitError(null);

    if (!email.trim()) {
      setEmailError('Ingresa tu correo electrónico.');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('El correo no tiene un formato válido.');
      return;
    }
    setEmailError(undefined);

    setLoading(true);
    const result = await resetPassword(email.trim());
    setLoading(false);

    // Always show the neutral confirmation to avoid revealing whether the
    // email exists. A genuine network/transport error is surfaced instead.
    if (!result.ok) {
      const lower: string = (result.error ?? '').toLowerCase();
      if (
        lower.includes('failed to fetch') ||
        lower.includes('network') ||
        lower.includes('timeout') ||
        lower.includes('connection')
      ) {
        setSubmitError('Error de conexión. Verifica tu internet e inténtalo de nuevo.');
        return;
      }
      // Any other error (e.g. rate limit) — still show neutral success to
      // avoid enumeration, but keep the message honest about retries.
    }
    setSent(true);
  };

  /* ---- Confirmation screen ---- */
  if (sent) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rr-navy-50">
            <CheckCircle2 className="h-7 w-7 text-rr-navy-700" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Revisa tu correo</h1>
          <p className="mt-3 text-sm text-slate-600">
            Si existe una cuenta asociada a{' '}
            <span className="font-semibold text-slate-900">{email.trim()}</span>, recibirás un
            enlace para restablecer tu contraseña en unos minutos.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            ¿No recibiste el correo? Revisa tu carpeta de spam o inténtalo de nuevo más tarde.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-rr-navy-500/20 transition-all hover:shadow-lg hover:shadow-rr-red-600/30"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a iniciar sesión
          </Link>
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
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Recuperar contraseña</h1>
            <p className="text-sm text-slate-500">
              Te enviaremos un enlace para restablecerla
            </p>
          </div>
        </div>

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
          <div>
            <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) {
                    setEmailError(undefined);
                  }
                }}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'forgot-email-error' : undefined}
                className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  emailError
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-slate-300 focus:border-rr-navy-500 focus:ring-rr-navy-400'
                }`}
                placeholder="tu@correo.com"
              />
            </div>
            {emailError && (
              <p id="forgot-email-error" className="mt-1.5 text-xs text-red-600">
                {emailError}
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
                Enviando enlace…
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Enviar enlace de recuperación
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Recordaste tu contraseña?{' '}
          <Link
            to="/login"
            className="font-semibold text-rr-navy-700 transition-colors hover:text-rr-navy-900"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
