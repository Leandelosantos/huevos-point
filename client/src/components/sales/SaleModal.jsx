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
  MenuItem,
  Divider,
  CircularProgress,
  Alert,
  Link,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import api from '../../services/api';

const CURRENCY_FORMAT = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

const EMPTY_ITEM = { productId: '', quantity: '', discount: '' };

const SaleModal = ({ open, onClose, onSuccess }) => {
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchProducts();
      setItems([{ ...EMPTY_ITEM }]);
      setPaymentMethod('Efectivo');
      setError('');
    }
  }, [open]);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data.data);
    } catch {
      setError('Error al cargar productos');
    }
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const getProductById = (id) => products.find((p) => p.id === id);

  const getSubtotal = (item) => {
    const product = getProductById(item.productId);
    if (!product || !item.quantity) return 0;
    const base = parseFloat(product.unitPrice) * parseFloat(item.quantity);
    const discount = parseFloat(item.discount || 0);
    return discount > 0 ? base * (1 - discount / 100) : base;
  };

  const getTotal = () => items.reduce((sum, item) => sum + getSubtotal(item), 0);

  const isValid = () => {
    return items.every((item) => {
      if (!item.productId || !item.quantity || parseFloat(item.quantity) <= 0) return false;
      const product = getProductById(item.productId);
      if (!product) return false;
      return parseFloat(item.quantity) <= parseFloat(product.stockQuantity);
    });
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        paymentMethod,
        items: items.map((item) => ({
          productId: parseInt(item.productId, 10),
          quantity: parseFloat(item.quantity),
          discount: parseFloat(item.discount || 0),
        })),
      };
      const response = await api.post('/sales', payload);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar la venta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCartRoundedIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Registrar Venta
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {items.map((item, index) => {
              const product = getProductById(item.productId);
              const subtotal = getSubtotal(item);
              const stockExceeded = product && item.quantity && parseFloat(item.quantity) > parseFloat(product.stockQuantity);

              return (
                <Box key={index} sx={{ mb: 2 }}>
                  {index > 0 && <Divider sx={{ mb: 2 }} />}
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, alignItems: { xs: 'stretch', sm: 'flex-start' } }}>
                    <TextField
                      select
                      label="Producto"
                      value={item.productId}
                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                      sx={{ flex: 2 }}
                      size="small"
                    >
                      {products.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name} — {CURRENCY_FORMAT.format(p.unitPrice)} (Stock: {p.stockQuantity})
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      label="Cantidad"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      error={stockExceeded}
                      helperText={stockExceeded ? `Stock: ${product.stockQuantity}` : ''}
                      sx={{ flex: 1 }}
                      size="small"
                      inputProps={{ min: 0, step: 0.5 }}
                    />

                    <TextField
                      label="Desc. %"
                      type="number"
                      value={item.discount}
                      onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                      sx={{ flex: 0.6 }}
                      size="small"
                      inputProps={{ min: 0, max: 100, step: 1 }}
                    />

                    <Box sx={{ flex: 0.8, textAlign: 'right', pt: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        Subtotal
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {CURRENCY_FORMAT.format(subtotal)}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: { xs: '100%', sm: 'auto' } }}>
                      <IconButton
                        onClick={() => removeItem(index)}
                        disabled={items.length <= 1}
                        size="small"
                        sx={{ mt: { xs: 0, sm: 0.5 } }}
                      >
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              );
            })}

            <Button
              startIcon={<AddRoundedIcon />}
              onClick={addItem}
              size="small"
              sx={{ mt: 1 }}
            >
              Agregar producto
            </Button>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 2 }}>
              <TextField
                select
                label="Método de pago"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                size="small"
                sx={{ width: { xs: '100%', sm: 220 } }}
              >
                <MenuItem value="Efectivo">Efectivo</MenuItem>
                <MenuItem value="Mercado Pago">Mercado Pago</MenuItem>
                <MenuItem value="Transferencia">Transferencia</MenuItem>
                <MenuItem value="Cuenta DNI">Cuenta DNI</MenuItem>
              </TextField>
              
              <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, width: { xs: '100%', sm: 'auto' } }}>
                <Typography variant="h6" sx={{ fontWeight: 700, display: 'inline', mr: 2 }}>
                  Total
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', display: 'inline' }}>
                  {CURRENCY_FORMAT.format(getTotal())}
                </Typography>
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={onClose} color="inherit">
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting || !isValid()}
            >
              {submitting ? <CircularProgress size={22} color="inherit" /> : 'Confirmar Venta'}
            </Button>
          </DialogActions>
    </Dialog>
  );
};

export default SaleModal;
