import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EggRoundedIcon from '@mui/icons-material/EggRounded';
import { useForm } from 'react-hook-form';
import api from '../../services/api';

const CategoryModal = ({ open, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const onSubmit = async (formData) => {
    setError('');
    setSubmitting(true);
    try {
      await api.post('/egg-categories', { name: formData.name.trim() });
      reset();
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la categoría');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EggRoundedIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Nueva Categoría
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Nombre de la categoría"
            fullWidth
            autoFocus
            placeholder="Ej: Jumbo, Super, Color..."
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            {...register('name', { required: 'El nombre es obligatorio' })}
          />

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Se crearán automáticamente las 5 presentaciones: Cajón (360), 1/2 Cajón (180), Maple (30), Docena (12), 1/2 Docena (6).
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={22} color="inherit" /> : 'Crear Categoría'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CategoryModal;
