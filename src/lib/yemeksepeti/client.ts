interface YemeksepetiConfig {
  // Yemeksepeti'de gerçek entegrasyon bilgileri
  vendorId: string // Vendor ID (Platform Satıcı ID)
  restaurantName: string // Restaurant Name
  chainCode?: string // Chain Code (Zincir kodu - eğer varsa)
  branchCode?: string // Branch Code (Şube kodu)
  integrationCode?: string // Integration Code (Entegrasyon kodu)
  webhookUrl?: string // Webhook URL
  webhookSecret?: string // Webhook Secret
  baseUrl?: string
}

interface YemeksepetiProduct {
  id: string
  name: string
  description: string
  price: number
  category_id: string
  image_url?: string
  is_available: boolean
  preparation_time?: number
  options?: YemeksepetiProductOption[]
}

interface YemeksepetiProductOption {
  id: string
  name: string
  type: 'single' | 'multiple'
  required: boolean
  choices: YemeksepetiOptionChoice[]
}

interface YemeksepetiOptionChoice {
  id: string
  name: string
  price: number
}

interface YemeksepetiCategory {
  id: string
  name: string
  description?: string
  sort_order: number
  is_active: boolean
}

interface YemeksepetiOrder {
  id: string
  order_number: string
  customer: {
    name: string
    phone: string
    email?: string
  }
  delivery_address: {
    address: string
    latitude?: number
    longitude?: number
    description?: string
  }
  items: YemeksepetiOrderItem[]
  status: string
  total_amount: number
  subtotal: number
  delivery_fee: number
  payment_method: string
  payment_status: string
  estimated_delivery_time: string
  order_date: string
  notes?: string
}

interface YemeksepetiOrderItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  options?: {
    option_id: string
    option_name: string
    choice_id: string
    choice_name: string
    price: number
  }[]
  special_instructions?: string
}

interface YemeksepetiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export class YemeksepetiClient {
  private config: YemeksepetiConfig
  private baseUrl: string

  constructor(config: YemeksepetiConfig) {
    this.config = config
    // Yemeksepeti'nin gerçek API endpoint'i bu değil, bu demo amaçlı
    this.baseUrl = config.baseUrl || 'https://hesapapps-integration.yemeksepeti.com/api/v1'
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<YemeksepetiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Vendor-ID': this.config.vendorId,
        'X-Restaurant-Name': this.config.restaurantName,
        'X-Branch-Code': this.config.branchCode || '',
        'X-Integration-Code': this.config.integrationCode || '',
      }

      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Yemeksepeti API Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Menü Yönetimi
  async getCategories(): Promise<YemeksepetiResponse<YemeksepetiCategory[]>> {
    return this.makeRequest<YemeksepetiCategory[]>('/menu/categories')
  }

  async createCategory(category: Omit<YemeksepetiCategory, 'id'>): Promise<YemeksepetiResponse<YemeksepetiCategory>> {
    return this.makeRequest<YemeksepetiCategory>('/menu/categories', 'POST', category)
  }

  async updateCategory(id: string, category: Partial<YemeksepetiCategory>): Promise<YemeksepetiResponse<YemeksepetiCategory>> {
    return this.makeRequest<YemeksepetiCategory>(`/menu/categories/${id}`, 'PUT', category)
  }

  async deleteCategory(id: string): Promise<YemeksepetiResponse<void>> {
    return this.makeRequest<void>(`/menu/categories/${id}`, 'DELETE')
  }

  async getProducts(): Promise<YemeksepetiResponse<YemeksepetiProduct[]>> {
    return this.makeRequest<YemeksepetiProduct[]>('/menu/products')
  }

  async createProduct(product: Omit<YemeksepetiProduct, 'id'>): Promise<YemeksepetiResponse<YemeksepetiProduct>> {
    return this.makeRequest<YemeksepetiProduct>('/menu/products', 'POST', product)
  }

  async updateProduct(id: string, product: Partial<YemeksepetiProduct>): Promise<YemeksepetiResponse<YemeksepetiProduct>> {
    return this.makeRequest<YemeksepetiProduct>(`/menu/products/${id}`, 'PUT', product)
  }

  async deleteProduct(id: string): Promise<YemeksepetiResponse<void>> {
    return this.makeRequest<void>(`/menu/products/${id}`, 'DELETE')
  }

  async updateProductAvailability(id: string, isAvailable: boolean): Promise<YemeksepetiResponse<void>> {
    return this.makeRequest<void>(`/menu/products/${id}/availability`, 'PUT', { is_available: isAvailable })
  }

