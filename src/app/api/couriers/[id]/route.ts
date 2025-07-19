import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase environment variables are not configured.')
}

// Service role key ile admin client oluştur
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// PUT - Kurye güncelle
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { full_name, phone, email, vehicle_type, license_plate, is_available, is_active, username, password } = body
    const id = params.id

    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Kurye ID gerekli' 
        },
        { status: 400 }
      )
    }

    // Kurye bilgilerini güncelle
    const updateData: any = {}
    if (full_name !== undefined) updateData.full_name = full_name
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (vehicle_type !== undefined) updateData.vehicle_type = vehicle_type
    if (license_plate !== undefined) updateData.license_plate = license_plate
    if (is_available !== undefined) updateData.is_available = is_available
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: courierData, error: courierError } = await supabaseAdmin
      .from('couriers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (courierError) {
      console.error('Courier update error:', courierError)
      throw courierError
    }

    // İlgili user bilgilerini de güncelle
    if (full_name || phone || email !== undefined || username || password) {
      const userUpdateData: any = {}
      if (full_name !== undefined) userUpdateData.full_name = full_name
      if (phone !== undefined) userUpdateData.phone = phone
      if (email !== undefined) userUpdateData.email = email
      if (username) userUpdateData.username = username
      if (password) userUpdateData.password = password

      // Username benzersizlik kontrolü (eğer username güncellenmek isteniyorsa)
      if (username) {
        const { data: existingUser, error: checkError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('username', username)
          .neq('id', courierData.user_id)
          .single()

        if (existingUser) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Bu kullanıcı adı zaten kullanılıyor' 
            },
            { status: 400 }
          )
        }
      }

      await supabaseAdmin
        .from('users')
        .update(userUpdateData)
        .eq('id', courierData.user_id)
    }

    return NextResponse.json({
      success: true,
      message: 'Kurye başarıyla güncellendi',
      courier: courierData
    })

  } catch (error) {
    console.error('PUT /api/couriers/[id] error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Kurye güncellenirken hata oluştu',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    )
  }
}

// DELETE - Kurye sil
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Kurye ID gerekli' 
        },
        { status: 400 }
      )
    }

    // Önce kurye bilgilerini al
    const { data: courierData, error: fetchError } = await supabaseAdmin
      .from('couriers')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Courier fetch error:', fetchError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Kurye bulunamadı' 
        },
        { status: 404 }
      )
    }

    // Kurye kaydını sil
    const { error: courierDeleteError } = await supabaseAdmin
      .from('couriers')
      .delete()
      .eq('id', id)

    if (courierDeleteError) {
      console.error('Courier delete error:', courierDeleteError)
      throw courierDeleteError
    }

    // İlgili user kaydını da sil
    if (courierData.user_id) {
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', courierData.user_id)
    }

    return NextResponse.json({
      success: true,
      message: 'Kurye başarıyla silindi'
    })

  } catch (error) {
    console.error('DELETE /api/couriers/[id] error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Kurye silinirken hata oluştu',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    )
  }
} 