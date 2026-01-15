import * as XLSX from 'xlsx';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

export const excelService = {
  // Cargar productos desde Excel en Firebase Storage
  async loadProductsFromExcel() {
    try {
      const storage = getStorage();
      const excelRef = ref(storage, 'inventario/inventario.xlsx');
      
      // Obtener URL de descarga
      const downloadURL = await getDownloadURL(excelRef);
      
      // Descargar el archivo
      const response = await fetch(downloadURL);
      const arrayBuffer = await response.arrayBuffer();
      
      // Procesar el Excel
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      // Convertir a formato de productos
      const products = this.parseExcelData(jsonData);
      
      return products;
    } catch (error) {
      console.error('Error cargando Excel:', error);
      throw error;
    }
  },

  // Parsear datos del Excel
  parseExcelData(data) {
    // Asumimos que la primera fila son los headers
    const headers = data[0];
    const rows = data.slice(1);
    
    // Encontrar índices de las columnas
    const codeIndex = headers.findIndex(h => 
      h.toLowerCase().includes('código') || 
      h.toLowerCase().includes('codigo')
    );
    
    const productIndex = headers.findIndex(h => 
      h.toLowerCase().includes('producto') || 
      h.toLowerCase().includes('descripción') ||
      h.toLowerCase().includes('descripcion')
    );
    
    // Mapear filas a productos
    return rows
      .filter(row => row[codeIndex] && row[productIndex]) // Filtrar filas vacías
      .map(row => ({
        code: String(row[codeIndex]).trim(),
        description: String(row[productIndex]).trim(),
        imported: true // Marcar como importado
      }));
  },

  // Verificar si un código ya existe en el Excel
  async isCodeInExcel(code) {
    try {
      const products = await this.loadProductsFromExcel();
      return products.some(product => 
        product.code.toLowerCase() === String(code).toLowerCase().trim()
      );
    } catch (error) {
      console.error('Error verificando código en Excel:', error);
      return false;
    }
  },

  // Obtener producto por código desde Excel
  async getProductByCode(code) {
    try {
      const products = await this.loadProductsFromExcel();
      const product = products.find(p => 
        p.code.toLowerCase() === String(code).toLowerCase().trim()
      );
      return product || null;
    } catch (error) {
      console.error('Error obteniendo producto por código:', error);
      return null;
    }
  },

  // Obtener todos los códigos del Excel
  async getAllExcelCodes() {
    try {
      const products = await this.loadProductsFromExcel();
      return products.map(p => p.code);
    } catch (error) {
      console.error('Error obteniendo códigos del Excel:', error);
      return [];
    }
  }
};