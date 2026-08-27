/**
 * # ResetPasswordPage
 *
 * New-password form. Uses the shared edge function verify-reset-code
 * to validate the code, then supabase.auth.updateUser to set the
 * new password.
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { KeyRound, ArrowLeft, Eye, EyeOff, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link, useRoute } from '@/lib/router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const MIN_PASSWORD_LENGTH: number = 8;

interface FieldErrors { password?: string; confirmPassword?: string; code?: string; }

function validatePasswords(password: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!password) errors.password = 'Ingresa una nueva contraseña.';
  else if (password.length < MIN_PASSWORD_LENGTH) errors.password = `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (!confirmPassword) errors.confirmPassword = 'Confirma tu nueva contraseña.';
  else if (password !== confirmPassword) errors.confirmPassword = 'Las contraseñas no coinciden.';
  return errors;
}

export function ResetPasswordPage(): ReactNode {
  const { updatePassword } = useAuth();
  const { navigate, query } = useRoute();

  const [code, setCode] = useState<string>(query.code ?? '');
  const [email, setEmail] = useState<string>(query.email ?? '');
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
    if (!code.trim()) errors.code = 'Ingresa el código de recuperación.';
    setFieldErrors(errors);
    if (errors.password || errors.confirmPassword || errors.code) return;

    setLoading(true);

    // Verify reset code via shared edge function
    try {
      const res: Response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-reset-code`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), code: code.trim() }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!res.ok) {
        const body: { error?: string } = await res.json();
        setSubmitError(body.error ?? 'Código inválido o expirado.');
        setLoading(false);
        return;
      }
    } catch {
      setSubmitError('Error de conexión. Inténtalo de nuevo.');
      setLoading(false);
      return;
    }

    // Update password
    const result = await updatePassword(password);
    setLoading(false);

    if (!result.ok) {
      setSubmitError(result.error ?? 'No se pudo actualizar la contraseña.');
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rr-navy-50">
            <CheckCircle2 className="h-7 w-7 text-rr-navy-700" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Contraseña actualizada</h1>
          <p className="mt-3 text-sm text-slate-600">Tu contraseña se ha restablecido correctamente.</p>
          <button type="button" onClick={() => navigate('/login', { replace: true })}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md">
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-rr-navy-700">
        <ArrowLeft className="h-4 w-4" /> Volver a iniciar sesión
      </Link>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rr-navy-700 to-rr-navy-900 text-white">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nueva contraseña</h1>
            <p className="text-sm text-slate-500">Ingresa el código y tu nueva contraseña</p>
          </div>
        </div>
        {submitError && (
          <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>{submitError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium text-slate-700">Correo electrónico</label>
            <input id="reset-email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-rr-navy-500 focus:ring-2 focus:ring-rr-navy-400" placeholder="tu@correo.com" />
          </div>
          <div>
            <label htmlFor="reset-code" className="mb-1.5 block text-sm font-medium text-slate-700">Código de recuperación</label>
            <input id="reset-code" type="text" required value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-center text-lg tracking-widest font-mono focus:border-rr-navy-500 focus:ring-2 focus:ring-rr-navy-400" placeholder="123456" />
            {fieldErrors.code && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.code}</p>}
          </div>
          <div>
            <label htmlFor="reset-password" className="mb-1.5 block text-sm font-medium text-slate-700">Nueva contraseña</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input id="reset-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={password}
                onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors((p: FieldErrors) => ({ ...p, password: undefined })); }}
                className={`w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 ${fieldErrors.password ? 'border-red-300 focus:ring-red-400' : 'border-slate-300 focus:border-rr-navy-500 focus:ring-rr-navy-400'}`}
                placeholder="Mínimo 8 caracteres" />
              <button type="button" onClick={() => setShowPassword((v: boolean) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
            {fieldErrors.password && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.password}</p>}
          </div>
          <div>
            <label htmlFor="reset-confirm" className="mb-1.5 block text-sm font-medium text-slate-700">Confirmar contraseña</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input id="reset-confirm" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" required value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (fieldErrors.confirmPassword) setFieldErrors((p: FieldErrors) => ({ ...p, confirmPassword: undefined })); }}
                className={`w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 ${fieldErrors.confirmPassword ? 'border-red-300 focus:ring-red-400' : 'border-slate-300 focus:border-rr-navy-500 focus:ring-rr-navy-400'}`}
                placeholder="Repite tu contraseña" />
              <button type="button" onClick={() => setShowConfirm((v: boolean) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
            {fieldErrors.confirmPassword && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.confirmPassword}</p>}
          </div>
          <button type="submit" disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rr-navy-700 to-rr-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Actualizando…</>) : (<><KeyRound className="h-4 w-4" /> Restablecer contraseña</>)}
          </button>
        </form>
      </div>
    </div>
  );
}
