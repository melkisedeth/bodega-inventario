import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  CircularProgress,
  Divider,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Upload as UploadIcon,
  Check as CheckIcon,
  AddCircle as AddCircleIcon,
  RemoveCircle as RemoveCircleIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { productsService } from '../services/productsService';
import { excelService } from '../services/excelService';
import { useAuth } from '../contexts/AuthContext';
import ProductForm from '../components/products/ProductForm';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [departments, setDepartments] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Estados para importación
  const [excelProducts, setExcelProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [loadingExcel, setLoadingExcel] = useState(false);
  
  // Estados para edición rápida de cantidad
  const [editingQuantity, setEditingQuantity] = useState(null);
  const [quantityInput, setQuantityInput] = useState('');
  const [savingQuantity, setSavingQuantity] = useState(false);

  const { userData } = useAuth();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productsService.getAllProducts();
      setProducts(data);
      // Extraer departamentos únicos
      const uniqueDepartments = [...new Set(data.map(p => p.department))];
      setDepartments(uniqueDepartments);
    } catch (error) {
      showSnackbar('Error al cargar productos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Función para manejar la edición rápida de cantidad
  const handleQuantityEditStart = (product) => {
    setEditingQuantity(product.id);
    setQuantityInput('');
  };

  const handleQuantityEditCancel = () => {
    setEditingQuantity(null);
    setQuantityInput('');
  };

  const handleQuantitySave = async (product) => {
    if (!quantityInput.trim()) {
      showSnackbar('Ingresa un valor para la cantidad', 'warning');
      return;
    }

    // Parsear el valor de entrada
    const inputValue = quantityInput.trim();
    let newQuantity = product.currentQuantity;

    try {
      // Verificar si es una operación de suma/resta
      if (inputValue.startsWith('+') || inputValue.startsWith('-')) {
        const operation = inputValue.startsWith('+') ? 'sumar' : 'restar';
        const numberValue = parseFloat(inputValue.substring(1));
        
        if (isNaN(numberValue)) {
          showSnackbar('Ingresa un número válido después del signo', 'error');
          return;
        }

        if (operation === 'sumar') {
          newQuantity += numberValue;
        } else {
          newQuantity -= numberValue;
          // No permitir cantidad negativa
          if (newQuantity < 0) {
            showSnackbar('No se puede tener cantidad negativa', 'error');
            return;
          }
        }
      } else {
        // Es una cantidad absoluta
        const absoluteValue = parseFloat(inputValue);
        if (isNaN(absoluteValue)) {
          showSnackbar('Ingresa un número válido', 'error');
          return;
        }
        if (absoluteValue < 0) {
          showSnackbar('La cantidad no puede ser negativa', 'error');
          return;
        }
        newQuantity = absoluteValue;
      }

      setSavingQuantity(true);
      
      // Actualizar el producto
      await productsService.updateProduct(product.id, {
        ...product,
        currentQuantity: newQuantity,
        lastUpdated: new Date().toISOString(),
        updatedBy: userData?.id || 'anonymous'
      });

      showSnackbar(`Cantidad actualizada: ${newQuantity} ${product.unit}`, 'success');
      
      // Actualizar la lista de productos
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === product.id ? { ...p, currentQuantity: newQuantity } : p
        )
      );

      // Cerrar el modo de edición
      handleQuantityEditCancel();
    } catch (error) {
      console.error('Error al actualizar cantidad:', error);
      showSnackbar('Error al actualizar cantidad', 'error');
    } finally {
      setSavingQuantity(false);
    }
  };

  const handleOpenDialog = (product = null) => {
    setSelectedProduct(product);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProduct(null);
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (selectedProduct) {
        await productsService.updateProduct(selectedProduct.id, productData);
        showSnackbar('Producto actualizado exitosamente');
      } else {
        await productsService.createProduct({
          ...productData,
          userId: userData?.id || 'anonymous'
        });
        showSnackbar('Producto creado exitosamente');
      }
      handleCloseDialog();
      loadProducts();
    } catch (error) {
      showSnackbar('Error al guardar producto', 'error');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await productsService.deleteProduct(id);
        showSnackbar('Producto eliminado exitosamente');
        loadProducts();
      } catch (error) {
        showSnackbar('Error al eliminar producto', 'error');
      }
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (searchTerm) filters.description = searchTerm;
      if (filterDepartment) filters.department = filterDepartment;
      const data = await productsService.searchProducts(filters);
      setProducts(data);
    } catch (error) {
      showSnackbar('Error en la búsqueda', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Implementar exportación a Excel
    showSnackbar('Exportación en desarrollo', 'info');
  };

  // Función para abrir diálogo de importación
  const handleOpenImportDialog = async () => {
    try {
      setImportDialogOpen(true);
      setImportError('');
      setLoadingExcel(true);
      setSelectedProducts([]);
      // Cargar productos del Excel
      const products = await excelService.loadProductsFromExcel();
      setExcelProducts(products);
    } catch (error) {
      console.error('Error cargando Excel:', error);
      setImportError('No se pudo cargar el archivo Excel. Verifica que exista en la ubicación correcta.');
      setExcelProducts([]);
    } finally {
      setLoadingExcel(false);
    }
  };

  // Función para importar productos seleccionados
  const handleImportProducts = async () => {
    if (selectedProducts.length === 0) return;
    setImporting(true);
    setImportError('');
    try {
      let importedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      // Procesar productos en lotes para mejor rendimiento
      const batchSize = 5;
      for (let i = 0; i < selectedProducts.length; i += batchSize) {
        const batch = selectedProducts.slice(i, i + batchSize);
        const promises = batch.map(async (product) => {
          try {
            // Verificar si ya existe
            const exists = await productsService.isCodeExists(product.code);
            if (!exists) {
              await productsService.createProduct({
                code: product.code,
                description: product.description,
                unit: product.unit || 'pza',
                department: product.department || 'otros',
                currentQuantity: product.currentQuantity || 0,
                minQuantity: product.minQuantity || null,
                maxQuantity: product.maxQuantity || null,
                userId: userData?.id || 'anonymous',
                importedFromExcel: true,
                excelSource: 'inventory'
              });
              importedCount++;
              return { success: true, product };
            } else {
              skippedCount++;
              return { success: false, product, reason: 'exists' };
            }
          } catch (error) {
            console.error(`Error importando producto ${product.code}:`, error);
            errorCount++;
            return { success: false, product, reason: 'error', error };
          }
        });
        await Promise.all(promises);
      }
      
      // Mostrar resumen
      let message = `✅ Importación completada:\n`;
      message += `• Importados: ${importedCount}\n`;
      message += `• Omitidos (ya existen): ${skippedCount}\n`;
      if (errorCount > 0) {
        message += `• Errores: ${errorCount}`;
      }
      showSnackbar(message, importedCount > 0 ? 'success' : 'warning');
      
      // Cerrar diálogo y recargar productos
      if (importedCount > 0) {
        setImportDialogOpen(false);
        loadProducts();
      }
    } catch (error) {
      console.error('Error durante la importación:', error);
      setImportError('Error durante la importación: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  // Manejar selección/deselección de productos
  const handleToggleProduct = (product) => {
    if (importing) return;
    const index = selectedProducts.findIndex(p => p.code === product.code);
    const newSelected = [...selectedProducts];
    if (index === -1) {
      newSelected.push(product);
    } else {
      newSelected.splice(index, 1);
    }
    setSelectedProducts(newSelected);
  };

  // Seleccionar/deseleccionar todos
  const handleSelectAll = () => {
    if (importing) return;
    if (selectedProducts.length === excelProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts([...excelProducts]);
    }
  };

  const columns = [
    { field: 'code', headerName: 'Código', width: 150 },
    { field: 'description', headerName: 'Descripción', width: 250 },
    { field: 'unit', headerName: 'Unidad', width: 100 },
    { field: 'department', headerName: 'Departamento', width: 150 },
    {
      field: 'currentQuantity',
      headerName: 'Cantidad',
      width: 200,
      renderCell: (params) => {
        const isLow = params.row.minQuantity && params.row.currentQuantity <= params.row.minQuantity;
        const isExcess = params.row.maxQuantity && params.row.currentQuantity > params.row.maxQuantity;
        let color = 'default';
        if (isLow) color = 'error';
        else if (isExcess) color = 'warning';

        // Si estamos editando esta fila
        if (editingQuantity === params.row.id) {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <TextField
                size="small"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                placeholder="Ej: +25, -10, o 50"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {params.row.currentQuantity}
                    </InputAdornment>
                  ),
                  sx: { width: 150 }
                }}
                autoFocus
                disabled={savingQuantity}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleQuantitySave(params.row);
                  } else if (e.key === 'Escape') {
                    handleQuantityEditCancel();
                  }
                }}
              />
              <Tooltip title="Guardar">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleQuantitySave(params.row)}
                  disabled={savingQuantity}
                >
                  {savingQuantity ? <CircularProgress size={20} /> : <SaveIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancelar">
                <IconButton
                  size="small"
                  color="error"
                  onClick={handleQuantityEditCancel}
                  disabled={savingQuantity}
                >
                  <CancelIcon />
                </IconButton>
              </Tooltip>
            </Box>
          );
        }

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${params.row.currentQuantity} ${params.row.unit}`}
              color={color}
              size="small"
              variant="outlined"
              sx={{ minWidth: 80 }}
            />
            <Tooltip title="Ajustar cantidad">
              <IconButton
                size="small"
                onClick={() => handleQuantityEditStart(params.row)}
                disabled={savingQuantity}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Agregar stock">
              <IconButton
                size="small"
                color="success"
                onClick={() => {
                  setEditingQuantity(params.row.id);
                  setQuantityInput('+');
                }}
                disabled={savingQuantity}
              >
                <AddCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Retirar stock">
              <IconButton
                size="small"
                color="error"
                onClick={() => {
                  setEditingQuantity(params.row.id);
                  setQuantityInput('-');
                }}
                disabled={savingQuantity}
              >
                <RemoveCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      }
    },
    { field: 'minQuantity', headerName: 'Mínimo', width: 100 },
    { field: 'maxQuantity', headerName: 'Máximo', width: 100 },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 150,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Editar producto">
            <IconButton
              onClick={() => handleOpenDialog(params.row)}
              size="small"
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar producto">
            <IconButton
              onClick={() => handleDeleteProduct(params.row.id)}
              size="small"
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Gestión de Productos
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={handleOpenImportDialog}
            disabled={loading}
          >
            Importar desde Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={loading}
          >
            Nuevo Producto
          </Button>
        </Box>
      </Box>

      {/* Filtros de búsqueda */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filtros de Búsqueda
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Buscar por descripción"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              select
              label="Departamento"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={5} sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleSearch}
              startIcon={<SearchIcon />}
            >
              Buscar
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setFilterDepartment('');
                loadProducts();
              }}
            >
              Limpiar
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
              Exportar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla de productos */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={products}
          columns={columns}
          loading={loading}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          getRowId={(row) => row.id}
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
          localeText={{
            noRowsLabel: 'No hay productos',
            footerRowSelected: (count) =>
              count !== 1
                ? `${count.toLocaleString()} productos seleccionados`
                : `${count.toLocaleString()} producto seleccionado`,
          }}
        />
      </Paper>

      {/* Dialog para crear/editar producto */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <ProductForm
          open={openDialog}
          onClose={handleCloseDialog}
          onSubmit={handleSaveProduct}
          product={selectedProduct}
        />
      </Dialog>

      {/* Diálogo de Importación desde Excel */}
      <Dialog
        open={importDialogOpen}
        onClose={() => !importing && setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '80vh', display: 'flex', flexDirection: 'column' }
        }}
      >
        <DialogTitle>
          Importar Productos desde Excel
        </DialogTitle>
        <DialogContent dividers sx={{ flex: 1, overflow: 'auto' }}>
          {importError && (
            <Alert
              severity="error"
              onClose={() => setImportError('')}
              sx={{ mb: 2 }}
            >
              {importError}
            </Alert>
          )}
          
          <Typography paragraph>
            Selecciona los productos que deseas importar del inventario Excel.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            • Los productos que ya existan en la base de datos serán omitidos.<br />
            • Se mantendrán los datos del Excel cuando sea posible.
          </Typography>

          {/* Contador de selección */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2">
              <strong>Productos disponibles:</strong> {excelProducts.length}
            </Typography>
            <Typography variant="body2">
              <strong>Seleccionados:</strong> {selectedProducts.length}
            </Typography>
          </Box>

          <Button
            onClick={handleSelectAll}
            disabled={loadingExcel || importing || excelProducts.length === 0}
            size="small"
            sx={{ mb: 2 }}
          >
            {selectedProducts.length === excelProducts.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </Button>

          {loadingExcel ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Cargando productos del Excel...</Typography>
            </Box>
          ) : excelProducts.length === 0 ? (
            <Alert severity="info">
              No se encontraron productos en el archivo Excel. Verifica que el archivo exista y tenga el formato correcto.
            </Alert>
          ) : (
            <List sx={{ bgcolor: 'background.paper' }}>
              {excelProducts.map((product, index) => {
                const isSelected = selectedProducts.some(p => p.code === product.code);
                return (
                  <ListItem
                    key={index}
                    button
                    onClick={() => handleToggleProduct(product)}
                    selected={isSelected}
                    disabled={importing}
                    sx={{
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' },
                      '&.Mui-selected': { bgcolor: 'primary.lighter' }
                    }}
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={isSelected}
                        tabIndex={-1}
                        disableRipple
                        disabled={importing}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" component="span">
                          {product.code}
                        </Typography>
                      }
                      secondary={
                        <Box component="span">
                          <Typography variant="body2" component="span" display="block">
                            {product.description}
                          </Typography>
                          {product.unit && (
                            <Chip
                              label={product.unit}
                              size="small"
                              sx={{ mr: 1, mt: 0.5 }}
                            />
                          )}
                          {product.department && (
                            <Chip
                              label={product.department}
                              size="small"
                              color="secondary"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button
            onClick={() => setImportDialogOpen(false)}
            disabled={importing}
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImportProducts}
            disabled={importing || selectedProducts.length === 0}
            variant="contained"
            startIcon={importing ? <CircularProgress size={20} /> : <CheckIcon />}
            sx={{ minWidth: 150 }}
          >
            {importing ? 'Importando...' : `Importar (${selectedProducts.length})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ whiteSpace: 'pre-line', maxWidth: 400 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Products;