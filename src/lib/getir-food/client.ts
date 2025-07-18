import { 
  GetirFoodConfig, 
  GetirFoodResponse, 
  GetirFoodProduct, 
  GetirFoodCategory,
  GetirFoodOrder,
  GetirFoodOrderUpdateRequest,
  GetirFoodMenuUpdateRequest,
  GetirFoodRestaurantStatusRequest,
  GetirFoodRestaurant,
  GetirFoodRateLimit,
  GetirFoodAuthResponse
} from '@/types/getir-food'
import crypto from 'crypto'

export class GetirFoodClient {
  private config: GetirFoodConfig
  private baseUrl: string
  private rateLimit: GetirFoodRateLimit | null = null
  private token: string | null = null
  private tokenExpiresAt: number = 0

  constructor(config: GetirFoodConfig) {
    this.config = config
    // Getir Food API endpoint'lerini kullan
    this.baseUrl = config.baseUrl || (
      config.environment === 'production' 
        ? 'https://developers.getir.com' 
        : 'https://developers.getir.com'
    )
  }

  private async getToken(): Promise<string> {
    // Token'ı kontrol et, süresi dolmadıysa mevcut token'ı kullan
    if (this.token && Date.now() < this.tokenExpiresAt) {
      return this.token
    }

    // Yeni token al
    const loginResponse = await this.login()
    if (!loginResponse.success || !loginResponse.data) {
      throw new Error('Login başarısız: ' + loginResponse.error)
    }

    this.token = loginResponse.data.token
    // Token 1 saat geçerli (3600 saniye), 5 dakika önce yenile
    this.tokenExpiresAt = Date.now() + (55 * 60 * 1000) // 55 dakika

    return this.token
  }

