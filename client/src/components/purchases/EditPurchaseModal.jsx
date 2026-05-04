import { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  InputAdornment,
  Typography,
  Box,
} from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import api from '../../services/api';
import { showErrorAlert } from '../../utils/sweetAlert';
import { CURRENCY_FORMAT } from '../../utils/formatters';

const EditPurchaseModal = ({ open, onClose, onSuccess, purchase }) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (open && purchase) {
      reset({
        quantity: purchase.quantity,
        cost: purchase.cost,
        provider: purchase.provider || '',
        purchaseDate: dayjs(purchase.purchaseDate).format('YYYY-MM-DD'),
      });
    }
  }, [open, purchase, reset]);

  const isEgg = Boolean(purchase?.categoryId);
  const eggsPerCrate = purchase?.category?.eggsPerCrate || 360;
  const label = isEgg
    ? `${purchase?.category?.name || 'Categoría'} — cajones`
    : `${purchase?.product?.name || 'Producto'} — unidades`;

  const onSubmit = async (values) => {
    try {
      await api.put(`/purchases/${purchase.id}`, {
        quantity: parseFloat(values.quantity),
        cost: parseFloat(values.cost),
        provider: values.provider || null,
        purchaseDate: values.purchaseDate,
      });
      onSuccess();
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Error al actualizar la compra';
      showErrorAlert('Error', msg);
    }
  };

  if (!purchase) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Editar Compra #{purchase.id}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label={isEgg ? 'Cantidad (cajones)' : 'Cantidad (unidades)'}
                type="number"
                inputProps={{ step: isEgg ? '0.5' : '1', min: '0.5' }}
                fullWidth
                {...register('quantity', {
                  required: 'Campo requerido',
                  min: { value: 0.5, message: 'Debe ser mayor a 0' },
                })}
                error={Boolean(errors.quantity)}
                helperText={errors.quantity?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={isEgg ? 'Costo por cajón' : 'Costo por unidad'}
                type="number"
                inputProps={{ step: '0.01', min: '0' }}
                fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                {...register('cost', {
                  required: 'Campo requerido',
                  min: { value: 0, message: 'Debe ser ≥ 0' },
                })}
                error={Boolean(errors.cost)}
                helperText={errors.cost?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Proveedor"
                fullWidth
                {...register('provider')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fecha"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                {...register('purchaseDate', { required: 'Campo requerido' })}
                error={Boolean(errors.purchaseDate)}
                helperText={errors.purchaseDate?.message}
              />
            </Grid>
          </Grid>
          {isEgg && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Nota: cambiar la cantidad ajustará el stock de la categoría automáticamente (delta).
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">Cancelar</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={<SaveRoundedIcon />}
            sx={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)' }}
          >
            Guardar Cambios
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditPurchaseModal;
