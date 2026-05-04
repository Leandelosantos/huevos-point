import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Chip,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showSuccessToast, showErrorAlert, showErrorToast, showConfirmation } from '../utils/sweetAlert';
import PurchaseModal from '../components/purchases/PurchaseModal';
import EditPurchaseModal from '../components/purchases/EditPurchaseModal';
import { CURRENCY_FORMAT } from '../utils/formatters';

const PurchasesPage = () => {
  const { isAdmin, isSuperAdmin } = useAuth();

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0);

  // ── Purchase history state ─────────────────────────────────────────────
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // ── Products state ─────────────────────────────────────────────────────
  const [categoriesCache, setCategoriesCache] = useState([]);
  const [productsCache, setProductsCache] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [savingId, setSavingId] = useState(null);

  const fileInputRef = useRef(null);

  // ── Fetchers ───────────────────────────────────────────────────────────
  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/purchases');
      setPurchases(data.data.purchases || []);
    } catch {
      showErrorToast('No se pudieron cargar las compras registradas');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/egg-categories');
      setCategoriesCache(data.data || []);
      return data.data || [];
    } catch {
      showErrorToast('No se pudieron cargar las categorías');
      return [];
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/products');
      setProductsCache(data.data || []);
    } catch {
      showErrorToast('No se pudieron cargar los productos');
    }
  }, []);

  useEffect(() => {
    fetchPurchases();
    fetchCategories();
    fetchProducts();
  }, [fetchPurchases, fetchCategories, fetchProducts]);

  // ── Generic products (no categoryId = loaded via Excel) ────────────────
  const genericProducts = useMemo(() => {
    return productsCache.filter((p) => !p.categoryId);
  }, [productsCache]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return genericProducts;
    const lower = productSearch.toLowerCase();
    return genericProducts.filter((p) => p.name.toLowerCase().includes(lower));
  }, [genericProducts, productSearch]);

  // ── Purchase history handlers ──────────────────────────────────────────
  const handleOpenModal = () => setModalOpen(true);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      showSuccessToast('Procesando archivo...');
      const workbook = new ExcelJS.Workbook();
      if (file.name.endsWith('.csv')) {
        await workbook.csv.read(file);
      } else {
        await workbook.xlsx.load(await file.arrayBuffer());
      }
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error('El archivo está vacío');
      const headerObj = worksheet.getRow(1).getCell(1).value;
      const headerText = typeof headerObj === 'string' ? headerObj : (headerObj?.richText?.[0]?.text || headerObj || '');
      if (headerText.toString().trim().toLowerCase() !== 'nombre_producto') {
        throw new Error('La primera celda (A1) debe llamarse "nombre_producto"');
      }
      const newProducts = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const cellValue = row.getCell(1).value;
        const productName = typeof cellValue === 'string' ? cellValue : (cellValue?.richText?.[0]?.text || cellValue?.toString() || '');
        if (productName && productName.trim() !== '') {
          newProducts.push({ name: productName.trim(), stockQuantity: 0, unitPrice: 0 });
        }
      });
      if (newProducts.length === 0) throw new Error('No se encontraron nombres de productos en las filas subsiguientes');
      const { data } = await api.post('/products/bulk', newProducts);
      showSuccessToast(`Productos sincronizados: ${data.data.created} nuevos, ${data.data.updated} actualizados`);
      fetchProducts();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Error al procesar el archivo';
      showErrorAlert('Error de Importación', errorMsg);
    } finally {
      e.target.value = '';
    }
  };

  const handleViewReceipt = async (purchaseId) => {
    try {
      const { data } = await api.get(`/purchases/${purchaseId}/receipt`);
      const { receiptData, receiptMimeType } = data.data;
      const byteChars = atob(receiptData);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArr], { type: receiptMimeType });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch {
      showErrorToast('No se pudo cargar el comprobante');
    }
  };

  const handleEditPurchase = (purchase) => {
    setSelectedPurchase(purchase);
    setEditModalOpen(true);
  };

  const handleDeletePurchase = async (purchase) => {
    const label = purchase.category?.name || purchase.product?.name || `#${purchase.id}`;
    const confirmed = await showConfirmation(
      'Eliminar compra',
      `¿Eliminar la compra de ${label}? El stock asociado será revertido.`,
      'Sí, eliminar',
      'Cancelar'
    );
    if (!confirmed) return;
    try {
      await api.delete(`/purchases/${purchase.id}`);
      showSuccessToast('Compra eliminada y stock revertido');
      fetchPurchases();
      fetchCategories();
      fetchProducts();
    } catch (error) {
      showErrorAlert('Error', error.response?.data?.message || 'Error al eliminar la compra');
    }
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedPurchase(null);
    showSuccessToast('Compra actualizada correctamente');
    fetchPurchases();
    fetchCategories();
    fetchProducts();
  };

  const handlePurchaseSuccess = () => {
    setModalOpen(false);
    showSuccessToast('Compra registrada exitosamente');
    fetchPurchases();
    fetchCategories();
    fetchProducts();
  };

  // ── Product list handlers ──────────────────────────────────────────────
  const handleStartEdit = (product) => {
    setEditingId(product.id);
    setEditingName(product.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveProductName = async (productId) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setSavingId(productId);
    try {
      await api.put(`/products/${productId}`, { name: trimmed });
      setProductsCache((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, name: trimmed } : p))
      );
      showSuccessToast('Nombre actualizado');
      setEditingId(null);
      setEditingName('');
    } catch (error) {
      showErrorAlert('Error', error.response?.data?.message || 'No se pudo actualizar el nombre');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteAllProducts = async () => {
    const confirmed = await showConfirmation(
      'Eliminar todos los productos',
      `¿Eliminar los ${genericProducts.length} producto${genericProducts.length !== 1 ? 's' : ''} cargados? Esta acción no se puede deshacer.`,
      'Sí, eliminar todos',
      'Cancelar'
    );
    if (!confirmed) return;
    try {
      await api.delete('/products/bulk');
      showSuccessToast('Todos los productos eliminados correctamente');
      fetchProducts();
    } catch (error) {
      showErrorAlert('Error', error.response?.data?.message || 'No se pudieron eliminar los productos');
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmed = await showConfirmation(
      'Eliminar producto',
      `¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`,
      'Sí, eliminar',
      'Cancelar'
    );
    if (!confirmed) return;
    try {
      await api.delete(`/products/${product.id}`);
      setProductsCache((prev) => prev.filter((p) => p.id !== product.id));
      showSuccessToast('Producto eliminado');
    } catch (error) {
      showErrorAlert('Error', error.response?.data?.message || 'No se pudo eliminar el producto');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Compras
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Gestión de abastecimiento e ingreso de stock
          </Typography>
        </Box>

        {isAdmin && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <input
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button
              variant="outlined"
              startIcon={<UploadFileRoundedIcon />}
              onClick={() => fileInputRef.current.click()}
              sx={{ color: '#2D6A4F', borderColor: '#2D6A4F' }}
            >
              Cargar Productos
            </Button>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={handleOpenModal}
              sx={{
                background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' },
              }}
            >
              Nueva Compra
            </Button>
          </Box>
        )}
      </Box>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab
              icon={<ShoppingBagRoundedIcon fontSize="small" />}
              iconPosition="start"
              label="Historial de Compras"
              sx={{ fontWeight: 600, minHeight: 52 }}
            />
            <Tab
              icon={<InventoryRoundedIcon fontSize="small" />}
              iconPosition="start"
              label={`Productos Cargados${genericProducts.length ? ` (${genericProducts.length})` : ''}`}
              sx={{ fontWeight: 600, minHeight: 52 }}
            />
          </Tabs>
        </Box>

        {/* ── Tab 0: Purchase history ─────────────────────────────────────── */}
        {activeTab === 0 && (
          <CardContent sx={{ p: 0 }}>
            <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
              <Table sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Categoría / Producto</TableCell>
                    <TableCell>Proveedor</TableCell>
                    <TableCell align="center">Cajones / Unid.</TableCell>
                    <TableCell align="center">Huevos</TableCell>
                    <TableCell align="right">Costo/Cajón</TableCell>
                    <TableCell align="right">Total Invertido</TableCell>
                    <TableCell align="center">Comprobante</TableCell>
                    {isSuperAdmin && <TableCell align="center">Acciones</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: isSuperAdmin ? 9 : 8 }).map((_, j) => (
                          <TableCell key={j}><Skeleton /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : purchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin ? 9 : 8} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No hay compras registradas
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchases.map((purchase) => {
                      const qty = parseFloat(purchase.quantity) || 0;
                      const isEgg = Boolean(purchase.categoryId);
                      const eggsPerCrate = purchase.category?.eggsPerCrate || 360;
                      const eggs = isEgg ? qty * eggsPerCrate : null;
                      return (
                        <TableRow key={purchase.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {dayjs(purchase.purchaseDate).format('DD/MM/YYYY')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D6A4F' }}>
                              {purchase.category?.name || purchase.product?.name || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={purchase.provider || 'Sin Especificar'}
                              size="small"
                              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {qty}{isEgg ? ' caj.' : ' u.'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {eggs != null ? (
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{eggs}</Typography>
                            ) : (
                              <Typography variant="caption" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">{CURRENCY_FORMAT.format(purchase.cost)}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#C62828' }}>
                              -{CURRENCY_FORMAT.format(parseFloat(purchase.cost) * qty)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {purchase.hasReceipt ? (
                              <Tooltip title="Ver comprobante">
                                <IconButton size="small" onClick={() => handleViewReceipt(purchase.id)} sx={{ color: '#2D6A4F' }}>
                                  <ReceiptLongRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Typography variant="caption" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                          {isSuperAdmin && (
                            <TableCell align="center">
                              <Tooltip title="Editar">
                                <IconButton size="small" onClick={() => handleEditPurchase(purchase)} sx={{ color: '#1565C0' }}>
                                  <EditRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Eliminar">
                                <IconButton size="small" onClick={() => handleDeletePurchase(purchase)} sx={{ color: '#C62828' }}>
                                  <DeleteRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* ── Tab 1: Loaded products ──────────────────────────────────────── */}
        {activeTab === 1 && (
          <CardContent sx={{ p: 0 }}>
            {/* Search bar */}
            <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Buscar producto..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: productSearch ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setProductSearch('')}>
                          <CloseRoundedIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                  sx={{ width: { xs: '100%', sm: 340 } }}
                />
                <Typography variant="caption" color="text.secondary">
                  {filteredProducts.length} de {genericProducts.length} producto{genericProducts.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
              {isAdmin && genericProducts.length > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteRoundedIcon />}
                  onClick={handleDeleteAllProducts}
                  sx={{ ml: 'auto' }}
                >
                  Eliminar todos
                </Button>
              )}
            </Box>

            <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
              <Table sx={{ minWidth: 500 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '50%' }}>Nombre</TableCell>
                    <TableCell align="right">Precio unitario</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    {isAdmin && <TableCell align="center">Acciones</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {genericProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No hay productos cargados. Usá "Cargar Productos" para importar desde Excel.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          Sin resultados para "{productSearch}"
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const isEditing = editingId === product.id;
                      const isSaving = savingId === product.id;
                      return (
                        <TableRow key={product.id} hover>
                          <TableCell>
                            {isEditing ? (
                              <TextField
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                size="small"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveProductName(product.id);
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                                sx={{ minWidth: 220 }}
                              />
                            ) : (
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {product.name}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {CURRENCY_FORMAT.format(product.unitPrice)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {parseFloat(product.stockQuantity || 0).toFixed(0)} u.
                            </Typography>
                          </TableCell>
                          {isAdmin && (
                            <TableCell align="center">
                              {isEditing ? (
                                <>
                                  <Tooltip title="Guardar (Enter)">
                                    <span>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleSaveProductName(product.id)}
                                        disabled={isSaving || !editingName.trim()}
                                        sx={{ color: '#2D6A4F' }}
                                      >
                                        {isSaving ? <CircularProgress size={16} /> : <SaveRoundedIcon fontSize="small" />}
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <Tooltip title="Cancelar (Esc)">
                                    <IconButton size="small" onClick={handleCancelEdit} sx={{ color: 'text.secondary' }}>
                                      <CloseRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              ) : (
                                <>
                                  <Tooltip title="Editar nombre">
                                    <IconButton size="small" onClick={() => handleStartEdit(product)} sx={{ color: '#1565C0' }}>
                                      <EditRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Eliminar producto">
                                    <IconButton size="small" onClick={() => handleDeleteProduct(product)} sx={{ color: '#C62828' }}>
                                      <DeleteRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}
      </Card>

      <PurchaseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handlePurchaseSuccess}
        categories={categoriesCache}
        products={productsCache}
      />

      <EditPurchaseModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedPurchase(null); }}
        onSuccess={handleEditSuccess}
        purchase={selectedPurchase}
      />
    </Box>
  );
};

export default PurchasesPage;
