import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Skeleton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
} from '@mui/material';
import { PieChart, pieArcLabelClasses } from '@mui/x-charts/PieChart';
import { useDrawingArea } from '@mui/x-charts/hooks';
import { styled } from '@mui/material/styles';
import api from '../services/api';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InsertChartRoundedIcon from '@mui/icons-material/InsertChartRounded';
import { showErrorAlert } from '../utils/sweetAlert';

const curMonthName = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' });
const prevDate = new Date();
prevDate.setMonth(prevDate.getMonth() - 1);
const prevMonthName = prevDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

// Paleta de colores armoniosa para los productos
const PRODUCT_COLORS = [
  '#2D6A4F',
  '#40916C',
  '#52B788',
  '#74C69D',
  '#95D5B2',
  '#B7E4C7',
  '#D8F3DC',
  '#1B4332',
  '#081C15',
  '#A7C957',
];

// Genera un color con opacidad para el anillo exterior
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Texto central del PieChart
const StyledText = styled('text')(({ theme }) => ({
  fill: theme.palette.text.primary,
  textAnchor: 'middle',
  dominantBaseline: 'central',
  fontSize: 18,
  fontWeight: 700,
}));

function PieCenterLabel({ children }) {
  const { width, height, left, top } = useDrawingArea();
  return (
    <StyledText x={left + width / 2} y={top + height / 2}>
      {children}
    </StyledText>
  );
}

/**
 * Transforma el array de productos [{name, totalSold}] en datos para un PieChart doble anillo.
 * - Anillo interno: cada producto con su porcentaje del total.
 * - Anillo externo: unidades vendidas de cada producto con label.
 */
const buildPieData = (topProducts) => {
  const totalUnits = topProducts.reduce((acc, p) => acc + p.totalSold, 0);

  const innerData = topProducts.map((p, i) => ({
    id: p.name,
    label: p.name,
    value: p.totalSold,
    percentage: totalUnits > 0 ? (p.totalSold / totalUnits) * 100 : 0,
    color: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
  }));

  const outerData = topProducts.map((p, i) => ({
    id: `outer-${p.name}`,
    label: p.name,
    value: p.totalSold,
    percentage: totalUnits > 0 ? (p.totalSold / totalUnits) * 100 : 0,
    color: hexToRgba(PRODUCT_COLORS[i % PRODUCT_COLORS.length], 0.55),
  }));

  return { innerData, outerData, totalUnits };
};

const INNER_RADIUS = 45;
const MIDDLE_RADIUS = 110;
const OUTER_EXTRA = 22;

const TopProductsPieChart = ({ products, totalUnits }) => {
  const { innerData, outerData } = buildPieData(products);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: 380 }}>
      <PieChart
        series={[
          {
            innerRadius: INNER_RADIUS,
            outerRadius: MIDDLE_RADIUS,
            data: innerData,
            arcLabel: (item) =>
              item.percentage >= 4 // Bajamos de 8% a 4%
                ? `${item.percentage.toFixed(0)}%`
                : '',
            valueFormatter: ({ value }) =>
              `${value} de ${totalUnits} unidades (${((value / totalUnits) * 100).toFixed(1)}%)`,
            highlightScope: { fade: 'global', highlight: 'item' },
            highlighted: { additionalRadius: 3 },
            cornerRadius: 3,
          },
          {
            innerRadius: MIDDLE_RADIUS + 2,
            outerRadius: MIDDLE_RADIUS + OUTER_EXTRA,
            data: outerData,
            arcLabel: (item) =>
              item.percentage >= 3 // Bajamos de 12% a 3% para que aparezcan casi todos
                ? `${item.label}`
                : '',
            arcLabelRadius: MIDDLE_RADIUS + OUTER_EXTRA + 35, // Alegramos un poco más (de 30 a 35)
            valueFormatter: ({ value }) =>
              `${value} unidades`,
            highlightScope: { fade: 'global', highlight: 'item' },
            highlighted: { additionalRadius: 3 },
            cornerRadius: 3,
          },
        ]}
        sx={{
          [`& .${pieArcLabelClasses.root}`]: {
            fontSize: '11px',
            fontWeight: 600,
          },
        }}
        hideLegend
      >
        <PieCenterLabel>{totalUnits} uds</PieCenterLabel>
      </PieChart>
    </Box>
  );
};

// Leyenda personalizada debajo del chart
const PieLegend = ({ products }) => {
  const totalUnits = products.reduce((acc, p) => acc + p.totalSold, 0);

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        justifyContent: 'center',
        mt: 1,
        px: 1,
      }}
    >
      {products.map((p, i) => {
        const pct = totalUnits > 0 ? ((p.totalSold / totalUnits) * 100).toFixed(1) : 0;
        return (
          <Box
            key={p.name}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.3,
              borderRadius: 2,
              backgroundColor: hexToRgba(PRODUCT_COLORS[i % PRODUCT_COLORS.length], 0.08),
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
              {p.name}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.7rem', color: 'text.secondary' }}>
              {p.totalSold} ({pct}%)
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

const MetricsPage = () => {
  const [metrics, setMetrics] = useState({
    currentMonthTop: [],
    previousMonthTop: [],
    lowStockProducts: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/metrics');
      setMetrics(data.data);
    } catch {
      showErrorAlert('Error', 'Error al cargar las métricas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const curTotal = metrics.currentMonthTop.reduce((acc, p) => acc + p.totalSold, 0);
  const prevTotal = metrics.previousMonthTop.reduce((acc, p) => acc + p.totalSold, 0);

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
        {/* Current Month Pie Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0px 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                <InsertChartRoundedIcon sx={{ color: '#2D6A4F' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Top 10 vendidos ({curMonthName})</Typography>
              </Box>
              {loading ? (
                <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 2 }} />
              ) : metrics.currentMonthTop.length === 0 ? (
                <Box sx={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No hay ventas registradas este mes.</Typography>
                </Box>
              ) : (
                <>
                  <TopProductsPieChart
                    products={metrics.currentMonthTop}
                    totalUnits={curTotal}
                  />
                  <PieLegend products={metrics.currentMonthTop} />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Previous Month Pie Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0px 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                <InsertChartRoundedIcon sx={{ color: '#40916C' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Top 10 vendidos ({prevMonthName})</Typography>
              </Box>
              {loading ? (
                <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 2 }} />
              ) : metrics.previousMonthTop.length === 0 ? (
                <Box sx={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No hay ventas registradas el mes pasado.</Typography>
                </Box>
              ) : (
                <>
                  <TopProductsPieChart
                    products={metrics.previousMonthTop}
                    totalUnits={prevTotal}
                  />
                  <PieLegend products={metrics.previousMonthTop} />
                </>
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
    </Box>
  );
};

export default MetricsPage;