  // Sipariş Yönetimi
  async getOrders(params?: {
    status?: string
    date_from?: string
    date_to?: string
    limit?: number
    offset?: number
  }): Promise<YemeksepetiResponse<YemeksepetiOrder[]>> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }
    
    const endpoint = `/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return this.makeRequest<YemeksepetiOrder[]>(endpoint)
  }

  async getOrder(id: string): Promise<YemeksepetiResponse<YemeksepetiOrder>> {
    return this.makeRequest<YemeksepetiOrder>(`/orders/${id}`)
  }

  async updateOrderStatus(id: string, status: string, notes?: string): Promise<YemeksepetiResponse<void>> {
    return this.makeRequest<void>(`/orders/${id}/status`, 'PUT', { status, notes })
  }

  async acceptOrder(id: string, estimatedDeliveryTime: string): Promise<YemeksepetiResponse<void>> {
    return this.makeRequest<void>(`/orders/${id}/accept`, 'POST', { 
      estimated_delivery_time: estimatedDeliveryTime 
    })
  }

  async rejectOrder(id: string, reason: string): Promise<YemeksepetiResponse<void>> {
    return this.makeRequest<void>(`/orders/${id}/reject`, 'POST', { reason })
  }

  // Restoran Bilgileri
  async getRestaurantInfo(): Promise<YemeksepetiResponse<any>> {
    return this.makeRequest<any>('/restaurant/info')
  }

  async updateRestaurantStatus(isOpen: boolean): Promise<YemeksepetiResponse<void>> {
    return this.makeRequest<void>('/restaurant/status', 'PUT', { is_open: isOpen })
  }

  // Webhook Doğrulama
  verifyWebhook(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    
    return signature === expectedSignature
  }

  // Test Bağlantısı
  async testConnection(): Promise<YemeksepetiResponse<{ status: string }>> {
    return this.makeRequest<{ status: string }>('/test')
  }
}

// Utility fonksiyonları
export const createYemeksepetiClient = (config: YemeksepetiConfig): YemeksepetiClient => {
  return new YemeksepetiClient(config)
}

export const mapInternalProductToYemeksepeti = (product: any): Omit<YemeksepetiProduct, 'id'> => {
  return {
    name: product.name,
    description: product.description || '',
    price: product.base_price,
    category_id: product.category_id,
    image_url: product.image_url,
    is_available: product.is_available,
    preparation_time: product.preparation_time || 15,
    options: product.product_variants?.map((variant: any) => ({
      id: variant.id,
      name: variant.name,
      type: 'single' as const,
      required: false,
      choices: [{
        id: variant.id,
        name: variant.name,
        price: variant.price_modifier || 0
      }]
    })) || []
  }
}

export const mapYemeksepetiOrderToInternal = (order: YemeksepetiOrder): any => {
  return {
    external_order_id: order.id,
    order_number: order.order_number,
    customer_name: order.customer.name,
    customer_phone: order.customer.phone,
    customer_email: order.customer.email,
    customer_address: order.delivery_address.address,
    delivery_latitude: order.delivery_address.latitude,
    delivery_longitude: order.delivery_address.longitude,
    status: mapYemeksepetiStatusToInternal(order.status),
    external_status: order.status,
    total_amount: order.total_amount,
    subtotal: order.subtotal,
    delivery_fee: order.delivery_fee,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    estimated_delivery_time: order.estimated_delivery_time,
    order_date: order.order_date,
    notes: order.notes,
    raw_data: order,
    items: order.items.map(item => ({
      external_product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      options: item.options || [],
      special_instructions: item.special_instructions
    }))
  }
}

export const mapYemeksepetiStatusToInternal = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'confirmed': 'confirmed',
    'preparing': 'preparing',
    'ready': 'ready_for_pickup',
    'on_the_way': 'out_for_delivery',
    'delivered': 'delivered',
    'cancelled': 'cancelled'
  }
  
  return statusMap[status] || 'pending'
}

export const mapInternalStatusToYemeksepeti = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'confirmed': 'confirmed',
    'preparing': 'preparing',
    'ready_for_pickup': 'ready',
    'out_for_delivery': 'on_the_way',
    'delivered': 'delivered',
    'cancelled': 'cancelled'
  }
  
  return statusMap[status] || 'pending'
}

export type {
  YemeksepetiConfig,
  YemeksepetiProduct,
  YemeksepetiCategory,
  YemeksepetiOrder,
  YemeksepetiOrderItem,
  YemeksepetiResponse
} 