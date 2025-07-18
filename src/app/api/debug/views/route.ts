import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/index'

export async function GET(request: NextRequest) {
  try {
    // active_courier_locations view'ini test et
    const { data: viewData, error: viewError } = await supabase
      .from('active_courier_locations')
      .select('*')
      .order('full_name')

    // Manuel courier sorgusu
    const { data: manualData, error: manualError } = await supabase
      .from('couriers')
      .select(`
        id,
        full_name,
        phone,
        current_latitude,
        current_longitude,
        last_location_update,
        is_available,
        vehicle_type,
        license_plate,
        is_active
      `)
      .eq('is_active', true)
      .order('full_name')

    return NextResponse.json({
      view_result: {
        data: viewData || [],
        error: viewError?.message || null,
        count: viewData?.length || 0
      },
      manual_result: {
        data: manualData || [],
        error: manualError?.message || null,
        count: manualData?.length || 0
      },
      comparison: {
        view_works: !viewError && viewData && viewData.length > 0,
        manual_works: !manualError && manualData && manualData.length > 0,
        same_count: (viewData?.length || 0) === (manualData?.length || 0)
      }
    })

  } catch (error: any) {
    console.error('View test hatası:', error)
    return NextResponse.json(
      { error: error.message || 'View test başarısız' },
      { status: 500 }
    )
  }
} 