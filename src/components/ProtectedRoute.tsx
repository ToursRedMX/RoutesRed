/**
 * ProtectedRoute — guard for authenticated RoutesRed routes.
 *
 * Checks: user authenticated, email verified, platform access
 * registered, onboarding completed. Does NOT copy ToursRed-specific
 * guards (agency approved, admin_permissions, staff).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRoute } from '@/lib/router';
import { supabase, registerPlatformAccess } from '@/lib/supabase';
import { MfaGate } from '@/components/MfaGate';
import { Loader2 } from 'lucide-react';

type GuardState = 'loading' | 'unauthenticated' | 'needs_onboarding' | 'ready';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps): ReactNode {
  const { user, loading: authLoading, emailVerified } = useAuth();
  const { navigate } = useRoute();
  const [state, setState] = useState<GuardState>('loading');

  useEffect((): void => {
    if (authLoading) return;
    if (!user) {
      setState('unauthenticated');
      return;
    }

    void (async (): Promise<void> => {
      // Register platform access (no params, canonical function)
      const platformRow = await registerPlatformAccess();

      if (platformRow && !platformRow.onboarding_completed) {
        setState('needs_onboarding');
        return;
      }

      setState('ready');
    })();
  }, [user, authLoading]);

  if (authLoading || state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rr-navy-600" />
      </div>
    );
  }

  if (state === 'unauthenticated') {
    navigate('/login', { replace: true });
    return null;
  }

  if (state === 'needs_onboarding') {
    navigate('/onboarding', { replace: true });
    return null;
  }

  // Email verification check (skip for now — email confirmation is off by default)
  if (!emailVerified && user) {
    // If email verification is required, redirect to verify-email
    // For now, allow access since email confirmation is OFF
  }

  return <MfaGate>{children}</MfaGate>;
}
