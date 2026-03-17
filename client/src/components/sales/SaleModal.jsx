import { useState, useEffect } from 'react';
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
  MenuItem,
  Divider,
  CircularProgress,
  Alert,
  Collapse,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import api from '../../services/api';
import { CURRENCY_FORMAT } from '../../utils/formatters';

const EMPTY_ITEM = { productId: '', quantity: '', discount: '', discountConcept: '' };

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
      // Si se borra el descuento, limpiar también el concepto
      if (field === 'discount' && (!value || parseFloat(value) <= 0)) {
        updated[index].discountConcept = '';
      }
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
        saleDate: dayjs().format('YYYY-MM-DD'),
        items: items.map((item) => ({
          productId: parseInt(item.productId, 10),
          quantity: parseFloat(item.quantity),
          discount: parseFloat(item.discount || 0),
          discountConcept: item.discountConcept || null,
        })),
      };
      await api.post('/sales', payload);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar la venta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ShoppingCartRoundedIcon color="primary" fontSize="medium" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Registrar Venta
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2.5 }}>
            {error}
          </Alert>
        )}

        {items.map((item, index) => {
          const product = getProductById(item.productId);
          const subtotal = getSubtotal(item);
          const stockExceeded =
            product && item.quantity && parseFloat(item.quantity) > parseFloat(product.stockQuantity);
          const hasDiscount = item.discount && parseFloat(item.discount) > 0;

          return (
            <Box key={index} sx={{ mb: 1.5 }}>
              {index > 0 && <Divider sx={{ mb: 2 }} />}

              {/* Fila principal: Producto | Cantidad | Desc. % | Subtotal | Eliminar */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '3fr 1fr 1fr auto auto' },
                  gap: 2,
                  alignItems: 'flex-start',
                }}
              >
                <TextField
                  select
                  label="Producto"
                  value={item.productId}
                  onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                  size="medium"
                >
                  {products.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} — {CURRENCY_FORMAT.format(p.unitPrice)}{' '}
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                        (Stock: {p.stockQuantity})
                      </Typography>
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Cantidad"
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  error={stockExceeded}
                  helperText={stockExceeded ? `Máx: ${product.stockQuantity}` : ''}
                  size="medium"
                  slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                />

                <TextField
                  label="Desc. %"
                  type="number"
                  value={item.discount}
                  onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                  size="medium"
                  slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
                />

                {/* Subtotal */}
                <Box sx={{ pt: 1.5, textAlign: 'right', minWidth: 90 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Subtotal
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 700, color: hasDiscount ? 'success.main' : 'primary.main' }}
                  >
                    {CURRENCY_FORMAT.format(subtotal)}
                  </Typography>
                  {hasDiscount && (
                    <Typography variant="caption" color="text.disabled" sx={{ textDecoration: 'line-through' }}>
                      {CURRENCY_FORMAT.format(
                        product ? parseFloat(product.unitPrice) * parseFloat(item.quantity || 0) : 0
                      )}
                    </Typography>
                  )}
                </Box>

                <IconButton
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                  size="medium"
                  sx={{ mt: 0.5, color: 'error.light', '&:hover': { color: 'error.main' } }}
                >
                  <DeleteRoundedIcon />
                </IconButton>
              </Box>

              {/* Fila condicional: Concepto de descuento */}
              <Collapse in={hasDiscount} timeout={250} unmountOnExit>
                <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalOfferRoundedIcon fontSize="small" sx={{ color: 'warning.main', flexShrink: 0 }} />
                  <TextField
                    label="Concepto de descuento"
                    placeholder="Ej: Cliente frecuente, promoción del día..."
                    value={item.discountConcept}
                    onChange={(e) => handleItemChange(index, 'discountConcept', e.target.value)}
                    size="small"
                    fullWidth
                    slotProps={{ htmlInput: { maxLength: 120 } }}
                  />
                </Box>
              </Collapse>
            </Box>
          );
        })}

        <Button startIcon={<AddRoundedIcon />} onClick={addItem} size="small" sx={{ mt: 1.5 }}>
          Agregar producto
        </Button>

        <Divider sx={{ my: 2.5 }} />

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <TextField
            select
            label="Método de pago"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            size="medium"
            sx={{ width: { xs: '100%', sm: 240 } }}
          >
            <MenuItem value="Efectivo">Efectivo</MenuItem>
            <MenuItem value="Mercado Pago">Mercado Pago</MenuItem>
            <MenuItem value="Transferencia">Transferencia</MenuItem>
            <MenuItem value="Cuenta DNI">Cuenta DNI</MenuItem>
          </TextField>

          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Total a cobrar
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>
              {CURRENCY_FORMAT.format(getTotal())}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, gap: 1 }}>
        <Button onClick={onClose} color="inherit" size="large">
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting || !isValid()} size="large">
          {submitting ? <CircularProgress size={22} color="inherit" /> : 'Confirmar Venta'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaleModal;