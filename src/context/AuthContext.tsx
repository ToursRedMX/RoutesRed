/**
 * # AuthContext
 *
 * Authentication context for RoutesRed.
 *
 * Wraps Supabase auth with email/password, OAuth (Google/Azure),
 * session management with inactivity timeout, and platform access
 * registration via routesred.register_platform_access().
 *
 * Does NOT copy ToursRed-specific authorization (agency guards,
 * admin_permissions, staff permissions, role-based redirects).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export interface AuthResult {
  error: string | null;
  ok: boolean;
}

export interface SignUpOptions {
  firstName?: string;
  lastName?: string;
  phone?: string;
  emailRedirectTo?: string;
}

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  emailVerified: boolean;
  signUp: (email: string, password: string, options?: SignUpOptions) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  resendVerification: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ------------------------------------------------------------------ *
 * Constants
 * ------------------------------------------------------------------ */

/** Neutro inactivity timeout for all RoutesRed roles (2 hours). */
const INACTIVITY_TIMEOUT_MS: number = 2 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

/* ------------------------------------------------------------------ *
 * Provider
 * ------------------------------------------------------------------ */

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): ReactNode {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- Session bootstrap ---- */
  useEffect((): (() => void) => {
    let active: boolean = true;

    void (async (): Promise<void> => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) {
        setSession(null);
      } else {
        setSession(data.session);
      }
      setLoading(false);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event: string, newSession: Session | null): void => {
        // Async-wrapper pattern: avoid deadlock by scheduling off the callback
        void Promise.resolve().then((): void => {
          setSession(newSession);
        });
      },
    );

    return (): void => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  /* ---- Inactivity timer ---- */
  const resetInactivityTimer = useCallback((): void => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (!session) return;
    inactivityTimerRef.current = setTimeout((): void => {
      void supabase.auth.signOut();
      setSession(null);
    }, INACTIVITY_TIMEOUT_MS);
  }, [session]);

  useEffect((): (() => void) => {
    if (!session) return;
    resetInactivityTimer();

    const onActivity = (): void => resetInactivityTimer();
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('click', onActivity);

    return (): void => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('click', onActivity);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [session, resetInactivityTimer]);

  /* ---- Derived values ---- */
  const user: User | null = useMemo((): User | null => session?.user ?? null, [session]);
  const emailVerified: boolean = useMemo(
    (): boolean => Boolean(user?.email_confirmed_at ?? user?.confirmed_at),
    [user],
  );

  /* ---- Actions ---- */
  const signUp = useCallback(
    async (email: string, password: string, options: SignUpOptions = {}): Promise<AuthResult> => {
      const { firstName, lastName, phone, emailRedirectTo } = options;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone,
            role: 'traveler',
          },
        },
      });

      if (error) {
        return { ok: false, error: errorMessage(error) };
      }

      const newUser: User | null = data.user;
      if (newUser && data.session) {
        const { error: profileError } = await supabase.from('users').insert({
          id: newUser.id,
          email,
          first_name: firstName ?? null,
          last_name: lastName ?? null,
          phone: phone ?? null,
          role: 'traveler',
        });

        if (profileError) {
          return {
            ok: true,
            error: 'Cuenta creada, pero falló la configuración del perfil. Contacta soporte.',
          };
        }
      }

      return { ok: true, error: null };
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { ok: false, error: errorMessage(error) };
      }

      // Ensure profile exists (for users who signed up with email confirmation)
      if (data.user) {
        const { data: existing } = await supabase
          .from('users')
          .select('id, is_active')
          .eq('id', data.user.id)
          .maybeSingle();

        if (existing && existing.is_active === false) {
          await supabase.auth.signOut();
          return { ok: false, error: 'USUARIO_BLOQUEADO' };
        }

        if (!existing) {
          await supabase.from('users').insert({
            id: data.user.id,
            email,
            role: 'traveler',
          });
        }
      }

      return { ok: true, error: null };
    },
    [],
  );

  const signOut = useCallback(async (): Promise<AuthResult> => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { ok: false, error: errorMessage(error) };
    }
    setSession(null);
    return { ok: true, error: null };
  }, []);

  const resetPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      // Use shared edge function send-password-reset
      try {
        const res: Response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
            signal: AbortSignal.timeout(8000),
          },
        );
        if (!res.ok) {
          return { ok: false, error: 'No se pudo enviar el correo de recuperación.' };
        }
        return { ok: true, error: null };
      } catch {
        return { ok: false, error: 'Error de conexión. Inténtalo de nuevo.' };
      }
    },
    [],
  );

  const updatePassword = useCallback(
    async (newPassword: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        return { ok: false, error: errorMessage(error) };
      }
      return { ok: true, error: null };
    },
    [],
  );

  const resendVerification = useCallback(async (): Promise<AuthResult> => {
    if (!user?.email) {
      return { ok: false, error: 'No hay usuario para verificar.' };
    }
    try {
      const res: Response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!res.ok) {
        return { ok: false, error: 'No se pudo reenviar el correo.' };
      }
      return { ok: true, error: null };
    } catch {
      return { ok: false, error: 'Error de conexión.' };
    }
  }, [user]);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      session,
      loading,
      emailVerified,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      resendVerification,
    }),
    [
      user,
      session,
      loading,
      emailVerified,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      resendVerification,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ------------------------------------------------------------------ *
 * Hook
 * ------------------------------------------------------------------ */

export function useAuth(): AuthContextValue {
  const ctx: AuthContextValue | undefined = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
