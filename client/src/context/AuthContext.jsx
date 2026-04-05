import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [activeTenant, setActiveTenant] = useState(() => {
    const stored = sessionStorage.getItem('activeTenant');
    return stored ? JSON.parse(stored) : null;
  });

  const [loading, setLoading] = useState(false);

  const isAuthenticated = Boolean(user);
  const isSuperAdmin = user?.role === 'superadmin';
  const isDemo = user?.role === 'demo';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      const { token, user: userData } = data.data;

      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      if (userData.tenants && userData.tenants.length > 0) {
        const defaultTenant = userData.tenants[0];
        sessionStorage.setItem('activeTenant', JSON.stringify(defaultTenant));
        setActiveTenant(defaultTenant);
      } else {
        sessionStorage.removeItem('activeTenant');
        setActiveTenant(null);
      }

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Error al iniciar sesión';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Logout even if API call fails
    } finally {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('activeTenant');
      setUser(null);
      setActiveTenant(null);
    }
  }, []);

  const switchTenant = useCallback((tenant) => {
    sessionStorage.setItem('activeTenant', JSON.stringify(tenant));
    setActiveTenant(tenant);
  }, []);

  const removeTenantFromUser = useCallback((tenantId) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, tenants: (prev.tenants || []).filter((t) => t.id !== tenantId) };
      sessionStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addTenantToUser = useCallback((tenant) => {
    setUser((prev) => {
      if (!prev) return prev;
      const already = prev.tenants?.some((t) => t.id === tenant.id);
      if (already) return prev;
      const updated = { ...prev, tenants: [...(prev.tenants || []), tenant] };
      sessionStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateActiveTenant = useCallback((fields) => {
    setActiveTenant((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...fields };
      sessionStorage.setItem('activeTenant', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    isDemo,
    activeTenant,
    login,
    logout,
    switchTenant,
    updateActiveTenant,
    addTenantToUser,
    removeTenantFromUser,
  }), [user, loading, isAuthenticated, isAdmin, isSuperAdmin, isDemo, activeTenant, login, logout, switchTenant, updateActiveTenant, addTenantToUser, removeTenantFromUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
