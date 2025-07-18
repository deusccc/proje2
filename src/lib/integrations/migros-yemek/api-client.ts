import { RijndaelEncryption } from '@/lib/encryption/rijndael';
import { 
  MigrosYemekConfig, 
  MigrosYemekApiResponse, 
  MigrosYemekOrderStatusUpdate,
  MigrosYemekStore
} from './types';

export class MigrosYemekApiClient {
  private config: MigrosYemekConfig;

  constructor(config: MigrosYemekConfig) {
    this.config = config;
  }

  /**
   * Base API request method
   */
  private async makeRequest<T>(
    endpoint: string, 
    data: object, 
    method: 'GET' | 'POST' = 'POST'
  ): Promise<MigrosYemekApiResponse<T>> {
    try {
      const url = `${this.config.baseUrl}${endpoint}`;
      
      // Request body'yi şifrele
      const requestBody = RijndaelEncryption.createRequestBody(data, this.config.secretKey);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'ApiKey': this.config.apiKey,
          'User-Agent': 'Gourmet-POS-Integration/1.0'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Response'u decrypt et (eğer şifrelenmiş ise)
      if (result.value) {
        const decryptedData = RijndaelEncryption.decrypt(result.value, this.config.secretKey);
        return {
          success: true,
          data: JSON.parse(decryptedData)
        };
      }

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error(`Migros Yemek API Error (${endpoint}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API request failed'
      };
    }
  }

  /**
   * Get stores for the restaurant
   */
  async getStores(storeGroupId?: number): Promise<MigrosYemekApiResponse<MigrosYemekStore[]>> {
    const data = storeGroupId ? { storeGroupId } : {};
    return this.makeRequest<MigrosYemekStore[]>('/Store/GetStores', data);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: number, 
    status: MigrosYemekOrderStatusUpdate['status'],
    estimatedDeliveryTime?: string,
    cancelReason?: string
  ): Promise<MigrosYemekApiResponse<any>> {
    const data: MigrosYemekOrderStatusUpdate = {
      orderId,
      status,
      ...(estimatedDeliveryTime && { estimatedDeliveryTime }),
      ...(cancelReason && { cancelReason })
    };

    return this.makeRequest('/Order/UpdateStatus', data);
  }

  /**
   * Confirm order
   */
  async confirmOrder(orderId: number, estimatedDeliveryTime?: string): Promise<MigrosYemekApiResponse<any>> {
    return this.updateOrderStatus(orderId, 'CONFIRMED', estimatedDeliveryTime);
  }

  /**
   * Set order as preparing
   */
  async setOrderPreparing(orderId: number): Promise<MigrosYemekApiResponse<any>> {
    return this.updateOrderStatus(orderId, 'PREPARING');
  }

  /**
   * Set order as ready
   */
  async setOrderReady(orderId: number): Promise<MigrosYemekApiResponse<any>> {
    return this.updateOrderStatus(orderId, 'READY');
  }

  /**
   * Set order as on the way
   */
  async setOrderOnTheWay(orderId: number): Promise<MigrosYemekApiResponse<any>> {
    return this.updateOrderStatus(orderId, 'ON_THE_WAY');
  }

  /**
   * Set order as delivered
   */
  async setOrderDelivered(orderId: number): Promise<MigrosYemekApiResponse<any>> {
    return this.updateOrderStatus(orderId, 'DELIVERED');
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: number, reason: string): Promise<MigrosYemekApiResponse<any>> {
    return this.updateOrderStatus(orderId, 'CANCELLED', undefined, reason);
  }

  /**
   * Get menu items (if available)
   */
  async getMenuItems(): Promise<MigrosYemekApiResponse<any>> {
    return this.makeRequest('/Menu/GetItems', {});
  }

  /**
   * Update menu item availability
   */
  async updateMenuItemAvailability(
    productId: number, 
    isAvailable: boolean
  ): Promise<MigrosYemekApiResponse<any>> {
    const data = {
      productId,
      isAvailable
    };

    return this.makeRequest('/Menu/UpdateAvailability', data);
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<MigrosYemekApiResponse<any>> {
    return this.makeRequest('/Test/Connection', {});
  }

  /**
   * Get order details
   */
  async getOrderDetails(orderId: number): Promise<MigrosYemekApiResponse<any>> {
    const data = { orderId };
    return this.makeRequest('/Order/GetDetails', data);
  }
} 