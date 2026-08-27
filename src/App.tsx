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
 * - `/auth/google-callback`    → GoogleCallbackPage
 * - `/auth/azure-callback`     → AzureCallbackPage
 * - `/transportadoras`         → ProvidersPage (PublicLayout)
 * - `/transportadoras/:slug`   → ProviderDetailPage (PublicLayout)
 * - `/account`                 → AccountPage (ProtectedRoute)
 * - `/provider/registro`       → ProviderRegister (PublicLayout)
 * - `/provider`                → ProviderDashboard (ProtectedRoute + ProviderLayout)
 * - `/provider/perfil`         → ProviderProfile (ProtectedRoute + ProviderLayout)
 * - `/provider/vehiculos`      → VehiclesPage (ProtectedRoute + ProviderLayout)
 * - `/provider/operadores`     → DriversPage (ProtectedRoute + ProviderLayout)
 * - `/provider/documentos`     → DocumentsPage (ProtectedRoute + ProviderLayout)
 * - `/provider/configuracion`  → ProviderSettings (ProtectedRoute + ProviderLayout)
 */
import { type ReactNode } from 'react';

import { AuthProvider } from '@/context/AuthContext';
import { Router, Route, useRoute } from '@/lib/router';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ProviderLayout } from '@/components/layout/ProviderLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { GoogleCallbackPage } from '@/pages/auth/GoogleCallbackPage';
import { AzureCallbackPage } from '@/pages/auth/AzureCallbackPage';
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

      {/* ---- OAuth callbacks ---- */}
      <Route path="/auth/google-callback">
        <GoogleCallbackPage />
      </Route>

      <Route path="/auth/azure-callback">
        <AzureCallbackPage />
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
        <ProtectedRoute>
          <AccountPage />
        </ProtectedRoute>
      </Route>

      {/* ---- Provider routes ---- */}
      <Route path="/provider/registro">
        <PublicLayout>
          <ProviderRegister />
        </PublicLayout>
      </Route>

      <Route path="/provider/perfil">
        <ProtectedRoute>
          <ProviderLayout>
            <ProviderProfile />
          </ProviderLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/provider/vehiculos">
        <ProtectedRoute>
          <ProviderLayout>
            <VehiclesPage />
          </ProviderLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/provider/operadores">
        <ProtectedRoute>
          <ProviderLayout>
            <DriversPage />
          </ProviderLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/provider/documentos">
        <ProtectedRoute>
          <ProviderLayout>
            <DocumentsPage />
          </ProviderLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/provider/configuracion">
        <ProtectedRoute>
          <ProviderLayout>
            <ProviderSettings />
          </ProviderLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/provider">
        <ProtectedRoute>
          <ProviderLayout>
            <ProviderDashboard />
          </ProviderLayout>
        </ProtectedRoute>
      </Route>

      {/* ---- Fallback ---- */}
      {path !== '/' &&
        !path.startsWith('/login') &&
        !path.startsWith('/registro') &&
        !path.startsWith('/forgot-password') &&
        !path.startsWith('/reset-password') &&
        !path.startsWith('/verify-email') &&
        !path.startsWith('/onboarding') &&
        !path.startsWith('/auth/') &&
        !path.startsWith('/transportadoras') &&
        !path.startsWith('/account') &&
        !path.startsWith('/provider') && <NotFound />}
    </>
  );
}

function NotFound(): ReactNode {
  return (
    <PublicLayout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <p className="text-6xl font-extrabold text-rr-red-600">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Página no encontrada</h1>
        <p className="mt-2 text-slate-500">La página que buscas no existe o fue movida.</p>
      </div>
    </PublicLayout>
  );
}

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
