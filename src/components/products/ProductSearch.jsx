import React, { useState, useEffect } from 'react';
import {
  TextField,
  Autocomplete,
  CircularProgress,
  Box,
  Typography,
  Alert,
  Button
} from '@mui/material';
import { excelService } from '../../services/excelService';

const ProductSearch = ({ onSelectProduct, disabled }) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    if (!searchTerm || searchTerm.length < 2) {
      setOptions([]);
      return;
    }

    const loadOptions = async () => {
      setLoading(true);
      setError('');

      try {
        // Cargar todos los productos del Excel
        const allProducts = await excelService.loadProductsFromExcel();
        
        // Filtrar por término de búsqueda
        const filtered = allProducts.filter(product =>
          product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (active) {
          setOptions(filtered.slice(0, 50)); // Limitar a 50 resultados
        }
      } catch (error) {
        console.error('Error cargando productos:', error);
        if (active) {
          setError('Error cargando productos del inventario');
          setOptions([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const debounceTimer = setTimeout(loadOptions, 300);
    
    return () => {
      active = false;
      clearTimeout(debounceTimer);
    };
  }, [searchTerm]);

  const handleInputChange = (event, value) => {
    setSearchTerm(value);
  };

  const handleSelect = (event, value) => {
    if (value) {
      onSelectProduct(value);
      setSearchTerm('');
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Autocomplete
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        onChange={handleSelect}
        onInputChange={handleInputChange}
        options={options}
        getOptionLabel={(option) => `${option.code} - ${option.description}`}
        loading={loading}
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Buscar producto en inventario"
            placeholder="Escribe código o descripción..."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <React.Fragment>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props}>
            <Box>
              <Typography variant="body1" fontWeight="bold">
                {option.code}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {option.description}
              </Typography>
            </Box>
          </li>
        )}
        noOptionsText={
          searchTerm.length < 2 
            ? "Escribe al menos 2 caracteres" 
            : "No se encontraron productos"
        }
      />
      
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      
      <Button 
        variant="outlined" 
        size="small" 
        sx={{ mt: 1 }}
        onClick={async () => {
          setLoading(true);
          try {
            const products = await excelService.loadProductsFromExcel();
            setOptions(products.slice(0, 50));
            setSearchTerm('');
          } catch (error) {
            setError('Error cargando inventario completo');
          } finally {
            setLoading(false);
          }
        }}
      >
        Cargar inventario completo
      </Button>
    </Box>
  );
};

export default ProductSearch;