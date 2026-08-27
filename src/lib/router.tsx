/**
 * # Hash-based Router
 *
 * A minimal, dependency-free router built on `window.location.hash`.
 *
 * Provides:
 * - {@link Router} — listens to `hashchange` and exposes the current path.
 * - {@link Route} — pattern-matches a path (with `:param` segments) and renders children.
 * - {@link Link} — anchor that updates the hash without a full reload.
 * - {@link useRoute} — hook returning `{ path, params, query }`.
 * - {@link navigate} — imperative hash navigation.
 *
 * ## URL shape
 * URLs look like `/#/transportadoras/acme-bus`. The leading `#` is the
 * hash; everything after the first `/` is treated as the application path.
 * A bare `#` or empty hash is normalised to `/`.
 *
 * ## Pattern matching
 * Patterns support dynamic segments prefixed with `:` — e.g.
 * `/transportadoras/:slug`. A trailing `/*` wildcard matches any path
 * that starts with the preceding segment and captures the remainder in
 * the `*` param.
 *
 * @packageDocumentation
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** Extracted dynamic parameters keyed by their segment name. */
export type RouteParams = Record<string, string>;

/** Result of matching a pattern against a path. */
interface MatchResult {
  /** `true` when the path matches the pattern. */
  matches: boolean;
  /** Captured dynamic params (empty object on no match). */
  params: RouteParams;
}

/** Value exposed by {@link RouterContext}. */
interface RouterContextValue {
  /** Current normalised path (e.g. `/transportadoras/acme`). */
  path: string;
  /** Parsed query-string params (key → value). */
  query: Record<string, string>;
  /** Dynamic params from the most recently matched {@link Route}. */
  params: RouteParams;
  /** Navigate to a new path imperatively. */
  navigate: (to: string, opts?: NavigateOptions) => void;
}

/** Options accepted by {@link navigate}. */
interface NavigateOptions {
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
}

/* ------------------------------------------------------------------ *
 * Path utilities
 * ------------------------------------------------------------------ */

/**
 * Read the application path from `window.location.hash`.
 *
 * Removes the leading `#` and any extra leading slashes, returning a
 * path that always starts with `/`. An empty hash returns `/`.
 */
function getPathFromHash(): string {
  const hash: string = window.location.hash || '';
  // Strip the leading '#' (and '#' alone if that's all there is).
  const raw: string = hash.startsWith('#') ? hash.slice(1) : hash;
  if (raw === '' || raw === '/') {
    return '/';
  }
  // Ensure a single leading slash.
  const withSlash: string = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash;
}

/**
 * Parse a query string (without the leading `?`) into a key→value map.
 */
