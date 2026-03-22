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
const PAYMENT_METHODS = ['Efectivo', 'Mercado Pago', 'Transferencia', 'Cuenta DNI'];

const SaleModal = ({ open, onClose, onSuccess }) => {
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [paymentSplits, setPaymentSplits] = useState([{ method: 'Efectivo', amount: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchProducts();
      setItems([{ ...EMPTY_ITEM }]);
      setPaymentSplits([{ method: 'Efectivo', amount: '' }]);
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
      if (field === 'discount' && (!value || parseFloat(value) <= 0)) {
        updated[index].discountConcept = '';
      }
      return updated;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

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

  // ── Payment split handlers ────────────────────────────────────────────────

  const hasSplits = paymentSplits.length > 1;
  const splitTotal = paymentSplits.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const remaining = getTotal() - splitTotal;

  const handleSplitChange = (index, field, value) => {
    setPaymentSplits((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addPaymentSplit = () => {
    setPaymentSplits((prev) => {
      const usedMethods = prev.map((s) => s.method);
      const nextMethod = PAYMENT_METHODS.find((m) => !usedMethods.includes(m)) || 'Transferencia';
      if (prev.length === 1) {
        // Pre-fill first split with current total so user only edits the second
        return [
          { method: prev[0].method, amount: String(getTotal().toFixed(2)) },
          { method: nextMethod, amount: '' },
        ];
      }
      return [...prev, { method: nextMethod, amount: '' }];
    });
  };

  const removePaymentSplit = (index) => {
    setPaymentSplits((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // Back to 1 split — clear amount (implied = total)
      if (updated.length === 1) return [{ method: updated[0].method, amount: '' }];
      return updated;
    });
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const isPaymentValid = () => {
    if (paymentSplits.length === 1) return Boolean(paymentSplits[0].method);
    const total = getTotal();
    const allFilled = paymentSplits.every((p) => p.method && parseFloat(p.amount) > 0);
    return allFilled && Math.abs(splitTotal - total) < 0.02;
  };

  const isValid = () => {
    const itemsValid = items.every((item) => {
      if (!item.productId || !item.quantity || parseFloat(item.quantity) <= 0) return false;
      const product = getProductById(item.productId);
      if (!product) return false;
      return parseFloat(item.quantity) <= parseFloat(product.stockQuantity);
    });
    return itemsValid && isPaymentValid();
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        paymentSplits:
          paymentSplits.length === 1
            ? [{ method: paymentSplits[0].method, amount: getTotal() }]
            : paymentSplits.map((s) => ({ method: s.method, amount: parseFloat(s.amount) })),
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

        {/* ── Sección de pago ──────────────────────────────────────────────── */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 2,
          }}
        >
          {/* Métodos de pago */}
          <Box sx={{ flex: 1 }}>
            {paymentSplits.map((split, index) => (
              <Box
                key={index}
                sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-start' }}
              >
                <TextField
                  select
                  label={index === 0 ? 'Método de pago' : `Método ${index + 1}`}
                  value={split.method}
                  onChange={(e) => handleSplitChange(index, 'method', e.target.value)}
                  size="medium"
                  sx={{ flex: 2, minWidth: 150 }}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <MenuItem
                      key={m}
                      value={m}
                      disabled={paymentSplits.some((s, i) => i !== index && s.method === m)}
                    >
                      {m}
                    </MenuItem>
                  ))}
                </TextField>

                {hasSplits && (
                  <TextField
                    label="Monto"
                    type="number"
                    value={split.amount}
                    onChange={(e) => handleSplitChange(index, 'amount', e.target.value)}
                    size="medium"
                    sx={{ flex: 1.5, minWidth: 110 }}
                    slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                  />
                )}

                {hasSplits && (
                  <IconButton
                    onClick={() => removePaymentSplit(index)}
                    size="medium"
                    sx={{ mt: 0.5, color: 'error.light', '&:hover': { color: 'error.main' } }}
                  >
                    <DeleteRoundedIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}

            {paymentSplits.length < 3 && (
              <Button
                startIcon={<AddRoundedIcon />}
                onClick={addPaymentSplit}
                size="small"
                sx={{ mt: 0.5 }}
              >
                Agregar método de pago
              </Button>
            )}

            {hasSplits && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 1,
                  fontWeight: 600,
                  color: Math.abs(remaining) < 0.02 ? 'success.main' : 'warning.main',
                }}
              >
                {Math.abs(remaining) < 0.02
                  ? '✓ Total distribuido correctamente'
                  : remaining > 0
                  ? `Pendiente de asignar: ${CURRENCY_FORMAT.format(remaining)}`
                  : `Excede el total en: ${CURRENCY_FORMAT.format(Math.abs(remaining))}`}
              </Typography>
            )}
          </Box>

          {/* Total */}
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