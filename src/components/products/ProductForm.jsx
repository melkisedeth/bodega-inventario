import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  Divider,
  Alert,
  FormControl,
  FormHelperText,
  MenuItem,
  Chip,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  Numbers as NumbersIcon,
  Description as DescriptionIcon,
  Straighten as StraightenIcon,
  Category as CategoryIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  LocalOffer as LocalOfferIcon,
  Search as SearchIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import ProductSearch from './ProductSearch';
import { excelService } from '../../services/excelService';
import { productsService } from '../../services/productsService';

// Esquema de validación actualizado
const schema = yup.object({
  code: yup.string()
    .required('El código es requerido')
    .min(1, 'Mínimo 1 caracter')
    .max(50, 'Máximo 50 caracteres')
    .test('unique-code', 'Este código ya existe', async function(value) {
      if (!value || this.parent.isFromExcel) return true;
      
      // Si estamos editando un producto existente, no validar su propio código
      if (this.parent.existingProductId && value === this.parent.originalCode) {
        return true;
      }
      
      // Verificar en Firebase
      const existsInDB = await productsService.isCodeExists(value);
      if (existsInDB) return false;
      
      // Verificar en Excel
      const existsInExcel = await excelService.isCodeInExcel(value);
      return !existsInExcel;
    }),
  description: yup.string()
    .required('La descripción es requerida')
    .min(3, 'Mínimo 3 caracteres')
    .max(500, 'Máximo 500 caracteres'),
  unit: yup.string().required('La unidad es requerida'),
  department: yup.string().required('El departamento es requerido'),
  currentQuantity: yup.number()
    .typeError('Debe ser un número')
    .min(0, 'La cantidad no puede ser negativa')
    .required('La cantidad es requerida')
    .default(0),
  minQuantity: yup.number()
    .typeError('Debe ser un número')
    .min(0, 'No puede ser negativo')
    .nullable()
    .transform((value) => (value === '' || value === null ? null : Number(value))),
  maxQuantity: yup.number()
    .typeError('Debe ser un número')
    .min(0, 'No puede ser negativo')
    .nullable()
    .transform((value) => (value === '' || value === null ? null : Number(value)))
    .test('max-min', 'Debe ser mayor que la cantidad mínima', function(value) {
      const { minQuantity } = this.parent;
      if (value && minQuantity) {
        return value > minQuantity;
      }
      return true;
    }),
  isFromExcel: yup.boolean().default(false),
  existingProductId: yup.string().nullable(),
  originalCode: yup.string().nullable(),
});

