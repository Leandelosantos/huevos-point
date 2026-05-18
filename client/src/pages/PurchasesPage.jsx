import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Skeleton, Chip,
  IconButton, Tooltip, Tabs, Tab, TextField, InputAdornment,
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  Grid, CircularProgress, FormControl, Select, MenuItem, Checkbox, Stack,
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
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import DeliveryDiningRoundedIcon from '@mui/icons-material/DeliveryDiningRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showSuccessToast, showErrorAlert, showErrorToast, showConfirmation } from '../utils/sweetAlert';
import PurchaseModal from '../components/purchases/PurchaseModal';
import EditPurchaseModal from '../components/purchases/EditPurchaseModal';
import WithdrawalModal from '../components/purchases/WithdrawalModal';
import { CURRENCY_FORMAT } from '../utils/formatters';

// ── Month picker (same pattern as MetricsPage) ─────────────────────────────
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const todayYM = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};

const MonthYearPicker = ({ value, onChange }) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [selYear, selMonth] = value.split('-').map(Number);
  const years = [];
  for (let y = 2024; y <= currentYear; y++) years.push(y);

  const handleYear = (newYear) => {
    const clampedMonth = newYear === currentYear && selMonth > currentMonth ? currentMonth : selMonth;
    onChange(`${newYear}-${String(clampedMonth).padStart(2, '0')}`);
  };
  const handleMonth = (newMonth) => onChange(`${selYear}-${String(newMonth).padStart(2, '0')}`);
  const selectSx = { fontSize: 13, '& .MuiSelect-select': { py: '6px', px: '10px' } };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <FormControl size="small">
        <Select value={selMonth} onChange={(e) => handleMonth(e.target.value)} sx={selectSx}>
          {MONTH_NAMES.map((name, i) => {
            const mn = i + 1;
            return <MenuItem key={mn} value={mn} disabled={selYear === currentYear && mn > currentMonth}>{name}</MenuItem>;
          })}
        </Select>
      </FormControl>
      <FormControl size="small">
        <Select value={selYear} onChange={(e) => handleYear(e.target.value)} sx={selectSx}>
          {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </Select>
      </FormControl>
    </Box>
  );
};

