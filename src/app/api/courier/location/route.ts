import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/index'

// POST: Kurye konumunu güncelle
export async function POST(request: NextRequest) {
  try {
    const {
      courierId,
      latitude,
      longitude,
      accuracy,
      heading,
      speed
    } = await request.json()

    if (!courierId || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Kurye ID, enlem ve boylam gerekli' },
        { status: 400 }
      )
    }

    // Kurye konumunu güncelle
    const { error: courierError } = await supabase
      .from('couriers')
      .update({
        current_latitude: latitude,
        current_longitude: longitude,
        last_location_update: new Date().toISOString()
      })
      .eq('id', courierId)

    if (courierError) {
      throw courierError
    }

    // Konum geçmişine kaydet
    const { data: locationRecord, error: locationError } = await supabase
      .from('courier_locations')
      .insert({
        courier_id: courierId,
        latitude,
        longitude,
        accuracy,
        heading,
        speed,
        timestamp: new Date().toISOString()
      })
      .select()
      .single()

    if (locationError) {
      throw locationError
    }

    return NextResponse.json({
      success: true,
      location_id: locationRecord.id,
      timestamp: locationRecord.timestamp
    })

  } catch (error: any) {
    console.error('Konum güncelleme hatası:', error)
    return NextResponse.json(
      { error: error.message || 'Konum güncellenemedi' },
      { status: 500 }
    )
  }
}

// GET: Kurye konumunu al
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const courierId = url.searchParams.get('courierId')

    if (!courierId) {
      return NextResponse.json(
        { error: 'Kurye ID gerekli' },
        { status: 400 }
      )
    }

    // Kurye konumunu al
    const { data: courier, error } = await supabase
      .from('couriers')
      .select('id, full_name, current_latitude, current_longitude, last_location_update, is_available')
      .eq('id', courierId)
      .single()

    if (error) {
      throw error
    }

    if (!courier) {
      return NextResponse.json(
        { error: 'Kurye bulunamadı' },
        { status: 404 }
      )
    }

    return NextResponse.json(courier)

  } catch (error: any) {
    console.error('Konum alma hatası:', error)
    return NextResponse.json(
      { error: error.message || 'Konum alınamadı' },
      { status: 500 }
    )
  }
}

// PUT: Kurye müsaitlik durumunu güncelle
export async function PUT(request: NextRequest) {
  try {
    const { courierId, isAvailable } = await request.json()

    if (!courierId || typeof isAvailable !== 'boolean') {
      return NextResponse.json(
        { error: 'Kurye ID ve müsaitlik durumu gerekli' },
        { status: 400 }
      )
    }

    const { data: courier, error } = await supabase
      .from('couriers')
      .update({
        is_available: isAvailable,
        updated_at: new Date().toISOString()
      })
      .eq('id', courierId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      courier_id: courier.id,
      is_available: courier.is_available
    })

  } catch (error: any) {
    console.error('Müsaitlik güncelleme hatası:', error)
    return NextResponse.json(
      { error: error.message || 'Müsaitlik durumu güncellenemedi' },
      { status: 500 }
    )
  }
} 