import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import axios from 'axios';

/**
 * Punto de entrada para el auto-login cross-app desde Dashboard Maestro.
 * URL: /auto-login?token=<JWT>&tenant=<tenantId>
 *
 * El Dashboard Maestro genera un JWT firmado con el mismo JWT_SECRET de Huevos Point.
 * Esta página lo valida via POST /api/auth/auto-login y arranca la sesión.
 */
const AutoLoginPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const tenantIdParam = searchParams.get('tenant');

    if (!token) {
      setError('Token no proporcionado.');
      return;
    }

    const doAutoLogin = async () => {
      try {
        // Usamos axios directo (sin el interceptor global) para que un 401
        // no redirija al login antes de que podamos mostrar el error
        const base = import.meta.env.VITE_API_URL || '/api';
        const { data } = await axios.post(`${base}/auth/auto-login`, { token });
        const { token: validatedToken, user } = data.data;

        sessionStorage.setItem('token', validatedToken);
        sessionStorage.setItem('user', JSON.stringify(user));

        // Seleccionar el tenant pedido, o el primero disponible
        const tenants = user.tenants || [];
        const targetId = tenantIdParam ? parseInt(tenantIdParam, 10) : null;
        const activeTenant =
          (targetId && tenants.find((t) => t.id === targetId)) ||
          tenants[0] ||
          null;

        if (activeTenant) {
          sessionStorage.setItem('activeTenant', JSON.stringify(activeTenant));
        } else {
          sessionStorage.removeItem('activeTenant');
        }

        navigate('/', { replace: true });
      } catch (err) {
        const msg = err.response?.data?.message || 'Error al validar el token de acceso.';
        setError(msg);
      }
    };

    doAutoLogin();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          <Typography fontWeight={600} mb={0.5}>
            Error de acceso automático
          </Typography>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress size={40} />
      <Typography color="text.secondary">Iniciando sesión automática…</Typography>
    </Box>
  );
};

export default AutoLoginPage;