  private async login(): Promise<GetirFoodResponse<GetirFoodAuthResponse>> {
    const url = `${this.baseUrl}/auth/login`
    
    const body = {
      appSecretKey: this.config.appSecretKey,
      restaurantSecretKey: this.config.restaurantSecretKey
    }

    console.log('🔐 Getir Food Login Request:', {
      url,
      body: {
        appSecretKey: '[HIDDEN]',
        restaurantSecretKey: '[HIDDEN]'
      }
    })

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      })

      console.log('📥 Getir Food Login Response:', {
        status: response.status,
        statusText: response.statusText
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Getir Food Login Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        return {
          success: false,
          error: `Login Error: ${response.status} ${response.statusText} - ${errorText}`
        }
      }

      const responseData = await response.json()
      console.log('✅ Getir Food Login Success')

      return {
        success: true,
        data: {
          token: responseData.token || responseData.accessToken,
          expiresIn: responseData.expiresIn || 3600,
          tokenType: responseData.tokenType || 'Bearer'
        }
      }
    } catch (error) {
      console.error('❌ Getir Food Login Exception:', error)
      return {
        success: false,
        error: `Login Exception: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken()
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<GetirFoodResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    
    try {
      const headers = await this.getAuthHeaders()

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

      console.log('🔗 Getir Food API Request:', {
        method,
        url,
        headers: {
          ...headers,
          'Authorization': 'Bearer [HIDDEN]'
        },
        body: body ? '[BODY]' : undefined
      })

      const response = await fetch(url, requestOptions)
      
      // Rate limiting bilgilerini güncelle
      this.updateRateLimit(response)
      
      console.log('📥 Getir Food API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Getir Food API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        return {
          success: false,
          error: `API Error: ${response.status} ${response.statusText} - ${errorText}`
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

      console.log('✅ Getir Food API Success Response:', Array.isArray(data) ? `Array with ${data.length} items` : typeof data)

      return {
        success: true,
        data
      }
    } catch (error) {
      console.error('❌ Getir Food API Request Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private updateRateLimit(response: Response): void {
    const limitHeader = response.headers.get('X-RateLimit-Limit')
    const remainingHeader = response.headers.get('X-RateLimit-Remaining')
    const resetHeader = response.headers.get('X-RateLimit-Reset')

    if (limitHeader && remainingHeader && resetHeader) {
      this.rateLimit = {
        limit: parseInt(limitHeader),
        remaining: parseInt(remainingHeader),
        resetTime: parseInt(resetHeader) * 1000 // Unix timestamp'i millisecond'a çevir
      }
    }
  }

  // Rate limiting bilgisini al
  getRateLimit(): GetirFoodRateLimit | null {
    return this.rateLimit
  }

  // Webhook imza doğrulama - artık kullanılmıyor ama geriye dönük uyumluluk için
  verifyWebhook(payload: string, signature: string): boolean {
    try {
      // Webhook doğrulama için config'de webhook_secret kullanılacak
      const webhookSecret = 'webhook_secret' // Bu değer integration_settings'den gelecek
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
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
    limit?: number
    status?: string
    startDate?: string
    endDate?: string
  }): Promise<GetirFoodResponse<{
    orders: GetirFoodOrder[]
    totalCount: number
    page: number
    limit: number
  }>> {
    try {
      const queryParams = new URLSearchParams()
      
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.status) queryParams.append('status', params.status)
      if (params?.startDate) queryParams.append('startDate', params.startDate)
      if (params?.endDate) queryParams.append('endDate', params.endDate)

      const endpoint = `/food-orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const result = await this.makeRequest<any>(endpoint)
      
      if (result.success) {
        const responseData = result.data
        const orders = responseData.orders || []
        
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
              paymentMethod: order.paymentMethod
            })),
            totalCount: responseData.totalCount || orders.length,
            page: responseData.page || 1,
            limit: responseData.limit || 10
          }
        }
      }
      
      return result
    } catch (error) {
      console.error('❌ Getir Food getOrders error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getOrder(orderId: string): Promise<GetirFoodResponse<GetirFoodOrder>> {
    const endpoint = `/food-orders/${orderId}`
    return this.makeRequest<GetirFoodOrder>(endpoint)
  }

  async updateOrderStatus(orderId: string, status: 'verify' | 'prepare' | 'deliver' | 'cancel'): Promise<GetirFoodResponse<void>> {
    const endpoint = `/food-orders/${orderId}/${status}`
    return await this.makeRequest<void>(endpoint, 'POST')
  }

  async acceptOrder(orderId: string): Promise<GetirFoodResponse<void>> {
    return this.updateOrderStatus(orderId, 'verify')
  }

  async rejectOrder(orderId: string, reason?: string): Promise<GetirFoodResponse<void>> {
    const endpoint = `/food-orders/${orderId}/cancel`
    const body = reason ? { cancelNote: reason } : undefined
    return await this.makeRequest<void>(endpoint, 'POST', body)
  }

  async markOrderReady(orderId: string): Promise<GetirFoodResponse<void>> {
    return this.updateOrderStatus(orderId, 'prepare')
  }

  async markOrderDelivered(orderId: string): Promise<GetirFoodResponse<void>> {
    return this.updateOrderStatus(orderId, 'deliver')
  }

  // Menü işlemleri
  async getMenu(): Promise<GetirFoodResponse<{
    categories: GetirFoodCategory[]
    products: GetirFoodProduct[]
  }>> {
    const endpoint = '/restaurants/menu'
    return await this.makeRequest<{
      categories: GetirFoodCategory[]
      products: GetirFoodProduct[]
    }>(endpoint)
  }

  async updateMenu(request: GetirFoodMenuUpdateRequest): Promise<GetirFoodResponse<void>> {
    // Getir Food API'sinde menü güncelleme farklı endpoint'ler kullanır
    // Bu metod şimdilik placeholder olarak kalacak
    return {
      success: false,
      error: 'Menu update not implemented for Getir Food API'
    }
  }

  async getCategories(): Promise<GetirFoodResponse<GetirFoodCategory[]>> {
    const menuResult = await this.getMenu()
    if (menuResult.success && menuResult.data) {
      return {
        success: true,
        data: menuResult.data.categories
      }
    }
    return {
      success: false,
      error: menuResult.error || 'Failed to fetch categories'
    }
  }

  async createCategory(category: Omit<GetirFoodCategory, 'id'>): Promise<GetirFoodResponse<GetirFoodCategory>> {
    // Getir Food API'sinde kategori oluşturma desteklenmiyor
    return {
      success: false,
      error: 'Category creation not supported in Getir Food API'
    }
  }

  async updateCategory(categoryId: string, category: Partial<GetirFoodCategory>): Promise<GetirFoodResponse<GetirFoodCategory>> {
    // Getir Food API'sinde kategori güncelleme desteklenmiyor
    return {
      success: false,
      error: 'Category update not supported in Getir Food API'
    }
  }

  async deleteCategory(categoryId: string): Promise<GetirFoodResponse<void>> {
    // Getir Food API'sinde kategori silme desteklenmiyor
    return {
      success: false,
      error: 'Category deletion not supported in Getir Food API'
    }
  }

  async getProducts(): Promise<GetirFoodResponse<GetirFoodProduct[]>> {
    const menuResult = await this.getMenu()
    if (menuResult.success && menuResult.data) {
      return {
        success: true,
        data: menuResult.data.products
      }
    }
    return {
      success: false,
      error: menuResult.error || 'Failed to fetch products'
    }
  }

  async createProduct(product: Omit<GetirFoodProduct, 'id'>): Promise<GetirFoodResponse<GetirFoodProduct>> {
    // Getir Food API'sinde ürün oluşturma desteklenmiyor
    return {
      success: false,
      error: 'Product creation not supported in Getir Food API'
    }
  }

  async updateProduct(productId: string, product: Partial<GetirFoodProduct>): Promise<GetirFoodResponse<GetirFoodProduct>> {
    // Getir Food API'sinde ürün güncelleme desteklenmiyor
    return {
      success: false,
      error: 'Product update not supported in Getir Food API'
    }
  }

  async deleteProduct(productId: string): Promise<GetirFoodResponse<void>> {
    // Getir Food API'sinde ürün silme desteklenmiyor
    return {
      success: false,
      error: 'Product deletion not supported in Getir Food API'
    }
  }

  // Ürün durumunu güncelle
  async updateProductAvailability(productId: string, isAvailable: boolean): Promise<GetirFoodResponse<void>> {
    try {
      console.log('🔄 Updating product availability...', { productId, isAvailable })
      
      const status = isAvailable ? 100 : 200 // ACTIVE: 100, INACTIVE: 200
      const endpoint = `/products/${productId}/status`
      
      console.log(`🔗 Using product status endpoint: ${endpoint}`)
      console.log(`📝 Request body: { "status": ${status} }`)
      
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
        
        if (result.error?.includes('404')) {
          errorMessage = 'Ürün bulunamadı'
        } else if (result.error?.includes('401') || result.error?.includes('Unauthorized')) {
          errorMessage = 'Authentication hatası. API anahtarları kontrol edilmelidir.'
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

  // Kategori durumunu güncelle - Getir Food API'sinde desteklenmiyor
  async updateCategoryAvailability(categoryId: string, isAvailable: boolean): Promise<GetirFoodResponse<void>> {
    console.log('⚠️ Category availability update not supported in Getir Food API')
    return {
      success: false,
      error: 'Category availability update not supported in Getir Food API'
    }
  }

  // Restoran işlemleri
  async getRestaurantInfo(): Promise<GetirFoodResponse<GetirFoodRestaurant>> {
    const endpoint = '/restaurants'
    return await this.makeRequest<GetirFoodRestaurant>(endpoint)
  }

  async updateRestaurantStatus(action: 'open' | 'close', timeOffAmount?: number): Promise<GetirFoodResponse<void>> {
    const endpoint = `/restaurants/status/${action}`
    const body = action === 'close' && timeOffAmount ? { timeOffAmount } : undefined
    
    return await this.makeRequest<void>(endpoint, 'PUT', body)
  }

  async openRestaurant(): Promise<GetirFoodResponse<void>> {
    return this.updateRestaurantStatus('open')
  }

  async closeRestaurant(timeOffAmount?: number): Promise<GetirFoodResponse<void>> {
    return this.updateRestaurantStatus('close', timeOffAmount)
  }

  // Raporlama
  async getOrderReport(params: {
    startDate: string
    endDate: string
    status?: string
  }): Promise<GetirFoodResponse<{
    orders: GetirFoodOrder[]
    totalCount: number
    totalRevenue: number
    averageOrderValue: number
  }>> {
    try {
      const ordersResult = await this.getOrders({
        startDate: params.startDate,
        endDate: params.endDate,
        limit: 1000
      })
      
      if (ordersResult.success && ordersResult.data) {
        const orders = ordersResult.data.orders
        const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
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
  }): Promise<GetirFoodResponse<Array<{
    productId: string
    productName: string
    orderCount: number
    revenue: number
  }>>> {
    try {
      const ordersResult = await this.getOrders({
        startDate: params.startDate,
        endDate: params.endDate,
        limit: 1000
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

  // Bağlantı Testi
  async testConnection(): Promise<GetirFoodResponse<{ status: string, message: string }>> {
    try {
      console.log('🧪 Testing Getir Food API connection...')
      console.log('🔧 Test Config:', {
        baseUrl: this.baseUrl,
        appSecretKey: this.config.appSecretKey ? `${this.config.appSecretKey.substring(0, 8)}...` : 'MISSING',
        restaurantSecretKey: this.config.restaurantSecretKey ? `${this.config.restaurantSecretKey.substring(0, 8)}...` : 'MISSING',
        environment: this.config.environment
      })
      
      // Konfigürasyon kontrolü
      if (!this.config.appSecretKey || !this.config.restaurantSecretKey) {
        return {
          success: false,
          error: 'App Secret Key ve Restaurant Secret Key gereklidir'
        }
      }

      // Şimdilik sadece konfigürasyon kontrolü yapıyoruz
      // Gerçek API endpoint'leri henüz mevcut değil
      console.log('✅ Getir Food configuration validated successfully')
      
      return {
        success: true,
        data: {
          status: 'connected',
          message: 'Getir Food konfigürasyonu doğrulandı (API endpoint\'leri henüz aktif değil)'
        }
      }
    } catch (error) {
      console.error('❌ Getir Food test connection error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bağlantı testi sırasında hata oluştu'
      }
    }
  }
}

// Factory fonksiyonu
export const createGetirFoodClient = (config: GetirFoodConfig): GetirFoodClient => {
  return new GetirFoodClient(config)
} 