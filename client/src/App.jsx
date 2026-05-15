import { useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from './context/ThemeContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { useAppTheme } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StockPage from './pages/StockPage';
import AuditPage from './pages/AuditPage';
import MetricsPage from './pages/MetricsPage';
import UsersPage from './pages/UsersPage';
import PurchasesPage from './pages/PurchasesPage';
import SuperadminDashboardPage from './pages/SuperadminDashboardPage';
import SuperadminTenantDetailPage from './pages/SuperadminTenantDetailPage';
import ConfigPage from './pages/ConfigPage';
import AutoLoginPage from './pages/AutoLoginPage';
import ApiKeysPage from './pages/ApiKeysPage';
import useInactivityTimer from './hooks/useInactivityTimer';

// Sincroniza el tema del tenant activo con el ThemeContext
const ThemeSyncer = () => {
  const { activeTenant } = useAuth();
  const { applyTheme } = useAppTheme();

  useEffect(() => {
    if (activeTenant?.theme) {
      applyTheme(activeTenant.theme);
    }
  }, [activeTenant?.theme, applyTheme]);

  return null;
};

// Cierra sesión por inactividad tras 1 hora sin interacción real
const InactivityWatcher = () => {
  const { isAuthenticated, logout } = useAuth();

  const handleExpire = useCallback(async () => {
    await logout('inactivity');
  }, [logout]);

  useInactivityTimer({ isAuthenticated, onExpire: handleExpire });

  return null;
};

const App = () => {
  return (
    <ThemeProvider>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <CurrencyProvider>
            <ThemeSyncer />
            <InactivityWatcher />
            <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auto-login" element={<AutoLoginPage />} />

            {/* Protected layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route
                path="/stock"
                element={
                  <ProtectedRoute requiredRole={['admin', 'demo']}>
                    <StockPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchases"
                element={
                  <ProtectedRoute requiredRole={['admin', 'demo']}>
                    <PurchasesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit"
                element={
                  <ProtectedRoute requiredRole={['admin', 'demo']}>
                    <AuditPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/metrics"
                element={
                  <ProtectedRoute requiredRole={['admin', 'demo']}>
                    <MetricsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute requiredRole={['admin', 'superadmin']}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/config"
                element={
                  <ProtectedRoute requiredRole={['admin', 'superadmin']}>
                    <ConfigPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin"
                element={
                  <ProtectedRoute requiredRole="superadmin">
                    <SuperadminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/api-keys"
                element={
                  <ProtectedRoute requiredRole="superadmin">
                    <ApiKeysPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/tenants/:id"
                element={
                  <ProtectedRoute requiredRole="superadmin">
                    <SuperadminTenantDetailPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CurrencyProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
