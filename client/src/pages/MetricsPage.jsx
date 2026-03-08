import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import api from '../services/api';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InsertChartRoundedIcon from '@mui/icons-material/InsertChartRounded';

const curMonthName = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' });
const prevDate = new Date();
prevDate.setMonth(prevDate.getMonth() - 1);
const prevMonthName = prevDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

const MetricsPage = () => {
  const [metrics, setMetrics] = useState({
    currentMonthTop: [],
    previousMonthTop: [],
    lowStockProducts: [],
  });
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/metrics');
      setMetrics(data.data);
    } catch {
      setSnackbar({ open: true, message: 'Error al cargar las métricas', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
          Métricas
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Análisis de ventas y estado del inventario
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Current Month Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0px 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                <InsertChartRoundedIcon sx={{ color: '#2D6A4F' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Top 10 vendidos ({curMonthName})</Typography>
              </Box>
              {loading ? (
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
              ) : metrics.currentMonthTop.length === 0 ? (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No hay ventas registradas este mes.</Typography>
                </Box>
              ) : (
                <Box sx={{ width: '100%' }}>
                  <BarChart
                    height={320}
                    dataset={metrics.currentMonthTop}
                    xAxis={[{ 
                      scaleType: 'band', 
                      dataKey: 'name',
                      tickLabelStyle: { 
                        angle: -25, 
                        textAnchor: 'end',
                        fontSize: 11
                      }
                    }]}
                    series={[{ 
                      dataKey: 'totalSold', 
                      label: 'Unidades Vendidas', 
                      color: '#52B788' 
                    }]}
                    margin={{ top: 20, bottom: 90, left: 40, right: 20 }}
                    slotProps={{
                      legend: { hidden: true }
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Previous Month Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0px 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                <InsertChartRoundedIcon sx={{ color: '#40916C' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Top 10 vendidos ({prevMonthName})</Typography>
              </Box>
              {loading ? (
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
              ) : metrics.previousMonthTop.length === 0 ? (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No hay ventas registradas el mes pasado.</Typography>
                </Box>
              ) : (
                <Box sx={{ width: '100%' }}>
                  <BarChart
                    height={320}
                    dataset={metrics.previousMonthTop}
                    xAxis={[{ 
                      scaleType: 'band', 
                      dataKey: 'name',
                      tickLabelStyle: { 
                        angle: -25, 
                        textAnchor: 'end',
                        fontSize: 11
                      }
                    }]}
                    series={[{ 
                      dataKey: 'totalSold', 
                      label: 'Unidades Vendidas', 
                      color: '#74C69D' 
                    }]}
                    margin={{ top: 20, bottom: 90, left: 40, right: 20 }}
                    slotProps={{
                      legend: { hidden: true }
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Low Stock Watchlist */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                <WarningAmberRoundedIcon sx={{ color: '#E63946' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Alerta de Stock (Menos de 30 unidades)</Typography>
              </Box>
              {loading ? (
                <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
              ) : (
                <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                  <List disablePadding>
                    {metrics.lowStockProducts.length === 0 ? (
                      <ListItem>
                        <ListItemText primary="Todos los productos tienen un stock saludable." />
                      </ListItem>
                    ) : (
                      metrics.lowStockProducts.map((p, index) => (
                        <React.Fragment key={p.id}>
                          <ListItem>
                            <ListItemText 
                              primary={
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {p.name}
                                </Typography>
                              } 
                            />
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 800, 
                                color: p.stockQuantity === 0 ? '#C62828' : '#D84315',
                                backgroundColor: p.stockQuantity === 0 ? 'rgba(198, 40, 40, 0.1)' : 'rgba(216, 67, 21, 0.1)',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 5
                              }}
                            >
                              Stock actual: {p.stockQuantity}
                            </Typography>
                          </ListItem>
                          {index < metrics.lowStockProducts.length - 1 && <Divider component="li" />}
                        </React.Fragment>
                      ))
                    )}
                  </List>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MetricsPage;
