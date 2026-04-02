import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme/theme';
import { AuthProvider } from './context/AuthContext';
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

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

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
                  <ProtectedRoute requiredRole="superadmin">
                    <UsersPage />
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
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
