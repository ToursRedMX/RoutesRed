/**
 * Turnstile widget for Cloudflare CAPTCHA.
 *
 * Site key is read from VITE_TURNSTILE_SITE_KEY env var.
 * Renders the Cloudflare Turnstile challenge and calls onToken
 * when a token is obtained, or onExpire/onError when it needs reset.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

declare global {
  interface Window {
    turnstile?: {
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
    };
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

const SCRIPT_SRC: string = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve: () => void, reject: (e: Error) => void) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const existing: HTMLScriptElement | null = document.querySelector(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Turnstile')));
      return;
    }
    const script: HTMLScriptElement = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = (): void => resolve();
    script.onerror = (): void => reject(new Error('Failed to load Turnstile'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function TurnstileWidget({ onToken, onExpire, onError }: TurnstileWidgetProps): ReactNode {
  const containerRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement>(null);
  const widgetIdRef: React.RefObject<string | null> = useRef<string | null>(null);
  const [loadError, setLoadError] = useState<boolean>(false);

  const siteKey: string = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

  useEffect((): (() => void) => {
    if (!siteKey) {
      setLoadError(true);
      return;
    }

    let cancelled: boolean = false;

    loadTurnstileScript()
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
        setLoadError(true);
      });

    return (): void => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onToken, onExpire, onError]);

  if (loadError) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
        No se pudo cargar el verificador de seguridad. Recarga la página.
      </div>
    );
  }

  return <div ref={containerRef} className="cf-turnstile" />;
}
