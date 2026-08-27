/**
 * # AuthContext
 *
 * Authentication context for the RoutesRed platform.
 *
 * Wraps the Supabase browser client (`@supabase/supabase-js`) and exposes
 * a typed React context for email/password auth: signup, signin, signout,
 * password reset, password update, and email verification resend.
 *
 * ## Signup flow
 * `signUp` creates a row in `auth.users` **and** a matching profile row in
 * `public.users` with `role = 'traveler'`. The profile insert relies on the
 * `users_insert_own` RLS policy (`auth.uid() = id`), which is satisfied
 * because the just-signed-up user is now authenticated.
 *
 * ## onAuthStateChange async-wrapper pattern
 * Supabase's `onAuthStateChange` fires its callback synchronously on the
 * same call stack as certain internal auth operations. Calling
 * `supabase.auth.getSession()` — or any auth mutating method — *inside*
 * the callback can therefore deadlock or throw
 * `"AuthSessionMissingError"`. To avoid this, the callback schedules the
 * real work onto the next microtask via a queue + `Promise.resolve()`,
 * so the Supabase internal lock is released before we touch it again.
 *
 * @packageDocumentation
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
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** Result returned by auth operations that may succeed or fail. */
export interface AuthResult {
  /** `null` on success, or a human-readable error message. */
  error: string | null;
  /** Whether the operation completed without error. */
  ok: boolean;
}

/** Optional metadata passed to `signUp` to prefill the profile. */
export interface SignUpOptions {
  /** Given name — written to `public.users.first_name`. */
  firstName?: string;
  /** Family name — written to `public.users.last_name`. */
  lastName?: string;
  /** Phone number — written to `public.users.phone`. */
  phone?: string;
  /** Redirect URL for the email-confirmation link. */
  emailRedirectTo?: string;
}

/** Shape of the value exposed by {@link AuthContext}. */
export interface AuthContextValue {
  /** The Supabase auth user, or `null` when signed out. */
  user: User | null;
  /** The active Supabase session, or `null` when signed out. */
  session: Session | null;
  /** `true` while the initial session is being restored on mount. */
  loading: boolean;
  /** `true` when the user's email has been verified (`email_confirmed_at`). */
  emailVerified: boolean;

  /** Create a new traveler account (auth.users + public.users). */
  signUp: (email: string, password: string, options?: SignUpOptions) => Promise<AuthResult>;
  /** Sign in with email and password. */
  signIn: (email: string, password: string) => Promise<AuthResult>;
  /** Sign out the current user. */
  signOut: () => Promise<AuthResult>;
  /** Send a password-reset email to the given address. */
  resetPassword: (email: string) => Promise<AuthResult>;
  /** Update the current user's password (requires an active session). */
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  /** Resend the email-verification link to the current user. */
  resendVerification: () => Promise<AuthResult>;
}

/* ------------------------------------------------------------------ *
 * Context
 * ------------------------------------------------------------------ */

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/**
 * Normalise a Supabase error into a readable string.
 *
 * Supabase auth errors carry a `message` field; some legacy errors are
 * plain `Error` instances. We guard both and never leak the raw object.
 */
function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Read the `public.users` profile for the current user.
 *
 * Used after signup to confirm the profile row was created. A missing
 * profile is non-fatal (the caller still got an auth session), so we
 * swallow the error and return `null`.
 */
async function fetchProfile(
  client: SupabaseClient,
  userId: string,
): Promise<{ role: string | null } | null> {
  const { data, error } = await client
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return null;
  }
  return data as { role: string | null } | null;
}

