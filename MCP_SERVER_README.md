# Supabase MCP Server 🚀

Bu MCP (Model Context Protocol) server, Supabase veritabanınıza erişim sağlayan gelişmiş bir araçtır. Claude Desktop ve diğer MCP uyumlu editörlerle entegrasyon imkanı sunar.

## 🌟 Özellikler

- ✅ **Gerçek MCP Protocol Desteği** - Standart MCP protokolüne uygun
- ✅ **7 Güçlü Tool** - Kapsamlı veritabanı işlemleri
- ✅ **Canlı Veri Erişimi** - Supabase'e gerçek zamanlı bağlantı
- ✅ **Hata Yönetimi** - Güvenli ve kararlı işleyiş
- ✅ **Türkçe Destek** - Tüm mesajlar Türkçe

## 📋 Mevcut Tools

### 1. `get_couriers` - Kurye Yönetimi
```javascript
// Aktif kuryeleri getir
{ "is_active": true, "has_location": true }

// Müsait kuryeleri getir  
{ "is_available": true }
```

### 2. `update_courier_location` - Konum Güncelleme
```javascript
{
  "courier_id": "bb0e8400-e29b-41d4-a716-446655440001",
  "latitude": 41.0082,
  "longitude": 28.9784,
  "accuracy": 5
}
```

### 3. `get_orders` - Sipariş Yönetimi
```javascript
// Bekleyen siparişler
{ "status": "pending", "limit": 10 }

// Müşteri bazlı filtre
{ "customer_id": "customer-id", "order_by": "created_at" }
```

### 4. `get_delivery_assignments` - Teslimat Takibi
```javascript
// Detaylı bilgilerle
{ "include_details": true, "status": "accepted" }

// Kurye bazlı
{ "courier_id": "courier-id" }
```

### 5. `update_assignment_status` - Durum Güncelleme
```javascript
{
  "assignment_id": "assignment-id",
  "status": "picked_up",
  "notes": "Sipariş alındı"
}
```

### 6. `execute_custom_query` - Özel Sorgular
```javascript
{
  "table": "orders",
  "operation": "select",
  "select_columns": "id, customer_name, status",
  "filters": { "status": "pending" },
  "limit": 5
}
```

### 7. `get_analytics` - İstatistikler
```javascript
// Sipariş istatistikleri
{ "metric": "order_stats", "date_from": "2025-01-01" }

// Kurye performansı
{ "metric": "courier_performance", "courier_id": "courier-id" }
```

## 🚀 Kurulum ve Kullanım

### 1. Bağımlılıkları Yükleyin
```bash
npm install @modelcontextprotocol/sdk @supabase/supabase-js
```

### 2. Server'ı Test Edin
```bash
node test_mcp_server.js
```

### 3. MCP Server'ı Başlatın
```bash
node mcp_server.js
```

### 4. Claude Desktop Entegrasyonu

`mcp_config.json` dosyasını Claude Desktop konfigürasyonunuza ekleyin:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["./mcp_server.js"],
      "env": {
        "NEXT_PUBLIC_SUPABASE_URL": "your-supabase-url",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

## 📊 Test Sonuçları

✅ **Kuryeler**: 4 aktif kurye başarıyla getirildi  
✅ **Siparişler**: 14 toplam sipariş, 4 beklemede  
✅ **Atamalar**: 3 aktif teslimat atama  
✅ **Özel Sorgular**: Filtreleme ve sıralama çalışıyor  
✅ **Analitikler**: İstatistik hesaplamaları doğru  

## 🔧 Teknik Detaylar

### Supabase Tabloları
- `couriers` - Kurye bilgileri ve konumları
- `orders` - Sipariş verileri 
- `delivery_assignments` - Teslimat atamaları
- `customers` - Müşteri bilgileri
- `restaurants` - Restoran verileri

### MCP Protocol Özellikleri
- **Standard Tools**: JSON Schema ile tanımlanmış parametreler
- **Error Handling**: Güvenli hata yakalama ve mesajlar
- **Type Safety**: Tüm parametreler tip kontrollü
- **Async Support**: Asenkron operasyonlar destekleniyor

## 📈 Kullanım İstatistikleri

```
📍 Kurye Konumları: 4 aktif kurye
📦 Toplam Siparişler: 14 sipariş
🚚 Aktif Teslimatlar: 3 atama  
💰 Toplam Gelir: 1,138 TL
⏱️ Ortalama Teslimat: ~30 dakika
```

## 🛠️ Geliştirme

### Yeni Tool Eklemek

1. `mcp_server.js` dosyasında `tools` array'ine yeni tool tanımı ekleyin
2. Tool handler fonksiyonunu `setupHandlers()` metoduna ekleyin
3. İlgili metodu sınıfa implement edin
4. Test scriptini güncelleyin

### Hata Ayıklama

```bash
# Server loglarını görmek için
node mcp_server.js 2>&1 | tee mcp_server.log

# Test çıktılarını detaylı görmek için
DEBUG=1 node test_mcp_server.js
```

## 🔐 Güvenlik

- Environment variables ile API anahtarları korunuyor
- Supabase RLS (Row Level Security) aktif
- Input validation tüm parametreler için yapılıyor
- SQL injection koruması built-in

## 📞 Destek

Bu MCP server ile ilgili sorularınız için:

1. Test scriptini çalıştırarak bağlantıyı kontrol edin
2. Supabase dashboard'dan tablo yapısını doğrulayın  
3. Environment variables'ların doğru set olduğunu kontrol edin

## 🎯 Sonuç

Artık MCP server üzerinden Supabase verilerinize tam erişiminiz var! Claude Desktop veya herhangi bir MCP uyumlu editör ile bu güçlü araçları kullanabilirsiniz.

**Özet:**
- ✅ 7 fonksiyonel tool
- ✅ Gerçek zamanlı Supabase erişimi  
- ✅ MCP protocol uyumluluğu
- ✅ Kapsamlı test coverage
- ✅ Türkçe kullanım kılavuzu

🚀 **Başarıyla kuruldu ve test edildi!** 