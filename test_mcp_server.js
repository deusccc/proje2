const { SupabaseMCPServer } = require('./mcp_server.js');

async function testMCPServer() {
  console.log('🧪 MCP Server Test Başlatılıyor...\n');
  
  try {
    // Server instance oluştur
    const server = new SupabaseMCPServer();
    
    // Kuryeleri test et
    console.log('📍 Kuryeler Test Ediliyor...');
    const couriersResult = await server.getCouriers({ is_active: true, has_location: true });
    console.log('✅ Kuryeler:', couriersResult.content[0].text.substring(0, 200) + '...\n');
    
    // Siparişleri test et
    console.log('📦 Siparişler Test Ediliyor...');
    const ordersResult = await server.getOrders({ status: 'pending', limit: 3 });
    console.log('✅ Siparişler:', ordersResult.content[0].text.substring(0, 200) + '...\n');
    
    // Teslimat atamalarını test et
    console.log('🚚 Teslimat Atamaları Test Ediliyor...');
    const assignmentsResult = await server.getDeliveryAssignments({ include_details: true });
    console.log('✅ Atamalar:', assignmentsResult.content[0].text.substring(0, 200) + '...\n');
    
    // Özel sorgu test et
    console.log('🔍 Özel Sorgu Test Ediliyor...');
    const customResult = await server.executeCustomQuery({
      table: 'couriers',
      operation: 'select',
      select_columns: 'id, full_name, is_active, current_latitude, current_longitude',
      filters: { is_active: true },
      limit: 2
    });
    console.log('✅ Özel Sorgu:', customResult.content[0].text.substring(0, 200) + '...\n');
    
    // Analitik test et
    console.log('📊 Analitik Test Ediliyor...');
    const analyticsResult = await server.getAnalytics({ metric: 'order_stats' });
    console.log('✅ Analitik:', analyticsResult.content[0].text.substring(0, 200) + '...\n');
    
    console.log('🎉 Tüm testler başarıyla tamamlandı!');
    
    // Mevcut tool'ları listele
    console.log('\n📋 Mevcut MCP Tools:');
    const tools = [
      'get_couriers - Kurye verilerini getirir',
      'update_courier_location - Kurye konumunu günceller', 
      'get_orders - Siparişleri listeler',
      'get_delivery_assignments - Teslimat atamalarını getirir',
      'update_assignment_status - Atama durumunu günceller',
      'execute_custom_query - Özel Supabase sorgusu çalıştırır',
      'get_analytics - İstatistik ve analitik veriler'
    ];
    
    tools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool}`);
    });
    
  } catch (error) {
    console.error('❌ Test Hatası:', error.message);
  }
}

// Eğer script doğrudan çalıştırılıyorsa test'i başlat
if (require.main === module) {
  testMCPServer();
}

module.exports = { testMCPServer }; 