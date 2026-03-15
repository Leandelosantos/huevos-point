import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Chip,
  Skeleton,
  Grid,
  Pagination,
} from '@mui/material';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import dayjs from 'dayjs';
import api from '../services/api';
import { showErrorAlert } from '../utils/sweetAlert';

const ACTION_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'VENTA', label: 'Venta' },
  { value: 'EGRESO', label: 'Egreso' },
  { value: 'PRODUCTO_CREADO', label: 'Producto creado' },
  { value: 'PRODUCTO_MODIFICADO', label: 'Producto modificado' },
  { value: 'PRODUCTO_ELIMINADO', label: 'Producto eliminado' },
];

const ACTION_COLORS = {
  LOGIN: { bg: 'rgba(2, 136, 209, 0.1)', color: '#0288D1' },
  LOGOUT: { bg: 'rgba(117, 117, 117, 0.1)', color: '#757575' },
  VENTA: { bg: 'rgba(45, 106, 79, 0.1)', color: '#2D6A4F' },
  EGRESO: { bg: 'rgba(198, 40, 40, 0.1)', color: '#C62828' },
  PRODUCTO_CREADO: { bg: 'rgba(46, 125, 50, 0.1)', color: '#2E7D32' },
  PRODUCTO_MODIFICADO: { bg: 'rgba(237, 108, 2, 0.1)', color: '#ED6C02' },
  PRODUCTO_ELIMINADO: { bg: 'rgba(198, 40, 40, 0.1)', color: '#C62828' },
};

const PAGE_SIZE = 20;

const AuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    actionType: '',
    username: '',
  });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };

      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.actionType) params.actionType = filters.actionType;
      if (filters.username) params.username = filters.username;

      const { data } = await api.get('/audit-logs', { params });
      setLogs(data.data.logs);
      setTotal(data.data.total);
    } catch {
      showErrorAlert('Error', 'Error al cargar auditoría');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
          Auditoría
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Registro de todas las acciones del sistema
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center" sx={{ width: '100%', m: 0 }}>
            <Grid item xs={12} sm={6} md={3} sx={{ pl: { xs: 0, sm: 2 }, pt: { xs: 2, sm: 2 } }}>
              <TextField
                label="Fecha desde"
                type="date"
                fullWidth
                size="small"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3} sx={{ pl: { xs: 0, sm: 2 }, pt: { xs: 2, sm: 2 } }}>
              <TextField
                label="Fecha hasta"
                type="date"
                fullWidth
                size="small"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3} sx={{ pl: { xs: 0, sm: 2 }, pt: { xs: 2, sm: 2 } }}>
              <TextField
                select
                label="Tipo de acción"
                fullWidth
                size="small"
                value={filters.actionType}
                onChange={(e) => handleFilterChange('actionType', e.target.value)}
              >
                {ACTION_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3} sx={{ pl: { xs: 0, sm: 2 }, pt: { xs: 2, sm: 2 } }}>
              <TextField
                label="Usuario"
                fullWidth
                size="small"
                value={filters.username}
                onChange={(e) => handleFilterChange('username', e.target.value)}
                placeholder="Buscar por usuario"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
            <Table size="small" sx={{ minWidth: { xs: 700, md: '100%' } }}>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha/Hora</TableCell>
                  <TableCell>Acción</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Descripción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      <HistoryRoundedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        No hay registros para los filtros seleccionados
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const actionStyle = ACTION_COLORS[log.actionType] || {
                      bg: 'rgba(0,0,0,0.05)',
                      color: '#666',
                    };
                    return (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Typography variant="body2">
                            {dayjs(log.createdAt).format('DD/MM/YYYY')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(log.createdAt).format('HH:mm:ss')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.actionType}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              backgroundColor: actionStyle.bg,
                              color: actionStyle.color,
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {log.username}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 350 }}>
                          <Typography variant="body2" noWrap title={log.description}>
                            {log.description}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AuditPage;
