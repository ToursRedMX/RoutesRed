/**
 * # VerifyEmailPage
 *
 * Email-verification status page.
 *
 * Shown after a user signs up when email confirmation is required, or
 * when a user lands back on the app from a verification email link.
 * Displays whether the current user's email is verified, offers a
 * resend-verification button, and links to `/login` once verified.
 *
 * @packageDocumentation
 */

import { useState, type ReactNode } from 'react';
import {
  MailCheck,
  MailWarning,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

import { Link } from '@/lib/router';
import { useAuth } from '@/context/AuthContext';

/* ------------------------------------------------------------------ *
 * VerifyEmailPage
 * ------------------------------------------------------------------ */

export function VerifyEmailPage(): ReactNode {
  const { user, emailVerified, resendVerification, loading } = useAuth();

  const [resending, setResending] = useState<boolean>(false);
  const [resendOk, setResendOk] = useState<boolean>(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResend = async (): Promise<void> => {
    setResendError(null);
    setResending(true);
    const result = await resendVerification();
    setResending(false);
    if (result.ok) {
      setResendOk(true);
    } else {
      setResendError(result.error ?? 'No se pudo reenviar el enlace. Inténtalo de nuevo.');
    }
  };

  /* ---- No user signed in ---- */
  if (!user) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <MailWarning className="h-7 w-7 text-slate-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Verifica tu correo</h1>
          <p className="mt-3 text-sm text-slate-600">
            Inicia sesión para verificar el estado de tu correo electrónico.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-rr-navy-500/20 transition-all hover:shadow-lg hover:shadow-rr-red-600/30"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  /* ---- Verified ---- */
  if (emailVerified) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rr-navy-50">
            <MailCheck className="h-7 w-7 text-rr-navy-700" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Correo verificado</h1>
          <p className="mt-3 text-sm text-slate-600">
            Tu correo electrónico{' '}
            <span className="font-semibold text-slate-900">{user.email ?? ''}</span> ya está
            confirmado. Puedes acceder a tu cuenta normalmente.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-rr-navy-500/20 transition-all hover:shadow-lg hover:shadow-rr-red-600/30"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  /* ---- Awaiting verification ---- */
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <Link
        to="/login"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-rr-navy-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a iniciar sesión
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <MailWarning className="h-7 w-7 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Confirma tu correo</h1>
        <p className="mt-3 text-sm text-slate-600">
          Hemos enviado un enlace de confirmación a{' '}
          <span className="font-semibold text-slate-900">{user.email ?? 'tu correo'}</span>. Haz
          clic en el enlace para activar tu cuenta.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          ¿No recibiste el correo? Revisa tu carpeta de spam.
        </p>

        {/* Resend success */}
        {resendOk && (
          <div
            role="status"
            className="mt-5 flex items-start gap-2.5 rounded-lg border border-rr-navy-200 bg-rr-navy-50 p-3.5 text-left text-sm text-rr-navy-700"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Te hemos enviado un nuevo enlace de confirmación.</span>
          </div>
        )}

        {/* Resend error */}
        {resendError && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-left text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{resendError}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resending || loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-rr-navy-500/20 transition-all hover:shadow-lg hover:shadow-rr-red-600/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Reenviando…
            </>
          ) : (
            <>
              <MailCheck className="h-4 w-4" />
              Reenviar correo de confirmación
            </>
          )}
        </button>
      </div>
    </div>
  );
}
