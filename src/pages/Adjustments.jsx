import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Alert,
  Snackbar,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Undo as UndoIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useForm } from 'react-hook-form';
import { productsService, movementsService } from '../services/productsService';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Adjustments = () => {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAdjustmentDialog, setOpenAdjustmentDialog] = useState(false);
  const [openRevertDialog, setOpenRevertDialog] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { userData } = useAuth();

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      productId: '',
      type: 'adjustment',
      quantity: 0,
      reason: '',
      reference: ''
    }
  });

  const selectedProductId = watch('productId');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        setValue('currentQuantity', product.currentQuantity);
      }
    }
  }, [selectedProductId, products, setValue]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [movementsData, productsData] = await Promise.all([
        movementsService.getAllMovements(),
        productsService.getAllProducts()
      ]);
      setMovements(movementsData);
      setProducts(productsData);
    } catch (error) {
      showSnackbar('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenAdjustmentDialog = () => {
    reset({
      productId: '',
      type: 'adjustment',
      quantity: 0,
      reason: '',
      reference: '',
      currentQuantity: 0
    });
    setOpenAdjustmentDialog(true);
  };

  const handleCloseAdjustmentDialog = () => {
    setOpenAdjustmentDialog(false);
  };

  const handleOpenRevertDialog = (movement) => {
    setSelectedMovement(movement);
    setOpenRevertDialog(true);
  };

  const handleCloseRevertDialog = () => {
    setOpenRevertDialog(false);
    setSelectedMovement(null);
  };

  const handleSubmitAdjustment = async (data) => {
    try {
      const product = products.find(p => p.id === data.productId);
      if (!product) {
        showSnackbar('Producto no encontrado', 'error');
        return;
      }

      let newQuantity;
      switch (data.type) {
        case 'entrada':
          newQuantity = product.currentQuantity + Number(data.quantity);
          break;
        case 'salida':
          newQuantity = product.currentQuantity - Number(data.quantity);
          if (newQuantity < 0) {
            showSnackbar('No hay suficiente stock', 'error');
            return;
          }
          break;
        case 'ajuste':
          newQuantity = Number(data.quantity);
          break;
        default:
          newQuantity = product.currentQuantity;
      }

      await movementsService.registerMovement({
        productId: data.productId,
        productCode: product.code,
        productDescription: product.description,
        type: data.type,
        previousQuantity: product.currentQuantity,
        newQuantity,
        quantity: Number(data.quantity),
        reason: data.reason,
        reference: data.reference,
        userId: userData?.id,
        userName: userData?.name
      });

      showSnackbar('Movimiento registrado exitosamente');
      handleCloseAdjustmentDialog();
      loadData();
    } catch (error) {
      showSnackbar('Error al registrar movimiento', 'error');
    }
  };

  const handleRevertMovement = async (reason) => {
    try {
      await movementsService.revertMovement(
        selectedMovement.id,
        reason,
        userData?.id
      );
      showSnackbar('Movimiento revertido exitosamente');
      handleCloseRevertDialog();
      loadData();
    } catch (error) {
      showSnackbar('Error al revertir movimiento', 'error');
    }
  };

  const columns = [
    { 
      field: 'timestamp', 
      headerName: 'Fecha/Hora', 
      width: 180,
      valueFormatter: (params) => 
        format(params.value.toDate(), 'dd/MM/yyyy HH:mm', { locale: es })
    },
    { field: 'productCode', headerName: 'Código', width: 120 },
    { field: 'productDescription', headerName: 'Descripción', width: 200 },
    { 
      field: 'type', 
      headerName: 'Tipo', 
      width: 120,
      renderCell: (params) => {
        const typeConfig = {
          entrada: { label: 'Entrada', color: 'success' },
          salida: { label: 'Salida', color: 'error' },
          ajuste: { label: 'Ajuste', color: 'info' },
          reversion: { label: 'Reversión', color: 'warning' }
        };
        const config = typeConfig[params.value] || { label: params.value, color: 'default' };
        return <Chip label={config.label} color={config.color} size="small" />;
      }
    },
    { field: 'previousQuantity', headerName: 'Cant. Anterior', width: 130 },
    { field: 'newQuantity', headerName: 'Cant. Nueva', width: 130 },
    { field: 'reason', headerName: 'Motivo', width: 200 },
    { field: 'userName', headerName: 'Usuario', width: 150 },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 100,
      renderCell: (params) => (
        <Tooltip title="Revertir movimiento">
          <IconButton
            onClick={() => handleOpenRevertDialog(params.row)}
            size="small"
            disabled={params.row.reverted || params.row.type === 'reversion'}
          >
            <UndoIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Container maxWidth="xl">
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" component="h1">
            Ajustes de Inventario
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdjustmentDialog}
          >
            Nuevo Ajuste
          </Button>
        </Box>

        {/* Tabla de movimientos */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={movements}
            columns={columns}
            loading={loading}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
          />
        </Box>
      </Paper>

      {/* Dialog para nuevo ajuste */}
      <Dialog open={openAdjustmentDialog} onClose={handleCloseAdjustmentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Movimiento</DialogTitle>
        <form onSubmit={handleSubmit(handleSubmitAdjustment)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Producto *"
                  {...register('productId', { required: true })}
                  margin="normal"
                >
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.code} - {product.description}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              {selectedProductId && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Cantidad Actual"
                    value={watch('currentQuantity')}
                    margin="normal"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Tipo de Movimiento *"
                  {...register('type', { required: true })}
                  margin="normal"
                >
                  <MenuItem value="entrada">Entrada</MenuItem>
                  <MenuItem value="salida">Salida</MenuItem>
                  <MenuItem value="ajuste">Ajuste Directo</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Cantidad *"
                  type="number"
                  {...register('quantity', { required: true, min: 0 })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Motivo *"
                  {...register('reason', { required: true })}
                  margin="normal"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Referencia/Observaciones"
                  {...register('reference')}
                  margin="normal"
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAdjustmentDialog}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Registrar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog para revertir movimiento */}
      <Dialog open={openRevertDialog} onClose={handleCloseRevertDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Revertir Movimiento</DialogTitle>
        <DialogContent>
          {selectedMovement && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                ¿Estás seguro de revertir este movimiento? Esta acción no se puede deshacer.
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Producto"
                    value={selectedMovement.productDescription}
                    margin="normal"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Tipo"
                    value={selectedMovement.type}
                    margin="normal"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Motivo Original"
                    value={selectedMovement.reason}
                    margin="normal"
                    InputProps={{ readOnly: true }}
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Justificación de la Reversión *"
                    margin="normal"
                    multiline
                    rows={3}
                    id="reversionReason"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRevertDialog}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="warning"
            onClick={() => {
              const reason = document.getElementById('reversionReason').value;
              if (!reason) {
                showSnackbar('Debe ingresar una justificación', 'error');
                return;
              }
              handleRevertMovement(reason);
            }}
          >
            Revertir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Adjustments;