// Opciones para unidades
const unitOptions = [
  { value: 'pza', label: 'Pieza (pza)' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'g', label: 'Gramo (g)' },
  { value: 'l', label: 'Litro (l)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'cm', label: 'Centímetro (cm)' },
  { value: 'mm', label: 'Milímetro (mm)' },
  { value: 'caja', label: 'Caja' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'rollo', label: 'Rollo' },
  { value: 'par', label: 'Par' },
  { value: 'docena', label: 'Docena' },
  { value: 'unidad', label: 'Unidad' },
];

// Opciones para departamentos
const departmentOptions = [
  { value: 'ferreteria', label: 'Ferretería' },
  { value: 'electronica', label: 'Electrónica' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'otros', label: 'Otros' },
];

const ProductForm = ({ open, onClose, onSubmit, product }) => {
  const [selectedExcelProduct, setSelectedExcelProduct] = useState(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [errorAlert, setErrorAlert] = useState({ open: false, message: '', severity: 'error' });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting, isDirty }
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      code: '',
      description: '',
      unit: 'pza',
      department: 'electronica',
      currentQuantity: 0,
      minQuantity: null,
      maxQuantity: null,
      isFromExcel: false,
      existingProductId: null,
      originalCode: null,
    }
  });

  // Observar valores para mostrar alertas
  const currentQuantity = watch('currentQuantity');
  const minQuantity = watch('minQuantity');
  const maxQuantity = watch('maxQuantity');
  const unit = watch('unit');
  const isFromExcel = watch('isFromExcel');

  // Determinar si hay alertas de inventario
  const hasLowStock = minQuantity && currentQuantity <= minQuantity;
  const hasExcessStock = maxQuantity && currentQuantity > maxQuantity;

  useEffect(() => {
    if (product && open) {
      reset({
        code: product.code || '',
        description: product.description || '',
        unit: product.unit || 'pza',
        department: product.department || 'electronica',
        currentQuantity: product.currentQuantity || 0,
        minQuantity: product.minQuantity || null,
        maxQuantity: product.maxQuantity || null,
        isFromExcel: false,
        existingProductId: product.id || null,
        originalCode: product.code || null,
      });
      setSelectedExcelProduct(null);
    } else if (!product && open) {
      reset({
        code: '',
        description: '',
        unit: 'pza',
        department: 'electronica',
        currentQuantity: 0,
        minQuantity: null,
        maxQuantity: null,
        isFromExcel: false,
        existingProductId: null,
        originalCode: null,
      });
      setSelectedExcelProduct(null);
      setErrorAlert({ open: false, message: '', severity: 'error' });
    }
  }, [product, open, reset]);

  const handleFormSubmit = async (data) => {
    try {
      // Asegurarse de que currentQuantity sea un número
      const formattedData = {
        ...data,
        currentQuantity: Number(data.currentQuantity) || 0,
        minQuantity: data.minQuantity ? Number(data.minQuantity) : null,
        maxQuantity: data.maxQuantity ? Number(data.maxQuantity) : null,
      };
      
      // Remover campos auxiliares antes de enviar
      delete formattedData.isFromExcel;
      delete formattedData.existingProductId;
      delete formattedData.originalCode;
      
      await onSubmit(formattedData);
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrorAlert({
        open: true,
        message: `Error al guardar: ${error.message}`,
        severity: 'error'
      });
    }
  };

  // Función para manejar cambios en currentQuantity
  const handleQuantityChange = (field, value) => {
    const numValue = value === '' ? 0 : Number(value);
    setValue(field, numValue, { shouldValidate: true, shouldDirty: true });
  };

  // Función para manejar selección de producto del Excel
  const handleExcelProductSelect = async (excelProduct) => {
    if (!excelProduct) return;
    
    setSelectedExcelProduct(excelProduct);
    
    // Verificar si ya existe en la base de datos
    const existsInDB = await productsService.isCodeExists(excelProduct.code);
    
    if (existsInDB) {
      setValue('isFromExcel', false);
      setValue('code', '');
      setValue('description', '');
      setValue('existingProductId', null);
      setValue('originalCode', null);
      
      // Mostrar alerta
      setErrorAlert({
        open: true,
        message: `⚠️ El producto "${excelProduct.code}" ya existe en la base de datos`,
        severity: 'warning'
      });
      return;
    }
    
    // Rellenar campos del formulario
    setValue('code', excelProduct.code, { shouldValidate: true, shouldDirty: true });
    setValue('description', excelProduct.description, { shouldValidate: true, shouldDirty: true });
    setValue('isFromExcel', true, { shouldValidate: true });
    setValue('existingProductId', null);
    setValue('originalCode', null);
    
    // Si el producto del Excel tiene unidad o departamento, también rellenarlos
    if (excelProduct.unit) {
      setValue('unit', excelProduct.unit, { shouldValidate: true });
    }
    if (excelProduct.department) {
      setValue('department', excelProduct.department, { shouldValidate: true });
    }
    
    // Disparar validación
    trigger(['code', 'description']);
  };

  // Función para limpiar selección del Excel
  const handleClearExcelSelection = () => {
    setSelectedExcelProduct(null);
    setValue('isFromExcel', false);
    setValue('code', '');
    setValue('description', '');
    setValue('existingProductId', product?.id || null);
    setValue('originalCode', product?.code || null);
    trigger(['code', 'description']);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'primary.main', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 2.5,
        px: 3,
        flexShrink: 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <InventoryIcon fontSize="medium" />
          <Typography variant="h6" component="div" fontWeight={600}>
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </Typography>
        </Box>
        <IconButton 
          onClick={onClose}
          sx={{ 
            color: 'white',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
          }}
          size="medium"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(handleFormSubmit)} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <DialogContent sx={{ 
          py: 3, 
          px: 3,
          overflowY: 'auto',
          flex: 1
        }}>
          <Stack spacing={3}>
            {/* Alertas de error */}
            {errorAlert.open && (
              <Alert 
                severity={errorAlert.severity} 
                sx={{ 
                  borderRadius: 1.5,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                onClose={() => setErrorAlert({ ...errorAlert, open: false })}
              >
                {errorAlert.message}
              </Alert>
            )}

            {/* SECCIÓN DE BÚSQUEDA EN EXCEL */}
            {!product && (
              <Box sx={{ 
                p: 2.5, 
                bgcolor: 'info.lighter', 
                borderRadius: 1.5, 
                border: '1px solid', 
                borderColor: 'info.light',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
              }}>
                <Typography variant="subtitle1" gutterBottom color="info.dark" fontWeight={600}>
                  <SearchIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                  Buscar en inventario existente
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
                  Busca productos previamente registrados en el archivo Excel
                </Typography>
                
                <ProductSearch 
                  onSelectProduct={handleExcelProductSelect}
                  disabled={!!selectedExcelProduct || isSubmitting || isFromExcel}
                />
                
                {selectedExcelProduct && (
                  <Box sx={{ 
                    mt: 2.5, 
                    p: 2, 
                    bgcolor: 'success.lighter', 
                    borderRadius: 1, 
                    border: '1px solid', 
                    borderColor: 'success.light'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" color="success.dark" fontWeight={600} sx={{ mb: 0.5 }}>
                          ✅ Producto seleccionado del inventario:
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          <strong>Código:</strong> {selectedExcelProduct.code}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Descripción:</strong> {selectedExcelProduct.description}
                        </Typography>
                      </Box>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        color="error"
                        onClick={handleClearExcelSelection}
                        disabled={isSubmitting}
                        sx={{ ml: 1, minWidth: 90 }}
                      >
                        Cambiar
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {/* Alertas de inventario */}
            {(hasLowStock || hasExcessStock) && (
              <Alert 
                severity={hasLowStock ? "warning" : "info"} 
                sx={{ 
                  borderRadius: 1.5,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  '& .MuiAlert-icon': { fontSize: 22 }
                }}
                icon={hasLowStock ? <WarningIcon /> : null}
              >
                <Typography fontWeight={600} sx={{ mb: 0.5 }}>
                  {hasLowStock ? '⚠️ Stock bajo' : '📊 Stock excedido'}
                </Typography>
                <Typography variant="body2">
                  {hasLowStock 
                    ? `${currentQuantity || 0} ${unit} (Mínimo: ${minQuantity} ${unit})`
                    : `${currentQuantity || 0} ${unit} (Máximo: ${maxQuantity} ${unit})`
                  }
                </Typography>
              </Alert>
            )}

            {/* Código del Producto */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <LocalOfferIcon sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                Código del Producto *
              </Typography>
              <Controller
                name="code"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    placeholder="Ej: PROD-001"
                    error={!!errors.code}
                    disabled={!!product || selectedExcelProduct || validatingCode}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocalOfferIcon color={selectedExcelProduct ? "success" : "action"} />
                        </InputAdornment>
                      ),
                      endAdornment: validatingCode && (
                        <InputAdornment position="end">
                          <CircularProgress size={20} />
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        height: 56
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '1rem'
                      }
                    }}
                    onBlur={async () => {
                      if (field.value && !selectedExcelProduct && !product) {
                        setValidatingCode(true);
                        await trigger('code');
                        setValidatingCode(false);
                      }
                    }}
                  />
                )}
              />
              <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {errors.code ? (
                  <FormHelperText error sx={{ m: 0 }}>
                    {errors.code.type === 'unique-code' 
                      ? '❌ Este código ya existe en el sistema'
                      : `❌ ${errors.code.message}`}
                  </FormHelperText>
                ) : (
                  <FormHelperText sx={{ m: 0 }}>
                    {selectedExcelProduct ? (
                      <span style={{ color: '#2e7d32', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2em', marginRight: 4 }}>✓</span> Código verificado en el inventario
                      </span>
                    ) : (
                      'Ingresa un código único para el producto'
                    )}
                  </FormHelperText>
                )}
                {selectedExcelProduct && (
                  <Chip 
                    label="Del inventario" 
                    size="small" 
                    color="success" 
                    variant="outlined"
                    sx={{ height: 24, fontSize: '0.75rem' }}
                  />
                )}
              </Box>
            </Box>

            {/* Descripción */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <DescriptionIcon sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                Descripción del Producto *
              </Typography>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    placeholder="Ej: Martillo de carpintero profesional con mango de fibra de vidrio..."
                    multiline
                    rows={4}
                    error={!!errors.description}
                    disabled={!!selectedExcelProduct}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DescriptionIcon color={selectedExcelProduct ? "success" : "action"} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        alignItems: 'flex-start',
                        pt: 1
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '1rem',
                        lineHeight: 1.5
                      }
                    }}
                  />
                )}
              />
              {errors.description && (
                <FormHelperText error sx={{ mt: 0.5 }}>
                  ❌ {errors.description.message}
                </FormHelperText>
              )}
            </Box>

            {/* Unidad y Departamento en columna */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Unidad de Medida */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <StraightenIcon sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                  Unidad de Medida *
                </Typography>
                <Controller
                  name="unit"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      error={!!errors.unit}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <StraightenIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          height: 56
                        },
                        '& .MuiInputBase-input': {
                          fontSize: '1rem'
                        }
                      }}
                    >
                      {unitOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value} sx={{ py: 1.5 }}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                {errors.unit && (
                  <FormHelperText error sx={{ mt: 0.5 }}>
                    ❌ {errors.unit.message}
                  </FormHelperText>
                )}
              </Box>

              {/* Departamento/Categoría */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <CategoryIcon sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                  Departamento/Categoría *
                </Typography>
                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      error={!!errors.department}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CategoryIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          height: 56
                        },
                        '& .MuiInputBase-input': {
                          fontSize: '1rem'
                        }
                      }}
                    >
                      {departmentOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value} sx={{ py: 1.5 }}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                {errors.department && (
                  <FormHelperText error sx={{ mt: 0.5 }}>
                    ❌ {errors.department.message}
                  </FormHelperText>
                )}
              </Box>
            </Box>

            {/* Cantidad en Stock */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <NumbersIcon sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                Cantidad en Stock *
              </Typography>
              <Controller
                name="currentQuantity"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    placeholder="0"
                    value={field.value || 0}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleQuantityChange('currentQuantity', value);
                    }}
                    error={!!errors.currentQuantity}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <NumbersIcon color="action" />
                        </InputAdornment>
                      ),
                      inputProps: { 
                        min: 0,
                        step: 0.01
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        height: 56
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '1.1rem',
                        fontWeight: 500
                      }
                    }}
                  />
                )}
              />
              {errors.currentQuantity && (
                <FormHelperText error sx={{ mt: 0.5 }}>
                  ❌ {errors.currentQuantity.message}
                </FormHelperText>
              )}
            </Box>

            <Divider sx={{ my: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                Configuración de Stock (Opcional)
              </Typography>
            </Divider>

            {/* Stock Mínimo y Máximo */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Stock Mínimo */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <TrendingDownIcon sx={{ mr: 1, fontSize: 20, color: 'warning.main' }} />
                  Stock Mínimo
                </Typography>
                <Controller
                  name="minQuantity"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      placeholder="Ej: 10"
                      value={field.value === null || field.value === undefined ? '' : field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        setValue('minQuantity', value === '' ? null : Number(value), {
                          shouldValidate: true,
                          shouldDirty: true
                        });
                      }}
                      error={!!errors.minQuantity}
                      InputProps={{
                        inputProps: { 
                          min: 0,
                          step: 0.01
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          height: 56
                        },
                        '& .MuiInputBase-input': {
                          fontSize: '1rem'
                        }
                      }}
                    />
                  )}
                />
                {errors.minQuantity ? (
                  <FormHelperText error sx={{ mt: 0.5 }}>
                    ❌ {errors.minQuantity.message}
                  </FormHelperText>
                ) : (
                  <FormHelperText sx={{ mt: 0.5 }}>
                    Recibirás alertas cuando el stock sea igual o menor a este valor
                  </FormHelperText>
                )}
              </Box>

              {/* Stock Máximo */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon sx={{ mr: 1, fontSize: 20, color: 'info.main' }} />
                  Stock Máximo
                </Typography>
                <Controller
                  name="maxQuantity"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      placeholder="Ej: 100"
                      value={field.value === null || field.value === undefined ? '' : field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        setValue('maxQuantity', value === '' ? null : Number(value), {
                          shouldValidate: true,
                          shouldDirty: true
                        });
                      }}
                      error={!!errors.maxQuantity}
                      InputProps={{
                        inputProps: { 
                          min: 0,
                          step: 0.01
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          height: 56
                        },
                        '& .MuiInputBase-input': {
                          fontSize: '1rem'
                        }
                      }}
                    />
                  )}
                />
                {errors.maxQuantity ? (
                  <FormHelperText error sx={{ mt: 0.5 }}>
                    ❌ {errors.maxQuantity.message}
                  </FormHelperText>
                ) : (
                  <FormHelperText sx={{ mt: 0.5 }}>
                    Recibirás alertas cuando el stock exceda este valor
                  </FormHelperText>
                )}
              </Box>
            </Box>

            {/* Resumen de Stock - SOLO si hay configuraciones */}
            {(minQuantity || maxQuantity) && (
              <Box sx={{ 
                mt: 1,
                p: 2.5, 
                bgcolor: 'grey.50', 
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'grey.300',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom color="text.primary">
                  📊 Resumen de Configuración
                </Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Stock actual:
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {currentQuantity || 0} {unit}
                    </Typography>
                  </Box>
                  {minQuantity && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Stock mínimo:
                      </Typography>
                      <Typography variant="body1" fontWeight={600} color="warning.main">
                        {minQuantity} {unit}
                      </Typography>
                    </Box>
                  )}
                  {maxQuantity && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Stock máximo:
                      </Typography>
                      <Typography variant="body1" fontWeight={600} color="info.main">
                        {maxQuantity} {unit}
                      </Typography>
                    </Box>
                  )}
                  <Divider sx={{ my: 0.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Margen de seguridad:
                    </Typography>
                    <Typography 
                      variant="body1" 
                      fontWeight={600}
                      color={(currentQuantity || 0) - (minQuantity || 0) <= 0 ? 'error.main' : 'success.main'}
                    >
                      {(currentQuantity || 0) - (minQuantity || 0)} {unit}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>

        {/* Botones SIEMPRE VISIBLES */}
        <DialogActions sx={{ 
          px: 3, 
          py: 2.5, 
          bgcolor: 'grey.50',
          borderTop: '1px solid',
          borderColor: 'grey.300',
          flexShrink: 0,
          position: 'sticky',
          bottom: 0,
          zIndex: 1
        }}>
          <Button 
            onClick={onClose}
            variant="outlined"
            color="inherit"
            sx={{ 
              borderRadius: 1.5,
              minWidth: 100,
              height: 42,
              fontSize: '0.95rem'
            }}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={isSubmitting || (!isDirty && product)}
            sx={{ 
              borderRadius: 1.5,
              minWidth: 150,
              height: 42,
              fontSize: '0.95rem',
              fontWeight: 600,
              bgcolor: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.dark',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              },
              '&:disabled': {
                bgcolor: 'grey.400',
                transform: 'none',
                boxShadow: 'none'
              },
              transition: 'all 0.2s ease'
            }}
          >
            {isSubmitting ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} color="inherit" />
                Guardando...
              </Box>
            ) : product ? 'Guardar Cambios' : 'Crear Producto'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProductForm;