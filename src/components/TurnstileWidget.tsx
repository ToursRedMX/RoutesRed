import { useEffect, useRef, useState, type ReactNode } from 'react';

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
      theme?: 'light' | 'dark' | 'auto';
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

interface PublicConfigResponse {
  turnstile_site_key?: string;
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const configuredSiteKey: string = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      const handleLoad = (): void => resolve();
      const handleError = (): void => reject(new Error('Failed to load Turnstile'));
      existing.addEventListener('load', handleLoad, { once: true });
      existing.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = (): void => resolve();
    script.onerror = (): void => reject(new Error('Failed to load Turnstile'));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
}

async function loadPublicSiteKey(): Promise<string> {
  if (configuredSiteKey) return configuredSiteKey;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  const response = await fetch(`${supabaseUrl}/functions/v1/routesred-public-config`, {
    headers: { apikey: supabaseAnonKey },
  });

  if (!response.ok) throw new Error('Turnstile site key is unavailable');

  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || typeof (data as PublicConfigResponse).turnstile_site_key !== 'string') {
    throw new Error('Invalid Turnstile configuration');
  }

  const siteKey = (data as PublicConfigResponse).turnstile_site_key.trim();
  if (!siteKey) throw new Error('Empty Turnstile site key');
  return siteKey;
}

export function TurnstileWidget({ onToken, onExpire, onError }: TurnstileWidgetProps): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [siteKey, setSiteKey] = useState<string>(configuredSiteKey);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(!configuredSiteKey);

  useEffect((): (() => void) => {
    let cancelled = false;

    if (configuredSiteKey) return (): void => { cancelled = true; };

    void loadPublicSiteKey()
      .then((key: string): void => {
        if (cancelled) return;
        setSiteKey(key);
        setLoading(false);
      })
      .catch((): void => {
        if (cancelled) return;
        setLoading(false);
        setLoadError(true);
        onError?.();
      });

    return (): void => {
      cancelled = true;
    };
  }, [onError]);

  useEffect((): (() => void) | undefined => {
    if (!siteKey) return undefined;

    let cancelled = false;
    void loadTurnstileScript()
      .then((): void => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string): void => onToken(token),
          'expired-callback': (): void => {
            onToken('');
            onExpire?.();
          },
          'error-callback': (): void => {
            onToken('');
            onError?.();
          },
        });
      })
      .catch((): void => {
        if (!cancelled) {
          setLoadError(true);
          onError?.();
        }
      });

    return (): void => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onToken, onExpire, onError]);

  if (loading) {
    return <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">Cargando verificador…</div>;
  }

  if (loadError) {
    return <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">No se pudo cargar el verificador de seguridad. Recarga la página.</div>;
  }

  return <div ref={containerRef} className="cf-turnstile" />;
}
