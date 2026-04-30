import { useState, useEffect, useRef } from 'react';
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
  IconButton,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import EggRoundedIcon from '@mui/icons-material/EggRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import dayjs from 'dayjs';
import api from '../../services/api';
import { showErrorAlert } from '../../utils/sweetAlert';

const DEFAULT_EGGS_PER_CRATE = 360;

const INIT_EGG = {
  purchaseDate: dayjs().format('YYYY-MM-DD'),
  categoryId: '',
  quantity: '',
  cost: '',
  provider: '',
};

const INIT_GENERIC = {
  purchaseDate: dayjs().format('YYYY-MM-DD'),
  productId: '',
  quantity: '',
  cost: '',
  price: '',
  provider: '',
};

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

const PurchaseModal = ({ open, onClose, onSuccess, categories, products }) => {
  const [purchaseType, setPurchaseType] = useState('egg');
  const [eggForm, setEggForm] = useState(INIT_EGG);
  const [genericForm, setGenericForm] = useState(INIT_GENERIC);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [receiptMimeType, setReceiptMimeType] = useState(null);
  const [receiptFileName, setReceiptFileName] = useState('');
  const receiptInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setEggForm(INIT_EGG);
      setGenericForm(INIT_GENERIC);
      setReceiptData(null);
      setReceiptMimeType(null);
      setReceiptFileName('');
    }
  }, [open]);

  const handleEggChange = (e) => {
    const { name, value } = e.target;
    setEggForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenericChange = (e) => {
    const { name, value } = e.target;
    setGenericForm((prev) => ({ ...prev, [name]: value }));
  };

  const selectedCategory = (categories || []).find((c) => c.id === eggForm.categoryId || c.id === parseInt(eggForm.categoryId, 10));
  const eggsPerCrate = selectedCategory?.eggsPerCrate || DEFAULT_EGGS_PER_CRATE;
  const eggsEquivalent = parseFloat(eggForm.quantity || 0) * eggsPerCrate;

  const handleReceiptChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > MAX_FILE_BYTES) {
      showErrorAlert('Archivo demasiado grande', 'El comprobante no puede superar los 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const [header, base64] = reader.result.split(',');
      const mime = header.match(/data:(.*);base64/)[1];
      setReceiptData(base64);
      setReceiptMimeType(mime);
      setReceiptFileName(file.name);
    };
    reader.onerror = () => {
      showErrorAlert('Error', 'No se pudo leer el archivo. Intente nuevamente.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptData(null);
    setReceiptMimeType(null);
    setReceiptFileName('');
  };

  const isEggValid = eggForm.categoryId && eggForm.quantity && eggForm.cost;
  const isGenericValid = genericForm.productId && genericForm.quantity && genericForm.cost;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (purchaseType === 'egg') {
        await api.post('/purchases', {
          categoryId: parseInt(eggForm.categoryId, 10),
          quantity: parseFloat(eggForm.quantity),
          cost: parseFloat(eggForm.cost),
          provider: eggForm.provider || undefined,
          purchaseDate: eggForm.purchaseDate,
          receiptData: receiptData || null,
          receiptMimeType: receiptMimeType || null,
        });
      } else {
        await api.post('/purchases', {
          productId: parseInt(genericForm.productId, 10),
          quantity: parseFloat(genericForm.quantity),
          cost: parseFloat(genericForm.cost),
          price: genericForm.price ? parseFloat(genericForm.price) : undefined,
          provider: genericForm.provider || undefined,
          purchaseDate: genericForm.purchaseDate,
          receiptData: receiptData || null,
          receiptMimeType: receiptMimeType || null,
        });
      }

      onSuccess();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Ocurrió un error al registrar la compra.';
      showErrorAlert('Error de Registro', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const receiptSection = (
    <Grid item xs={12}>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        ref={receiptInputRef}
        onChange={handleReceiptChange}
      />
      {receiptFileName ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'success.light',
            bgcolor: '#E8F5E9',
          }}
        >
          <InsertDriveFileRoundedIcon sx={{ color: '#2D6A4F', flexShrink: 0 }} />
          <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600, color: '#2D6A4F' }} noWrap>
            {receiptFileName}
          </Typography>
          <IconButton size="small" onClick={handleRemoveReceipt} sx={{ color: 'text.secondary' }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      ) : (
        <Button
          variant="outlined"
          startIcon={<UploadFileRoundedIcon />}
          onClick={() => receiptInputRef.current.click()}
          fullWidth
          sx={{
            borderStyle: 'dashed',
            borderColor: 'divider',
            color: 'text.secondary',
            py: 1.5,
            '&:hover': { borderColor: '#2D6A4F', color: '#2D6A4F' },
          }}
        >
          Adjuntar comprobante (PDF, JPG, PNG — opcional, máx. 2 MB)
        </Button>
      )}
    </Grid>
  );

  return (
    <Dialog open={open} onClose={!isSubmitting ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: '#2D6A4F' }}>
        Registrar Nueva Compra
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {/* Type toggle */}
          <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={purchaseType}
              exclusive
              onChange={(_, v) => v && setPurchaseType(v)}
              size="small"
            >
              <ToggleButton value="egg" sx={{ gap: 0.75, px: 2.5 }}>
                <EggRoundedIcon fontSize="small" />
                Huevos (por categoría)
              </ToggleButton>
              <ToggleButton value="generic" sx={{ gap: 0.75, px: 2.5 }}>
                <InventoryRoundedIcon fontSize="small" />
                Producto general
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {purchaseType === 'egg' ? (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Fecha de compra"
                  name="purchaseDate"
                  type="date"
                  value={eggForm.purchaseDate}
                  onChange={handleEggChange}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Categoría"
                  name="categoryId"
                  value={eggForm.categoryId}
                  onChange={handleEggChange}
                  required
                >
                  {(categories || []).map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Cantidad (cajones)"
                  name="quantity"
                  type="number"
                  value={eggForm.quantity}
                  onChange={handleEggChange}
                  required
                  inputProps={{ min: 0.5, step: 0.5 }}
                  helperText="Soporta medios cajones: 0.5, 1, 1.5..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Proveedor"
                  name="provider"
                  value={eggForm.provider}
                  onChange={handleEggChange}
                  placeholder="Opcional"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Costo por cajón"
                  name="cost"
                  type="number"
                  value={eggForm.cost}
                  onChange={handleEggChange}
                  required
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  inputProps={{ min: 0, step: '0.01' }}
                />
              </Grid>
              {eggsEquivalent > 0 && (
                <Grid item xs={12}>
                  <Alert severity="info" icon={false} sx={{ fontWeight: 600 }}>
                    Equivale a <strong>{eggsEquivalent}</strong> huevos ({(eggsEquivalent / (eggsPerCrate / 12)).toFixed(0)} maples)
                  </Alert>
                </Grid>
              )}
              {receiptSection}
            </Grid>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Fecha de compra"
                  name="purchaseDate"
                  type="date"
                  value={genericForm.purchaseDate}
                  onChange={handleGenericChange}
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
                  value={genericForm.productId}
                  onChange={handleGenericChange}
                  required
                >
                  {(products || [])
                    .filter((p) => !p.categoryId)
                    .map((p) => (
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
                  value={genericForm.quantity}
                  onChange={handleGenericChange}
                  required
                  inputProps={{ min: 1, step: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Proveedor"
                  name="provider"
                  value={genericForm.provider}
                  onChange={handleGenericChange}
                  placeholder="Opcional"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Costo por unidad"
                  name="cost"
                  type="number"
                  value={genericForm.cost}
                  onChange={handleGenericChange}
                  required
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  inputProps={{ min: 0, step: '0.01' }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Precio de venta (opcional)"
                  name="price"
                  type="number"
                  value={genericForm.price}
                  onChange={handleGenericChange}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  inputProps={{ min: 0, step: '0.01' }}
                  helperText="Actualiza el precio del producto"
                />
              </Grid>
              {receiptSection}
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || (purchaseType === 'egg' ? !isEggValid : !isGenericValid)}
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
