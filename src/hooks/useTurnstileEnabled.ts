/**
 * Hook to read the Turnstile-enabled toggle from platform_settings.
 *
 * Returns { turnstileEnabled, loading }. Defaults to false on error.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useTurnstileEnabled(): { turnstileEnabled: boolean; loading: boolean } {
  const [turnstileEnabled, setTurnstileEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect((): (() => void) => {
    let active: boolean = true;
    supabase
      .from('platform_settings')
      .select('turnstile_auth_enabled')
      .maybeSingle()
      .then(({ data }: { data: { turnstile_auth_enabled?: boolean } | null }): void => {
        if (!active) return;
        setTurnstileEnabled(data?.turnstile_auth_enabled ?? false);
        setLoading(false);
      })
      .catch((): void => {
        if (!active) return;
        setTurnstileEnabled(false);
        setLoading(false);
      });
    return (): void => {
      active = false;
    };
  }, []);

  return { turnstileEnabled, loading };
}
