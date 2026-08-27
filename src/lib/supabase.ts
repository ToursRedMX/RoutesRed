/**
 * Supabase client singleton and auth helpers.
 *
 * Reads connection details from Vite env vars. A single client instance
 * is shared across the app. Includes wrappers for signIn/signUp that
 * integrate with the shared infrastructure (risk check, is_active,
 * orphan cleanup, platform access).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    experimental: {
      passkey: true,
    },
  },
});

/* ------------------------------------------------------------------ *
 * Device fingerprint (no PII)
 * ------------------------------------------------------------------ */

export function computeDeviceFingerprint(): string {
  try {
    const raw: string = [
      navigator.userAgent,
      navigator.language,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      `${screen.width}x${screen.height}`,
      navigator.platform,
    ].join('|');
    let hash: number = 5381;
    for (let i: number = 0; i < raw.length; i++) {
      hash = ((hash << 5) + hash) ^ raw.charCodeAt(i);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  } catch {
    return 'unknown';
  }
}

/* ------------------------------------------------------------------ *
 * Risk check (shared edge function)
 * ------------------------------------------------------------------ */

export interface RiskCheckResult {
  require_captcha: boolean;
  ip_blocked: boolean;
  delay_ms: number;
}

export async function checkLoginRisk(
  email: string,
  deviceFingerprint: string,
): Promise<RiskCheckResult | null> {
  try {
    const res: Response = await fetch(
      `${supabaseUrl}/functions/v1/check-login-risk`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, device_fingerprint: deviceFingerprint }),
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) return null;
    const data: RiskCheckResult = await res.json();
    return data;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * signIn wrapper — password + captcha + is_active check
 * ------------------------------------------------------------------ */

export interface SignInResult {
  ok: boolean;
  error: string | null;
  userBlocked: boolean;
}

export async function signInWithEmail(
  email: string,
  password: string,
  captchaToken?: string,
): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: captchaToken ? { captchaToken } : undefined,
  });

  if (error) {
    return { ok: false, error: error.message, userBlocked: false };
  }

  if (data.user) {
    const { data: profile } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      return {
        ok: false,
        error: 'USUARIO_BLOQUEADO',
        userBlocked: true,
      };
    }
  }

  return { ok: true, error: null, userBlocked: false };
}

/* ------------------------------------------------------------------ *
 * signUp wrapper — email check + profile insert + orphan cleanup
 * ------------------------------------------------------------------ */

export interface SignUpResult {
  ok: boolean;
  error: string | null;
  emailExists: boolean;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  captchaToken: string | undefined,
  metadata: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    emailRedirectTo?: string;
  },
): Promise<SignUpResult> {
  // Check if email already exists in public.users
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    return { ok: false, error: null, emailExists: true };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: metadata.emailRedirectTo,
      captchaToken,
      data: {
        first_name: metadata.firstName,
        last_name: metadata.lastName,
        phone: metadata.phone,
        role: 'traveler',
      },
    },
  });

  if (error) {
    return { ok: false, error: error.message, emailExists: false };
  }

  const newUser = data.user;
  if (newUser && data.session) {
    const { error: profileError } = await supabase.from('users').insert({
      id: newUser.id,
      email,
      first_name: metadata.firstName ?? null,
      last_name: metadata.lastName ?? null,
      phone: metadata.phone ?? null,
      role: 'traveler',
    });

    if (profileError) {
      // Cleanup orphan auth user
      await deleteIncompleteSignup(newUser.id);
      return {
        ok: false,
        error: 'No se pudo crear el perfil. Inténtalo de nuevo.',
        emailExists: false,
      };
    }
  }

  return { ok: true, error: null, emailExists: false };
}

async function deleteIncompleteSignup(userId: string): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/functions/v1/delete-incomplete-signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ''}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ user_id: userId }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Non-fatal; orphan will be cleaned up later
  }
}

/* ------------------------------------------------------------------ *
 * Platform access helpers (canonical no-param functions)
 * ------------------------------------------------------------------ */

export async function registerPlatformAccess(): Promise<{
  onboarding_completed: boolean;
} | null> {
  const { data, error } = await supabase.rpc('register_platform_access');
  if (error) return null;
  return data as { onboarding_completed: boolean } | null;
}

export async function completePlatformOnboarding(): Promise<boolean> {
  const { data, error } = await supabase.rpc('complete_onboarding');
  if (error) return false;
  return Boolean(data);
}

/* ------------------------------------------------------------------ *
 * OAuth helpers
 * ------------------------------------------------------------------ */

export async function signInWithGoogle(): Promise<void> {
  const redirectTo: string = `${window.location.origin}/#/auth/google-callback`;
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
}

export async function signInWithAzure(): Promise<void> {
  const redirectTo: string = `${window.location.origin}/#/auth/azure-callback`;
  await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo,
      scopes: 'email profile openid https://graph.microsoft.com/User.Read',
    },
  });
}

/* ------------------------------------------------------------------ *
 * OAuth toggle reader
 * ------------------------------------------------------------------ */

export interface OAuthToggles {
  google: boolean;
  azure: boolean;
  x: boolean;
  facebook: boolean;
}

export async function fetchOAuthToggles(): Promise<OAuthToggles> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select(
      'oauth_google_login_enabled, oauth_azure_login_enabled, oauth_twitter_login_enabled, oauth_facebook_login_enabled',
    )
    .maybeSingle();

  if (error || !data) {
    return { google: false, azure: false, x: false, facebook: false };
  }

  return {
    google: Boolean(data.oauth_google_login_enabled),
    azure: Boolean(data.oauth_azure_login_enabled),
    x: Boolean(data.oauth_twitter_login_enabled),
    facebook: Boolean(data.oauth_facebook_login_enabled),
  };
}
