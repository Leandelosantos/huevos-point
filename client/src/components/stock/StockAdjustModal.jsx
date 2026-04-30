import { useState, useEffect } from 'react';
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
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { useForm } from 'react-hook-form';
import api from '../../services/api';

const StockAdjustModal = ({ open, onClose, onSuccess, category }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (open && category) {
      reset({ stockUnits: Math.floor(category.stockUnits) });
      setError('');
    }
  }, [open, category, reset]);

  const onSubmit = async (formData) => {
    setError('');
    setSubmitting(true);
    try {
      await api.patch(`/egg-categories/${category.id}/stock`, {
        stockUnits: parseFloat(formData.stockUnits),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al ajustar stock');
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
          <TuneRoundedIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Ajustar Stock
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

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Categoría: <strong>{category?.name}</strong>
          </Typography>

          <TextField
            label="Stock en huevos (unidades)"
            type="number"
            fullWidth
            autoFocus
            error={Boolean(errors.stockUnits)}
            helperText={errors.stockUnits?.message || 'Ingresá la cantidad total de huevos que hay actualmente'}
            inputProps={{ min: 0, step: 1 }}
            {...register('stockUnits', {
              required: 'El stock es obligatorio',
              min: { value: 0, message: 'El stock no puede ser negativo' },
            })}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={22} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default StockAdjustModal;
