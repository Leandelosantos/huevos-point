import { useState, useEffect, useCallback } from 'react';
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
  IconButton,
  Tooltip,
  Skeleton,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import api from '../services/api';
import ProductModal from '../components/stock/ProductModal';
import ImportStockDialog from '../components/stock/ImportStockDialog';
import ConfirmDialog from '../components/common/ConfirmDialog';

const CURRENCY_FORMAT = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

const StockPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, product: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/products');
      setProducts(data.data);
    } catch {
      setSnackbar({ open: true, message: 'Error al cargar productos', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAdd = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleDeleteClick = (product) => {
    setDeleteConfirm({ open: true, product });
  };

  const handleDeleteConfirm = async () => {
    const product = deleteConfirm.product;
    setDeleteConfirm({ open: false, product: null });

    try {
      await api.delete(`/products/${product.id}`);
      setSnackbar({ open: true, message: `"${product.name}" eliminado exitosamente`, severity: 'success' });
      fetchProducts();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Error al eliminar el producto',
        severity: 'error',
      });
    }
  };

  const handleModalSuccess = () => {
    setModalOpen(false);
    setEditingProduct(null);
    setSnackbar({
      open: true,
      message: editingProduct ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente',
      severity: 'success',
    });
    fetchProducts();
  };

  const handleImportSuccess = () => {
    setImportModalOpen(false);
    fetchProducts();
  };

  const getStockColor = (quantity) => {
    const qty = parseFloat(quantity);
    if (qty === 0) return 'error';
    if (qty <= 10) return 'warning';
    return 'success';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Stock
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Gestión de inventario de productos
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            id="btn-import-stock"
            variant="outlined"
            onClick={() => setImportModalOpen(true)}
            sx={{ px: 3 }}
          >
            Importar Stock
          </Button>
          <Button
            id="btn-add-product"
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={handleAdd}
            sx={{ px: 3 }}
          >
            Agregar Producto
          </Button>
        </Box>
      </Box>

      {/* Products Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell align="center">Stock</TableCell>
                  <TableCell align="right">Precio Unitario</TableCell>
                  <TableCell align="center" sx={{ width: 120 }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      <InventoryRoundedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        No hay productos registrados
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id} hover>
                      <TableCell>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {product.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={product.stockQuantity}
                          size="small"
                          color={getStockColor(product.stockQuantity)}
                          variant="outlined"
                          sx={{ fontWeight: 700, minWidth: 60 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {CURRENCY_FORMAT.format(product.unitPrice)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(product)}
                            sx={{ color: 'primary.main' }}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(product)}
                            sx={{ color: 'error.main', ml: 0.5 }}
                          >
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <ProductModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={handleModalSuccess}
        product={editingProduct}
      />

      {/* Import Stock Modal */}
      <ImportStockDialog
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Eliminar Producto"
        message={`¿Estás seguro de eliminar "${deleteConfirm.product?.name}"? El producto será desactivado.`}
        confirmText="Eliminar"
        severity="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ open: false, product: null })}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StockPage;
