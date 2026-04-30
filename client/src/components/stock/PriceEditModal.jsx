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
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import { useForm } from 'react-hook-form';
import api from '../../services/api';

const PriceEditModal = ({ open, onClose, onSuccess, product }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (open && product) {
      reset({ unitPrice: product.unitPrice || '' });
      setError('');
    }
  }, [open, product, reset]);

  const onSubmit = async (formData) => {
    setError('');
    setSubmitting(true);
    try {
      await api.put(`/products/${product.id}`, {
        unitPrice: parseFloat(formData.unitPrice),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar precio');
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
          <AttachMoneyRoundedIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Editar Precio
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
            {product?.name}
          </Typography>

          <TextField
            label="Precio unitario ($)"
            type="number"
            fullWidth
            autoFocus
            error={Boolean(errors.unitPrice)}
            helperText={errors.unitPrice?.message}
            inputProps={{ min: 0, step: 0.01 }}
            {...register('unitPrice', {
              required: 'El precio es obligatorio',
              min: { value: 0, message: 'El precio no puede ser negativo' },
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

export default PriceEditModal;