// ── Summary card component ─────────────────────────────────────────────────
const SummaryCard = ({ icon, title, gross, net, withdrawn, color, borderColor, onClick, loading }) => (
  <Card
    onClick={onClick}
    sx={{
      borderRadius: 3,
      borderLeft: `4px solid ${borderColor}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow 0.15s, transform 0.15s',
      '&:hover': onClick ? { boxShadow: '0 4px 20px rgba(0,0,0,0.12)', transform: 'translateY(-1px)' } : {},
    }}
  >
    <CardContent sx={{ pb: '16px !important' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{ color, display: 'flex' }}>{icon}</Box>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} fontSize={11}>
          {title}
        </Typography>
        {onClick && (
          <Chip label="Retirar" size="small" sx={{ ml: 'auto', fontSize: '0.65rem', height: 20, fontWeight: 600, color, bgcolor: `${borderColor}18` }} />
        )}
      </Box>
      {loading ? (
        <Skeleton variant="text" width={120} height={36} />
      ) : (
        <>
          <Typography variant="h5" fontWeight={800} color={color}>
            {CURRENCY_FORMAT.format(net)}
          </Typography>
          {withdrawn > 0 && (
            <Typography variant="caption" color="text.disabled">
              Bruto {CURRENCY_FORMAT.format(gross)} — Retirado {CURRENCY_FORMAT.format(withdrawn)}
            </Typography>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

// ── Egg debt card ──────────────────────────────────────────────────────────
const EggDebtCard = ({ debt, loading }) => (
  <Card sx={{
    borderRadius: 3,
    borderLeft: '4px solid #C62828',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    background: 'rgba(198,40,40,0.03)',
  }}>
    <CardContent sx={{ pb: '16px !important' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <WarningAmberRoundedIcon sx={{ color: '#C62828', fontSize: 20 }} />
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} fontSize={11}>
          Deuda total de huevos
        </Typography>
      </Box>
      {loading ? (
        <Skeleton variant="text" width={140} height={36} />
      ) : (
        <>
          <Typography variant="h5" fontWeight={800} color="#C62828">
            {CURRENCY_FORMAT.format(debt?.debtAmount ?? 0)}
          </Typography>
          {debt && (debt.totalPurchased > 0 || debt.totalPaid > 0) && (
            <Typography variant="caption" color="text.disabled">
              Comprado {CURRENCY_FORMAT.format(debt.totalPurchased)} — Pagado {CURRENCY_FORMAT.format(debt.totalPaid)}
            </Typography>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

// ── Main page ──────────────────────────────────────────────────────────────
const PurchasesPage = () => {
  const { isAdmin, isSuperAdmin } = useAuth();

  // ── Tabs ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0);

  // ── Purchase history ───────────────────────────────────────────────────
  const [purchases, setPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // ── Products ───────────────────────────────────────────────────────────
  const [categoriesCache, setCategoriesCache] = useState([]);
  const [productsCache, setProductsCache] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [savingId, setSavingId] = useState(null);
  const fileInputRef = useRef(null);

  // ── Cajas state ────────────────────────────────────────────────────────
  const [selectedYM, setSelectedYM] = useState(todayYM);
  const [cashSummary, setCashSummary] = useState(null);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [loadingCash, setLoadingCash] = useState(true);
  const [selectedRows, setSelectedRows] = useState(new Set());

  // ── Withdrawal modal ───────────────────────────────────────────────────
  const [withdrawalModal, setWithdrawalModal] = useState(null); // { source, dates, maxAmount }

  // ── Fetchers ───────────────────────────────────────────────────────────
  const fetchPurchases = useCallback(async () => {
    try {
      setLoadingPurchases(true);
      const { data } = await api.get('/purchases');
      setPurchases(data.data.purchases || []);
    } catch { showErrorToast('No se pudieron cargar las compras'); }
    finally { setLoadingPurchases(false); }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/egg-categories');
      setCategoriesCache(data.data || []);
      return data.data || [];
    } catch { showErrorToast('No se pudieron cargar las categorías'); return []; }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/products');
      setProductsCache(data.data || []);
    } catch { showErrorToast('No se pudieron cargar los productos'); }
  }, []);

  const fetchCash = useCallback(async (ym) => {
    const [year, month] = ym.split('-').map(Number);
    try {
      setLoadingCash(true);
      setSelectedRows(new Set());
      const [summaryRes, registersRes] = await Promise.all([
        api.get('/purchases/cash/summary', { params: { year, month } }),
        api.get('/purchases/cash/registers', { params: { year, month } }),
      ]);
      setCashSummary(summaryRes.data.data);
      setCashRegisters(registersRes.data.data);
    } catch { showErrorToast('No se pudieron cargar las cajas'); }
    finally { setLoadingCash(false); }
  }, []);

  useEffect(() => {
    fetchPurchases();
    fetchCategories();
    fetchProducts();
  }, [fetchPurchases, fetchCategories, fetchProducts]);

  useEffect(() => {
    fetchCash(selectedYM);
  }, [fetchCash, selectedYM]);

  // ── Product helpers ────────────────────────────────────────────────────
  const genericProducts = useMemo(() => productsCache.filter((p) => !p.categoryId), [productsCache]);
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return genericProducts;
    const lower = productSearch.toLowerCase();
    return genericProducts.filter((p) => p.name.toLowerCase().includes(lower));
  }, [genericProducts, productSearch]);

  // ── Multi-select helpers ───────────────────────────────────────────────
  const toggleRow = (date) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedRows.size === cashRegisters.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(cashRegisters.map((r) => r.date)));
    }
  };
  const selectedDates = Array.from(selectedRows);
  const selectedEfectivo = cashRegisters
    .filter((r) => selectedRows.has(r.date))
    .reduce((acc, r) => acc + r.efectivo, 0);

  // ── Withdrawal submit ──────────────────────────────────────────────────
  const handleWithdrawalSubmit = async ({ source, type, amount, concept, dates }) => {
    // Single record — use the row date for single-day, today for multi-day selection
    const withdrawalDate = dates.length === 1 ? dates[0] : dayjs().format('YYYY-MM-DD');
    await api.post('/purchases/cash/withdrawals', {
      withdrawalDate,
      source,
      type,
      amount,
      concept,
    });
  };

  const openWithdrawal = ({ source, dates, maxAmount }) => {
    setWithdrawalModal({ source, dates, maxAmount });
  };

  // ── Purchase history handlers ──────────────────────────────────────────
  const handleOpenModal = () => setModalOpen(true);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      showSuccessToast('Procesando archivo...');
      const workbook = new ExcelJS.Workbook();
      if (file.name.endsWith('.csv')) { await workbook.csv.read(file); }
      else { await workbook.xlsx.load(await file.arrayBuffer()); }
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error('El archivo está vacío');
      const headerObj = worksheet.getRow(1).getCell(1).value;
      const headerText = typeof headerObj === 'string' ? headerObj : (headerObj?.richText?.[0]?.text || headerObj || '');
      if (headerText.toString().trim().toLowerCase() !== 'nombre_producto') throw new Error('La primera celda (A1) debe llamarse "nombre_producto"');
      const newProducts = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const cellValue = row.getCell(1).value;
        const productName = typeof cellValue === 'string' ? cellValue : (cellValue?.richText?.[0]?.text || cellValue?.toString() || '');
        if (productName && productName.trim() !== '') newProducts.push({ name: productName.trim(), stockQuantity: 0, unitPrice: 0 });
      });
      if (newProducts.length === 0) throw new Error('No se encontraron nombres de productos');
      const { data } = await api.post('/products/bulk', newProducts);
      showSuccessToast(`Productos sincronizados: ${data.data.created} nuevos, ${data.data.updated} actualizados`);
      fetchProducts();
    } catch (error) {
      showErrorAlert('Error de Importación', error.response?.data?.message || error.message || 'Error al procesar el archivo');
    } finally { e.target.value = ''; }
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
    } catch { showErrorToast('No se pudo cargar el comprobante'); }
  };

  const handleEditPurchase = (purchase) => { setSelectedPurchase(purchase); setEditModalOpen(true); };
  const handleDeletePurchase = async (purchase) => {
    const label = purchase.category?.name || purchase.product?.name || `#${purchase.id}`;
    const confirmed = await showConfirmation('Eliminar compra', `¿Eliminar la compra de ${label}? El stock asociado será revertido.`, 'Sí, eliminar', 'Cancelar');
    if (!confirmed) return;
    try {
      await api.delete(`/purchases/${purchase.id}`);
      showSuccessToast('Compra eliminada y stock revertido');
      fetchPurchases(); fetchCategories(); fetchProducts();
    } catch (error) { showErrorAlert('Error', error.response?.data?.message || 'Error al eliminar'); }
  };
  const handleEditSuccess = () => { setEditModalOpen(false); setSelectedPurchase(null); showSuccessToast('Compra actualizada'); fetchPurchases(); fetchCategories(); fetchProducts(); };
  const handlePurchaseSuccess = () => { setModalOpen(false); showSuccessToast('Compra registrada exitosamente'); fetchPurchases(); fetchCategories(); fetchProducts(); fetchCash(selectedYM); };

  // ── Product list handlers ──────────────────────────────────────────────
  const handleStartEdit = (product) => { setEditingId(product.id); setEditingName(product.name); };
  const handleCancelEdit = () => { setEditingId(null); setEditingName(''); };
  const handleSaveProductName = async (productId) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setSavingId(productId);
    try {
      await api.put(`/products/${productId}`, { name: trimmed });
      setProductsCache((prev) => prev.map((p) => (p.id === productId ? { ...p, name: trimmed } : p)));
      showSuccessToast('Nombre actualizado');
      setEditingId(null); setEditingName('');
    } catch (error) { showErrorAlert('Error', error.response?.data?.message || 'No se pudo actualizar el nombre'); }
    finally { setSavingId(null); }
  };
  const handleDeleteAllProducts = async () => {
    const confirmed = await showConfirmation('Eliminar todos los productos', `¿Eliminar los ${genericProducts.length} producto${genericProducts.length !== 1 ? 's' : ''}?`, 'Sí, eliminar todos', 'Cancelar');
    if (!confirmed) return;
    try {
      await api.delete('/products/bulk');
      showSuccessToast('Todos los productos eliminados');
      fetchProducts();
    } catch (error) { showErrorAlert('Error', error.response?.data?.message || 'No se pudieron eliminar'); }
  };
  const handleDeleteProduct = async (product) => {
    const confirmed = await showConfirmation('Eliminar producto', `¿Eliminar "${product.name}"?`, 'Sí, eliminar', 'Cancelar');
    if (!confirmed) return;
    try {
      await api.delete(`/products/${product.id}`);
      setProductsCache((prev) => prev.filter((p) => p.id !== product.id));
      showSuccessToast('Producto eliminado');
    } catch (error) { showErrorAlert('Error', error.response?.data?.message || 'No se pudo eliminar'); }
  };

  const isCurrentMonth = selectedYM === todayYM();

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Compras / Cajas
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Abastecimiento, deuda de huevos y cierre de cajas
          </Typography>
        </Box>
        {isAdmin && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} />
            <Button variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => fileInputRef.current.click()} sx={{ color: '#2D6A4F', borderColor: '#2D6A4F' }}>
              Cargar Productos
            </Button>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={handleOpenModal}
              sx={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)', '&:hover': { background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' } }}>
              Nueva Compra
            </Button>
          </Box>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* ── Summary cards ─────────────────────────────────────────────── */}
        {/* Egg debt — always visible, all-time */}
        <Grid item xs={12} sm={6} md={3}>
          <EggDebtCard debt={cashSummary?.eggDebt} loading={loadingCash} />
        </Grid>

        {/* Month selector row for the 3 payment cards */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <CalendarMonthRoundedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              Totales del mes{isCurrentMonth ? ' (en curso)' : ''}:
            </Typography>
            <MonthYearPicker value={selectedYM} onChange={(ym) => { setSelectedYM(ym); }} />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <SummaryCard
            icon={<MonetizationOnRoundedIcon />}
            title="Efectivo"
            gross={cashSummary?.efectivo?.gross ?? 0}
            net={cashSummary?.efectivo?.net ?? 0}
            withdrawn={cashSummary?.efectivo?.withdrawn ?? 0}
            color="#2E7D32"
            borderColor="#43A047"
            loading={loadingCash}
            onClick={isAdmin ? () => openWithdrawal({ source: 'efectivo', dates: isCurrentMonth ? [dayjs().format('YYYY-MM-DD')] : cashRegisters.map((r) => r.date), maxAmount: cashSummary?.efectivo?.net ?? 0 }) : null}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <SummaryCard
            icon={<CreditCardRoundedIcon />}
            title="MP / Posnet / Transferencia / Cuenta DNI"
            gross={cashSummary?.digital?.gross ?? 0}
            net={cashSummary?.digital?.net ?? 0}
            withdrawn={cashSummary?.digital?.withdrawn ?? 0}
            color="#1565C0"
            borderColor="#1E88E5"
            loading={loadingCash}
            onClick={isAdmin ? () => openWithdrawal({ source: 'digital', dates: isCurrentMonth ? [dayjs().format('YYYY-MM-DD')] : cashRegisters.map((r) => r.date), maxAmount: cashSummary?.digital?.net ?? 0 }) : null}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <SummaryCard
            icon={<DeliveryDiningRoundedIcon />}
            title="Rappi"
            gross={cashSummary?.rappi?.gross ?? 0}
            net={cashSummary?.rappi?.net ?? 0}
            withdrawn={cashSummary?.rappi?.withdrawn ?? 0}
            color="#E65100"
            borderColor="#FB8C00"
            loading={loadingCash}
            onClick={isAdmin ? () => openWithdrawal({ source: 'rappi', dates: isCurrentMonth ? [dayjs().format('YYYY-MM-DD')] : cashRegisters.map((r) => r.date), maxAmount: cashSummary?.rappi?.net ?? 0 }) : null}
          />
        </Grid>

        {/* ── Cajas grid ────────────────────────────────────────────────── */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PointOfSaleRoundedIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={700}>Cajas</Typography>
                  {selectedRows.size > 0 && (
                    <Chip
                      label={`${selectedRows.size} seleccionada${selectedRows.size > 1 ? 's' : ''} — ${CURRENCY_FORMAT.format(selectedEfectivo)} efectivo`}
                      size="small"
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  {selectedRows.size > 0 && isAdmin && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<MonetizationOnRoundedIcon />}
                      onClick={() => openWithdrawal({ source: 'efectivo', dates: selectedDates, maxAmount: selectedEfectivo })}
                      sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}
                    >
                      Retirar efectivo seleccionadas
                    </Button>
                  )}
                </Box>
              </Box>

              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 780 }} size="small">
                  <TableHead>
                    <TableRow>
                      {isAdmin && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            indeterminate={selectedRows.size > 0 && selectedRows.size < cashRegisters.length}
                            checked={cashRegisters.length > 0 && selectedRows.size === cashRegisters.length}
                            onChange={toggleAll}
                          />
                        </TableCell>
                      )}
                      <TableCell><Typography variant="caption" fontWeight={700}>Fecha</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" fontWeight={700}>Total del día</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" fontWeight={700} sx={{ color: '#2E7D32' }}>Efectivo</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" fontWeight={700} sx={{ color: '#1565C0' }}>MP / Posnet / Transf. / DNI</Typography></TableCell>
                      <TableCell align="right"><Typography variant="caption" fontWeight={700} sx={{ color: '#E65100' }}>Rappi</Typography></TableCell>
                      {isAdmin && <TableCell align="center"><Typography variant="caption" fontWeight={700}>Acción</Typography></TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingCash ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: isAdmin ? 7 : 5 }).map((_, j) => (
                            <TableCell key={j}><Skeleton /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : cashRegisters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 7 : 5} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No hay ventas registradas en este período.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      cashRegisters.map((row) => {
                        const isSelected = selectedRows.has(row.date);
                        const hasWithdrawals = row.withdrawals?.length > 0;
                        return (
                          <TableRow
                            key={row.date}
                            hover
                            selected={isSelected}
                            sx={{ '&.Mui-selected': { bgcolor: 'rgba(25,118,210,0.05)' } }}
                          >
                            {isAdmin && (
                              <TableCell padding="checkbox">
                                <Checkbox size="small" checked={isSelected} onChange={() => toggleRow(row.date)} />
                              </TableCell>
                            )}
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {dayjs(row.date).format('DD/MM/YYYY')}
                              </Typography>
                              {hasWithdrawals && (
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" mt={0.3}>
                                  {row.withdrawals.map((w) => (
                                    <Chip
                                      key={w.id}
                                      label={`-${CURRENCY_FORMAT.format(w.amount)} ${w.type === 'deuda_huevos' ? '🥚' : w.concept}`}
                                      size="small"
                                      sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(0,0,0,0.06)' }}
                                    />
                                  ))}
                                </Stack>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={800}>
                                {CURRENCY_FORMAT.format(row.total)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600} color={row.efectivo > 0 ? '#2E7D32' : 'text.disabled'}>
                                {row.efectivo > 0 ? CURRENCY_FORMAT.format(row.efectivo) : '—'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600} color={row.digital > 0 ? '#1565C0' : 'text.disabled'}>
                                {row.digital > 0 ? CURRENCY_FORMAT.format(row.digital) : '—'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600} color={row.rappi > 0 ? '#E65100' : 'text.disabled'}>
                                {row.rappi > 0 ? CURRENCY_FORMAT.format(row.rappi) : '—'}
                              </Typography>
                            </TableCell>
                            {isAdmin && (
                              <TableCell align="center">
                                <Tooltip title="Retirar efectivo">
                                  <IconButton
                                    size="small"
                                    onClick={() => openWithdrawal({ source: 'efectivo', dates: [row.date], maxAmount: row.efectivo })}
                                    sx={{ color: '#2E7D32' }}
                                  >
                                    <MonetizationOnRoundedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                    {/* Totals row */}
                    {cashRegisters.length > 0 && !loadingCash && (
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        {isAdmin && <TableCell padding="checkbox" />}
                        <TableCell>
                          <Typography variant="caption" fontWeight={700} color="text.secondary">TOTAL DEL MES</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={800}>
                            {CURRENCY_FORMAT.format(cashRegisters.reduce((acc, r) => acc + r.total, 0))}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700} color="#2E7D32">
                            {CURRENCY_FORMAT.format(cashRegisters.reduce((acc, r) => acc + r.efectivo, 0))}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700} color="#1565C0">
                            {CURRENCY_FORMAT.format(cashRegisters.reduce((acc, r) => acc + r.digital, 0))}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700} color="#E65100">
                            {CURRENCY_FORMAT.format(cashRegisters.reduce((acc, r) => acc + r.rappi, 0))}
                          </Typography>
                        </TableCell>
                        {isAdmin && <TableCell />}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Purchases + Products tabs ──────────────────────────────────── */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                <Tab icon={<ShoppingBagRoundedIcon fontSize="small" />} iconPosition="start" label="Historial de Compras" sx={{ fontWeight: 600, minHeight: 52 }} />
                <Tab icon={<InventoryRoundedIcon fontSize="small" />} iconPosition="start" label={`Productos Cargados${genericProducts.length ? ` (${genericProducts.length})` : ''}`} sx={{ fontWeight: 600, minHeight: 52 }} />
              </Tabs>
            </Box>

            {/* Tab 0: Purchase history */}
            {activeTab === 0 && (
              <CardContent sx={{ p: 0 }}>
                <TableContainer sx={{ overflowX: 'auto' }}>
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
                      {loadingPurchases ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: isSuperAdmin ? 9 : 8 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                          </TableRow>
                        ))
                      ) : purchases.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isSuperAdmin ? 9 : 8} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">No hay compras registradas</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        purchases.map((purchase) => {
                          const qty = parseFloat(purchase.quantity) || 0;
                          const isEgg = Boolean(purchase.categoryId);
                          const eggs = isEgg ? qty * (purchase.category?.eggsPerCrate || 360) : null;
                          return (
                            <TableRow key={purchase.id} hover>
                              <TableCell><Typography variant="body2" fontWeight={600}>{dayjs(purchase.purchaseDate).format('DD/MM/YYYY')}</Typography></TableCell>
                              <TableCell><Typography variant="body2" fontWeight={600} color="#2D6A4F">{purchase.category?.name || purchase.product?.name || '—'}</Typography></TableCell>
                              <TableCell><Chip label={purchase.provider || 'Sin Especificar'} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem' }} /></TableCell>
                              <TableCell align="center"><Typography variant="body2" fontWeight={800}>{qty}{isEgg ? ' caj.' : ' u.'}</Typography></TableCell>
                              <TableCell align="center">{eggs != null ? <Typography variant="body2" fontWeight={600}>{eggs}</Typography> : <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                              <TableCell align="right"><Typography variant="body2">{CURRENCY_FORMAT.format(purchase.cost)}</Typography></TableCell>
                              <TableCell align="right"><Typography variant="body2" fontWeight={800} color="#C62828">-{CURRENCY_FORMAT.format(parseFloat(purchase.cost) * qty)}</Typography></TableCell>
                              <TableCell align="center">
                                {purchase.hasReceipt ? (
                                  <Tooltip title="Ver comprobante"><IconButton size="small" onClick={() => handleViewReceipt(purchase.id)} sx={{ color: '#2D6A4F' }}><ReceiptLongRoundedIcon fontSize="small" /></IconButton></Tooltip>
                                ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                              </TableCell>
                              {isSuperAdmin && (
                                <TableCell align="center">
                                  <Tooltip title="Editar"><IconButton size="small" onClick={() => handleEditPurchase(purchase)} sx={{ color: '#1565C0' }}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
                                  <Tooltip title="Eliminar"><IconButton size="small" onClick={() => handleDeletePurchase(purchase)} sx={{ color: '#C62828' }}><DeleteRoundedIcon fontSize="small" /></IconButton></Tooltip>
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

            {/* Tab 1: Loaded products */}
            {activeTab === 1 && (
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      size="small"
                      placeholder="Buscar producto..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
                        endAdornment: productSearch ? <InputAdornment position="end"><IconButton size="small" onClick={() => setProductSearch('')}><CloseRoundedIcon fontSize="small" /></IconButton></InputAdornment> : null,
                      }}
                      sx={{ width: { xs: '100%', sm: 340 } }}
                    />
                    <Typography variant="caption" color="text.secondary">{filteredProducts.length} de {genericProducts.length}</Typography>
                  </Box>
                  {isAdmin && genericProducts.length > 0 && (
                    <Button variant="outlined" color="error" size="small" startIcon={<DeleteRoundedIcon />} onClick={handleDeleteAllProducts} sx={{ ml: 'auto' }}>
                      Eliminar todos
                    </Button>
                  )}
                </Box>
                <TableContainer sx={{ overflowX: 'auto' }}>
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
                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><Typography variant="body2" color="text.secondary">No hay productos. Usá "Cargar Productos" para importar desde Excel.</Typography></TableCell></TableRow>
                      ) : filteredProducts.length === 0 ? (
                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><Typography variant="body2" color="text.secondary">Sin resultados para "{productSearch}"</Typography></TableCell></TableRow>
                      ) : (
                        filteredProducts.map((product) => {
                          const isEditing = editingId === product.id;
                          const isSaving = savingId === product.id;
                          return (
                            <TableRow key={product.id} hover>
                              <TableCell>
                                {isEditing ? (
                                  <TextField value={editingName} onChange={(e) => setEditingName(e.target.value)} size="small" autoFocus
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveProductName(product.id); if (e.key === 'Escape') handleCancelEdit(); }}
                                    sx={{ minWidth: 220 }} />
                                ) : <Typography variant="body2" fontWeight={500}>{product.name}</Typography>}
                              </TableCell>
                              <TableCell align="right"><Typography variant="body2">{CURRENCY_FORMAT.format(product.unitPrice)}</Typography></TableCell>
                              <TableCell align="right"><Typography variant="body2" fontWeight={600}>{parseFloat(product.stockQuantity || 0).toFixed(0)} u.</Typography></TableCell>
                              {isAdmin && (
                                <TableCell align="center">
                                  {isEditing ? (
                                    <>
                                      <Tooltip title="Guardar"><span><IconButton size="small" onClick={() => handleSaveProductName(product.id)} disabled={isSaving || !editingName.trim()} sx={{ color: '#2D6A4F' }}>{isSaving ? <CircularProgress size={16} /> : <SaveRoundedIcon fontSize="small" />}</IconButton></span></Tooltip>
                                      <Tooltip title="Cancelar"><IconButton size="small" onClick={handleCancelEdit} sx={{ color: 'text.secondary' }}><CloseRoundedIcon fontSize="small" /></IconButton></Tooltip>
                                    </>
                                  ) : (
                                    <>
                                      <Tooltip title="Editar nombre"><IconButton size="small" onClick={() => handleStartEdit(product)} sx={{ color: '#1565C0' }}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
                                      <Tooltip title="Eliminar"><IconButton size="small" onClick={() => handleDeleteProduct(product)} sx={{ color: '#C62828' }}><DeleteRoundedIcon fontSize="small" /></IconButton></Tooltip>
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
        </Grid>
      </Grid>

      {/* Modals */}
      <PurchaseModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={handlePurchaseSuccess} categories={categoriesCache} products={productsCache} />
      <EditPurchaseModal open={editModalOpen} onClose={() => { setEditModalOpen(false); setSelectedPurchase(null); }} onSuccess={handleEditSuccess} purchase={selectedPurchase} />

      {withdrawalModal && (
        <WithdrawalModal
          open={Boolean(withdrawalModal)}
          onClose={() => setWithdrawalModal(null)}
          onSuccess={() => { setWithdrawalModal(null); fetchCash(selectedYM); }}
          source={withdrawalModal.source}
          dates={withdrawalModal.dates}
          maxAmount={withdrawalModal.maxAmount}
          onSubmit={handleWithdrawalSubmit}
        />
      )}
    </Box>
  );
};

export default PurchasesPage;
