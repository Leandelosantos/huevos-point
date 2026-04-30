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
  Collapse,
  TextField,
  Button,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import EggRoundedIcon from '@mui/icons-material/EggRounded';
import api from '../services/api';
import CategoryModal from '../components/stock/CategoryModal';
import PriceEditModal from '../components/stock/PriceEditModal';
import StockAdjustModal from '../components/stock/StockAdjustModal';
import { showErrorToast, showSuccessToast, showConfirmation } from '../utils/sweetAlert';
import { CURRENCY_FORMAT } from '../utils/formatters';

const StockPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [priceModal, setPriceModal] = useState({ open: false, product: null });
  const [stockAdjustModal, setStockAdjustModal] = useState({ open: false, category: null });

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/egg-categories');
      setCategories(data.data);
    } catch {
      showErrorToast('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getStockColor = (eggs) => {
    if (eggs === 0) return 'error';
    if (eggs < 360) return 'warning';
    return 'success';
  };

  const handleCategorySuccess = () => {
    setCategoryModalOpen(false);
    showSuccessToast('Categoría creada con presentaciones');
    fetchCategories();
  };

  const handlePriceSuccess = () => {
    setPriceModal({ open: false, product: null });
    showSuccessToast('Precio actualizado');
    fetchCategories();
  };

  const handleStockAdjustSuccess = () => {
    setStockAdjustModal({ open: false, category: null });
    showSuccessToast('Stock ajustado');
    fetchCategories();
  };

  const handleDeleteCategory = async (cat) => {
    const confirmed = await showConfirmation(
      `¿Eliminar categoría "${cat.name}"?`,
      'Se eliminarán también todas sus presentaciones. Esta acción no se puede deshacer.',
      'Sí, eliminar',
      'Cancelar'
    );
    if (!confirmed) return;
    try {
      await api.delete(`/egg-categories/${cat.id}`);
      showSuccessToast(`Categoría "${cat.name}" eliminada`);
      fetchCategories();
    } catch (err) {
      showErrorToast(err.response?.data?.message || 'Error al eliminar la categoría');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 4, gap: 2 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Stock
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Inventario por categoría de huevos
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => setCategoryModalOpen(true)}
        >
          Nueva Categoría
        </Button>
      </Box>

      {/* Categories Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 50 }} />
                  <TableCell>Categoría</TableCell>
                  <TableCell align="center">Stock (huevos)</TableCell>
                  <TableCell align="center">Cajones</TableCell>
                  <TableCell align="center" sx={{ width: 120 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <EggRoundedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        No hay categorías. Creá una para comenzar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <>
                      <TableRow key={cat.id} hover sx={{ cursor: 'pointer' }} onClick={() => toggleExpand(cat.id)}>
                        <TableCell>
                          <IconButton size="small">
                            {expandedId === cat.id ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body1" sx={{ fontWeight: 700 }}>
                            {cat.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${Math.floor(cat.stockUnits)} huevos`}
                            size="small"
                            color={getStockColor(cat.stockUnits)}
                            variant="outlined"
                            sx={{ fontWeight: 700, minWidth: 100 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {cat.stockCrates}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Ajustar stock">
                            <IconButton
                              size="small"
                              onClick={() => setStockAdjustModal({ open: true, category: cat })}
                              sx={{ color: 'primary.main' }}
                            >
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar categoría">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteCategory(cat)}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                      {/* Expanded presentations */}
                      <TableRow key={`${cat.id}-expand`}>
                        <TableCell colSpan={5} sx={{ py: 0, borderBottom: expandedId === cat.id ? undefined : 'none' }}>
                          <Collapse in={expandedId === cat.id} timeout="auto" unmountOnExit>
                            <Box sx={{ py: 2, pl: 4 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                                Presentaciones
                              </Typography>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Presentación</TableCell>
                                    <TableCell align="center">Unids/pres.</TableCell>
                                    <TableCell align="center">Disponible</TableCell>
                                    <TableCell align="right">Precio</TableCell>
                                    <TableCell align="center" sx={{ width: 80 }}>Editar</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {(cat.presentations || []).map((p) => (
                                    <TableRow key={p.id}>
                                      <TableCell>{p.name}</TableCell>
                                      <TableCell align="center">{p.unitsPerPresentation}</TableCell>
                                      <TableCell align="center">
                                        <Chip
                                          label={p.availableStock}
                                          size="small"
                                          color={p.availableStock === 0 ? 'error' : 'default'}
                                          variant="outlined"
                                          sx={{ fontWeight: 600, minWidth: 50 }}
                                        />
                                      </TableCell>
                                      <TableCell align="right">
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                          {parseFloat(p.unitPrice) > 0 ? CURRENCY_FORMAT.format(p.unitPrice) : '—'}
                                        </Typography>
                                      </TableCell>
                                      <TableCell align="center">
                                        <Tooltip title="Editar precio">
                                          <IconButton
                                            size="small"
                                            onClick={() => setPriceModal({ open: true, product: p })}
                                            sx={{ color: 'primary.main' }}
                                          >
                                            <EditRoundedIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Modals */}
      <CategoryModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSuccess={handleCategorySuccess}
      />
      <PriceEditModal
        open={priceModal.open}
        onClose={() => setPriceModal({ open: false, product: null })}
        onSuccess={handlePriceSuccess}
        product={priceModal.product}
      />
      <StockAdjustModal
        open={stockAdjustModal.open}
        onClose={() => setStockAdjustModal({ open: false, category: null })}
        onSuccess={handleStockAdjustSuccess}
        category={stockAdjustModal.category}
      />
    </Box>
  );
};

export default StockPage;
