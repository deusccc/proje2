import {
  TrendyolYemekConfig, 
  TrendyolYemekResponse, 
  TrendyolYemekProduct, 
  TrendyolYemekCategory,
  TrendyolYemekOrder,
  TrendyolYemekOrderUpdateRequest,
  TrendyolYemekMenuUpdateRequest,
  TrendyolYemekRestaurantStatusRequest,
  TrendyolYemekRestaurant,
  TrendyolYemekRateLimit
} from '@/types/trendyol-go'
import crypto from 'crypto'

export class TrendyolYemekClient {
  private config: TrendyolYemekConfig
  private baseUrl: string
  private rateLimit: TrendyolYemekRateLimit | null = null

  constructor(config: TrendyolYemekConfig) {
    this.config = config
    // Gerçek Trendyol GO API endpoint'lerini kullan
    this.baseUrl = config.baseUrl || 'https://api.tgoapis.com'
  }

  private getAuthHeaders(): Record<string, string> {
    // Trendyol GO API Basic Authentication kullanır
    // API_KEY:API_SECRET formatında base64 encode edilir
    const credentials = `${this.config.apiKey}:${this.config.apiSecret}`
    const basicAuth = Buffer.from(credentials).toString('base64')
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'User-Agent': `${this.config.sellerId} - SelfIntegration`,
      'Accept': 'application/json'
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<TrendyolYemekResponse<T>> {
      const url = `${this.baseUrl}${endpoint}`
    const headers = this.getAuthHeaders()

    // Rate limiting kontrolü
    if (this.rateLimit) {
      const now = Date.now()
      if (now < this.rateLimit.resetTime) {
        const waitTime = this.rateLimit.resetTime - now
        console.log(`⏳ Rate limit aşıldı, ${waitTime}ms bekleniyor...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    const requestOptions: any = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
      }

      console.log('🔗 Trendyol GO API Request:', {
        method,
        url,
        headers: {
          ...headers,
        'Authorization': 'Basic [HIDDEN]'
      },
      body: body ? '[BODY]' : undefined
    })

    try {
      const response = await fetch(url, requestOptions)

      // Rate limiting bilgilerini güncelle
      this.updateRateLimit(response)

      console.log('📥 Trendyol GO API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Trendyol GO API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        return {
          success: false,
          error: `API Error: ${response.status} ${response.statusText}`
        }
      }

      const responseText = await response.text()
      console.log('📄 Raw Response:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''))

      // Boş response kontrolü
      if (!responseText || responseText.trim() === '') {
        console.log('⚠️ Boş response alındı')
        return {
          success: true,
          data: [] as any // Boş array döndür
        }
      }

      let data: T
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError)
        return {
          success: false,
          error: 'Invalid JSON response'
        }
      }

      console.log('✅ Trendyol GO API Success Response:', Array.isArray(data) ? `Array with ${data.length} items` : typeof data)
      
      return {
        success: true,
        data
      }
    } catch (error) {
      console.error('❌ Trendyol GO API Request Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private updateRateLimit(response: Response): void {
    const limit = response.headers.get('X-RateLimit-Limit')
    const remaining = response.headers.get('X-RateLimit-Remaining')
    const reset = response.headers.get('X-RateLimit-Reset')

    if (limit && remaining && reset) {
      this.rateLimit = {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        resetTime: parseInt(reset)
      }
    }
  }

  // Rate limiting bilgisini al
  getRateLimit(): TrendyolYemekRateLimit | null {
    return this.rateLimit
  }

  // Webhook imza doğrulama
  verifyWebhook(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.apiSecret)
        .update(payload)
        .digest('hex')
      
      return signature === expectedSignature
    } catch (error) {
      console.error('Webhook verification error:', error)
      return false
    }
  }

  // Sipariş işlemleri
  async getOrders(params?: {
    page?: number
    size?: number
    status?: string
    startDate?: string
    endDate?: string
  }): Promise<TrendyolYemekResponse<{
    orders: TrendyolYemekOrder[]
    totalCount: number
    page: number
    size: number
  }>> {
    try {
    const queryParams = new URLSearchParams()
    
      if (params?.size) queryParams.append('size', params.size.toString())
    if (params?.startDate) {
      const startTimestamp = new Date(params.startDate).getTime()
      queryParams.append('packageModificationStartDate', startTimestamp.toString())
    }
    if (params?.endDate) {
      const endTimestamp = new Date(params.endDate).getTime()
      queryParams.append('packageModificationEndDate', endTimestamp.toString())
    }

      const endpoint = `/integrator/order/meal/suppliers/${this.config.sellerId}/packages${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const result = await this.makeRequest<any>(endpoint)
      
      if (result.success) {
        const orders = Array.isArray(result.data) ? result.data : []
        return {
          success: true,
          data: {
            orders: orders.map((order: any) => ({
              id: order.id,
              orderNumber: order.orderNumber,
              status: order.status,
              createdAt: order.createdAt,
              updatedAt: order.updatedAt,
              customer: order.customer,
              deliveryAddress: order.deliveryAddress,
              items: order.items || [],
              totalAmount: order.totalAmount,
              deliveryFee: order.deliveryFee || 0,
              serviceFee: order.serviceFee || 0,
              discountAmount: order.discountAmount || 0,
              finalAmount: order.finalAmount,
              paymentMethod: order.paymentMethod,
              paymentStatus: order.paymentStatus,
              deliveryType: order.deliveryType,
              estimatedDeliveryTime: order.estimatedDeliveryTime,
              actualDeliveryTime: order.actualDeliveryTime,
              customerNote: order.customerNote,
              restaurantNote: order.restaurantNote
            })),
            totalCount: orders.length,
            page: params?.page || 1,
            size: params?.size || 50
          }
        }
      }
      
      return {
        success: false,
        error: result.error || 'Failed to fetch orders'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getOrder(orderId: string): Promise<TrendyolYemekResponse<TrendyolYemekOrder>> {
    const endpoint = `/integrator/order/meal/suppliers/${this.config.sellerId}/packages/${orderId}`
    return this.makeRequest<TrendyolYemekOrder>(endpoint)
  }

  async updateOrderStatus(request: TrendyolYemekOrderUpdateRequest): Promise<TrendyolYemekResponse<void>> {
    const endpoint = `/integrator/order/meal/suppliers/${this.config.sellerId}/packages/${request.orderId}/status`
    return this.makeRequest<void>(endpoint, 'PUT', {
      status: request.status,
      estimatedDeliveryTime: request.estimatedDeliveryTime,
      rejectReason: request.rejectReason,
      notes: request.notes
    })
  }

  async acceptOrder(orderId: string, estimatedDeliveryTime?: string): Promise<TrendyolYemekResponse<void>> {
    return this.updateOrderStatus({
      orderId,
      status: 'CONFIRMED',
      estimatedDeliveryTime
    })
  }

  async rejectOrder(orderId: string, reason: string): Promise<TrendyolYemekResponse<void>> {
    return this.updateOrderStatus({
      orderId,
      status: 'CANCELLED',
      rejectReason: reason
    })
  }

  async markOrderReady(orderId: string): Promise<TrendyolYemekResponse<void>> {
    return this.updateOrderStatus({
      orderId,
      status: 'READY'
    })
  }

  async markOrderDelivered(orderId: string): Promise<TrendyolYemekResponse<void>> {
    return this.updateOrderStatus({
      orderId,
      status: 'DELIVERED'
    })
  }

  // Menü işlemleri
  async getMenu(): Promise<TrendyolYemekResponse<{
    categories: TrendyolYemekCategory[]
    products: TrendyolYemekProduct[]
  }>> {
    try {
      const endpoint = `/integrator/product/meal/suppliers/${this.config.sellerId}/stores/${this.config.restaurantId}/products`
      const result = await this.makeRequest<any>(endpoint)
      
      if (result.success) {
        const products = Array.isArray(result.data) ? result.data : []
        return {
          success: true,
          data: {
            categories: [], // Kategoriler ayrı endpoint'ten gelecek
            products: products.map((product: any) => ({
              id: product.id,
              name: product.name,
              description: product.description,
              price: product.sellingPrice,
              originalPrice: product.originalPrice,
              isAvailable: product.isAvailable !== undefined ? product.isAvailable : (product.status === 'ACTIVE'), // Hem isAvailable hem status kontrolü
              categoryId: product.categoryId || 'default',
              imageUrl: product.imageUrl,
              ingredients: product.ingredients || [],
              allergens: product.allergens || [],
              variants: product.variants || [],
              modifierGroups: product.modifierGroups || []
            }))
          }
        }
      }
      
      return {
        success: false,
        error: result.error || 'Failed to fetch menu'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Restoran menüsünü al (Trendyol GO API endpoint'i kullan)
  async getRestaurantMenu(): Promise<TrendyolYemekResponse<{
    products: TrendyolYemekProduct[]
    sections: TrendyolYemekCategory[]
    ingredients: any[]
    modifierGroups: any[]
  }>> {
    try {
      console.log('🔄 Fetching restaurant menu from Trendyol GO API...')
      console.log('🔧 Config:', {
        baseUrl: this.baseUrl,
        sellerId: this.config.sellerId,
        restaurantId: this.config.restaurantId,
        apiKey: this.config.apiKey ? `${this.config.apiKey.substring(0, 8)}...` : 'MISSING',
        apiSecret: this.config.apiSecret ? `${this.config.apiSecret.substring(0, 8)}...` : 'MISSING'
      })
      
      // Resmi dokümantasyona göre endpoint
      const endpoint = `/integrator/product/meal/suppliers/${this.config.sellerId}/stores/${this.config.restaurantId}/products`
      
      console.log(`🔗 Using official endpoint: ${endpoint}`)
      const result = await this.makeRequest<any>(endpoint)
      
      if (result.success && result.data) {
        console.log(`✅ Success with official endpoint`)
        
        // Response formatı dokümantasyona göre
        const responseData = result.data
        
        // Debug: Response yapısını logla
        console.log('🔍 Raw API Response structure:', {
          isArray: Array.isArray(responseData),
          hasProducts: !!responseData.products,
          hasSections: !!responseData.sections,
          directProductsCount: Array.isArray(responseData) ? responseData.length : 0,
          nestedProductsCount: responseData.products?.length || 0
        })
        
        // API'den gelen response'da ürünler doğrudan array olarak geliyor
        const products = Array.isArray(responseData) ? responseData : (responseData.products || [])
        
        // Debug: İlk ürünün ham halini logla
        if (products.length > 0) {
          console.log('🔍 First product raw data:', JSON.stringify(products[0], null, 2))
          
          const firstProduct = products[0]
          console.log('🔍 First product availability check:', {
            hasIsAvailable: firstProduct.isAvailable !== undefined,
            isAvailableValue: firstProduct.isAvailable,
            hasStatus: firstProduct.status !== undefined,
            statusValue: firstProduct.status,
            finalIsAvailable: firstProduct.isAvailable !== undefined ? firstProduct.isAvailable : (firstProduct.status === 'ACTIVE')
          })
        }
        
        return {
          success: true,
          data: {
            products: products.map((product: any) => ({
              id: product.id,
              name: product.name,
              description: product.description,
              price: product.sellingPrice,
              originalPrice: product.originalPrice,
              isAvailable: product.isAvailable !== undefined ? product.isAvailable : (product.status === 'ACTIVE'), // Hem isAvailable hem status kontrolü
              categoryId: product.categoryId || 'default',
              imageUrl: product.imageUrl,
              ingredients: product.ingredients || [],
              allergens: product.allergens || [],
              variants: product.variants || [],
              modifierGroups: product.modifierGroups || []
            })),
            sections: responseData.sections || [],
            ingredients: responseData.ingredients || [],
            modifierGroups: responseData.modifierGroups || []
          }
        }
      } else {
        console.log(`❌ Failed with official endpoint: ${result.error || 'Empty response'}`)
        
        // Hata mesajını analiz et
        let errorMessage = result.error || 'API request failed'
        
        if (result.error?.includes('556') || result.error?.includes('Service Unavailable')) {
          errorMessage = 'Trendyol GO API geçici olarak hizmet veremiyor (556 Service Unavailable). Lütfen birkaç dakika sonra tekrar deneyin.'
        } else if (result.error?.includes('401') || result.error?.includes('Unauthorized')) {
          errorMessage = 'Authentication hatası (401 Unauthorized). API anahtarları kontrol edilmelidir.'
        }
        
        return {
          success: false,
          error: errorMessage
        }
      }
    } catch (error) {
      console.error('Error fetching restaurant menu:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async updateMenu(request: TrendyolYemekMenuUpdateRequest): Promise<TrendyolYemekResponse<void>> {
    const endpoint = `/integrator/product/meal/suppliers/${this.config.sellerId}/stores/${this.config.restaurantId}/menu`
    return this.makeRequest<void>(endpoint, 'PUT', request)
  }

  async getCategories(): Promise<TrendyolYemekResponse<TrendyolYemekCategory[]>> {
    const endpoint = `/integrator/product/meal/suppliers/${this.config.sellerId}/stores/${this.config.restaurantId}/categories`
    return this.makeRequest<TrendyolYemekCategory[]>(endpoint)
  }

  async createCategory(category: Omit<TrendyolYemekCategory, 'id'>): Promise<TrendyolYemekResponse<TrendyolYemekCategory>> {
    const endpoint = `/integrator/product/meal/suppliers/${this.config.sellerId}/stores/${this.config.restaurantId}/categories`
    return this.makeRequest<TrendyolYemekCategory>(endpoint, 'POST', category)
  }

  async updateCategory(categoryId: string, category: Partial<TrendyolYemekCategory>): Promise<TrendyolYemekResponse<TrendyolYemekCategory>> {
    const endpoint = `/integrator/product/meal/suppliers/${this.config.sellerId}/stores/${this.config.restaurantId}/categories/${categoryId}`
    return this.makeRequest<TrendyolYemekCategory>(endpoint, 'PUT', category)
  }

  async deleteCategory(categoryId: string): Promise<TrendyolYemekResponse<void>> {
    const endpoint = `/integrator/product/meal/suppliers/${this.config.sellerId}/stores/${this.config.restaurantId}/categories/${categoryId}`
    return this.makeRequest<void>(endpoint, 'DELETE')
  }

  async getProducts(): Promise<TrendyolYemekResponse<TrendyolYemekProduct[]>> {
    const endpoint = `/integrator/product/meal/suppliers/${this.config.sellerId}/stores/${this.config.restaurantId}/products`
    const result = await this.makeRequest<any>(endpoint)
    
    if (result.success) {
      const products = Array.isArray(result.data) ? result.data : []
      return {
        success: true,
        data: products.map((product: any) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.sellingPrice,
          originalPrice: product.originalPrice,
          isAvailable: product.isAvailable !== undefined ? product.isAvailable : (product.status === 'ACTIVE'), // Hem isAvailable hem status kontrolü
          categoryId: product.categoryId || 'default',
          imageUrl: product.imageUrl,
          ingredients: product.ingredients || [],
          allergens: product.allergens || [],
          variants: product.variants || [],
          modifierGroups: product.modifierGroups || []
        }))
      }
    }
    
    return {
      success: false,
      error: result.error || 'Failed to fetch products'
    }
  }

  async createProduct(product: Omit<TrendyolYemekProduct, 'id'>): Promise<TrendyolYemekResponse<TrendyolYemekProduct>> {
    const endpoint = `/integrator/product/meal/suppliers/${this.config.sellerId}/stores/${this.config.restaurantId}/products`
    return this.makeRequest<TrendyolYemekProduct>(endpoint, 'POST', product)
  }

  async updateProduct(productId: string, product: Partial<TrendyolYemekProduct>): Promise<TrendyolYemekResponse<TrendyolYemekProduct>> {
    const endpoint = `/integrator/product/meal/suppliers/${this.config.sellerId}/stores/${this.config.restaurantId}/products/${productId}`
    return this.makeRequest<TrendyolYemekProduct>(endpoint, 'PUT', product)
  }

  async deleteProduct(productId: string): Promise<TrendyolYemekResponse<void>> {
    const endpoint = `/integrator/product/meal/suppliers/${this.config.sellerId}/stores/${this.config.restaurantId}/products/${productId}`
    return this.makeRequest<void>(endpoint, 'DELETE')
  }

  // Ürün durumunu güncelle (Trendyol GO API endpoint'i kullan)
  async updateProductAvailability(productId: string, isAvailable: boolean): Promise<TrendyolYemekResponse<void>> {
    try {
      console.log('🔄 Updating product availability...', { productId, isAvailable })
      
      // Resmi dokümantasyona göre endpoint ve format
      const status = isAvailable ? 'ACTIVE' : 'PASSIVE'
      const endpoint = `/integrator/product/meal/suppliers/${this.config.sellerId}/stores/${this.config.restaurantId}/products/${productId}/status`
      
      console.log(`🔗 Using official product status endpoint: ${endpoint}`)
      console.log(`📝 Request body: { "status": "${status}" }`)
      
      const result = await this.makeRequest<void>(endpoint, 'PUT', { status })
      
      if (result.success) {
        console.log(`✅ Product ${productId} status updated to ${status}`)
        return {
          success: true,
          data: undefined
        }
      } else {
        console.log(`❌ Failed to update product ${productId} status: ${result.error}`)
        
        // Hata mesajını analiz et
        let errorMessage = result.error || 'Ürün durumu güncellenemedi'
        
        if (result.error?.includes('556') || result.error?.includes('Service Unavailable')) {
          errorMessage = 'Trendyol GO API geçici olarak hizmet veremiyor. Lütfen birkaç dakika sonra tekrar deneyin.'
        } else if (result.error?.includes('401') || result.error?.includes('Unauthorized')) {
          errorMessage = 'Authentication hatası. API anahtarları kontrol edilmelidir.'
        } else if (result.error?.includes('409')) {
          errorMessage = 'Aynı şube özelinde değişiklik yapılmış olabilir. Tekrar deneyin.'
        }
        
        return {
          success: false,
          error: errorMessage
        }
      }
    } catch (error) {
      console.error('❌ Product availability update error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Kategori durumunu güncelle (Trendyol GO API endpoint'i kullan)
  async updateCategoryAvailability(categoryId: string, isAvailable: boolean): Promise<TrendyolYemekResponse<void>> {
    try {
      console.log('🔄 Updating category availability...', { categoryId, isAvailable })
      
      // Resmi dokümantasyona göre endpoint ve format
      const status = isAvailable ? 'ACTIVE' : 'PASSIVE'
      const endpoint = `/integrator/product/meal/suppliers/${this.config.sellerId}/stores/${this.config.restaurantId}/sections/${categoryId}/status`
      
      console.log(`🔗 Using official category status endpoint: ${endpoint}`)
      console.log(`📝 Request body: { "status": "${status}" }`)
      
      const result = await this.makeRequest<void>(endpoint, 'PUT', { status })
      
      if (result.success) {
        console.log(`✅ Category ${categoryId} status updated to ${status}`)
        return {
          success: true,
          data: undefined
        }
      } else {
        console.log(`❌ Failed to update category ${categoryId} status: ${result.error}`)
        
        // Hata mesajını analiz et
        let errorMessage = result.error || 'Kategori durumu güncellenemedi'
        
        if (result.error?.includes('556') || result.error?.includes('Service Unavailable')) {
          errorMessage = 'Trendyol GO API geçici olarak hizmet veremiyor. Lütfen birkaç dakika sonra tekrar deneyin.'
        } else if (result.error?.includes('401') || result.error?.includes('Unauthorized')) {
          errorMessage = 'Authentication hatası. API anahtarları kontrol edilmelidir.'
        } else if (result.error?.includes('409')) {
          errorMessage = 'Aynı şube özelinde değişiklik yapılmış olabilir. Tekrar deneyin.'
        }
        
        return {
          success: false,
          error: errorMessage
        }
      }
    } catch (error) {
      console.error('❌ Category availability update error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Restoran işlemleri
  async getRestaurantInfo(): Promise<TrendyolYemekResponse<TrendyolYemekRestaurant>> {
    // Trendyol GO API'sinde restoran bilgileri için ayrı endpoint yok
    // Ürün listesi endpoint'ini kullanarak bağlantı testi yapabiliriz
    try {
      const endpoint = `/integrator/product/meal/suppliers/${this.config.sellerId}/stores/${this.config.restaurantId}/products`
      const result = await this.makeRequest<any>(endpoint)
      
      if (result.success) {
        // Mock restaurant info döndür
        return {
          success: true,
          data: {
            id: this.config.restaurantId,
            name: 'Restaurant',
            description: 'Trendyol GO Restaurant',
            isOpen: true,
            address: {
              title: 'Restaurant Address',
              address: 'Address',
              district: 'District',
              city: 'City',
              coordinates: { latitude: 0, longitude: 0 }
            },
            contact: {
              phone: 'Phone',
              email: 'email@restaurant.com'
            },
            operatingHours: [],
            deliverySettings: {
              minOrderAmount: 0,
              maxDeliveryDistance: 0,
              deliveryFee: 0,
              estimatedDeliveryTime: 30
            },
            categories: [],
            products: []
          }
        }
      }
      
      return {
        success: false,
        error: result.error || 'Failed to get restaurant info'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async updateRestaurantStatus(request: TrendyolYemekRestaurantStatusRequest): Promise<TrendyolYemekResponse<void>> {
    // Trendyol GO API'sinde restoran durumu güncelleme endpoint'i farklı olabilir
    // Şimdilik mock response döndür
    return {
      success: true,
      data: undefined
    }
  }

  async openRestaurant(): Promise<TrendyolYemekResponse<void>> {
    return this.updateRestaurantStatus({
      isOpen: true
    })
  }

  async closeRestaurant(reason?: string, reopenTime?: string): Promise<TrendyolYemekResponse<void>> {
    return this.updateRestaurantStatus({
      isOpen: false,
      reason,
      reopenTime
    })
  }

  // Raporlama
  async getOrderReport(params: {
    startDate: string
    endDate: string
    status?: string
  }): Promise<TrendyolYemekResponse<{
    orders: TrendyolYemekOrder[]
    totalCount: number
    totalRevenue: number
    averageOrderValue: number
  }>> {
    try {
      const ordersResult = await this.getOrders({
        startDate: params.startDate,
        endDate: params.endDate,
        size: 1000
      })
      
      if (ordersResult.success && ordersResult.data) {
        const orders = ordersResult.data.orders
        const totalRevenue = orders.reduce((sum, order) => sum + order.finalAmount, 0)
        const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0
        
        return {
          success: true,
          data: {
            orders,
            totalCount: orders.length,
            totalRevenue,
            averageOrderValue
          }
        }
      }
      
      return {
        success: false,
        error: ordersResult.error || 'Failed to get order report'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getProductReport(params: {
    startDate: string
    endDate: string
  }): Promise<TrendyolYemekResponse<Array<{
    productId: string
    productName: string
    orderCount: number
    revenue: number
  }>>> {
    try {
      const ordersResult = await this.getOrders({
        startDate: params.startDate,
        endDate: params.endDate,
        size: 1000
      })
      
      if (ordersResult.success && ordersResult.data) {
        const productStats = new Map<string, { name: string, count: number, revenue: number }>()
        
        ordersResult.data.orders.forEach(order => {
          order.items.forEach(item => {
            const existing = productStats.get(item.productId) || { name: item.productName, count: 0, revenue: 0 }
            existing.count += item.quantity
            existing.revenue += item.totalPrice
            productStats.set(item.productId, existing)
          })
        })
        
        const report = Array.from(productStats.entries()).map(([productId, stats]) => ({
          productId,
          productName: stats.name,
          orderCount: stats.count,
          revenue: stats.revenue
        }))
        
        return {
          success: true,
          data: report
        }
      }
      
      return {
        success: false,
        error: ordersResult.error || 'Failed to get product report'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Bağlantı Testi (Trendyol GO API kullan)
  async testConnection(): Promise<TrendyolYemekResponse<{ status: string, message: string }>> {
    try {
      console.log('🧪 Testing Trendyol GO API connection...')
      console.log('🔧 Test Config:', {
        baseUrl: this.baseUrl,
        sellerId: this.config.sellerId,
        restaurantId: this.config.restaurantId,
        apiKey: this.config.apiKey ? `${this.config.apiKey.substring(0, 8)}...` : 'MISSING',
        apiSecret: this.config.apiSecret ? `${this.config.apiSecret.substring(0, 8)}...` : 'MISSING'
      })
      
      // Resmi dokümantasyona göre endpoint
      const endpoint = `/integrator/product/meal/suppliers/${this.config.sellerId}/stores/${this.config.restaurantId}/products`
      const result = await this.makeRequest<any>(endpoint)
      
      if (result.success) {
        return {
          success: true,
          data: {
            status: 'connected',
            message: 'Trendyol GO API bağlantısı başarılı'
          }
        }
      }
      
      // Hata mesajını analiz et
      let errorMessage = result.error || 'Bağlantı testi başarısız'
      
      if (result.error?.includes('556') || result.error?.includes('Service Unavailable')) {
        errorMessage = 'Trendyol GO API geçici olarak hizmet veremiyor (556 Service Unavailable). Lütfen birkaç dakika sonra tekrar deneyin.'
      } else if (result.error?.includes('401') || result.error?.includes('Unauthorized')) {
        errorMessage = 'Authentication hatası (401 Unauthorized). API anahtarları kontrol edilmelidir.'
      }
      
          return {
            success: false,
        error: errorMessage
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bağlantı testi sırasında hata oluştu'
      }
    }
  }
}

// Factory fonksiyonu
export const createTrendyolYemekClient = (config: TrendyolYemekConfig): TrendyolYemekClient => {
  return new TrendyolYemekClient(config)
} 

// Backward compatibility
export const createTrendyolGoClient = createTrendyolYemekClient
export const TrendyolGoClient = TrendyolYemekClient 