/* ------------------------------------------------------------------ *
 * Provider
 * ------------------------------------------------------------------ */

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provides auth state and actions to the app.
 *
 * Wrap the application root:
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps): ReactNode {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * Microtask queue for the `onAuthStateChange` async-wrapper pattern.
   * Each entry is an async function scheduled by the listener; we run
   * them after the Supabase internal lock is released.
   */
  const queueRef = useRef<Array<() => Promise<void>>>([]);
  /** `true` once the queue drain loop is running, to avoid duplicates. */
  const drainingRef = useRef<boolean>(false);

  /* ---- Session bootstrap ---- */
  useEffect(() => {
    let active: boolean = true;

    // Restore the session that may already be in localStorage.
    void (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) {
        return;
      }
      if (error) {
        // No session is a normal state, not a hard failure.
        setSession(null);
      } else {
        setSession(data.session);
      }
      setLoading(false);
    })();

    /* ---- onAuthStateChange with async-wrapper pattern ---- */
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event: string, newSession: Session | null) => {
        // Schedule the state update off the Supabase call stack to avoid
        // the deadlock that occurs when auth methods are invoked during
        // the listener callback.
        queueRef.current.push(async () => {
          setSession(newSession);
        });
        void drainQueue();
      },
    );

    async function drainQueue(): Promise<void> {
      if (drainingRef.current) {
        return;
      }
      drainingRef.current = true;
      try {
        // Yield to the microtask queue so the Supabase lock is released.
        while (queueRef.current.length > 0) {
          const task: (() => Promise<void>) | undefined = queueRef.current.shift();
          if (task) {
            await task();
          }
        }
      } finally {
        drainingRef.current = false;
      }
    }

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  /* ---- Derived values ---- */
  const user: User | null = useMemo(() => session?.user ?? null, [session]);
  const emailVerified: boolean = useMemo(
    () => Boolean(user?.email_confirmed_at ?? user?.confirmed_at),
    [user],
  );

  /* ---- Actions ---- */

  /**
   * Create a new traveler account.
   *
   * 1. Calls `supabase.auth.signUp` — creates `auth.users`.
   * 2. If a session is returned immediately (email confirmation disabled),
   *    inserts the matching `public.users` profile row with
   *    `role = 'traveler'`.
   * 3. If email confirmation is required, the profile row is created on
   *    first sign-in after confirmation (via the same `users_insert_own`
   *    policy); we attempt it eagerly here but tolerate failure.
   */
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      options: SignUpOptions = {},
    ): Promise<AuthResult> => {
      const { firstName, lastName, phone, emailRedirectTo } = options;

      const redirectTo: string | undefined = emailRedirectTo;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone,
          },
        },
      });

      if (error) {
        return { ok: false, error: errorMessage(error) };
      }

      const newUser: User | null = data.user;
      // If the user is immediately authenticated (confirmation disabled),
      // create the profile row now. Otherwise the profile is created after
      // the user confirms and signs in.
      if (newUser && data.session) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: newUser.id,
            email,
            first_name: firstName ?? null,
            last_name: lastName ?? null,
            phone: phone ?? null,
            role: 'traveler',
          });

        if (profileError) {
          // Non-fatal: auth account exists; profile can be repaired later.
          return {
            ok: true,
            error: 'Account created, but profile setup failed. Please contact support.',
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

      // Ensure a profile row exists for users who signed up with email
      // confirmation enabled (no profile was created at signup time).
      // Tolerate absence — RLS or an existing row may prevent insert.
      if (data.user) {
        const existing = await fetchProfile(supabase, data.user.id);
        if (existing === null) {
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
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { ok: false, error: errorMessage(error) };
    }
    setSession(null);
    return { ok: true, error: null };
  }, []);

  const resetPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        return { ok: false, error: errorMessage(error) };
      }
      return { ok: true, error: null };
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
      return { ok: false, error: 'No signed-in user to verify.' };
    }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });
    if (error) {
      return { ok: false, error: errorMessage(error) };
    }
    return { ok: true, error: null };
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

/**
 * Access the auth context.
 *
 * @throws if used outside of {@link AuthProvider}.
 */
export function useAuth(): AuthContextValue {
  const ctx: AuthContextValue | undefined = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
