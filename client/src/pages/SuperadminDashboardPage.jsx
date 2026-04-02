import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import dayjs from 'dayjs';
import api from '../services/api';
import { showErrorToast } from '../utils/sweetAlert';
import { CURRENCY_FORMAT } from '../utils/formatters';

const SuperadminDashboardPage = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, tenantsRes] = await Promise.all([
        api.get('/superadmin/dashboard'),
        api.get('/superadmin/tenants'),
      ]);
      setDashboard(dashRes.data.data);
      setTenants(tenantsRes.data.data);
    } catch {
      showErrorToast('Error al cargar el panel de superadmin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statCards = [
    {
      label: 'Total Tenants',
      value: dashboard?.tenantStats?.total ?? 0,
      icon: <BusinessRoundedIcon />,
      color: '#1B4332',
      bgGradient: 'linear-gradient(135deg, #D8F3DC 0%, #B7E4C7 100%)',
      iconBg: '#2D6A4F',
    },
    {
      label: 'Activos',
      value: dashboard?.tenantStats?.active ?? 0,
      icon: <CheckCircleRoundedIcon />,
      color: '#2D6A4F',
      bgGradient: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
      iconBg: '#388E3C',
    },
    {
      label: 'Suspendidos',
      value: dashboard?.tenantStats?.suspended ?? 0,
      icon: <BlockRoundedIcon />,
      color: '#C62828',
      bgGradient: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)',
      iconBg: '#C62828',
    },
    {
      label: 'Ventas (30d)',
      value: dashboard?.totalRevenueLast30Days ?? 0,
      icon: <TrendingUpRoundedIcon />,
      color: '#1565C0',
      bgGradient: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
      iconBg: '#1565C0',
      isCurrency: true,
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
          Panel Superadmin
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Visión global de todos los tenants y operaciones del sistema
        </Typography>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4, width: '100%', m: 0, p: 0 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.label} sx={{ pl: { xs: 0, sm: 3 }, pt: { xs: 2, sm: 3 } }}>
            <Card
              sx={{
                background: card.bgGradient,
                border: 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.3)',
                }}
              />
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: card.color, fontWeight: 600, mb: 1, opacity: 0.8 }}>
                      {card.label}
                    </Typography>
                    {loading ? (
                      <Skeleton width={100} height={40} />
                    ) : (
                      <Typography
                        variant="h3"
                        sx={{ color: card.color, fontWeight: 800, fontSize: { xs: '1.5rem', sm: '1.75rem' } }}
                      >
                        {card.isCurrency ? CURRENCY_FORMAT.format(card.value) : card.value}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '14px',
                      backgroundColor: card.iconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tenants Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessRoundedIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Todos los Tenants
            </Typography>
          </Box>

          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table sx={{ minWidth: 700 }}>
              <TableHead sx={{ backgroundColor: '#F8FBF9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Nombre</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Usuarios</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Productos</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }} align="right">
                    Ventas (30d)
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Fecha alta</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : tenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No hay tenants registrados
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  tenants.map((tenant) => (
                    <TableRow key={tenant.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{tenant.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={tenant.isActive ? 'Activo' : 'Suspendido'}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            backgroundColor: tenant.isActive
                              ? 'rgba(82, 183, 136, 0.1)'
                              : 'rgba(198, 40, 40, 0.1)',
                            color: tenant.isActive ? '#2D6A4F' : '#C62828',
                          }}
                        />
                      </TableCell>
                      <TableCell>{tenant.userCount}</TableCell>
                      <TableCell>{tenant.productCount}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {CURRENCY_FORMAT.format(tenant.salesLast30Days)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {dayjs(tenant.createdAt).format('DD/MM/YYYY')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver detalle">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/superadmin/tenants/${tenant.id}`)}
                            sx={{ color: '#2D6A4F' }}
                          >
                            <OpenInNewRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SuperadminDashboardPage;