function parseQuery(qs: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!qs) {
    return result;
  }
  for (const pair of qs.split('&')) {
    if (!pair) {
      continue;
    }
    const eqIndex: number = pair.indexOf('=');
    const key: string = eqIndex === -1 ? pair : pair.slice(0, eqIndex);
    const value: string = eqIndex === -1 ? '' : pair.slice(eqIndex + 1);
    result[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return result;
}

/**
 * Split a path into its pathname and query-string parts.
 */
function splitPath(fullPath: string): { pathname: string; query: Record<string, string> } {
  const qIndex: number = fullPath.indexOf('?');
  if (qIndex === -1) {
    return { pathname: fullPath, query: {} };
  }
  return {
    pathname: fullPath.slice(0, qIndex),
    query: parseQuery(fullPath.slice(qIndex + 1)),
  };
}

/**
 * Match a single path against a pattern containing `:param` segments
 * and an optional trailing `/*` wildcard.
 */
export function matchPath(pattern: string, path: string): MatchResult {
  const { pathname } = splitPath(path);

  const hasWildcard: boolean = pattern.endsWith('/*');
  const cleanPattern: string = hasWildcard ? pattern.slice(0, -2) : pattern;

  const patternSegments: string[] = cleanPattern.split('/').filter((s: string) => s.length > 0);
  const pathSegments: string[] = pathname.split('/').filter((s: string) => s.length > 0);

  const params: RouteParams = {};

  // Wildcard routes match any path that begins with the pattern prefix.
  if (hasWildcard) {
    if (pathSegments.length < patternSegments.length) {
      return { matches: false, params };
    }
    for (let i: number = 0; i < patternSegments.length; i++) {
      const pSeg: string = patternSegments[i];
      const aSeg: string = pathSegments[i];
      if (pSeg.startsWith(':')) {
        params[pSeg.slice(1)] = decodeURIComponent(aSeg);
      } else if (pSeg !== aSeg) {
        return { matches: false, params };
      }
    }
    params['*'] = pathSegments.slice(patternSegments.length).map(encodeURIComponent).join('/');
    return { matches: true, params };
  }

  // Exact-length match for non-wildcard patterns.
  if (patternSegments.length !== pathSegments.length) {
    return { matches: false, params };
  }
  for (let i: number = 0; i < patternSegments.length; i++) {
    const pSeg: string = patternSegments[i];
    const aSeg: string = pathSegments[i];
    if (pSeg.startsWith(':')) {
      params[pSeg.slice(1)] = decodeURIComponent(aSeg);
    } else if (pSeg !== aSeg) {
      return { matches: false, params };
    }
  }
  return { matches: true, params };
}

/**
 * Normalise a destination string into a hash path, ensuring it starts
 * with `/`.
 */
function normalizeTo(to: string): string {
  if (to.startsWith('#')) {
    to = to.slice(1);
  }
  if (!to.startsWith('/')) {
    to = `/${to}`;
  }
  return to;
}

/* ------------------------------------------------------------------ *
 * Context
 * ------------------------------------------------------------------ */

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

/* ------------------------------------------------------------------ *
 * Router
 * ------------------------------------------------------------------ */

interface RouterProps {
  children: ReactNode;
}

/**
 * Top-level router provider.
 *
 * Listens to `hashchange` and keeps the current path in state. Must
 * wrap any component that uses {@link useRoute}, {@link Route}, or
 * {@link Link}. On mount it normalises a missing hash to `#/`.
 */
export function Router({ children }: RouterProps): ReactNode {
  const [fullPath, setFullPath] = useState<string>(() => getPathFromHash());

  useEffect(() => {
    // Ensure the URL has a usable hash on first load.
    if (!window.location.hash) {
      window.location.hash = '#/';
    }
    const onChange = (): void => {
      setFullPath(getPathFromHash());
    };
    window.addEventListener('hashchange', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
    };
  }, []);

  const { pathname, query } = useMemo(() => splitPath(fullPath), [fullPath]);

  const navigateFn = useCallback(
    (to: string, opts: NavigateOptions = {}): void => {
      const target: string = normalizeTo(to);
      const newHash: string = `#${target}`;
      if (opts.replace) {
        // Replace the current entry so Back skips this navigation.
        const url: string = `${window.location.pathname}${window.location.search}${newHash}`;
        window.history.replaceState(null, '', url);
        setFullPath(getPathFromHash());
      } else if (`#${target}` !== window.location.hash) {
        window.location.hash = newHash;
        // hashchange fires synchronously for same-document hash updates.
        setFullPath(getPathFromHash());
      }
    },
    [],
  );

  const value: RouterContextValue = useMemo(
    () => ({
      path: pathname,
      query,
      params: {},
      navigate: navigateFn,
    }),
    [pathname, query, navigateFn],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

/* ------------------------------------------------------------------ *
 * Route
 * ------------------------------------------------------------------ */

interface RouteProps {
  /** Pattern to match, e.g. `/transportadoras/:slug`. */
  path: string;
  /** Content to render when the pattern matches. */
  children: ReactNode;
}

/**
 * Render its children only when the current path matches `path`.
 *
 * Dynamic segments are available via {@link useRoute}.`params`.
 */
export function Route({ path, children }: RouteProps): ReactNode {
  const ctx: RouterContextValue | undefined = useContext(RouterContext);
  if (ctx === undefined) {
    throw new Error('Route must be used within a Router');
  }
  const { matches, params } = useMemo(
    () => matchPath(path, ctx.path),
    [path, ctx.path],
  );

  if (!matches) {
    return null;
  }

  // Inject the matched params into a context overlay so nested
  // useRoute calls see them.
  const overlay: RouterContextValue = {
    ...ctx,
    params,
  };
  return <RouterContext.Provider value={overlay}>{children}</RouterContext.Provider>;
}

/* ------------------------------------------------------------------ *
 * Link
 * ------------------------------------------------------------------ */

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Destination path, e.g. `/transportadoras`. */
  to: string;
}

/**
 * Anchor that navigates via the hash router (no full page reload).
 *
 * Pass-through all standard anchor attributes except `href`, which is
 * derived from `to`.
 */
export function Link({ to, onClick, children, ...rest }: LinkProps): ReactNode {
  const ctx: RouterContextValue | undefined = useContext(RouterContext);
  if (ctx === undefined) {
    throw new Error('Link must be used within a Router');
  }
  const href: string = `#${normalizeTo(to)}`;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>): void => {
      // Allow modifier-clicks to open in a new tab/window.
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      e.preventDefault();
      ctx.navigate(to);
      if (onClick) {
        onClick(e);
      }
    },
    [ctx, to, onClick],
  );

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ *
 * useRoute
 * ------------------------------------------------------------------ */

/**
 * Access the current router state: path, query, and matched params.
 *
 * @throws if used outside of {@link Router}.
 */
export function useRoute(): RouterContextValue {
  const ctx: RouterContextValue | undefined = useContext(RouterContext);
  if (ctx === undefined) {
    throw new Error('useRoute must be used within a Router');
  }
  return ctx;
}

/* ------------------------------------------------------------------ *
 * navigate (standalone)
 * ------------------------------------------------------------------ */

/**
 * Imperatively navigate to a new path.
 *
 * Works without a React context by directly mutating
 * `window.location.hash`, so it can be called from event handlers or
 * non-component code. For context-aware navigation, prefer
 * `useRoute().navigate`.
 */
export function navigate(to: string, opts: NavigateOptions = {}): void {
  const target: string = normalizeTo(to);
  const newHash: string = `#${target}`;
  if (opts.replace) {
    const url: string = `${window.location.pathname}${window.location.search}${newHash}`;
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else if (`#${target}` !== window.location.hash) {
    window.location.hash = newHash;
  }
}
