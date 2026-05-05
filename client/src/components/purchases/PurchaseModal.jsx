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
  Autocomplete,
  Divider,
  Tooltip,
} from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import EggRoundedIcon from '@mui/icons-material/EggRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import dayjs from 'dayjs';
import api from '../../services/api';
import { showErrorAlert } from '../../utils/sweetAlert';

const DEFAULT_EGGS_PER_CRATE = 360;
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

const EMPTY_EGG_ITEM = { categoryId: '', quantity: '', cost: '', provider: '' };
const EMPTY_GENERIC_ITEM = {
  productId: '',
  productSearch: '',
  selectedProduct: null,
  quantity: '',
  cost: '',
  price: '',
  provider: '',
};

const PurchaseModal = ({ open, onClose, onSuccess, categories, products }) => {
  const [purchaseType, setPurchaseType] = useState('egg');
  const [purchaseDate, setPurchaseDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [eggItems, setEggItems] = useState([{ ...EMPTY_EGG_ITEM }]);
  const [genericItems, setGenericItems] = useState([{ ...EMPTY_GENERIC_ITEM }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [receiptMimeType, setReceiptMimeType] = useState(null);
  const [receiptFileName, setReceiptFileName] = useState('');
  const receiptInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPurchaseDate(dayjs().format('YYYY-MM-DD'));
      setEggItems([{ ...EMPTY_EGG_ITEM }]);
      setGenericItems([{ ...EMPTY_GENERIC_ITEM }]);
      setReceiptData(null);
      setReceiptMimeType(null);
      setReceiptFileName('');
    }
  }, [open]);

  const genericProductsList = (products || []).filter((p) => !p.categoryId);

  // ── Egg item handlers ─────────────────────────────────────────────────────
  const handleEggItemChange = (index, field, value) => {
    setEggItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addEggItem = () => setEggItems((prev) => [...prev, { ...EMPTY_EGG_ITEM }]);
  const removeEggItem = (index) => setEggItems((prev) => prev.filter((_, i) => i !== index));

  // ── Generic item handlers ─────────────────────────────────────────────────
  const handleGenericItemChange = (index, field, value) => {
    setGenericItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleGenericProductSelect = (index, product) => {
    setGenericItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        selectedProduct: product,
        productId: product?.id ?? '',
      };
      return updated;
    });
  };

  const addGenericItem = () => setGenericItems((prev) => [...prev, { ...EMPTY_GENERIC_ITEM }]);
  const removeGenericItem = (index) => setGenericItems((prev) => prev.filter((_, i) => i !== index));

  // ── Receipt handlers ──────────────────────────────────────────────────────
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
    reader.onerror = () => showErrorAlert('Error', 'No se pudo leer el archivo. Intente nuevamente.');
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptData(null);
    setReceiptMimeType(null);
    setReceiptFileName('');
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const isEggValid = eggItems.every((item) => item.categoryId && item.quantity && item.cost);
  const isGenericValid = genericItems.every((item) => item.productId && item.quantity && item.cost);
  const isValid = purchaseType === 'egg' ? isEggValid : isGenericValid;

  const activeItems = purchaseType === 'egg' ? eggItems : genericItems;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const items =
        purchaseType === 'egg'
          ? eggItems.map((item) => ({
              categoryId: parseInt(item.categoryId, 10),
              quantity: parseFloat(item.quantity),
              cost: parseFloat(item.cost),
              provider: item.provider || undefined,
              purchaseDate,
            }))
          : genericItems.map((item) => ({
              productId: parseInt(item.productId, 10),
              quantity: parseFloat(item.quantity),
              cost: parseFloat(item.cost),
              price: item.price ? parseFloat(item.price) : undefined,
              provider: item.provider || undefined,
              purchaseDate,
            }));

      await api.post('/purchases/bulk', {
        items,
        receiptData: receiptData || null,
        receiptMimeType: receiptMimeType || null,
      });

      onSuccess();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Ocurrió un error al registrar la compra.';
      showErrorAlert('Error de Registro', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Receipt section ───────────────────────────────────────────────────────
  const receiptSection = (
    <Box sx={{ mt: 2.5 }}>
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
    </Box>
  );

  return (
    <Dialog open={open} onClose={!isSubmitting ? onClose : undefined} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: '#2D6A4F' }}>Registrar Nueva Compra</DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {/* Type toggle */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
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

          {/* Shared date */}
          <TextField
            fullWidth
            label="Fecha de compra"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 3 }}
          />

          {/* ── Egg items ─────────────────────────────────────────────────── */}
          {purchaseType === 'egg' && (
            <>
              {eggItems.map((item, index) => {
                const selectedCategory = (categories || []).find(
                  (c) => c.id === item.categoryId || c.id === parseInt(item.categoryId, 10)
                );
                const eggsPerCrate = selectedCategory?.eggsPerCrate || DEFAULT_EGGS_PER_CRATE;
                const eggsEquivalent = parseFloat(item.quantity || 0) * eggsPerCrate;

                return (
                  <Box key={index}>
                    {index > 0 && <Divider sx={{ my: 2.5 }} />}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Grid container spacing={2} sx={{ flex: 1 }}>
                        <Grid item xs={12} sm={5}>
                          <TextField
                            select
                            fullWidth
                            label="Categoría"
                            value={item.categoryId}
                            onChange={(e) => handleEggItemChange(index, 'categoryId', e.target.value)}
                            required
                          >
                            {(categories || []).map((c) => (
                              <MenuItem key={c.id} value={c.id}>
                                {c.name}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField
                            fullWidth
                            label="Cajones"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleEggItemChange(index, 'quantity', e.target.value)}
                            required
                            inputProps={{ min: 0.5, step: 0.5 }}
                            helperText="Ej: 0.5, 1, 1.5"
                          />
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <TextField
                            fullWidth
                            label="Costo por cajón"
                            type="number"
                            value={item.cost}
                            onChange={(e) => handleEggItemChange(index, 'cost', e.target.value)}
                            required
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            inputProps={{ min: 0, step: '0.01' }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Proveedor"
                            value={item.provider}
                            onChange={(e) => handleEggItemChange(index, 'provider', e.target.value)}
                            placeholder="Opcional"
                            size="small"
                          />
                        </Grid>
                        {eggsEquivalent > 0 && (
                          <Grid item xs={12}>
                            <Alert severity="info" icon={false} sx={{ py: 0.5, fontWeight: 600 }}>
                              Equivale a <strong>{eggsEquivalent}</strong> huevos (
                              {(eggsEquivalent / (eggsPerCrate / 12)).toFixed(0)} maples)
                            </Alert>
                          </Grid>
                        )}
                      </Grid>
                      {eggItems.length > 1 && (
                        <Tooltip title="Quitar">
                          <IconButton
                            onClick={() => removeEggItem(index)}
                            size="small"
                            sx={{ mt: 0.5, flexShrink: 0, color: 'error.light', '&:hover': { color: 'error.main' } }}
                          >
                            <DeleteRoundedIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                );
              })}

              <Button
                startIcon={<AddRoundedIcon />}
                onClick={addEggItem}
                size="small"
                sx={{ mt: 2, color: '#2D6A4F' }}
              >
                Agregar categoría
              </Button>
            </>
          )}

          {/* ── Generic items ──────────────────────────────────────────────── */}
          {purchaseType === 'generic' && (
            <>
              {genericItems.map((item, index) => {
                const filteredProducts =
                  item.productSearch.length >= 3
                    ? genericProductsList.filter((p) =>
                        p.name.toLowerCase().includes(item.productSearch.toLowerCase())
                      )
                    : [];

                return (
                  <Box key={index}>
                    {index > 0 && <Divider sx={{ my: 2.5 }} />}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Grid container spacing={2} sx={{ flex: 1 }}>
                        <Grid item xs={12} sm={6}>
                          <Autocomplete
                            options={filteredProducts}
                            getOptionLabel={(p) => p.name}
                            inputValue={item.productSearch}
                            value={item.selectedProduct}
                            onInputChange={(_, val) => handleGenericItemChange(index, 'productSearch', val)}
                            onChange={(_, product) => handleGenericProductSelect(index, product)}
                            noOptionsText={
                              item.productSearch.length < 3
                                ? 'Escribí al menos 3 letras para buscar'
                                : 'Sin resultados'
                            }
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Producto"
                                required
                                placeholder="Buscar producto..."
                              />
                            )}
                          />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField
                            fullWidth
                            label="Cantidad"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleGenericItemChange(index, 'quantity', e.target.value)}
                            required
                            inputProps={{ min: 1, step: 1 }}
                          />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField
                            fullWidth
                            label="Costo/unidad"
                            type="number"
                            value={item.cost}
                            onChange={(e) => handleGenericItemChange(index, 'cost', e.target.value)}
                            required
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            inputProps={{ min: 0, step: '0.01' }}
                          />
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <TextField
                            fullWidth
                            label="Precio de venta (opcional)"
                            type="number"
                            value={item.price}
                            onChange={(e) => handleGenericItemChange(index, 'price', e.target.value)}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            inputProps={{ min: 0, step: '0.01' }}
                            helperText="Actualiza el precio del producto"
                          />
                        </Grid>
                        <Grid item xs={6} sm={8}>
                          <TextField
                            fullWidth
                            label="Proveedor"
                            value={item.provider}
                            onChange={(e) => handleGenericItemChange(index, 'provider', e.target.value)}
                            placeholder="Opcional"
                          />
                        </Grid>
                      </Grid>
                      {genericItems.length > 1 && (
                        <Tooltip title="Quitar">
                          <IconButton
                            onClick={() => removeGenericItem(index)}
                            size="small"
                            sx={{ mt: 0.5, flexShrink: 0, color: 'error.light', '&:hover': { color: 'error.main' } }}
                          >
                            <DeleteRoundedIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                );
              })}

              <Button
                startIcon={<AddRoundedIcon />}
                onClick={addGenericItem}
                size="small"
                sx={{ mt: 2, color: '#2D6A4F' }}
              >
                Agregar producto
              </Button>
            </>
          )}

          {receiptSection}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !isValid}
            sx={{
              background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' },
            }}
          >
            {isSubmitting
              ? 'Registrando...'
              : `Confirmar Compra${activeItems.length > 1 ? ` (${activeItems.length} ítems)` : ''}`}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PurchaseModal;
