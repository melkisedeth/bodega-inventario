import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';

const PRODUCTS_COLLECTION = 'products';
const MOVEMENTS_COLLECTION = 'movements';

export const productsService = {
  // Obtener todos los productos
  async getAllProducts() {
    try {
      const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  },

  // Obtener producto por ID
  async getProductById(id) {
    try {
      const docRef = doc(db, PRODUCTS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting product:', error);
      return null;
    }
  },

  // Crear nuevo producto
  async createProduct(productData) {
    try {
      console.log('📦 Datos recibidos para crear producto:', productData);
      
      // Generar código único si no se proporciona
      if (!productData.code) {
        productData.code = await this.generateProductCode();
      }

      const productToSave = {
        code: productData.code || '',
        description: productData.description || '',
        unit: productData.unit || 'pza',
        department: productData.department || 'electronica',
        currentQuantity: Number(productData.currentQuantity) || 0,
        minQuantity: productData.minQuantity ? Number(productData.minQuantity) : null,
        maxQuantity: productData.maxQuantity ? Number(productData.maxQuantity) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: productData.userId || 'anonymous',
        totalMovements: 0,
        importedFromExcel: productData.importedFromExcel || false
      };

      console.log('💾 Producto a guardar:', productToSave);

      const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), productToSave);
      console.log('✅ Producto creado con ID:', docRef.id);
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating product:', error);
      throw error;
    }
  },

  // Actualizar producto
  async updateProduct(id, productData) {
    try {
      console.log('🔄 Actualizando producto ID:', id, 'con datos:', productData);
      
      const docRef = doc(db, PRODUCTS_COLLECTION, id);
      
      const updateData = {
        description: productData.description || '',
        unit: productData.unit || 'pza',
        department: productData.department || 'electronica',
        currentQuantity: Number(productData.currentQuantity) || 0,
        minQuantity: productData.minQuantity ? Number(productData.minQuantity) : null,
        maxQuantity: productData.maxQuantity ? Number(productData.maxQuantity) : null,
        updatedAt: new Date()
      };

      // Solo actualizar código si no es edición (para productos nuevos)
      if (productData.code && !productData.isEdit) {
        updateData.code = productData.code || '';
      }

      console.log('📤 Datos para actualizar:', updateData);
      
      await updateDoc(docRef, updateData);
      console.log('✅ Producto actualizado correctamente');
    } catch (error) {
      console.error('❌ Error updating product:', error);
      throw error;
    }
  },

  // Eliminar producto
  async deleteProduct(id) {
    try {
      const docRef = doc(db, PRODUCTS_COLLECTION, id);
      await deleteDoc(docRef);
      console.log('🗑️ Producto eliminado:', id);
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      throw error;
    }
  },

  // Buscar productos
  async searchProducts(filters) {
    try {
      let q = collection(db, PRODUCTS_COLLECTION);
      const conditions = [];

      if (filters.code) {
        conditions.push(where('code', '==', filters.code));
      }
      if (filters.description) {
        conditions.push(where('description', '>=', filters.description));
        conditions.push(where('description', '<=', filters.description + '\uf8ff'));
      }
      if (filters.department) {
        conditions.push(where('department', '==', filters.department));
      }

      if (conditions.length > 0) {
        q = query(q, ...conditions);
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error searching products:', error);
      return [];
    }
  },

  // Verificar si código ya existe
  async isCodeExists(code) {
    try {
      if (!code) return false;
      
      const q = query(
        collection(db, PRODUCTS_COLLECTION),
        where('code', '==', String(code).trim())
      );
      const snapshot = await getDocs(q);
      const exists = !snapshot.empty;
      console.log(`🔍 Código "${code}" existe en DB:`, exists);
      return exists;
    } catch (error) {
      console.error('❌ Error verificando código:', error);
      return false;
    }
  },

  // Buscar productos por código (para autocomplete)
  async searchByCode(code) {
    try {
      const q = query(
        collection(db, PRODUCTS_COLLECTION),
        where('code', '>=', code),
        where('code', '<=', code + '\uf8ff'),
        orderBy('code'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error buscando por código:', error);
      return [];
    }
  },

  // Generar código único
  async generateProductCode() {
    try {
      const countersRef = doc(db, 'counters', 'products');
      const countersSnap = await getDoc(countersRef);
      
      let lastNumber = 1000;
      if (countersSnap.exists()) {
        lastNumber = countersSnap.data().lastNumber + 1;
      }
      
      await updateDoc(countersRef, {
        lastNumber: lastNumber
      }, { merge: true });
      
      const newCode = `PROD-${lastNumber}`;
      console.log('🔢 Nuevo código generado:', newCode);
      return newCode;
    } catch (error) {
      console.error('❌ Error generating product code:', error);
      return `PROD-${Date.now()}`;
    }
  },

  // Obtener productos con inventario bajo
  async getLowStockProducts() {
    try {
      const products = await this.getAllProducts();
      return products.filter(product => {
        if (!product.minQuantity) return false;
        return product.currentQuantity <= product.minQuantity;
      });
    } catch (error) {
      console.error('❌ Error getting low stock products:', error);
      return [];
    }
  },

  // Obtener productos por agotarse
  async getAlmostOutOfStockProducts() {
    try {
      const products = await this.getAllProducts();
      return products.filter(product => {
        if (!product.minQuantity) return false;
        const threshold = product.minQuantity * 1.1; // +10%
        return product.currentQuantity <= threshold;
      });
    } catch (error) {
      console.error('❌ Error getting almost out of stock products:', error);
      return [];
    }
  },

  // Obtener productos con exceso
  async getExcessStockProducts() {
    try {
      const products = await this.getAllProducts();
      return products.filter(product => {
        if (!product.maxQuantity) return false;
        return product.currentQuantity > product.maxQuantity;
      });
    } catch (error) {
      console.error('❌ Error getting excess stock products:', error);
      return [];
    }
  },

  // Obtener estadísticas
  async getStatistics() {
    try {
      const products = await this.getAllProducts();
      const totalProducts = products.length;
      const totalValue = products.reduce((sum, product) => 
        sum + (product.currentQuantity * (product.unitPrice || 0)), 0);
      const lowStockCount = products.filter(p => 
        p.minQuantity && p.currentQuantity <= p.minQuantity
      ).length;

      return {
        totalProducts,
        totalValue,
        lowStockCount,
        excessStockCount: products.filter(p => 
          p.maxQuantity && p.currentQuantity > p.maxQuantity
        ).length,
        neverMovedCount: products.filter(p => 
          (!p.totalMovements || p.totalMovements === 0)
        ).length
      };
    } catch (error) {
      console.error('❌ Error getting statistics:', error);
      return {
        totalProducts: 0,
        totalValue: 0,
        lowStockCount: 0,
        excessStockCount: 0,
        neverMovedCount: 0
      };
    }
  }
};

export const movementsService = {
  // Registrar movimiento
  async registerMovement(movementData) {
    try {
      const batch = writeBatch(db);
      
      // Actualizar producto
      const productRef = doc(db, PRODUCTS_COLLECTION, movementData.productId);
      batch.update(productRef, {
        currentQuantity: movementData.newQuantity,
        updatedAt: new Date(),
        totalMovements: increment(1)
      });

      // Registrar movimiento
      const movementRef = doc(collection(db, MOVEMENTS_COLLECTION));
      batch.set(movementRef, {
        ...movementData,
        timestamp: new Date(),
        movementId: movementRef.id
      });

      await batch.commit();
      console.log('📝 Movimiento registrado:', movementRef.id);
      return movementRef.id;
    } catch (error) {
      console.error('❌ Error registering movement:', error);
      throw error;
    }
  },

  // Obtener historial por producto
  async getProductHistory(productId) {
    try {
      const q = query(
        collection(db, MOVEMENTS_COLLECTION),
        where('productId', '==', productId),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting product history:', error);
      return [];
    }
  },

  // Obtener todos los movimientos
  async getAllMovements(startDate, endDate) {
    try {
      let q = collection(db, MOVEMENTS_COLLECTION);
      
      if (startDate && endDate) {
        q = query(
          q,
          where('timestamp', '>=', startDate),
          where('timestamp', '<=', endDate),
          orderBy('timestamp', 'desc')
        );
      } else {
        q = query(q, orderBy('timestamp', 'desc'));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting movements:', error);
      return [];
    }
  },

  // Revertir movimiento
  async revertMovement(movementId, reason, userId) {
    try {
      const movementRef = doc(db, MOVEMENTS_COLLECTION, movementId);
      const movementSnap = await getDoc(movementRef);
      
      if (!movementSnap.exists()) {
        throw new Error('Movimiento no encontrado');
      }

      const movement = movementSnap.data();
      const batch = writeBatch(db);

      // Revertir cantidad en producto
      const productRef = doc(db, PRODUCTS_COLLECTION, movement.productId);
      batch.update(productRef, {
        currentQuantity: movement.previousQuantity,
        updatedAt: new Date()
      });

      // Registrar movimiento de reversión
      const revertMovementRef = doc(collection(db, MOVEMENTS_COLLECTION));
      batch.set(revertMovementRef, {
        productId: movement.productId,
        type: 'reversion',
        previousQuantity: movement.newQuantity,
        newQuantity: movement.previousQuantity,
        reason: `Reversión: ${reason}`,
        userId: userId,
        originalMovementId: movementId,
        timestamp: new Date(),
        movementId: revertMovementRef.id
      });

      // Marcar movimiento original como revertido
      batch.update(movementRef, {
        reverted: true,
        revertedAt: new Date(),
        revertedBy: userId,
        reversionReason: reason
      });

      await batch.commit();
      console.log('↩️ Movimiento revertido:', movementId);
    } catch (error) {
      console.error('❌ Error reverting movement:', error);
      throw error;
    }
  }
};