/**
 * Supabase client singleton.
 *
 * Reads its connection details from the Vite environment variables
 * `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env`). A single
 * client instance is created and shared across the app to avoid spawning
 * redundant websocket/realtime connections and to keep `auth.storage`
 * state consistent.
 *
 * Import as: `import { supabase } from '@/lib/supabase'`
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly at module load so a missing .env is obvious in dev.
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

/**
 * Shared Supabase browser client.
 *
 * Created once; re-exported everywhere so auth state, realtime
 * channels and fetch caches stay in sync.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the session in localStorage so refresh survives reloads.
    persistSession: true,
    // Refresh the access token automatically before it expires.
    autoRefreshToken: true,
    // Detect the session from the URL on first load (email redirects).
    detectSessionInUrl: true,
  },
});
