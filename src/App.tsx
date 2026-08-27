/**
 * # App
 *
 * Root application component. Mounts the {@link AuthProvider}, the
 * hash-based {@link Router}, and declares every route.
 *
 * Routes:
 * - `/`                        → LandingPage (PublicLayout)
 * - `/login`                   → LoginPage (PublicLayout)
 * - `/registro`                → RegisterPage (PublicLayout)
 * - `/forgot-password`         → ForgotPasswordPage (PublicLayout)
 * - `/reset-password`          → ResetPasswordPage (PublicLayout)
 * - `/verify-email`            → VerifyEmailPage (PublicLayout)
 * - `/onboarding`              → OnboardingPage (PublicLayout)
 * - `/transportadoras`         → ProvidersPage (PublicLayout)
 * - `/transportadoras/:slug`   → ProviderDetailPage (PublicLayout)
 * - `/account`                 → AccountPage (auth layout)
 * - `/provider/registro`       → ProviderRegister (PublicLayout)
 * - `/provider`                → ProviderDashboard (ProviderLayout)
 * - `/provider/perfil`         → ProviderProfile (ProviderLayout)
 * - `/provider/vehiculos`      → VehiclesPage (ProviderLayout)
 * - `/provider/operadores`     → DriversPage (ProviderLayout)
 * - `/provider/documentos`     → DocumentsPage (ProviderLayout)
 * - `/provider/configuracion`  → ProviderSettings (ProviderLayout)
 *
 * Public routes are wrapped in {@link PublicLayout}. Provider dashboard
 * routes are wrapped in {@link ProviderLayout}; the registration route
 * (`/provider/registro`) uses {@link PublicLayout} since the user may
 * not be authenticated yet.
 *
 * @packageDocumentation
 */

import { type ReactNode } from 'react';

import { AuthProvider } from '@/context/AuthContext';
import { Router, Route, useRoute } from '@/lib/router';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ProviderLayout } from '@/components/layout/ProviderLayout';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { ProvidersPage } from '@/pages/ProvidersPage';
import { ProviderDetailPage } from '@/pages/ProviderDetailPage';
import { AccountPage } from '@/pages/AccountPage';
import { ProviderDashboard } from '@/pages/provider/ProviderDashboard';
import { ProviderRegister } from '@/pages/provider/ProviderRegister';
import { ProviderProfile } from '@/pages/provider/ProviderProfile';
import { VehiclesPage } from '@/pages/provider/VehiclesPage';
import { DriversPage } from '@/pages/provider/DriversPage';
import { DocumentsPage } from '@/pages/provider/DocumentsPage';
import { ProviderSettings } from '@/pages/provider/ProviderSettings';

/* ------------------------------------------------------------------ *
 * Route switch
 * ------------------------------------------------------------------ */

/**
 * Renders the matching route based on the current hash path.
 *
 * Wrapped in {@link Router} so all child {@link Route} components share
 * the same router context. Public routes share {@link PublicLayout};
 * provider dashboard routes use {@link ProviderLayout}.
 */
function Routes(): ReactNode {
  const { path } = useRoute();

  return (
    <>
      {/* ---- Public routes ---- */}
      <Route path="/">
        <PublicLayout>
          <LandingPage />
        </PublicLayout>
      </Route>

      <Route path="/login">
        <PublicLayout>
          <LoginPage />
        </PublicLayout>
      </Route>

      <Route path="/registro">
        <PublicLayout>
          <RegisterPage />
        </PublicLayout>
      </Route>

      <Route path="/forgot-password">
        <PublicLayout>
          <ForgotPasswordPage />
        </PublicLayout>
      </Route>

      <Route path="/reset-password">
        <PublicLayout>
          <ResetPasswordPage />
        </PublicLayout>
      </Route>

      <Route path="/verify-email">
        <PublicLayout>
          <VerifyEmailPage />
        </PublicLayout>
      </Route>

      <Route path="/onboarding">
        <PublicLayout>
          <OnboardingPage />
        </PublicLayout>
      </Route>

      <Route path="/transportadoras">
        <PublicLayout>
          <ProvidersPage />
        </PublicLayout>
      </Route>

      <Route path="/transportadoras/:slug">
        <PublicLayout>
          <ProviderDetailPage />
        </PublicLayout>
      </Route>

      {/* ---- Authenticated routes ---- */}
      <Route path="/account">
        <AccountPage />
      </Route>

      {/* ---- Provider routes (registration is public, dashboard is authed) ---- */}
      <Route path="/provider/registro">
        <PublicLayout>
          <ProviderRegister />
        </PublicLayout>
      </Route>

      <Route path="/provider/perfil">
        <ProviderLayout>
          <ProviderProfile />
        </ProviderLayout>
      </Route>

      <Route path="/provider/vehiculos">
        <ProviderLayout>
          <VehiclesPage />
        </ProviderLayout>
      </Route>

      <Route path="/provider/operadores">
        <ProviderLayout>
          <DriversPage />
        </ProviderLayout>
      </Route>

      <Route path="/provider/documentos">
        <ProviderLayout>
          <DocumentsPage />
        </ProviderLayout>
      </Route>

      <Route path="/provider/configuracion">
        <ProviderLayout>
          <ProviderSettings />
        </ProviderLayout>
      </Route>

      <Route path="/provider">
        <ProviderLayout>
          <ProviderDashboard />
        </ProviderLayout>
      </Route>

      {/* ---- Fallback ---- */}
      {path !== '/' &&
        !path.startsWith('/login') &&
        !path.startsWith('/registro') &&
        !path.startsWith('/forgot-password') &&
        !path.startsWith('/reset-password') &&
        !path.startsWith('/verify-email') &&
        !path.startsWith('/onboarding') &&
        !path.startsWith('/transportadoras') &&
        !path.startsWith('/account') &&
        !path.startsWith('/provider') && <NotFound />}
    </>
  );
}

/**
 * Minimal 404 fallback shown for unmatched routes.
 */
function NotFound(): ReactNode {
  return (
    <PublicLayout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-6xl font-extrabold text-rr-red-600">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Página no encontrada</h1>
        <p className="mt-2 text-slate-500">
          La página que buscas no existe o fue movida.
        </p>
      </div>
    </PublicLayout>
  );
}

/* ------------------------------------------------------------------ *
 * App
 * ------------------------------------------------------------------ */

function App(): ReactNode {
  return (
    <AuthProvider>
      <Router>
        <Routes />
      </Router>
    </AuthProvider>
  );
}

export default App;
