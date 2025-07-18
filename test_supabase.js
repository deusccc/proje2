const { createClient } = require('@supabase/supabase-js');

// Supabase bağlantı bilgileri
const supabaseUrl = 'https://nijfrqlruefhnjnynnfx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pamZycWxydWVmaG5qbnlubmZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTY1NTAsImV4cCI6MjA2NjM3MjU1MH0.MFs7dkuOQzyUhLmsjNMrOqA6WBBuUGhSzWxJJh-hBDA';

// Supabase client oluştur
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
  console.log('🔄 Supabase bağlantısı test ediliyor...\n');

  try {
    // 1. Temel bağlantı testi
    console.log('1. Temel bağlantı testi:');
    const { data, error } = await supabase
      .from('couriers')
      .select('id, full_name, is_available')
      .limit(3);

    if (error) {
      console.error('❌ Bağlantı hatası:', error.message);
      return;
    }

    console.log('✅ Bağlantı başarılı!');
    console.log('📊 Bulunan kurye sayısı:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('👥 İlk birkaç kurye:');
      data.forEach(courier => {
        console.log(`   - ${courier.full_name} (${courier.is_available ? 'Aktif' : 'Pasif'})`);
      });
    }
    console.log('');

    // 2. Kurye konumları testi
    console.log('2. Kurye konumları testi:');
    const { data: locationData, error: locationError } = await supabase
      .from('couriers')
      .select('id, full_name, current_latitude, current_longitude, last_location_update')
      .not('current_latitude', 'is', null)
      .not('current_longitude', 'is', null)
      .limit(5);

    if (locationError) {
      console.error('❌ Konum verisi hatası:', locationError.message);
    } else {
      console.log('✅ Konum verisi alındı!');
      console.log('📍 Konumu olan kurye sayısı:', locationData?.length || 0);
      if (locationData && locationData.length > 0) {
        console.log('🗺️ Kurye konumları:');
        locationData.forEach(courier => {
          const lastUpdate = courier.last_location_update ? 
            new Date(courier.last_location_update).toLocaleString('tr-TR') : 'Hiç güncellenmedi';
          console.log(`   - ${courier.full_name}: ${courier.current_latitude}, ${courier.current_longitude} (Son güncelleme: ${lastUpdate})`);
        });
      }
    }
    console.log('');

    // 3. Aktif atamalar testi
    console.log('3. Aktif teslimat atamaları testi:');
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('delivery_assignments')
      .select('id, status, courier_id, order_id, created_at')
      .in('status', ['assigned', 'accepted', 'picked_up', 'on_the_way'])
      .limit(5);

    if (assignmentError) {
      console.error('❌ Atama verisi hatası:', assignmentError.message);
    } else {
      console.log('✅ Atama verisi alındı!');
      console.log('📦 Aktif atama sayısı:', assignmentData?.length || 0);
      if (assignmentData && assignmentData.length > 0) {
        console.log('🚚 Aktif atamalar:');
        assignmentData.forEach(assignment => {
          const createdDate = new Date(assignment.created_at).toLocaleString('tr-TR');
          console.log(`   - Atama ${assignment.id.substring(0, 8)}... (Durum: ${assignment.status}, Oluşturulma: ${createdDate})`);
        });
      }
    }
    console.log('');

    // 4. Trigger'ların var olup olmadığını kontrol et
    console.log('4. Trigger kontrol testi:');
    try {
      const { data: triggerData, error: triggerError } = await supabase
        .rpc('exec_sql', { 
          sql: `
            SELECT trigger_name, event_manipulation, action_timing 
            FROM information_schema.triggers 
            WHERE event_object_table = 'couriers' 
            AND trigger_name = 'update_couriers_updated_at';
          `
        });

      if (triggerError) {
        console.log('⚠️ Trigger kontrolü yapılamadı (normal, yetki gerekebilir)');
      } else {
        console.log('✅ Trigger kontrol başarılı');
        if (triggerData && triggerData.length > 0) {
          console.log('🔧 Bulunan trigger:');
          triggerData.forEach(trigger => {
            console.log(`   - ${trigger.trigger_name} (${trigger.action_timing} ${trigger.event_manipulation})`);
          });
        } else {
          console.log('⚠️ update_couriers_updated_at trigger bulunamadı');
        }
      }
    } catch (err) {
      console.log('⚠️ Trigger kontrolü yapılamadı (RPC desteği yok olabilir)');
    }
    console.log('');

    // 5. Test güncelleme
    console.log('5. Test güncelleme işlemi:');
    if (data && data.length > 0) {
      const testCourier = data[0];
      console.log(`Test kurye: ${testCourier.full_name} (ID: ${testCourier.id})`);
      
      const { error: updateError } = await supabase
        .from('couriers')
        .update({ 
          last_location_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', testCourier.id);

      if (updateError) {
        console.error('❌ Test güncelleme hatası:', updateError.message);
        console.log('Hata kodu:', updateError.code);
        console.log('Hata detayı:', updateError.details);
      } else {
        console.log('✅ Test güncelleme başarılı!');
      }
    }

    console.log('\n🎉 Supabase test tamamlandı!\n');

  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error.message);
    console.error('Hata detayları:', error);
  }
}

// Test fonksiyonunu çalıştır
testSupabaseConnection(); 