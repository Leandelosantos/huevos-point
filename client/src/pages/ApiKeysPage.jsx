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
  Paper,
  Skeleton,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  AlertTitle,
  InputAdornment,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import dayjs from 'dayjs';
import api from '../services/api';
import { showErrorToast, showSuccessToast, showConfirmation } from '../utils/sweetAlert';

// ─── Constantes ──────────────────────────────────────────────────────────────

const VALID_SCOPES = [
  { value: 'read:all',       label: 'read:all',       hint: 'Acceso completo de lectura a todos los recursos. Ideal para integraciones de confianza.' },
  { value: 'read:tenants',   label: 'read:tenants',   hint: 'Solo puede listar las sucursales visibles para la clave.' },
  { value: 'read:products',  label: 'read:products',  hint: 'Solo puede consultar el catálogo de productos.' },
  { value: 'read:sales',     label: 'read:sales',     hint: 'Solo puede leer ventas e ítems de cada venta.' },
  { value: 'read:expenses',  label: 'read:expenses',  hint: 'Solo puede consultar egresos.' },
  { value: 'read:purchases', label: 'read:purchases', hint: 'Solo puede consultar compras (sin comprobante binario).' },
  { value: 'read:metrics',   label: 'read:metrics',   hint: 'Solo puede ver totales agregados (ingresos, egresos, saldo neto).' },
];

const SCOPE_COLORS = {
  'read:all':       { bg: '#E8F5E9', color: '#2D6A4F' },
  'read:tenants':   { bg: '#E3F2FD', color: '#1565C0' },
  'read:products':  { bg: '#FFF3E0', color: '#E65100' },
  'read:sales':     { bg: '#F3E5F5', color: '#6A1B9A' },
  'read:expenses':  { bg: '#FCE4EC', color: '#AD1457' },
  'read:purchases': { bg: '#E0F7FA', color: '#00695C' },
  'read:metrics':   { bg: '#FFFDE7', color: '#F57F17' },
};

// ─── Componente de hint ───────────────────────────────────────────────────────

const HintTooltip = ({ text }) => (
  <Tooltip title={text} placement="right" arrow>
    <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help', verticalAlign: 'middle', ml: 0.5 }} />
  </Tooltip>
);

// ─── Modal de nueva API key ───────────────────────────────────────────────────

