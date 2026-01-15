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
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Upload as UploadIcon,
  Check as CheckIcon
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
                unit: product.unit || 'pza', // Usar unidad del Excel si existe
                department: product.department || 'otros', // Usar departamento del Excel si existe
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
      width: 120,
      renderCell: (params) => {
        const isLow = params.row.minQuantity && params.row.currentQuantity <= params.row.minQuantity;
        const isExcess = params.row.maxQuantity && params.row.currentQuantity > params.row.maxQuantity;
        
        let color = 'default';
        if (isLow) color = 'error';
        else if (isExcess) color = 'warning';
        
        return <Chip label={params.value} color={color} size="small" />;
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
          <Tooltip title="Editar">
            <IconButton onClick={() => handleOpenDialog(params.row)} size="small">
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
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
    <Container maxWidth="xl">
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" component="h1">
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
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Buscar descripción"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={handleSearch}
              >
                Buscar
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => {
                  setSearchTerm('');
                  setFilterDepartment('');
                  loadProducts();
                }}
              >
                Limpiar
              </Button>
            </Grid>
            <Grid item xs={12} md={1}>
              <Tooltip title="Exportar a Excel">
                <IconButton onClick={handleExport}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabla de productos */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={products}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 10,
                },
              },
            }}
            disableRowSelectionOnClick
          />
        </Box>
      </Paper>

      {/* Dialog para crear/editar producto */}
      <ProductForm
        open={openDialog}
        onClose={handleCloseDialog}
        onSubmit={handleSaveProduct}
        product={selectedProduct}
      />

      {/* Diálogo de Importación desde Excel */}
      <Dialog 
        open={importDialogOpen} 
        onClose={() => !importing && setImportDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UploadIcon />
            <Typography variant="h6">
              Importar Productos desde Excel
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ py: 3, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {importError && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }} 
              onClose={() => setImportError('')}
            >
              {importError}
            </Alert>
          )}
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              Selecciona los productos que deseas importar del inventario Excel.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Los productos que ya existan en la base de datos serán omitidos.
              <br />
              • Se mantendrán los datos del Excel cuando sea posible.
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />
          
          {/* Contador de selección */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 2 
          }}>
            <Typography variant="subtitle1">
              Productos disponibles: {excelProducts.length}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Seleccionados: {selectedProducts.length}
              </Typography>
              <Button
                size="small"
                onClick={handleSelectAll}
                disabled={loadingExcel || importing || excelProducts.length === 0}
              >
                {selectedProducts.length === excelProducts.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </Button>
            </Box>
          </Box>
          
          {loadingExcel ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flex: 1,
              py: 4 
            }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Cargando productos del Excel...
              </Typography>
            </Box>
          ) : excelProducts.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flex: 1,
              py: 4 
            }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                No se encontraron productos en el archivo Excel.
              </Alert>
              <Typography variant="body2" color="text.secondary">
                Verifica que el archivo exista y tenga el formato correcto.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ 
              flex: 1, 
              overflow: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1
            }}>
              <List>
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
                        '&:hover': {
                          bgcolor: 'action.hover'
                        },
                        '&.Mui-selected': {
                          bgcolor: 'primary.lighter'
                        }
                      }}
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={isSelected}
                          tabIndex={-1}
                          disableRipple
                          color="primary"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body1" fontWeight="medium">
                            {product.code}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {product.description}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                              {product.unit && (
                                <Chip 
                                  label={`Unidad: ${product.unit}`} 
                                  size="small" 
                                  variant="outlined" 
                                />
                              )}
                              {product.department && (
                                <Chip 
                                  label={`Depto: ${product.department}`} 
                                  size="small" 
                                  variant="outlined" 
                                />
                              )}
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => setImportDialogOpen(false)} 
            disabled={importing}
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleImportProducts}
            disabled={selectedProducts.length === 0 || importing || loadingExcel}
            startIcon={
              importing ? <CircularProgress size={20} color="inherit" /> : <CheckIcon />
            }
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
          sx={{ 
            whiteSpace: 'pre-line',
            maxWidth: 400 
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Products;