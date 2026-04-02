import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Divider,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import dayjs from 'dayjs';
import api from '../services/api';
import { showErrorToast, showSuccessToast, showConfirmation } from '../utils/sweetAlert';
import { CURRENCY_FORMAT } from '../utils/formatters';

const SuperadminTenantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/superadmin/tenants/${id}`);
      setDetail(data.data);
    } catch {
      showErrorToast('Error al cargar el detalle del tenant');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleSuspend = async () => {
    const confirmed = await showConfirmation(
      '¿Suspender tenant?',
      `El tenant "${detail?.tenant?.name}" quedará inactivo y sus usuarios no podrán acceder.`,
      'Sí, suspender'
    );
    if (!confirmed) return;
    try {
      setActionLoading(true);
      await api.post(`/superadmin/tenants/${id}/suspend`);
      showSuccessToast('Tenant suspendido correctamente');
      fetchDetail();
    } catch {
      showErrorToast('Error al suspender el tenant');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    const confirmed = await showConfirmation(
      '¿Reactivar tenant?',
      `El tenant "${detail?.tenant?.name}" volverá a estar activo.`,
      'Sí, reactivar'
    );
    if (!confirmed) return;
    try {
      setActionLoading(true);
      await api.post(`/superadmin/tenants/${id}/reactivate`);
      showSuccessToast('Tenant reactivado correctamente');
      fetchDetail();
    } catch {
      showErrorToast('Error al reactivar el tenant');
    } finally {
      setActionLoading(false);
    }
  };

  const tenant = detail?.tenant;
  const isActive = tenant?.isActive;

  const infoCards = [
    {
      label: 'Ventas (30d)',
      value: CURRENCY_FORMAT.format(detail?.totalSales30d ?? 0),
      icon: <TrendingUpRoundedIcon />,
      color: '#2D6A4F',
      bgGradient: 'linear-gradient(135deg, #D8F3DC 0%, #B7E4C7 100%)',
      iconBg: '#2D6A4F',
    },
    {
      label: 'Egresos (30d)',
      value: CURRENCY_FORMAT.format(detail?.totalExpenses30d ?? 0),
      icon: <TrendingDownRoundedIcon />,
      color: '#C62828',
      bgGradient: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)',
      iconBg: '#C62828',
    },
    {
      label: 'Balance neto (30d)',
      value: CURRENCY_FORMAT.format(detail?.netBalance30d ?? 0),
      icon: <AccountBalanceWalletRoundedIcon />,
      color: (detail?.netBalance30d ?? 0) >= 0 ? '#2D6A4F' : '#C62828',
      bgGradient:
        (detail?.netBalance30d ?? 0) >= 0
          ? 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)'
          : 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
      iconBg: (detail?.netBalance30d ?? 0) >= 0 ? '#2D6A4F' : '#E65100',
    },
    {
      label: 'Productos activos',
      value: `${detail?.activeProductCount ?? 0} / ${detail?.productCount ?? 0}`,
      icon: <InventoryRoundedIcon />,
      color: '#1565C0',
      bgGradient: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
      iconBg: '#1565C0',
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Button
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate('/superadmin')}
            sx={{ color: 'text.secondary', mb: 1, textTransform: 'none', p: 0, minWidth: 0 }}
          >
            Volver al panel
          </Button>
          {loading ? (
            <Skeleton width={220} height={48} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {tenant?.name}
              </Typography>
              <Chip
                label={isActive ? 'Activo' : 'Suspendido'}
                size="small"
                sx={{
                  fontWeight: 700,
                  backgroundColor: isActive ? 'rgba(82, 183, 136, 0.1)' : 'rgba(198, 40, 40, 0.1)',
                  color: isActive ? '#2D6A4F' : '#C62828',
                }}
              />
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {!loading && isActive && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<TrendingDownRoundedIcon />}
              onClick={handleSuspend}
              disabled={actionLoading}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
            >
              Suspender
            </Button>
          )}
          {!loading && !isActive && (
            <Button
              variant="contained"
              startIcon={<TrendingUpRoundedIcon />}
              onClick={handleReactivate}
              disabled={actionLoading}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' },
              }}
            >
              Reactivar
            </Button>
          )}
        </Box>
      </Box>

      {/* Info Cards */}
      <Grid container spacing={3} sx={{ mb: 4, width: '100%', m: 0, p: 0 }}>
        {infoCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.label} sx={{ pl: { xs: 0, sm: 3 }, pt: { xs: 2, sm: 3 } }}>
            <Card sx={{ background: card.bgGradient, border: 'none', position: 'relative', overflow: 'hidden' }}>
              <Box
                sx={{
                  position: 'absolute', top: -20, right: -20,
                  width: 100, height: 100, borderRadius: '50%',
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
                        sx={{ color: card.color, fontWeight: 800, fontSize: { xs: '1.3rem', sm: '1.5rem' } }}
                      >
                        {card.value}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      width: 48, height: 48, borderRadius: '14px',
                      backgroundColor: card.iconBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#FFFFFF', position: 'relative', zIndex: 1,
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

      {/* Users Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleRoundedIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Usuarios del Tenant
            </Typography>
          </Box>
          <Divider />
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table sx={{ minWidth: 500 }}>
              <TableHead sx={{ backgroundColor: '#F8FBF9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Usuario</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Nombre</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Rol</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: '#4CAF50' }}>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (detail?.users ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No hay usuarios en este tenant
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (detail?.users ?? []).map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{user.username}</TableCell>
                      <TableCell>{user.fullName}</TableCell>
                      <TableCell>{user.email || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={
                            user.role === 'superadmin'
                              ? 'Super Admin'
                              : user.role === 'admin'
                              ? 'Administrador'
                              : 'Empleado'
                          }
                          size="small"
                          color={user.role === 'superadmin' ? 'secondary' : user.role === 'admin' ? 'primary' : 'default'}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={user.isActive ? 'Activo' : 'Inactivo'}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            backgroundColor: user.isActive ? 'rgba(82, 183, 136, 0.1)' : 'rgba(239, 83, 80, 0.1)',
                            color: user.isActive ? '#2D6A4F' : '#D32F2F',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Recent Sales */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpRoundedIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Ventas recientes (últimos 30 días)
            </Typography>
          </Box>
          <Divider />
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table sx={{ minWidth: 400 }}>
              <TableHead sx={{ backgroundColor: '#F8FBF9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Medio de pago</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: '#4CAF50' }}>Importe</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <TableCell key={j}><Skeleton /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (detail?.recentSales ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Sin ventas en los últimos 30 días
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (detail?.recentSales ?? []).map((sale) => (
                    <TableRow key={sale.id} hover>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>#{sale.id}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {dayjs(sale.saleDate).format('DD/MM/YYYY')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{sale.paymentMethod || '—'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D6A4F' }}>
                          {CURRENCY_FORMAT.format(sale.totalAmount)}
                        </Typography>
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

export default SuperadminTenantDetailPage;
