import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  TextField,
  Button,
  Grid,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import StoreRoundedIcon from '@mui/icons-material/StoreRounded';
import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { THEMES } from '../theme/themes';
import api from '../services/api';
import { showSuccessToast, showErrorToast } from '../utils/sweetAlert';

// ─── Sección: Selector de Tema ─────────────────────────────────────────────

const ThemeCard = ({ config, selected, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      position: 'relative',
      borderRadius: 3,
      border: selected ? '2.5px solid' : '2px solid',
      borderColor: selected ? config.palette.primary.main : 'divider',
      cursor: 'pointer',
      overflow: 'hidden',
      transition: 'all 0.2s ease',
      boxShadow: selected ? `0 4px 16px rgba(0,0,0,0.15)` : 'none',
      '&:hover': {
        borderColor: config.palette.primary.main,
        boxShadow: `0 4px 12px rgba(0,0,0,0.12)`,
        transform: 'translateY(-2px)',
      },
    }}
  >
    {/* Preview del sidebar */}
    <Box
      sx={{
        height: 64,
        background: config.sidebar.bg,
        display: 'flex',
        alignItems: 'center',
        px: 2,
        gap: 1,
      }}
    >
      {config.preview.map((color) => (
        <Box
          key={color}
          sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: color, border: '2px solid rgba(255,255,255,0.3)' }}
        />
      ))}
    </Box>

    {/* Texto */}
    <Box sx={{ p: 1.5 }}>
      <Typography variant="body2" fontWeight={700} noWrap>
        {config.label}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
        {config.description}
      </Typography>
    </Box>

    {/* Check de seleccionado */}
    {selected && (
      <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
        <CheckCircleRoundedIcon
          sx={{ color: config.palette.primary.main, fontSize: 22, backgroundColor: '#fff', borderRadius: '50%' }}
        />
      </Box>
    )}
  </Box>
);

// ─── Sección principal ──────────────────────────────────────────────────────

const ConfigPage = () => {
  const { activeTenant, isSuperAdmin, updateActiveTenant } = useAuth();
  const { themeId, applyTheme } = useAppTheme();

  const [savingTheme, setSavingTheme] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(themeId);

  // Formulario de editar nombre de sucursal
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit, isSubmitting: isSubmittingEdit },
  } = useForm();

  // Formulario de nueva sucursal (solo superadmin)
  const {
    register: registerNew,
    handleSubmit: handleSubmitNew,
    reset: resetNew,
    formState: { errors: errorsNew, isSubmitting: isSubmittingNew },
  } = useForm();

  const [newBranchOpen, setNewBranchOpen] = useState(false);

  useEffect(() => {
    if (activeTenant?.name) {
      resetEdit({ name: activeTenant.name });
    }
    setSelectedTheme(activeTenant?.theme || themeId);
  }, [activeTenant, themeId, resetEdit]);

  // Preview instantáneo al seleccionar un tema (no guarda aún)
  const handleSelectTheme = (id) => {
    setSelectedTheme(id);
    applyTheme(id);
  };

  const handleSaveTheme = async () => {
    setSavingTheme(true);
    try {
      await api.put('/tenants/current', { theme: selectedTheme });
      updateActiveTenant({ theme: selectedTheme });
      showSuccessToast('Tema guardado correctamente');
    } catch {
      showErrorToast('No se pudo guardar el tema');
      // Revertir preview si falla
      applyTheme(activeTenant?.theme || themeId);
      setSelectedTheme(activeTenant?.theme || themeId);
    } finally {
      setSavingTheme(false);
    }
  };

  const handleSaveName = async (values) => {
    try {
      const { data } = await api.put('/tenants/current', { name: values.name });
      updateActiveTenant({ name: data.data.name });
      showSuccessToast('Nombre de sucursal actualizado');
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'No se pudo actualizar el nombre');
    }
  };

  const handleCreateBranch = async (values) => {
    try {
      await api.post('/tenants', { name: values.name });
      showSuccessToast(`Sucursal "${values.name}" creada correctamente`);
      resetNew();
      setNewBranchOpen(false);
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'No se pudo crear la sucursal');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Configuración
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Personaliza la apariencia y los datos de tu sucursal.
      </Typography>

      {/* ── Apariencia ──────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <PaletteRoundedIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Apariencia
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Elegí un tema de color para toda la aplicación. El cambio aplica a todos los usuarios de esta sucursal.
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {Object.values(THEMES).map((config) => (
            <Grid item xs={12} sm={6} md={4} key={config.id}>
              <ThemeCard
                config={config}
                selected={selectedTheme === config.id}
                onClick={() => handleSelectTheme(config.id)}
              />
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleSaveTheme}
            disabled={savingTheme || selectedTheme === (activeTenant?.theme || 'verde-bosque')}
            startIcon={savingTheme ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {savingTheme ? 'Guardando...' : 'Guardar tema'}
          </Button>
        </Box>
      </Paper>

      {/* ── Datos de la sucursal ──────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <StoreRoundedIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Datos de la sucursal
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Editá el nombre de la sucursal activa.
        </Typography>

        <Box component="form" onSubmit={handleSubmitEdit(handleSaveName)}>
          <TextField
            label="Nombre de la sucursal"
            fullWidth
            size="small"
            sx={{ mb: 2, maxWidth: 420 }}
            {...registerEdit('name', {
              required: 'El nombre es requerido',
              minLength: { value: 2, message: 'Mínimo 2 caracteres' },
              maxLength: { value: 100, message: 'Máximo 100 caracteres' },
            })}
            error={Boolean(errorsEdit.name)}
            helperText={errorsEdit.name?.message}
            InputProps={{
              startAdornment: <EditRoundedIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} />,
            }}
          />
          <Box>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmittingEdit}
              startIcon={isSubmittingEdit ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isSubmittingEdit ? 'Guardando...' : 'Guardar nombre'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* ── Nueva sucursal (solo superadmin) ─────────────────── */}
      {isSuperAdmin && (
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <AddBusinessRoundedIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Nueva sucursal
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Creá una nueva sucursal para el sistema. Luego podrás asignarle usuarios desde el panel de Usuarios.
          </Typography>

          <Button
            variant="outlined"
            startIcon={<AddBusinessRoundedIcon />}
            onClick={() => setNewBranchOpen(true)}
          >
            Crear nueva sucursal
          </Button>
        </Paper>
      )}

      {/* ── Dialog nueva sucursal ─────────────────────────────── */}
      <Dialog open={newBranchOpen} onClose={() => setNewBranchOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nueva sucursal</DialogTitle>
        <Divider />
        <Box component="form" onSubmit={handleSubmitNew(handleCreateBranch)}>
          <DialogContent>
            <TextField
              label="Nombre de la sucursal"
              fullWidth
              size="small"
              autoFocus
              {...registerNew('name', {
                required: 'El nombre es requerido',
                minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                maxLength: { value: 100, message: 'Máximo 100 caracteres' },
              })}
              error={Boolean(errorsNew.name)}
              helperText={errorsNew.name?.message}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setNewBranchOpen(false); resetNew(); }} color="inherit">
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmittingNew}
              startIcon={isSubmittingNew ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isSubmittingNew ? 'Creando...' : 'Crear sucursal'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default ConfigPage;
