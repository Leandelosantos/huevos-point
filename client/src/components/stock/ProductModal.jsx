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
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import { useForm } from 'react-hook-form';
import api from '../../services/api';

const ProductModal = ({ open, onClose, onSuccess, product }) => {
  const isEditing = Boolean(product);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (open) {
      if (product) {
        reset({
          name: product.name,
          stockQuantity: product.stockQuantity,
          unitPrice: product.unitPrice,
        });
      } else {
        reset({ name: '', stockQuantity: '', unitPrice: '' });
      }
      setError('');
    }
  }, [open, product, reset]);

  const onSubmit = async (formData) => {
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        stockQuantity: parseFloat(formData.stockQuantity),
        unitPrice: parseFloat(formData.unitPrice),
      };

      if (isEditing) {
        await api.put(`/products/${product.id}`, payload);
      } else {
        await api.post('/products', payload);
      }

      reset();
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el producto');
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
          <InventoryRoundedIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {isEditing ? 'Editar Producto' : 'Agregar Producto'}
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

          {!isEditing && (
            <TextField
              label="Nombre del producto"
              fullWidth
              autoFocus
              sx={{ mb: 2.5 }}
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              {...register('name', { required: 'El nombre es obligatorio' })}
            />
          )}

          <TextField
            label="Cantidad en stock"
            type="number"
            fullWidth
            sx={{ mb: 2.5 }}
            error={Boolean(errors.stockQuantity)}
            helperText={errors.stockQuantity?.message}
            inputProps={{ min: 0, step: 0.5 }}
            {...register('stockQuantity', {
              required: 'La cantidad es obligatoria',
              min: { value: 0, message: 'La cantidad no puede ser negativa' },
            })}
          />

          <TextField
            label="Precio unitario ($)"
            type="number"
            fullWidth
            error={Boolean(errors.unitPrice)}
            helperText={errors.unitPrice?.message}
            inputProps={{ min: 0, step: 0.01 }}
            {...register('unitPrice', {
              required: 'El precio es obligatorio',
              min: { value: 0.01, message: 'El precio debe ser mayor a 0' },
            })}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? (
              <CircularProgress size={22} color="inherit" />
            ) : isEditing ? (
              'Guardar Cambios'
            ) : (
              'Crear Producto'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProductModal;
