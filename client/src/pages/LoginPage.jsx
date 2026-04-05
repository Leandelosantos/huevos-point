import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

const LoginPage = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (formData) => {
    setError('');
    const result = await login(formData.username, formData.password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 40%, #40916C 70%, #52B788 100%)',
      }}
    >
      {/* Left side - Branding (hidden on mobile) */}
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -150,
            left: -50,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 480 }}>
          <Box
            sx={{
              width: 90,
              height: 90,
              borderRadius: '24px',
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 4,
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <Box
              component="img"
              src={logo}
              alt="Huevos Point Logo"
              sx={{ width: 64, height: 64 }}
            />
          </Box>

          <Typography
            variant="h2"
            sx={{
              color: '#FFFFFF',
              mb: 2,
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            Sistema integral de gestion y registro de ventas.
          </Typography>


          {/* Feature badges */}
          <Box sx={{ display: 'flex', gap: 2, mt: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Ventas', 'Egresos', 'Stock', 'Auditoría'].map((label) => (
              <Box
                key={label}
                sx={{
                  px: 2.5,
                  py: 1,
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right side - Login form */}
      <Box
        sx={{
          flex: { xs: 1, md: '0 0 480px' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 4 },
          bgcolor: '#FFFFFF',
          borderRadius: { md: '32px 0 0 32px' },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                component="img"
                src={logo}
                alt="Huevos Point Logo"
                sx={{ width: 48, height: 48 }}
              />
            </Box>
          </Box>

          <Typography variant="h3" sx={{ mb: 0.5, fontWeight: 800, color: '#1A1A2E' }}>
            Bienvenido
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
            Ingresá tus credenciales para acceder al sistema
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              id="login-username"
              label="Usuario"
              fullWidth
              autoFocus
              autoComplete="username"
              error={Boolean(errors.username)}
              helperText={errors.username?.message}
              sx={{ mb: 2.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonRoundedIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              {...register('username', { required: 'El usuario es obligatorio' })}
            />

            <TextField
              id="login-password"
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              autoComplete="current-password"
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
              sx={{ mb: 3.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockRoundedIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              {...register('password', { required: 'La contraseña es obligatoria' })}
            />

            <Button
              id="login-submit"
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 700,
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
