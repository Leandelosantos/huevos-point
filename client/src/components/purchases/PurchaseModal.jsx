import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  MenuItem,
  InputAdornment,
  Typography,
  Box,
} from '@mui/material';
import dayjs from 'dayjs';
import api from '../../services/api';
import { showErrorAlert } from '../../utils/sweetAlert';

const INIT_STATE = {
  purchaseDate: dayjs().format('YYYY-MM-DD'),
  productId: '',
  quantity: '',
  cost: '',
  price: '',
  provider: '',
};

const PurchaseModal = ({ open, onClose, onSuccess, products }) => {
  const [formData, setFormData] = useState(INIT_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [margin, setMargin] = useState(0);

  useEffect(() => {
    if (open) {
      setFormData(INIT_STATE);
      setMargin(0);
    }
  }, [open]);

  useEffect(() => {
    const cost = parseFloat(formData.cost) || 0;
    const price = parseFloat(formData.price) || 0;
    setMargin(price - cost);
  }, [formData.cost, formData.price]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await api.post('/purchases', {
        ...formData,
        quantity: parseInt(formData.quantity, 10),
        cost: parseFloat(formData.cost),
        price: parseFloat(formData.price),
        marginAmount: margin,
      });
      onSuccess();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Ocurrió un error al registrar la compra.';
      showErrorAlert('Error de Registro', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={!isSubmitting ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: '#2D6A4F' }}>
        Registrar Nueva Compra
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de compra"
                name="purchaseDate"
                type="date"
                value={formData.purchaseDate}
                onChange={handleChange}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Producto"
                name="productId"
                value={formData.productId}
                onChange={handleChange}
                required
              >
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cantidad"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                required
                inputProps={{ min: 1, step: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Proveedor"
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                placeholder="Opcional"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Costo Unitario"
                name="cost"
                type="number"
                value={formData.cost}
                onChange={handleChange}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                inputProps={{ min: 0, step: '0.01' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Precio de Venta Sugerido"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                inputProps={{ min: 0, step: '0.01' }}
              />
            </Grid>

            <Grid item xs={12}>
              <Box
                sx={{
                  p: 2,
                  mt: 1,
                  borderRadius: 2,
                  bgcolor: margin > 0 ? '#E8F5E9' : margin < 0 ? '#FFEBEE' : '#F5F5F5',
                  border: '1px solid',
                  borderColor: margin > 0 ? '#81C784' : margin < 0 ? '#E57373' : '#E0E0E0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Margen de Ganancia (Unitario):
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    color: margin > 0 ? '#2E7D32' : margin < 0 ? '#C62828' : 'text.disabled',
                  }}
                >
                  ${margin.toFixed(2)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{
              background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' },
            }}
          >
            {isSubmitting ? 'Registrando...' : 'Confirmar Compra'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PurchaseModal;
