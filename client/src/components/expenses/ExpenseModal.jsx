import { useState } from 'react';
import dayjs from 'dayjs';
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
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import { useForm } from 'react-hook-form';
import api from '../../services/api';

const ExpenseModal = ({ open, onClose, onSuccess }) => {
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
      await api.post('/expenses', {
        concept: formData.concept,
        amount: parseFloat(formData.amount),
        expenseDate: dayjs().format('YYYY-MM-DD'),
      });
      reset();
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar el egreso');
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
          <ReceiptRoundedIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Registrar Egreso
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
            label="Concepto"
            fullWidth
            autoFocus
            sx={{ mb: 2.5 }}
            error={Boolean(errors.concept)}
            helperText={errors.concept?.message}
            {...register('concept', { required: 'El concepto es obligatorio' })}
          />

          <TextField
            label="Monto ($)"
            type="number"
            fullWidth
            error={Boolean(errors.amount)}
            helperText={errors.amount?.message}
            inputProps={{ min: 0, step: 0.01 }}
            {...register('amount', {
              required: 'El monto es obligatorio',
              min: { value: 0.01, message: 'El monto debe ser mayor a 0' },
            })}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={22} color="inherit" /> : 'Confirmar Egreso'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ExpenseModal;
