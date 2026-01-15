import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Container,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  IconButton
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CompareArrows as MovementsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { productsService, movementsService } from '../services/productsService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Dashboard = () => {
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    todayMovements: 0
  });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Obtener todos los productos
      const products = await productsService.getAllProducts();
      
      // Calcular métricas
      const totalProducts = products.length;
      const totalValue = products.reduce((sum, product) => {
        return sum + (product.currentQuantity * (product.unitPrice || 0));
      }, 0);
      
      const lowStockProductsList = await productsService.getLowStockProducts();
      const lowStockCount = lowStockProductsList.length;
      
      // Obtener movimientos de hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const movements = await movementsService.getAllMovements(today, tomorrow);
      const todayMovements = movements.length;
      
      setMetrics({
        totalProducts,
        totalValue,
        lowStockCount,
        todayMovements
      });
      
      setLowStockProducts(lowStockProductsList.slice(0, 5));
      setRecentMovements(movements.slice(0, 10));
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    {
      title: 'Total Productos',
      value: metrics.totalProducts,
      icon: <InventoryIcon />,
      color: '#1976d2',
      description: 'Productos en inventario'
    },
    {
      title: 'Valor Total',
      value: `$${metrics.totalValue.toLocaleString()}`,
      icon: <TrendingUpIcon />,
      color: '#2e7d32',
      description: 'Valor estimado del inventario'
    },
    {
      title: 'Productos Bajos',
      value: metrics.lowStockCount,
      icon: <WarningIcon />,
      color: '#ed6c02',
      description: 'Necesitan reabastecimiento'
    },
    {
      title: 'Movimientos Hoy',
      value: metrics.todayMovements,
      icon: <MovementsIcon />,
      color: '#9c27b0',
      description: 'Registros del día'
    }
  ];

  const movementColumns = [
    { field: 'productCode', headerName: 'Producto', width: 150 },
    { field: 'type', headerName: 'Tipo', width: 120 },
    { field: 'previousQuantity', headerName: 'Cant. Anterior', width: 130 },
    { field: 'newQuantity', headerName: 'Nueva Cant.', width: 130 },
    { field: 'difference', headerName: 'Diferencia', width: 120 },
    { 
      field: 'timestamp', 
      headerName: 'Fecha/Hora', 
      width: 180,
      valueFormatter: (params) => {
        if (!params.value) return 'N/A';
        try {
          const date = params.value.toDate ? params.value.toDate() : new Date(params.value);
          return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
        } catch (error) {
          return 'Fecha inválida';
        }
      }
    }
  ];

  if (loading) {
    return (
      <Container>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <IconButton onClick={loadDashboardData}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Métricas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {metricCards.map((card, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ 
                    backgroundColor: `${card.color}15`,
                    borderRadius: '50%',
                    p: 1,
                    mr: 2
                  }}>
                    <Box sx={{ color: card.color }}>
                      {card.icon}
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="h4" component="div">
                      {card.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.description}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h6" component="div">
                  {card.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Productos con inventario bajo */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2">
                Productos con Inventario Bajo
              </Typography>
              <Chip 
                label={`${lowStockProducts.length} productos`} 
                color="warning" 
                size="small" 
              />
            </Box>
            <List sx={{ maxHeight: 320, overflow: 'auto' }}>
              {lowStockProducts.map((product, index) => (
                <React.Fragment key={product.id}>
                  <ListItem
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body1">
                            {product.description}
                          </Typography>
                          <Chip 
                            label={`${product.currentQuantity} ${product.unit}`} 
                            color="error" 
                            size="small" 
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Código: {product.code}
                          </Typography>
                          {product.minQuantity && (
                            <Typography variant="body2" color="text.secondary">
                              Mínimo: {product.minQuantity}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < lowStockProducts.length - 1 && <Divider />}
                </React.Fragment>
              ))}
              {lowStockProducts.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No hay productos con inventario bajo"
                    secondary="Todo está en orden"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Movimientos recientes */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
              Movimientos Recientes
            </Typography>
            <Box sx={{ height: 320 }}>
              <DataGrid
                rows={recentMovements.map(movement => ({
                  ...movement,
                  id: movement.id,
                  productCode: movement.productCode || 'N/A',
                  difference: movement.newQuantity - movement.previousQuantity
                }))}
                columns={movementColumns}
                hideFooter
                disableRowSelectionOnClick
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;