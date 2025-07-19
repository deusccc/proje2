import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createYemeksepetiClient } from '@/lib/yemeksepeti/client'
import { createYemeksepetiSyncService } from '@/lib/yemeksepeti/sync-service'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase environment variables are not configured.')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface WebhookPayload {
  event: string
  data: any
  timestamp: string
  restaurant_code: string
  branch_code?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-yemeksepeti-signature')
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    let payload: WebhookPayload
    try {
      payload = JSON.parse(body)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    // Restoran koduna göre entegrasyon ayarlarını bul
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integration_settings')
      .select('*')
      .eq('vendor_id', payload.restaurant_code) // vendor_id kullan
      .eq('platform', 'yemeksepeti')
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      await logWebhook(null, 'yemeksepeti', payload.event, request.url || '', 
        JSON.parse(body), null, 404, null, false, 'Integration not found')
      
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    // Webhook imzasını doğrula
    const client = createYemeksepetiClient({
      vendorId: integration.vendor_id || '',
      restaurantName: integration.restaurant_name || '',
      chainCode: integration.chain_code || '',
      branchCode: integration.branch_code || '',
      integrationCode: integration.integration_code || '',
      webhookUrl: integration.webhook_url || '',
      webhookSecret: integration.webhook_secret || ''
    })

    const isValidSignature = client.verifyWebhook(body, signature, integration.webhook_secret || '')
    
    if (!isValidSignature) {
      await logWebhook(integration.restaurant_id, 'yemeksepeti', payload.event, request.url || '', 
        JSON.parse(body), null, 401, null, false, 'Invalid signature')
      
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Webhook'u logla
    await logWebhook(integration.restaurant_id, 'yemeksepeti', payload.event, request.url || '', 
      JSON.parse(body), null, 200, null, false, null)

    // Event'e göre işlem yap
    let processingResult: any = null
    
    switch (payload.event) {
      case 'order.created':
        processingResult = await handleOrderCreated(integration.restaurant_id, payload.data)
        break
      
      case 'order.updated':
        processingResult = await handleOrderUpdated(integration.restaurant_id, payload.data)
        break
      
      case 'order.cancelled':
        processingResult = await handleOrderCancelled(integration.restaurant_id, payload.data)
        break
      
      case 'menu.updated':
        processingResult = await handleMenuUpdated(integration.restaurant_id, payload.data)
        break
      
      default:
        console.log(`Unhandled webhook event: ${payload.event}`)
        processingResult = { success: true, message: 'Event acknowledged but not processed' }
    }

    // Webhook log'unu güncelle
    await logWebhook(integration.restaurant_id, 'yemeksepeti', payload.event, request.url || '', 
      JSON.parse(body), processingResult, 200, null, true, null)

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      result: processingResult
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Yeni sipariş oluşturuldu
async function handleOrderCreated(restaurantId: string, orderData: any): Promise<any> {
  try {
    const syncService = await createYemeksepetiSyncService(restaurantId)
    if (!syncService) {
      throw new Error('Sync service not available')
    }

    // Siparişi kaydet
    const { error } = await supabaseAdmin
      .from('external_orders')
      .insert([{
        restaurant_id: restaurantId,
        platform: 'yemeksepeti',
        external_order_id: orderData.id,
        order_number: orderData.order_number,
        customer_name: orderData.customer.name,
        customer_phone: orderData.customer.phone,
        customer_email: orderData.customer.email,
        customer_address: orderData.delivery_address.address,
        delivery_latitude: orderData.delivery_address.latitude,
        delivery_longitude: orderData.delivery_address.longitude,
        status: 'pending',
        external_status: orderData.status,
        total_amount: orderData.total_amount,
        subtotal: orderData.subtotal,
        delivery_fee: orderData.delivery_fee,
        payment_method: orderData.payment_method,
        payment_status: orderData.payment_status,
        estimated_delivery_time: orderData.estimated_delivery_time,
        order_date: orderData.order_date,
        notes: orderData.notes,
        raw_data: orderData
      }])

    if (error) throw error

    // Sipariş kalemlerini kaydet
    const { data: externalOrder } = await supabaseAdmin
      .from('external_orders')
      .select('id')
      .eq('external_order_id', orderData.id)
      .single()

    if (externalOrder && orderData.items) {
      const orderItems = orderData.items.map((item: any) => ({
        external_order_id: externalOrder.id,
        external_product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        options: item.options || {},
        special_instructions: item.special_instructions
      }))

      await supabaseAdmin
        .from('external_order_items')
        .insert(orderItems)
    }

    return { success: true, message: 'Order created successfully' }
  } catch (error) {
    console.error('Order creation error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Sipariş güncellendi
async function handleOrderUpdated(restaurantId: string, orderData: any): Promise<any> {
  try {
    const { error } = await supabaseAdmin
      .from('external_orders')
      .update({
        status: orderData.status,
        external_status: orderData.status,
        payment_status: orderData.payment_status,
        estimated_delivery_time: orderData.estimated_delivery_time,
        raw_data: orderData,
        updated_at: new Date().toISOString()
      })
      .eq('restaurant_id', restaurantId)
      .eq('external_order_id', orderData.id)

    if (error) throw error

    return { success: true, message: 'Order updated successfully' }
  } catch (error) {
    console.error('Order update error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Sipariş iptal edildi
async function handleOrderCancelled(restaurantId: string, orderData: any): Promise<any> {
  try {
    const { error } = await supabaseAdmin
      .from('external_orders')
      .update({
        status: 'cancelled',
        external_status: 'cancelled',
        raw_data: orderData,
        updated_at: new Date().toISOString()
      })
      .eq('restaurant_id', restaurantId)
      .eq('external_order_id', orderData.id)

    if (error) throw error

    return { success: true, message: 'Order cancelled successfully' }
  } catch (error) {
    console.error('Order cancellation error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Menü güncellendi
async function handleMenuUpdated(restaurantId: string, menuData: any): Promise<any> {
  try {
    const syncService = await createYemeksepetiSyncService(restaurantId)
    if (!syncService) {
      throw new Error('Sync service not available')
    }

    // Menü senkronizasyonu başlat
    const result = await syncService.syncMenu({
      restaurantId,
      syncType: 'incremental'
    })

    return result
  } catch (error) {
    console.error('Menu update error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Webhook'u logla
async function logWebhook(
  restaurantId: string | null,
  platform: string,
  webhookType: string,
  webhookUrl: string,
  requestBody: any,
  responseBody: any,
  responseStatus: number,
  requestHeaders: any,
  processed: boolean,
  processingError: string | null
): Promise<void> {
  try {
    await supabaseAdmin
      .from('webhook_logs')
      .insert([{
        restaurant_id: restaurantId,
        platform,
        webhook_type: webhookType,
        webhook_url: webhookUrl,
        request_headers: requestHeaders,
        request_body: requestBody,
        response_status: responseStatus,
        response_body: responseBody,
        processed,
        processing_error: processingError
      }])
  } catch (error) {
    console.error('Webhook logging error:', error)
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Yemeksepeti webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
} 