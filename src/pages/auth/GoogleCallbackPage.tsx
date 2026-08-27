/**
 * Google OAuth callback page for RoutesRed.
 *
 * Supabase's detectSessionInUrl handles the code exchange automatically.
 * This page checks whether the user has a profile and platform access,
 * then redirects to onboarding or the dashboard.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { supabase, registerPlatformAccess } from '@/lib/supabase';
import { useRoute } from '@/lib/router';
import { Loader2 } from 'lucide-react';

export function GoogleCallbackPage(): ReactNode {
  const { navigate } = useRoute();
  const [error, setError] = useState<string | null>(null);

  useEffect((): void => {
    void (async (): Promise<void> => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        setError('No se pudo completar el inicio de sesión con Google.');
        return;
      }

      // Check if profile exists
      const userId: string = sessionData.session.user.id;
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) {
        // Create profile for new OAuth user
        const email: string = sessionData.session.user.email ?? '';
        const fullName: string =
          (sessionData.session.user.user_metadata?.full_name as string) ?? '';
        const nameParts: string[] = fullName.split(' ');
        await supabase.from('users').insert({
          id: userId,
          email,
          first_name: nameParts[0] ?? null,
          last_name: nameParts.slice(1).join(' ') ?? null,
          role: 'traveler',
        });
      }

      // Register platform access
      const platformRow = await registerPlatformAccess();

      if (platformRow && platformRow.onboarding_completed) {
        navigate('/', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    })();
  }, [navigate]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <a
            href="#/login"
            className="mt-4 inline-block text-sm font-semibold text-rr-navy-700 hover:text-rr-navy-900"
          >
            Volver a iniciar sesión
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-rr-navy-600" />
    </div>
  );
}
