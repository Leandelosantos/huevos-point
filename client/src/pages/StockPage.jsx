import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Skeleton,
  Chip,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import api from '../services/api';
import ProductModal from '../components/stock/ProductModal';
import { showErrorToast, showSuccessToast } from '../utils/sweetAlert';

const CURRENCY_FORMAT = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

const StockPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/products');
      setProducts(data.data);
    } catch {
      showErrorToast('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleEdit = (product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    setModalOpen(false);
    showSuccessToast(editingProduct ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente');
    setEditingProduct(null);
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
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 4, flexWrap: 'wrap', gap: 2, overflow: 'hidden', width: '100%' }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Stock
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Inventario de productos
          </Typography>
        </Box>
      </Box>

      {/* Products Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
            <Table sx={{ minWidth: { xs: 600, md: '100%' } }}>
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
    </Box>
  );
};

export default StockPage;
