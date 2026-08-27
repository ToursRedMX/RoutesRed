/**
 * # useProvider
 *
 * Fetches the transport provider owned by the current authenticated
 * user (the "active provider" for the dashboard). Returns the provider
 * row plus loading and error state, and a `refresh()` callback to
 * re-run the query after a mutation.
 *
 * The hook relies on the RLS policies on
 * `routesred.transport_providers` (readable by active members) and
 * `routesred.transport_provider_users` (readable by the user
 * themselves). It joins through `transport_provider_users` to find the
 * provider the current user owns or belongs to.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { TransportProvider } from '@/types';

/** Shape returned by the hook. */
export interface UseProviderResult {
  /** The provider row, or `null` when the user has none. */
  provider: TransportProvider | null;
  /** `true` while the initial query is in flight. */
  loading: boolean;
  /** Human-readable error message, or `null`. */
  error: string | null;
  /** Re-run the query. */
  refresh: () => Promise<void>;
}

/**
 * Load the provider owned by (or linked to) the current user.
 *
 * Returns `{ provider: null, loading: false }` when there is no
 * authenticated user or no provider row — the caller decides what to
 * render in that case (typically a redirect to registration).
 */
export function useProvider(): UseProviderResult {
  const { user } = useAuth();
  const [provider, setProvider] = useState<TransportProvider | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProvider = useCallback(async (): Promise<void> => {
    if (!user) {
      setProvider(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // Join transport_provider_users → transport_providers to find the
    // provider the current user is linked to. We pick the first active
    // membership; a user typically owns exactly one provider.
    const { data, error: rpcError } = await supabase
      .from('transport_provider_users')
      .select(
        'transport_provider_id, role, status, transport_providers!inner(*)',
      )
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (rpcError) {
      setError(rpcError.message);
      setProvider(null);
      setLoading(false);
      return;
    }

    if (!data) {
      setProvider(null);
      setLoading(false);
      return;
    }

    // The joined row comes back as { transport_provider_id, role, status,
    // transport_providers: TransportProvider | TransportProvider[] }.
    // PostgREST returns a single object for an `inner(*)` join with
    // `.maybeSingle()`, but we guard for both shapes.
    const joined: unknown = (data as Record<string, unknown>).transport_providers;
    let providerRow: TransportProvider | null = null;
    if (Array.isArray(joined)) {
      providerRow = (joined[0] as TransportProvider) ?? null;
    } else if (joined) {
      providerRow = joined as TransportProvider;
    }

    setProvider(providerRow);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchProvider();
  }, [fetchProvider]);

  return { provider, loading, error, refresh: fetchProvider };
}
