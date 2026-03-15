import { useState, useEffect, useRef } from 'react';
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
} from '@mui/material';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showSuccessToast, showErrorAlert, showErrorToast, showWarningAlert } from '../utils/sweetAlert';
import PurchaseModal from '../components/purchases/PurchaseModal';

const CURRENCY_FORMAT = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

const PurchasesPage = () => {
  const { isAdmin } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [productsCache, setProductsCache] = useState([]);
  
  const fileInputRef = useRef(null);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/purchases');
      setPurchases(data.data.purchases || []);
    } catch {
      showErrorToast('No se pudieron cargar las compras registradas');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProductsCache(data.data || []);
      return data.data || [];
    } catch {
      showErrorToast('No se pudo cargar el catálogo de productos');
      return [];
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchProducts();
  }, []);

  const handleOpenModal = async () => {
    const products = await fetchProducts();
    if (products.length === 0) {
      showWarningAlert(
        'Catálogo Vacío',
        'No existen productos en el sistema. Debes "Cargar Productos" mediante un archivo Excel/CSV antes de registrar una compra.'
      );
      return;
    }
    setModalOpen(true);
  };

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

      // Validar que la cabecera A1 sea "nombre_producto"
      const headerObj = worksheet.getRow(1).getCell(1).value;
      const headerText = typeof headerObj === 'string' ? headerObj : (headerObj?.richText?.[0]?.text || headerObj || '');
      
      if (headerText.toString().trim().toLowerCase() !== 'nombre_producto') {
        throw new Error('La primera celda (A1) debe llamarse "nombre_producto"');
      }

      const newProducts = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        const cellValue = row.getCell(1).value;
        const productName = typeof cellValue === 'string' ? cellValue : (cellValue?.richText?.[0]?.text || cellValue?.toString() || '');
        
        if (productName && productName.trim() !== '') {
          newProducts.push({
            name: productName.trim(),
            stockQuantity: 0,
            unitPrice: 0,
          });
        }
      });

      if (newProducts.length === 0) {
        throw new Error('No se encontraron nombres de productos en las filas subsiguientes');
      }

      const { data } = await api.post('/products/bulk', newProducts);
      showSuccessToast(`Productos sincronizados: ${data.data.created} nuevos, ${data.data.updated} actualizados`);
      
      fetchProducts(); // Update cache
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Error al procesar el archivo';
      showErrorAlert('Error de Importación', errorMsg);
    } finally {
      e.target.value = ''; // Reset input
    }
  };

  const handlePurchaseSuccess = () => {
    setModalOpen(false);
    showSuccessToast('Compra registrada exitosamente');
    fetchPurchases();
    fetchProducts();
  };

  return (
    <Box>
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

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingBagRoundedIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Historial de Compras
            </Typography>
          </Box>

          <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell align="center">Cant.</TableCell>
                  <TableCell align="right">Costo Unit.</TableCell>
                  <TableCell align="right">Precio Venta</TableCell>
                  <TableCell align="right">Monto de margen</TableCell>
                  <TableCell align="right">Total Invertido</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No hay compras registradas
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((purchase) => (
                    <TableRow key={purchase.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {dayjs(purchase.purchaseDate).format('DD/MM/YYYY')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D6A4F' }}>
                          {purchase.product?.name || 'Desconocido'}
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
                          x{purchase.quantity}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {CURRENCY_FORMAT.format(purchase.cost)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {CURRENCY_FORMAT.format(purchase.price)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#2D6A4F' }}>
                          {CURRENCY_FORMAT.format(parseFloat(purchase.price) - parseFloat(purchase.cost))}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#C62828' }}>
                          -{CURRENCY_FORMAT.format(parseFloat(purchase.cost) * parseInt(purchase.quantity, 10))}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <PurchaseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handlePurchaseSuccess}
        products={productsCache}
      />
    </Box>
  );
};

export default PurchasesPage;