const NewKeyModal = ({ open, onClose, onCreated }) => {
  const [loading, setLoading] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState(['read:all']);
  const hasReadAll = selectedScopes.includes('read:all');

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: { name: '', scopeType: 'business', businessId: '', rateLimitPerMin: 60, expiresAt: '' },
  });

  const handleClose = () => {
    reset();
    setSelectedScopes(['read:all']);
    onClose();
  };

  const toggleScope = (scope) => {
    if (scope === 'read:all') {
      setSelectedScopes(['read:all']);
      return;
    }
    setSelectedScopes((prev) => {
      const withoutAll = prev.filter((s) => s !== 'read:all');
      return withoutAll.includes(scope)
        ? withoutAll.filter((s) => s !== scope)
        : [...withoutAll, scope];
    });
  };

  const onSubmit = async (values) => {
    if (selectedScopes.length === 0) {
      showErrorToast('Seleccioná al menos un scope');
      return;
    }
    setLoading(true);
    try {
      const body = {
        name: values.name.trim(),
        scopes: selectedScopes,
        rateLimitPerMin: parseInt(values.rateLimitPerMin, 10) || 60,
      };
      if (values.scopeType === 'business') {
        body.businessId = parseInt(values.businessId, 10);
      } else {
        body.tenantId = parseInt(values.businessId, 10);
      }
      if (values.expiresAt) body.expiresAt = new Date(values.expiresAt).toISOString();

      const { data } = await api.post('/admin/api-keys', body);
      onCreated(data.data);
      handleClose();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Error al crear la API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VpnKeyRoundedIcon sx={{ color: '#2D6A4F' }} />
          Nueva API Key
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Nombre */}
          <Box>
            <Typography variant="body2" fontWeight={600} mb={0.5}>
              Nombre descriptivo
              <HintTooltip text="Identificá para qué sistema es esta clave. Ej: 'Dashboard Maestro – Producción'. No afecta el funcionamiento." />
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Ej: Dashboard Maestro - Producción"
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              {...register('name', { required: 'El nombre es obligatorio' })}
            />
          </Box>

          {/* Tipo de scope de aislamiento */}
          <Box>
            <Typography variant="body2" fontWeight={600} mb={0.5}>
              Tipo de acceso
              <HintTooltip text="'Negocio' da acceso a todas las sucursales del negocio. 'Sucursal' restringe a una sola sucursal. No podés combinar ambos." />
            </Typography>
            <Controller
              name="scopeType"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo</InputLabel>
                  <Select label="Tipo" {...field}>
                    <MenuItem value="business">Negocio (todas las sucursales)</MenuItem>
                    <MenuItem value="tenant">Sucursal (una sola)</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Box>

          {/* ID del negocio o sucursal */}
          <Box>
            <Typography variant="body2" fontWeight={600} mb={0.5}>
              ID del negocio o sucursal
              <HintTooltip text="El ID numérico del negocio (si elegiste 'Negocio') o de la sucursal (si elegiste 'Sucursal'). Podés verlo en la tabla de sucursales del panel superadmin." />
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              placeholder="Ej: 1"
              error={Boolean(errors.businessId)}
              helperText={errors.businessId?.message}
              {...register('businessId', {
                required: 'El ID es obligatorio',
                min: { value: 1, message: 'Debe ser un número positivo' },
              })}
            />
          </Box>

          {/* Scopes funcionales */}
          <Box>
            <Typography variant="body2" fontWeight={600} mb={0.5}>
              Permisos (scopes)
              <HintTooltip text="Definís qué endpoints puede consumir esta clave. 'read:all' es un comodín que habilita todo. Para mayor control, seleccioná solo los recursos necesarios." />
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <FormGroup>
                {VALID_SCOPES.map((s) => (
                  <FormControlLabel
                    key={s.value}
                    sx={{ mb: 0.5, alignItems: 'flex-start' }}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedScopes.includes(s.value)}
                        disabled={s.value !== 'read:all' && hasReadAll}
                        onChange={() => toggleScope(s.value)}
                        sx={{ pt: 0.5 }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.4 }}>
                          {s.label}
                          <HintTooltip text={s.hint} />
                        </Typography>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
              {hasReadAll && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Con <strong>read:all</strong> activo, los scopes individuales están deshabilitados (ya están incluidos).
                </Typography>
              )}
            </Paper>
          </Box>

          {/* Rate limit */}
          <Box>
            <Typography variant="body2" fontWeight={600} mb={0.5}>
              Límite de requests por minuto
              <HintTooltip text="Máximo de llamadas por minuto para esta clave (sliding window). Default: 60. Hay también un límite global de 120 req/min por IP que aplica sobre toda la API pública." />
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              {...register('rateLimitPerMin', { min: 1, max: 600 })}
              InputProps={{ endAdornment: <InputAdornment position="end">req/min</InputAdornment> }}
            />
          </Box>

          {/* Expiración (opcional) */}
          <Box>
            <Typography variant="body2" fontWeight={600} mb={0.5}>
              Fecha de expiración (opcional)
              <HintTooltip text="Si se completa, la clave dejará de funcionar automáticamente en esa fecha. Útil para integraciones temporales. Si se deja vacío, la clave no expira." />
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="date"
              InputLabelProps={{ shrink: true }}
              {...register('expiresAt')}
            />
          </Box>

        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={handleClose} color="inherit" disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Creando…' : 'Crear API key'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// ─── Modal de rawKey (se muestra una sola vez) ────────────────────────────────

const RawKeyModal = ({ open, keyData, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(keyData?.rawKey || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <KeyRoundedIcon sx={{ color: '#2D6A4F' }} />
          API Key creada — copiala ahora
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle sx={{ fontWeight: 700 }}>Esta es la única vez que verás esta clave completa</AlertTitle>
          Solo se almacena su hash SHA-256. Si la perdés, deberás revocarla y crear una nueva.
        </Alert>

        <Typography variant="body2" color="text.secondary" mb={1}>
          Clave generada para: <strong>{keyData?.name}</strong>
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            p: 2, borderRadius: 2, fontFamily: 'monospace', fontSize: '0.78rem',
            wordBreak: 'break-all', bgcolor: '#F8FBF9',
            display: 'flex', alignItems: 'center', gap: 1,
            border: '1.5px solid #2D6A4F',
          }}
        >
          <Box sx={{ flex: 1 }}>{keyData?.rawKey}</Box>
          <Tooltip title={copied ? '¡Copiado!' : 'Copiar al portapapeles'}>
            <IconButton size="small" onClick={handleCopy} sx={{ color: '#2D6A4F', flexShrink: 0 }}>
              {copied ? <CheckRoundedIcon fontSize="small" /> : <ContentCopyRoundedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Paper>

        <Box sx={{ mt: 2.5, p: 2, bgcolor: '#F3F4F6', borderRadius: 2 }}>
          <Typography variant="body2" fontWeight={700} mb={1} color="text.primary">
            ¿Cómo usarla?
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.8 }}>
            Agregá uno de estos headers en cada request a <code>/api/public/v1</code>:<br />
            <code>Authorization: Bearer {keyData?.rawKey}</code><br />
            — o —<br />
            <code>x-api-key: {keyData?.rawKey}</code>
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="contained" onClick={onClose}>
          Ya la guardé, cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

const ApiKeysPage = () => {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyModal, setNewKeyModal] = useState(false);
  const [rawKeyModal, setRawKeyModal] = useState(false);
  const [createdKey, setCreatedKey] = useState(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/api-keys');
      setKeys(data.data || []);
    } catch {
      showErrorToast('Error al cargar las API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreated = (keyData) => {
    setCreatedKey(keyData);
    setRawKeyModal(true);
    fetchKeys();
  };

  const handleRevoke = async (key) => {
    const confirmed = await showConfirmation(
      `¿Revocar "${key.name}"?`,
      'Todos los sistemas que usen esta clave recibirán 401 inmediatamente. No se puede deshacer.',
      'Sí, revocar'
    );
    if (!confirmed) return;
    try {
      await api.delete(`/admin/api-keys/${key.id}`);
      showSuccessToast('API key revocada');
      fetchKeys();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Error al revocar la key');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            API Keys
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Credenciales de acceso de solo lectura para sistemas satélite (ERPs, BI, integraciones externas).
            <HintTooltip text="La API pública /api/public/v1 es de solo lectura. Nunca expone contraseñas, tokens internos ni datos fuera del scope de la clave. Para operar sobre los datos, usá el panel principal." />
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => setNewKeyModal(true)}
          sx={{ flexShrink: 0 }}
        >
          Nueva API key
        </Button>
      </Box>

      {/* Info banner */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <AlertTitle sx={{ fontWeight: 700 }}>¿Qué es una API key?</AlertTitle>
        Es una credencial que le permite a un sistema externo leer datos de Huevos Point sin acceder al panel.
        Cada clave tiene <strong>permisos</strong> (qué puede ver), <strong>scope</strong> (qué sucursales) y un
        <strong> límite de velocidad</strong> (cuántas requests por minuto). El secreto de la clave
        <strong> solo se ve una vez</strong> al crearla — luego solo se almacena su hash.
      </Alert>

      {/* Tabla */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <VpnKeyRoundedIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Claves activas y revocadas
            </Typography>
            <Tooltip title="Las claves revocadas ya no funcionan. Se muestran para auditoría." arrow>
              <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help', ml: 0.5 }} />
            </Tooltip>
          </Box>

          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table sx={{ minWidth: 750 }}>
              <TableHead sx={{ backgroundColor: '#F8FBF9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>
                    Nombre
                    <HintTooltip text="Etiqueta descriptiva para identificar a qué sistema pertenece la clave." />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>
                    Prefijo
                    <HintTooltip text="Los primeros 12 caracteres de la clave. Permite identificar qué clave está siendo usada sin exponer el secreto completo." />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>
                    Scope
                    <HintTooltip text="'Negocio' puede ver todas las sucursales del business. 'Sucursal' solo ve una." />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>
                    Permisos
                    <HintTooltip text="Los endpoints que puede consumir esta clave." />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>
                    Rate limit
                    <HintTooltip text="Máximo de requests por minuto para esta clave (ventana deslizante de 60 segundos)." />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>
                    Último uso
                    <HintTooltip text="Última vez que se usó la clave. Se actualiza con un retraso de hasta 60 segundos para evitar sobrecarga de escrituras." />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#4CAF50' }}>
                    Expira
                    <HintTooltip text="Si está configurada, la clave se invalida automáticamente en esa fecha. Vacío = sin expiración." />
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: '#4CAF50' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Skeleton /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : keys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <VpnKeyRoundedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        No hay API keys creadas todavía
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        Creá una para conectar un sistema satélite
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  keys.map((key) => (
                    <TableRow key={key.id} hover sx={{ opacity: key.isActive ? 1 : 0.5 }}>
                      <TableCell sx={{ fontWeight: 600 }}>{key.name}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#2D6A4F', fontWeight: 600 }}
                        >
                          {key.keyPrefix}…
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={key.businessId ? `Negocio #${key.businessId}` : `Sucursal #${key.tenantId}`}
                          sx={{
                            fontWeight: 600, fontSize: '0.7rem',
                            backgroundColor: key.businessId ? '#E8F5E9' : '#E3F2FD',
                            color: key.businessId ? '#2D6A4F' : '#1565C0',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 220 }}>
                          {(key.scopes || []).map((s) => (
                            <Chip
                              key={s}
                              size="small"
                              label={s}
                              sx={{
                                fontWeight: 600, fontSize: '0.65rem',
                                backgroundColor: SCOPE_COLORS[s]?.bg || '#F5F5F5',
                                color: SCOPE_COLORS[s]?.color || '#616161',
                              }}
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{key.rateLimitPerMin} req/min</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {key.lastUsedAt ? dayjs(key.lastUsedAt).format('DD/MM/YY HH:mm') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={key.isActive ? 'Activa' : 'Revocada'}
                          sx={{
                            fontWeight: 700,
                            backgroundColor: key.isActive ? 'rgba(82,183,136,0.1)' : 'rgba(198,40,40,0.1)',
                            color: key.isActive ? '#2D6A4F' : '#C62828',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {key.expiresAt ? dayjs(key.expiresAt).format('DD/MM/YY') : 'Sin expiración'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {key.isActive && (
                          <Tooltip title="Revocar clave — los sistemas que la usen dejarán de tener acceso inmediatamente">
                            <IconButton
                              size="small"
                              onClick={() => handleRevoke(key)}
                              sx={{ color: '#C62828' }}
                            >
                              <BlockRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Modales */}
      <NewKeyModal
        open={newKeyModal}
        onClose={() => setNewKeyModal(false)}
        onCreated={handleCreated}
      />
      <RawKeyModal
        open={rawKeyModal}
        keyData={createdKey}
        onClose={() => { setRawKeyModal(false); setCreatedKey(null); }}
      />
    </Box>
  );
};

export default ApiKeysPage;
