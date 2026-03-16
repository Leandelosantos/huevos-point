import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import AddShoppingCartRoundedIcon from '@mui/icons-material/AddShoppingCartRounded';
import RemoveShoppingCartRoundedIcon from '@mui/icons-material/RemoveShoppingCartRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import SaleModal from '../components/sales/SaleModal';
import ExpenseModal from '../components/expenses/ExpenseModal';
import { showErrorAlert, showErrorToast, showSuccessToast } from '../utils/sweetAlert';

const CURRENCY_FORMAT = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

const DashboardPage = () => {
  const { isAdmin, activeTenant } = useAuth();
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/dashboard/summary?date=${selectedDate}`);
      setSummary(data.data.summary);
      setMovements(data.data.movements);
    } catch {
      showErrorToast('Error al cargar el resumen del día');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleSaleSuccess = () => {
    setSaleModalOpen(false);
    showSuccessToast('Venta registrada exitosamente');
    fetchDashboard();
  };

  const handleExpenseSuccess = () => {
    setExpenseModalOpen(false);
    showSuccessToast('Egreso registrado exitosamente');
    fetchDashboard();
  };

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Movimientos');
      const formattedDate = dayjs(selectedDate).format('DD/MM/YYYY');

      // Title
      worksheet.mergeCells('A1:E1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `Movimientos del día ${formattedDate}`;
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 40;

      // Headers
      const headers = ['Hora', 'Tipo/Concepto', 'Detalle de productos', 'Medio de pago', 'Monto de desc.', 'Importe'];
      const headerRow = worksheet.addRow(headers);
      
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, size: 16 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F5E9' } // Light green background (MUI green 50ish equivalent)
        };
      });
      worksheet.getRow(2).height = 30;

      // Column widths
      worksheet.columns = [
        { width: 15 }, // Hora
        { width: 30 }, // Tipo/Concepto
        { width: 50 }, // Detalle de productos
        { width: 25 }, // Medio de pago
        { width: 20 }, // Monto de desc.
        { width: 20 }, // Importe
      ];

      // Data Rows
      movements.forEach((mov) => {
        let detalleText = mov.description;
        if (mov.details && mov.details.length > 0) {
          detalleText = mov.details.map(d => `${d.productName} x${d.quantity}${d.discount > 0 ? ` (-${d.discount}%)` : ''}`).join('\n');
        }

        const row = worksheet.addRow([
          dayjs(mov.createdAt).format('HH:mm'),
          mov.type === 'VENTA' ? 'Venta' : `Egreso: ${mov.description}`,
          mov.type === 'VENTA' ? detalleText : 'N/A',
          mov.paymentMethod || 'N/A',
          mov.discountAmount || 0,
          mov.amount
        ]);

        row.eachCell((cell, colNumber) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          if (colNumber === 5 || colNumber === 6) {
            cell.numFmt = '"$"#,##0.00';
          }
        });
      });

      // Write & Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `movimientos_${selectedDate}.xlsx`);
    } catch (err) {
      console.error(err);
      showErrorAlert('Error', 'Error exportando a Excel');
    }
  };

  const summaryCards = [
    {
      label: 'Ingresos del día',
      value: summary?.totalIncome || 0,
      icon: <TrendingUpRoundedIcon />,
      color: '#2D6A4F',
      bgGradient: 'linear-gradient(135deg, #D8F3DC 0%, #B7E4C7 100%)',
      iconBg: '#2D6A4F',
    },
    {
      label: 'Egresos del día',
      value: summary?.totalExpenses || 0,
      icon: <TrendingDownRoundedIcon />,
      color: '#C62828',
      bgGradient: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)',
      iconBg: '#C62828',
    },
    {
      label: 'Saldo neto',
      value: summary?.netBalance || 0,
      icon: <AccountBalanceWalletRoundedIcon />,
      color: (summary?.netBalance || 0) >= 0 ? '#2D6A4F' : '#C62828',
      bgGradient:
        (summary?.netBalance || 0) >= 0
          ? 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)'
          : 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
      iconBg: (summary?.netBalance || 0) >= 0 ? '#2D6A4F' : '#E65100',
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, overflow: 'hidden' }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Dashboard {activeTenant ? `${activeTenant.name}` : ''}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Control de caja general
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
          <TextField
            type="date"
            label="Fecha de movimientos"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: dayjs().format('YYYY-MM-DD') }}
            sx={{ width: { xs: '100%', sm: 180 }, bgcolor: 'background.paper', mb: { xs: 1, sm: 0 } }}
          />
          {isAdmin && (
            <Button
              variant="outlined"
              startIcon={<DownloadRoundedIcon />}
              onClick={exportToExcel}
              disabled={loading || movements.length === 0}
              sx={{ color: '#2D6A4F', borderColor: '#2D6A4F' }}
            >
              Exportar a Excel
            </Button>
          )}
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4, width: '100%', m: 0, p: 0 }}>
        {summaryCards.map((card) => (
          <Grid item xs={12} sm={4} key={card.label} sx={{ pl: { xs: 0, sm: 3 }, pt: { xs: 2, sm: 3 } }}>
            <Card
              sx={{
                background: card.bgGradient,
                border: 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Decorative circle */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.3)',
                }}
              />
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ color: card.color, fontWeight: 600, mb: 1, opacity: 0.8 }}
                    >
                      {card.label}
                    </Typography>
                    {loading ? (
                      <Skeleton width={120} height={40} />
                    ) : (
                      <Typography
                        variant="h3"
                        sx={{
                          color: card.color,
                          fontWeight: 800,
                          fontSize: { xs: '1.5rem', sm: '1.75rem' },
                        }}
                      >
                        {CURRENCY_FORMAT.format(card.value)}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '14px',
                      backgroundColor: card.iconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Payment Method Breakdown */}
      {!loading && movements.some((m) => m.type === 'VENTA') && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1.5 }}>
            Ventas por medio de pago
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {Object.entries(
              movements
                .filter((m) => m.type === 'VENTA')
                .reduce((acc, m) => {
                  acc[m.paymentMethod] = (acc[m.paymentMethod] || 0) + m.amount;
                  return acc;
                }, {})
            ).map(([method, total]) => (
              <Box
                key={method}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
                  border: '1px solid rgba(45, 106, 79, 0.15)',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#2D6A4F' }}>
                  {method}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#2D6A4F' }}>
                  {CURRENCY_FORMAT.format(total)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Action Buttons */}
      <Grid container spacing={2} sx={{ mb: 4, width: '100%', m: 0 }}>
        <Grid item xs={12} sm={6} sx={{ pl: { xs: 0, sm: 2 }, pt: { xs: 2, sm: 2 } }}>
          <Button
            id="btn-register-sale"
            variant="contained"
            size="large"
            fullWidth
            startIcon={<AddShoppingCartRoundedIcon />}
            onClick={() => setSaleModalOpen(true)}
            sx={{
              py: 2,
              fontSize: '1rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
              },
            }}
          >
            Registrar Venta
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} sx={{ pl: { xs: 0, sm: 2 }, pt: { xs: 2, sm: 2 } }}>
          <Button
            id="btn-register-expense"
            variant="outlined"
            size="large"
            fullWidth
            startIcon={<RemoveShoppingCartRoundedIcon />}
            onClick={() => setExpenseModalOpen(true)}
            sx={{
              py: 2,
              fontSize: '1rem',
              fontWeight: 700,
              borderWidth: 2,
              borderColor: '#2D6A4F',
              color: '#2D6A4F',
              '&:hover': {
                borderWidth: 2,
                backgroundColor: 'rgba(45, 106, 79, 0.04)',
              },
            }}
          >
            Registrar Egreso
          </Button>
        </Grid>
      </Grid>

      {/* Movements list */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLongRoundedIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Movimientos del día
            </Typography>
          </Box>

              <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
              <Table sx={{ minWidth: { xs: 700, md: '100%' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Hora</TableCell>
                    <TableCell>Tipo/Concepto</TableCell>
                    <TableCell>Detalle de productos</TableCell>
                    <TableCell>Medio de pago</TableCell>
                    <TableCell align="right">Monto desc.</TableCell>
                    <TableCell align="right">Importe</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No hay movimientos registrados hoy
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.map((mov) => (
                      <TableRow key={`${mov.type}-${mov.id}`} hover>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {dayjs(mov.createdAt).format('HH:mm')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={mov.type}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.65rem',
                                backgroundColor: mov.type === 'VENTA' ? 'rgba(45, 106, 79, 0.1)' : 'rgba(198, 40, 40, 0.1)',
                                color: mov.type === 'VENTA' ? '#2D6A4F' : '#C62828',
                              }}
                            />
                            {mov.type === 'EGRESO' && (
                              <Typography variant="body2" sx={{ maxWidth: 150 }} noWrap>
                                {mov.description}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {mov.type === 'VENTA' ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                              {mov.details?.map((d, index) => (
                                <Box key={index}>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', justifyContent: 'space-between', width: '100%', minWidth: 220 }}>
                                    <span>
                                      {d.productName}
                                      {d.discount > 0 && (
                                        <span style={{ color: '#2D6A4F', fontWeight: 700, marginLeft: 6 }}>
                                          -{d.discount}%
                                        </span>
                                      )}
                                    </span>
                                    <span style={{ fontWeight: 600, marginLeft: 8 }}>x{d.quantity}</span>
                                  </Typography>
                                  {d.discount > 0 && d.discountConcept && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        color: 'warning.dark',
                                        fontStyle: 'italic',
                                        fontWeight: 500,
                                        pl: 0.5,
                                        mt: 0.25,
                                      }}
                                    >
                                      🏷 {d.discountConcept}
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {mov.paymentMethod || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: mov.discountAmount > 0 ? '#C62828' : 'text.disabled' }}>
                            {mov.discountAmount > 0 ? `-${CURRENCY_FORMAT.format(mov.discountAmount)}` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 800,
                              color: mov.type === 'VENTA' ? '#2D6A4F' : '#C62828',
                            }}
                          >
                            {mov.type === 'VENTA' ? '+' : '-'}
                            {CURRENCY_FORMAT.format(mov.amount)}
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

      {/* Modals */}
      <SaleModal
        open={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        onSuccess={handleSaleSuccess}
      />
      <ExpenseModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSuccess={handleExpenseSuccess}
      />
    </Box>
  );
};

export default DashboardPage;
