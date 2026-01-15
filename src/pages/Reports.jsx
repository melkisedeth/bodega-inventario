import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  GridOn as ExcelIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { productsService, movementsService } from '../services/productsService';
import { format, subDays } from 'date-fns';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [reportData, setReportData] = useState({
    inventorySummary: [],
    movementSummary: [],
    neverMovedProducts: [],
    metrics: {
      totalProducts: 0,
      totalValue: 0,
      totalMovements: 0,
      avgDailyMovements: 0
    }
  });

  useEffect(() => {
    loadReportData();
  }, [startDate, endDate]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      const [products, movements] = await Promise.all([
        productsService.getAllProducts(),
        movementsService.getAllMovements(startDate, endDate)
      ]);

      // Calcular métricas
      const totalProducts = products.length;
      const totalValue = products.reduce((sum, product) => 
        sum + (product.currentQuantity * (product.unitPrice || 0)), 0);
      const totalMovements = movements.length;
      
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;
      const avgDailyMovements = totalMovements / daysDiff;

      // Productos nunca movidos
      const movedProductIds = [...new Set(movements.map(m => m.productId))];
      const neverMovedProducts = products.filter(
        product => !movedProductIds.includes(product.id)
      );

      // Resumen por departamento
      const departmentSummary = products.reduce((acc, product) => {
        const dept = product.department || 'Sin Departamento';
        if (!acc[dept]) {
          acc[dept] = {
            count: 0,
            totalQuantity: 0,
            totalValue: 0,
            lowStock: 0
          };
        }
        acc[dept].count++;
        acc[dept].totalQuantity += product.currentQuantity;
        acc[dept].totalValue += product.currentQuantity * (product.unitPrice || 0);
        
        if (product.minQuantity && product.currentQuantity <= product.minQuantity) {
          acc[dept].lowStock++;
        }
        
        return acc;
      }, {});

      // Resumen de movimientos
      const movementSummary = movements.reduce((acc, movement) => {
        const date = format(movement.timestamp.toDate(), 'yyyy-MM-dd');
        if (!acc[date]) {
          acc[date] = {
            date,
            entries: 0,
            exits: 0,
            adjustments: 0,
            total: 0
          };
        }
        
        switch (movement.type) {
          case 'entrada':
            acc[date].entries++;
            break;
          case 'salida':
            acc[date].exits++;
            break;
          case 'ajuste':
            acc[date].adjustments++;
            break;
        }
        acc[date].total++;
        
        return acc;
      }, {});

      setReportData({
        inventorySummary: Object.entries(departmentSummary).map(([dept, data]) => ({
          department: dept,
          ...data
        })),
        movementSummary: Object.values(movementSummary).sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        ),
        neverMovedProducts: neverMovedProducts.slice(0, 10),
        metrics: {
          totalProducts,
          totalValue,
          totalMovements,
          avgDailyMovements: parseFloat(avgDailyMovements.toFixed(2))
        }
      });

    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    // Implementar exportación a PDF
    console.log('Exportar a PDF');
  };

  const handleExportExcel = () => {
    // Implementar exportación a Excel
    console.log('Exportar a Excel');
  };

  if (loading) {
    return (
      <Container>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Container maxWidth="xl">
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h1">
              Reportes
            </Typography>
            <Box>
              <Tooltip title="Exportar a PDF">
                <IconButton onClick={handleExportPDF} sx={{ mr: 1 }}>
                  <PdfIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Exportar a Excel">
                <IconButton onClick={handleExportExcel} sx={{ mr: 1 }}>
                  <ExcelIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Actualizar">
                <IconButton onClick={loadReportData}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Filtros de fecha */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Fecha Inicio"
                  value={startDate}
                  onChange={setStartDate}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Fecha Fin"
                  value={endDate}
                  onChange={setEndDate}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setStartDate(subDays(new Date(), 7));
                      setEndDate(new Date());
                    }}
                  >
                    Últimos 7 días
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setStartDate(subDays(new Date(), 30));
                      setEndDate(new Date());
                    }}
                  >
                    Últimos 30 días
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      const today = new Date();
                      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                      setStartDate(firstDay);
                      setEndDate(today);
                    }}
                  >
                    Este mes
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Métricas rápidas */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Productos
                  </Typography>
                  <Typography variant="h4" component="div">
                    {reportData.metrics.totalProducts}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              {/* <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Valor Total
                  </Typography>
                  <Typography variant="h4" component="div">
                    ${reportData.metrics.totalValue.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card> */}
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Movimientos
                  </Typography>
                  <Typography variant="h4" component="div">
                    {reportData.metrics.totalMovements}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Promedio Diario
                  </Typography>
                  <Typography variant="h4" component="div">
                    {reportData.metrics.avgDailyMovements}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Reporte de inventario por departamento */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Inventario por Departamento
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Departamento</TableCell>
                    <TableCell align="right">Productos</TableCell>
                    <TableCell align="right">Cantidad Total</TableCell>
                    <TableCell align="right">Valor Total</TableCell>
                    <TableCell align="right">Bajo Stock</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.inventorySummary.map((row) => (
                    <TableRow key={row.department}>
                      <TableCell>{row.department}</TableCell>
                      <TableCell align="right">{row.count}</TableCell>
                      <TableCell align="right">{row.totalQuantity.toLocaleString()}</TableCell>
                      <TableCell align="right">${row.totalValue.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        {row.lowStock > 0 ? (
                          <Chip 
                            label={row.lowStock} 
                            color="error" 
                            size="small" 
                          />
                        ) : (
                          '0'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Grid container spacing={3}>
            {/* Resumen de movimientos */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Resumen de Movimientos
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell align="right">Entradas</TableCell>
                        <TableCell align="right">Salidas</TableCell>
                        <TableCell align="right">Ajustes</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.movementSummary.slice(0, 10).map((row) => (
                        <TableRow key={row.date}>
                          <TableCell>
                            {format(new Date(row.date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={row.entries} 
                              color="success" 
                              size="small" 
                              icon={<TrendingUpIcon />}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={row.exits} 
                              color="error" 
                              size="small" 
                              icon={<TrendingDownIcon />}
                            />
                          </TableCell>
                          <TableCell align="right">{row.adjustments}</TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              {row.total}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Productos nunca movidos */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Productos Sin Movimientos
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Código</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell align="right">Cantidad</TableCell>
                        <TableCell>Departamento</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.neverMovedProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.code}</TableCell>
                          <TableCell>{product.description}</TableCell>
                          <TableCell align="right">
                            {product.currentQuantity} {product.unit}
                          </TableCell>
                          <TableCell>{product.department}</TableCell>
                        </TableRow>
                      ))}
                      {reportData.neverMovedProducts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography variant="body2" color="text.secondary">
                              Todos los productos tienen movimientos
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </LocalizationProvider>
  );
};

export default Reports;