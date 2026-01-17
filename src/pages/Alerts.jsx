import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert as MuiAlert,
  IconButton,
  Tooltip,
  LinearProgress,
  MenuItem
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { productsService } from '../services/productsService';

const Alerts = () => {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [almostOutProducts, setAlmostOutProducts] = useState([]);
  const [excessStockProducts, setExcessStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openSettings, setOpenSettings] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    emailNotifications: false,
    emailFrequency: 'daily',
    lowStockThreshold: 10,
    almostOutThreshold: 10,
    adminEmail: ''
  });

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const [lowStock, almostOut, excessStock] = await Promise.all([
        productsService.getLowStockProducts(),
        productsService.getAlmostOutOfStockProducts(),
        productsService.getExcessStockProducts()
      ]);

      setLowStockProducts(lowStock);
      setAlmostOutProducts(almostOut);
      setExcessStockProducts(excessStock);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };



  const getAlertIcon = (level) => {
    switch (level) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  // En el array de columnas, modifica el valueGetter de la columna percentage:
  const lowStockColumns = [
    { field: 'code', headerName: 'Código', width: 150 },
    { field: 'description', headerName: 'Descripción', width: 250 },
    { field: 'department', headerName: 'Departamento', width: 150 },
    {
      field: 'currentQuantity',
      headerName: 'Cantidad Actual',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={`${params.value} ${params.row.unit || ''}`}
          color="error"
          size="small"
        />
      )
    },
    {
      field: 'minQuantity',
      headerName: 'Cantidad Mínima',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value || 'N/A'}
          variant="outlined"
          size="small"
        />
      )
    },
    {
      field: 'percentage',
      headerName: 'Nivel',
      width: 120,
      valueGetter: (params) => {
        // Añade validación para evitar el error
        if (!params?.row?.minQuantity || !params?.row?.currentQuantity) return 'N/A';
        return `${Math.round((params.row.currentQuantity / params.row.minQuantity) * 100)}%`;
      },
      renderCell: (params) => {
        // Añade validación aquí también
        if (!params.row?.minQuantity || !params.row?.currentQuantity) {
          return (
            <Typography variant="body2" color="textSecondary">
              N/A
            </Typography>
          );
        }

        const percentage = (params.row.currentQuantity / params.row.minQuantity) * 100;

        let color = 'success';
        if (percentage <= 50) color = 'error';
        else if (percentage <= 100) color = 'warning';

        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(percentage, 100)}
              sx={{
                width: 60,
                mr: 1,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: color === 'error' ? '#f44336' :
                    color === 'warning' ? '#ff9800' : '#4caf50'
                }
              }}
            />
            <Typography variant="body2" color="textSecondary">
              {params.value}
            </Typography>
          </Box>
        );
      }
    }
  ];

  const getAlertLevel = (product) => {
    if (!product?.minQuantity || !product?.currentQuantity) return 'info';

    const percentage = (product.currentQuantity / product.minQuantity) * 100;

    if (percentage <= 50) return 'error';
    if (percentage <= 100) return 'warning';
    return 'info';
  };

  const handleOpenSettings = () => {
    setOpenSettings(true);
  };

  const handleCloseSettings = () => {
    setOpenSettings(false);
  };

  const handleSaveSettings = () => {
    // Guardar configuración en Firebase
    console.log('Guardar configuración:', alertSettings);
    handleCloseSettings();
  };

  const handleSendTestEmail = () => {
    // Enviar email de prueba
    console.log('Enviar email de prueba');
  };

  if (loading) {
    return (
      <Container>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">
            Alertas de Inventario
          </Typography>
          <Box>
            <Tooltip title="Recargar">
              <IconButton onClick={loadAlerts} sx={{ mr: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Configuración de Alertas">
              <IconButton onClick={handleOpenSettings}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Productos con inventario bajo */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ErrorIcon color="error" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      Productos con Inventario Bajo ({lowStockProducts.length})
                    </Typography>
                  </Box>
                }
                action={
                  <Chip
                    label="Crítico"
                    color="error"
                    size="small"
                    icon={<ErrorIcon />}
                  />
                }
              />
              <CardContent>
                <Box sx={{ height: 300 }}>
                  <DataGrid
                    rows={lowStockProducts}
                    columns={lowStockColumns}
                    hideFooter
                    disableSelectionOnClick
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Productos por agotarse */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WarningIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      Por Agotarse ({almostOutProducts.length})
                    </Typography>
                  </Box>
                }
                action={
                  <Chip
                    label="Advertencia"
                    color="warning"
                    size="small"
                    icon={<WarningIcon />}
                  />
                }
              />
              <CardContent>
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {almostOutProducts.map((product, index) => (
                    <MuiAlert
                      key={product.id}
                      severity="warning"
                      icon={getAlertIcon(getAlertLevel(product))}
                      sx={{ mb: index < almostOutProducts.length - 1 ? 1 : 0 }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">
                          {product.description}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {product.currentQuantity} {product.unit}
                        </Typography>
                      </Box>
                      <Typography variant="caption" display="block">
                        Mínimo: {product.minQuantity} | Departamento: {product.department}
                      </Typography>
                    </MuiAlert>
                  ))}
                  {almostOutProducts.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center">
                      No hay productos próximos a agotarse
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Productos con exceso */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <InfoIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      Exceso de Inventario ({excessStockProducts.length})
                    </Typography>
                  </Box>
                }
                action={
                  <Chip
                    label="Información"
                    color="info"
                    size="small"
                    icon={<InfoIcon />}
                  />
                }
              />
              <CardContent>
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {excessStockProducts.map((product, index) => (
                    <MuiAlert
                      key={product.id}
                      severity="info"
                      sx={{ mb: index < excessStockProducts.length - 1 ? 1 : 0 }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">
                          {product.description}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {product.currentQuantity} {product.unit}
                        </Typography>
                      </Box>
                      <Typography variant="caption" display="block">
                        Máximo: {product.maxQuantity} | Exceso: {product.currentQuantity - product.maxQuantity}
                      </Typography>
                    </MuiAlert>
                  ))}
                  {excessStockProducts.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center">
                      No hay productos con exceso de inventario
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Dialog de configuración */}
      <Dialog open={openSettings} onClose={handleCloseSettings} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SettingsIcon sx={{ mr: 1 }} />
            Configuración de Alertas
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={alertSettings.emailNotifications}
                    onChange={(e) => setAlertSettings({
                      ...alertSettings,
                      emailNotifications: e.target.checked
                    })}
                  />
                }
                label="Notificaciones por Email"
              />
            </Grid>

            {alertSettings.emailNotifications && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email del Administrador"
                    value={alertSettings.adminEmail}
                    onChange={(e) => setAlertSettings({
                      ...alertSettings,
                      adminEmail: e.target.value
                    })}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Frecuencia de Notificaciones"
                    value={alertSettings.emailFrequency}
                    onChange={(e) => setAlertSettings({
                      ...alertSettings,
                      emailFrequency: e.target.value
                    })}
                    margin="normal"
                  >
                    <MenuItem value="immediate">Inmediata</MenuItem>
                    <MenuItem value="daily">Diaria</MenuItem>
                    <MenuItem value="weekly">Semanal</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    startIcon={<EmailIcon />}
                    onClick={handleSendTestEmail}
                    variant="outlined"
                  >
                    Enviar Email de Prueba
                  </Button>
                </Grid>
              </>
            )}

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Umbral Inventario Bajo (%)"
                type="number"
                value={alertSettings.lowStockThreshold}
                onChange={(e) => setAlertSettings({
                  ...alertSettings,
                  lowStockThreshold: e.target.value
                })}
                margin="normal"
                helperText="Porcentaje del mínimo para considerar bajo"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Umbral Por Agotarse (%)"
                type="number"
                value={alertSettings.almostOutThreshold}
                onChange={(e) => setAlertSettings({
                  ...alertSettings,
                  almostOutThreshold: e.target.value
                })}
                margin="normal"
                helperText="Porcentaje extra sobre el mínimo"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSettings}>Cancelar</Button>
          <Button onClick={handleSaveSettings} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Alerts;