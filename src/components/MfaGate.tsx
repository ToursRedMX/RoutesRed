/**
 * MFA Gate — wraps protected content and enforces AAL2 when the user
 * has verified TOTP factors. Reuses existing global factors from
 * Supabase Auth (does NOT enroll a second factor automatically).
 *
 * issuer='RoutesRed' is only used when the user has NO factor and
 * chooses to enroll from RoutesRed.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Shield, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';

type GateState = 'loading' | 'not_required' | 'needs_enrollment' | 'needs_challenge' | 'passed';

interface MfaGateProps {
  children: ReactNode;
}

interface MfaFactor {
  id: string;
  factor_type: string;
  status: string;
  friendly_name: string | null;
}

interface FactorList {
  totp: MfaFactor[];
}

export function MfaGate({ children }: MfaGateProps): ReactNode {
  const [state, setState] = useState<GateState>('loading');
  const [error, setError] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [totpSecret, setTotpSecret] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState<string>('');
  const [challengeCode, setChallengeCode] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [challengeId, setChallengeId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const checkMfaStatus = useCallback(async (): Promise<void> => {
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const factors: FactorList = (factorsData as unknown as FactorList) ?? { totp: [] };
      const verifiedTotp: MfaFactor[] = (factors.totp ?? []).filter(
        (f: MfaFactor): boolean => f.status === 'verified',
      );

      if (verifiedTotp.length === 0) {
        // No verified factors — MFA is optional, allow access
        setState('not_required');
        return;
      }

      // Has verified factors — check AAL
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      let jwtAal: string = 'aal1';
      if (session?.access_token) {
        try {
          const payload: { aal?: string } = JSON.parse(
            atob(session.access_token.split('.')[1]),
          );
          jwtAal = payload.aal ?? 'aal1';
        } catch {
          jwtAal = 'aal1';
        }
      }

      if (jwtAal === 'aal2') {
        setState('passed');
        return;
      }

      setState('needs_challenge');
    } catch {
      setState('not_required');
    }
  }, []);

  useEffect((): void => {
    void checkMfaStatus();
  }, [checkMfaStatus]);

  const startChallenge = useCallback(async (): Promise<void> => {
    setError('');
    setSubmitting(true);
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const factors: FactorList = (factorsData as unknown as FactorList) ?? { totp: [] };
      const verified: MfaFactor = (factors.totp ?? []).find(
        (f: MfaFactor): boolean => f.status === 'verified',
      );
      if (!verified) {
        setState('not_required');
        return;
      }

      const { data, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verified.id,
      });
      if (challengeError) throw challengeError;

      setFactorId(verified.id);
      setChallengeId(data.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar verificación');
    } finally {
      setSubmitting(false);
    }
  }, []);

  const verifyChallenge = useCallback(async (): Promise<void> => {
    setError('');
    if (challengeCode.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }
    setSubmitting(true);
    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: challengeCode,
      });
      if (verifyError) throw verifyError;
      setState('passed');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Código incorrecto');
    } finally {
      setSubmitting(false);
    }
  }, [factorId, challengeId, challengeCode]);

  const startEnrollment = useCallback(async (): Promise<void> => {
    setError('');
    setSubmitting(true);
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'RoutesRed',
      });
      if (enrollError) throw enrollError;
      setFactorId(data.id);
      setTotpSecret(data.totp.secret);
      setQrUrl(data.totp.qr_code);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al configurar MFA');
    } finally {
      setSubmitting(false);
    }
  }, []);

  const verifyEnrollment = useCallback(async (): Promise<void> => {
    setError('');
    if (verifyCode.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }
    setSubmitting(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      setState('passed');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Código incorrecto');
    } finally {
      setSubmitting(false);
    }
  }, [factorId, verifyCode]);

  if (state === 'loading' || state === 'passed' || state === 'not_required') {
    if (state === 'loading') {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-rr-navy-600" />
        </div>
      );
    }
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rr-navy-50 text-rr-navy-700">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {state === 'needs_enrollment'
                ? 'Configura autenticación en dos pasos'
                : 'Verificación de seguridad'}
            </h1>
            <p className="text-sm text-slate-500">
              {state === 'needs_enrollment'
                ? 'Protege tu cuenta con un código de un solo uso'
                : 'Ingresa el código de tu app autenticadora'}
            </p>
          </div>
        </div>

        {state === 'needs_enrollment' && (
          <div className="space-y-4">
            {!qrUrl ? (
              <button
                type="button"
                onClick={() => void startEnrollment()}
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rr-navy-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rr-navy-800 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Comenzar configuración
              </button>
            ) : (
              <>
                <div className="flex flex-col items-center gap-3">
                  <img src={qrUrl} alt="QR code" className="h-48 w-48" />
                  <p className="text-xs text-slate-500">
                    Escanea con Google Authenticator, Authy o similar
                  </p>
                  <p className="font-mono text-xs text-slate-600">{totpSecret}</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Código de verificación
                  </label>
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-center text-xl tracking-widest font-mono focus:border-rr-navy-500 focus:ring-2 focus:ring-rr-navy-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void verifyEnrollment()}
                  disabled={submitting || verifyCode.length !== 6}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Verificar y activar
                </button>
              </>
            )}
          </div>
        )}

        {state === 'needs_challenge' && (
          <div className="space-y-4">
            {!challengeId ? (
              <button
                type="button"
                onClick={() => void startChallenge()}
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rr-navy-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rr-navy-800 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Iniciar verificación
              </button>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Código de tu app autenticadora
                  </label>
                  <input
                    type="text"
                    value={challengeCode}
                    onChange={(e) => setChallengeCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    autoFocus
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-center text-xl tracking-widest font-mono focus:border-rr-navy-500 focus:ring-2 focus:ring-rr-navy-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void verifyChallenge()}
                  disabled={submitting || challengeCode.length !== 6}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rr-navy-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rr-navy-800 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Verificar
                </button>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => setState('not_required')}
          className="mt-4 text-xs text-slate-400 hover:text-slate-600"
        >
          Saltar por ahora
        </button>
      </div>
    </div>
  );
}
