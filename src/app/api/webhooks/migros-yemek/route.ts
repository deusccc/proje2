import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/index';
import { MigrosYemekOrder, MigrosYemekWebhookPayload } from '@/lib/integrations/migros-yemek/types';

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Migros Yemek Webhook alındı');

    const body = await request.json();
    const order: MigrosYemekOrder = body;

    // Webhook logunu kaydet
    await supabase
      .from('webhook_logs')
      .insert({
        platform: 'migros-yemek',
        webhook_type: 'order_created',
        webhook_url: request.url,
        request_headers: Object.fromEntries(request.headers.entries()),
        request_body: body,
        response_status: 200,
        processed: false
      });

    // Restoran ID'sini bul (store.id ile eşleştir)
    const { data: integrationSetting } = await supabase
      .from('integration_settings')
      .select('restaurant_id')
      .eq('platform', 'migros-yemek')
      .eq('vendor_id', order.store.id.toString())
      .eq('is_active', true)
      .single();

    if (!integrationSetting) {
      console.error('Migros Yemek entegrasyonu bulunamadı:', order.store.id);
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    const restaurantId = integrationSetting.restaurant_id;

    // Mevcut siparişi kontrol et
    const { data: existingOrder } = await supabase
      .from('external_orders')
      .select('id')
      .eq('platform', 'migros-yemek')
      .eq('external_order_id', order.id.toString())
      .single();

    if (existingOrder) {
      console.log('Sipariş zaten mevcut:', order.id);
      return NextResponse.json({ message: 'Order already exists' });
    }

    // Fiyat hesapla (penny'den TL'ye çevir)
    const totalAmount = order.prices.discounted.amountAsPenny / 100;
    const subtotal = totalAmount;

    // Ödeme yöntemini belirle
    const paymentMethod = order.payment.type.isOnlinePayment ? 'online' : 'cash';

    // External order oluştur
    const { data: externalOrder, error: externalOrderError } = await supabase
      .from('external_orders')
      .insert({
        restaurant_id: restaurantId,
        platform: 'migros-yemek',
        external_order_id: order.id.toString(),
        order_number: order.id.toString(),
        customer_name: order.customer.fullName,
        customer_phone: order.customer.phoneNumber,
        customer_email: null,
        customer_address: order.customer.deliveryAddress.detail,
        delivery_latitude: order.customer.deliveryAddress.geoLocation.latitude,
        delivery_longitude: order.customer.deliveryAddress.geoLocation.longitude,
        status: 'pending',
        external_status: order.status,
        total_amount: totalAmount,
        subtotal: subtotal,
        delivery_fee: 0,
        platform_commission: 0,
        payment_method: paymentMethod,
        payment_status: 'pending',
        estimated_delivery_time: null,
        order_date: new Date(order.log.createdAsMs),
        raw_data: order
      })
      .select()
      .single();

    if (externalOrderError) {
      console.error('External order oluşturma hatası:', externalOrderError);
      throw externalOrderError;
    }

    // Internal order oluştur
    const { data: internalOrder, error: internalOrderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        customer_name: order.customer.fullName,
        customer_phone: order.customer.phoneNumber,
        customer_address: order.customer.deliveryAddress.detail,
        customer_address_lat: order.customer.deliveryAddress.geoLocation.latitude,
        customer_address_lng: order.customer.deliveryAddress.geoLocation.longitude,
        status: 'pending',
        total_amount: totalAmount,
        subtotal: subtotal,
        delivery_fee: 0,
        payment_method: paymentMethod,
        payment_status: 'pending',
        notes: order.extendedProperties.orderNote || null,
        customer_notes: order.extendedProperties.orderNote || null
      })
      .select()
      .single();

    if (internalOrderError) {
      console.error('Internal order oluşturma hatası:', internalOrderError);
      throw internalOrderError;
    }

    // External order'ı internal order ile bağla
    await supabase
      .from('external_orders')
      .update({ internal_order_id: internalOrder.id })
      .eq('id', externalOrder.id);

    // Order items oluştur
    for (const item of order.items) {
      // Ürün mapping'ini kontrol et
      const { data: productMapping } = await supabase
        .from('platform_product_mappings')
        .select('internal_product_id')
        .eq('platform', 'migros-yemek')
        .eq('restaurant_id', restaurantId)
        .eq('external_product_id', item.productId.toString())
        .single();

      // External order item oluştur
      const { data: externalOrderItem, error: externalOrderItemError } = await supabase
        .from('external_order_items')
        .insert({
          external_order_id: externalOrder.id,
          external_product_id: item.productId.toString(),
          product_name: item.name,
          product_description: null,
          quantity: item.amount,
          unit_price: item.price / 100,
          total_price: (item.price * item.amount) / 100,
          options: item.options || null,
          special_instructions: item.note || null,
          internal_product_id: productMapping?.internal_product_id || null
        })
        .select()
        .single();

      if (externalOrderItemError) {
        console.error('External order item oluşturma hatası:', externalOrderItemError);
      }

      // Eğer product mapping varsa internal order item da oluştur
      if (productMapping) {
        await supabase
          .from('order_items')
          .insert({
            order_id: internalOrder.id,
            product_id: productMapping.internal_product_id,
            product_name: item.name,
            quantity: item.amount,
            unit_price: item.price / 100,
            total_price: (item.price * item.amount) / 100,
            special_instructions: item.note || null
          });
      }
    }

    // Webhook'u processed olarak işaretle
    await supabase
      .from('webhook_logs')
      .update({ processed: true })
      .eq('platform', 'migros-yemek')
      .eq('request_body', JSON.stringify(body));

    console.log('✅ Migros Yemek siparişi başarıyla işlendi:', {
      migrosOrderId: order.id,
      internalOrderId: internalOrder.id,
      customerName: order.customer.fullName,
      totalAmount: totalAmount
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Order processed successfully',
      orderId: internalOrder.id
    });

  } catch (error: any) {
    console.error('💥 Migros Yemek webhook hatası:', error);

    // Hata logunu kaydet
    await supabase
      .from('webhook_logs')
      .insert({
        platform: 'migros-yemek',
        webhook_type: 'order_created',
        webhook_url: request.url,
        request_headers: Object.fromEntries(request.headers.entries()),
        request_body: await request.json().catch(() => ({})),
        response_status: 500,
        processed: false,
        processing_error: error.message
      });

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Webhook processing failed' 
      },
      { status: 500 }
    );
  }
} 