/**
 * StepUpContext — provides re-authentication for sensitive actions
 * via the verify-sensitive-action edge function.
 */
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';

interface StepUpContextValue {
  /** Verifies a TOTP code for a sensitive action. Returns true on success. */
  verifySensitiveAction: (code: string) => Promise<boolean>;
  /** Whether a step-up verification is currently in progress. */
  verifying: boolean;
  /** Error message from the last verification attempt. */
  stepUpError: string | null;
}

const StepUpContext = createContext<StepUpContextValue | undefined>(undefined);

interface StepUpProviderProps {
  children: ReactNode;
}

export function StepUpProvider({ children }: StepUpProviderProps): ReactNode {
  const [verifying, setVerifying] = useState<boolean>(false);
  const [stepUpError, setStepUpError] = useState<string | null>(null);

  const verifySensitiveAction = useCallback(async (code: string): Promise<boolean> => {
    setVerifying(true);
    setStepUpError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token: string = sessionData.session?.access_token ?? '';
      const res: Response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-sensitive-action`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({ code }),
        },
      );
      if (!res.ok) {
        const body: { error?: string; code?: string } = await res.json();
        setStepUpError(body.error ?? 'Verificación fallida');
        return false;
      }
      return true;
    } catch (err: unknown) {
      setStepUpError(err instanceof Error ? err.message : 'Error de conexión');
      return false;
    } finally {
      setVerifying(false);
    }
  }, []);

  const value: StepUpContextValue = {
    verifySensitiveAction,
    verifying,
    stepUpError,
  };

  return <StepUpContext.Provider value={value}>{children}</StepUpContext.Provider>;
}

export function useStepUp(): StepUpContextValue {
  const ctx: StepUpContextValue | undefined = useContext(StepUpContext);
  if (ctx === undefined) {
    throw new Error('useStepUp must be used within a StepUpProvider');
  }
  return ctx;
}
