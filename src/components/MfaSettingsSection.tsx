/**
 * MFA Settings Section — lets the user manage TOTP factors and
 * recovery codes. Reuses existing global edge functions:
 * generate-recovery-codes, use-recovery-code, invalidate-recovery-codes.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, Loader2, AlertTriangle, Check, Copy, Download } from 'lucide-react';

interface MfaFactor {
  id: string;
  factor_type: string;
  status: string;
  friendly_name: string | null;
  created_at: string;
}

interface FactorList {
  totp: MfaFactor[];
}

export function MfaSettingsSection(): ReactNode {
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [codesRemaining, setCodesRemaining] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const loadFactors = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const factorList: FactorList = (data as unknown as FactorList) ?? { totp: [] };
      setFactors(factorList.totp ?? []);
    } catch {
      setFactors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecoveryCodesRemaining = useCallback(async (): Promise<void> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_recovery_codes_remaining');
      if (!rpcError) {
        setCodesRemaining(data as number);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect((): void => {
    void loadFactors();
    void loadRecoveryCodesRemaining();
  }, [loadFactors, loadRecoveryCodesRemaining]);

  const handleGenerateRecoveryCodes = useCallback(async (): Promise<void> => {
    setError('');
    setSuccess('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token: string = sessionData.session?.access_token ?? '';
      const res: Response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-recovery-codes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
          },
        },
      );
      if (!res.ok) throw new Error('No se pudieron generar los códigos');
      const data: { codes?: string[] } = await res.json();
      setRecoveryCodes(data.codes ?? null);
      void loadRecoveryCodesRemaining();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al generar códigos');
    }
  }, [loadRecoveryCodesRemaining]);

  const handleCopy = useCallback(async (): Promise<void> => {
    if (!recoveryCodes) return;
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopied(true);
      setTimeout((): void => setCopied(false), 2000);
    } catch {
      // Non-fatal
    }
  }, [recoveryCodes]);

  const handleDownload = useCallback((): void => {
    if (!recoveryCodes) return;
    const blob: Blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' });
    const url: string = URL.createObjectURL(blob);
    const a: HTMLAnchorElement = document.createElement('a');
    a.href = url;
    a.download = 'routesred-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [recoveryCodes]);

  const verifiedFactors: MfaFactor[] = factors.filter(
    (f: MfaFactor): boolean => f.status === 'verified',
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rr-navy-50">
          <Shield className="h-5 w-5 text-rr-navy-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Autenticación en dos pasos (TOTP)</h3>
          <p className="text-sm text-slate-500">
            Protege tu cuenta con un código de verificación
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </div>
      ) : (
        <>
          <div className="mb-4 space-y-2">
            <p className="text-sm text-slate-600">
              Estado:{' '}
              {verifiedFactors.length > 0 ? (
                <span className="font-medium text-green-600">Activo</span>
              ) : (
                <span className="font-medium text-slate-500">No configurado</span>
              )}
            </p>
            {verifiedFactors.length > 0 && (
              <p className="text-sm text-slate-500">
                Códigos de recuperación restantes:{' '}
                <span className="font-medium">{codesRemaining ?? '—'}</span>
              </p>
            )}
          </div>

          {verifiedFactors.length > 0 && (
            <button
              type="button"
              onClick={() => void handleGenerateRecoveryCodes()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Generar códigos de recuperación
            </button>
          )}

          {recoveryCodes && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-sm font-medium text-amber-800">
                Guarda estos códigos en un lugar seguro
              </p>
              <div className="mb-3 grid grid-cols-2 gap-1 font-mono text-sm text-amber-900">
                {recoveryCodes.map((code: string, i: number) => (
                  <div key={i}>{code}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" /> Descargar
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRecoveryCodes(null);
                  setSuccess('Códigos guardados correctamente.');
                }}
                className="mt-3 w-full rounded-lg bg-rr-navy-700 px-3 py-2 text-sm font-medium text-white hover:bg-rr-navy-800"
              >
                Entendido, ya los guardé
              </button>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}
          {success && (
            <p className="mt-3 text-sm text-green-600">{success}</p>
          )}
        </>
      )}
    </div>
  );
}
