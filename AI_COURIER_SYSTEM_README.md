# 🤖 AI Kurye Atama Sistemi

Bu sistem, yapay zeka destekli otomatik kurye atama ve yönetim özelliği sunar. GPT-4o-mini modelini kullanarak en optimal kurye seçimi yapar.

## 🚀 Özellikler

### ✨ Akıllı Kurye Seçimi
- **Mesafe Optimizasyonu**: En yakın kuryeyi bulur
- **Yoğunluk Analizi**: Kurye iş yükünü değerlendirir
- **Performans Değerlendirmesi**: Kurye puanlarını dikkate alır
- **Araç Tipi Uyumu**: Sipariş büyüklüğüne uygun araç seçer
- **Teslimat Süresi Tahmini**: AI ile gerçekçi süre hesaplar

### 🔄 Otomatik İzleme
- **Gerçek Zamanlı Kontrol**: Atanmamış siparişleri otomatik tespit
- **Periyodik Atama**: 2 dakikada bir kontrol ve atama
- **Sistem Durumu**: Anlık sistem sağlığı izleme
- **Detaylı Raporlama**: Başarılı/başarısız atama raporları

### 📊 Yönetim Paneli
- **Canlı Dashboard**: Sistem durumu ve istatistikler
- **Manuel Kontrol**: İsteğe bağlı AI atama çalıştırma
- **Otomatik İzleme**: Başlat/durdur kontrolü
- **Detaylı Sonuçlar**: AI kararlarının gerekçeleri

## 🛠️ Kurulum

### 1. OpenAI API Anahtarı
```bash
# .env.local dosyasına ekleyin
OPENAI_API_KEY="sk-proj-YOUR_OPENAI_API_KEY_HERE"
```

### 2. Gerekli Paketler
```bash
npm install openai
```

### 3. Veritabanı Kurulumu
```sql
-- Kurye sistemini kurmak için SQL dosyalarını çalıştırın
-- courier_system.sql
-- fix_courier_foreign_key.sql
-- test_courier_users.sql
```

### 4. Test Kuryelerini Oluşturun
```sql
-- test_courier_users.sql dosyasını çalıştırın
-- Bu 4 test kuryesi oluşturur:
-- kurye1/kurye123, kurye2/kurye123, kurye3/kurye123, kurye4/kurye123
```

## 🎯 Kullanım

### Dashboard'dan Yönetim
1. Ana dashboard'da "AI Kurye Atama Sistemi" bölümüne gidin
2. Sistem durumunu kontrol edin
3. "Otomatik İzleme Başlat" ile sürekli izleme aktif edin
4. "Manuel Atama Çalıştır" ile anlık atama yapın

### Sipariş Detayından Manuel Atama
1. Bekleyen bir siparişin detay sayfasına gidin
2. "🤖 AI ile Kurye Ata" butonuna tıklayın
3. AI'ın seçim gerekçesini görün
4. Atama sonucunu onaylayın

### API Endpoint'leri

#### AI Kurye Atama
```bash
POST /api/ai-courier-assignment
{
  "orderId": "siparis-id",
  "forceAssign": false  # Opsiyonel: Mevcut atamayı zorla değiştir
}
```

#### Sistem Monitörü
```bash
# Sistem durumunu kontrol et
GET /api/ai-courier-monitor

# Otomatik atama çalıştır
POST /api/ai-courier-monitor
```

## 🧠 AI Karar Verme Süreci

AI aşağıdaki faktörleri değerlendirerek karar verir:

### 📍 Mevcut Durum Analizi
- Sipariş bilgileri (tutar, zaman, adres)
- Restoran konumu ve bilgileri
- Günlük sipariş yoğunluğu

### 🚚 Kurye Değerlendirmesi
- **Mesafe**: Restorana en yakın kurye
- **Aktif Teslimat**: Mevcut iş yükü
- **Performans**: Ortalama puan ve deneyim
- **Araç Tipi**: Sipariş büyüklüğüne uygunluk
- **Konum Güncelliği**: Son konum güncelleme zamanı

### 🎯 Optimizasyon Kriterleri
1. **Hız**: En kısa teslimat süresi
2. **Verimlilik**: Kurye kaynaklarının optimal kullanımı
3. **Kalite**: Yüksek performanslı kurye seçimi
4. **Adalet**: İş yükünün dengeli dağılımı

## 📈 Sistem Metrikleri

### 📊 Dashboard Göstergeleri
- **Atanmamış Sipariş**: Bekleyen sipariş sayısı
- **Müsait Kurye**: Aktif ve müsait kurye sayısı
- **AI Atama (1h)**: Son 1 saatteki AI atamaları
- **Sistem Durumu**: Genel sistem sağlığı

### 📋 Detaylı Raporlar
- İşlenen sipariş sayısı
- Başarılı atama oranı
- Başarısız atama sebepleri
- AI karar gerekçeleri
- Zaman damgaları

## 🔧 Konfigürasyon

### AI Model Ayarları
```javascript
// GPT-4o-mini kullanılıyor (maliyet-performans optimum)
model: 'gpt-4o-mini',
temperature: 0.3,  // Tutarlı kararlar için düşük
max_tokens: 500,   // Token kullanımını sınırla
```

### Otomatik İzleme
```javascript
// 2 dakikada bir kontrol
const MONITORING_INTERVAL = 2 * 60 * 1000;

// 30 saniyede bir sistem durumu güncelleme
const STATUS_UPDATE_INTERVAL = 30 * 1000;
```

## 🚨 Hata Yönetimi

### Yaygın Hatalar
1. **OpenAI API Anahtarı Eksik**: `.env.local` dosyasını kontrol edin
2. **Müsait Kurye Yok**: Kurye durumlarını kontrol edin
3. **Konum Bilgisi Eksik**: Restoran koordinatlarını ayarlayın
4. **API Rate Limit**: İstekler arasında bekleme süresi var

### Hata Çözümleri
```bash
# API anahtarını test edin
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Kurye durumlarını kontrol edin
SELECT * FROM couriers WHERE is_active = true AND is_available = true;

# Sistem loglarını inceleyin
# Browser console'da AI atama loglarını takip edin
```

## 🎛️ Sistem Yönetimi

### Kurye Durumu Yönetimi
```sql
-- Kuryeyi aktif et
UPDATE couriers SET is_available = true WHERE id = 'kurye-id';

-- Kurye konumunu güncelle
UPDATE couriers SET 
  current_latitude = 41.0082,
  current_longitude = 28.9784,
  last_location_update = NOW()
WHERE id = 'kurye-id';
```

### Performans İzleme
```sql
-- AI atama istatistikleri
SELECT 
  COUNT(*) as total_assignments,
  COUNT(CASE WHEN notes LIKE '%AI Atama%' THEN 1 END) as ai_assignments
FROM delivery_assignments
WHERE created_at >= NOW() - INTERVAL '1 day';
```

## 🔒 Güvenlik

### API Güvenliği
- OpenAI API anahtarı server-side'da saklanır
- Rate limiting uygulanır
- Hata mesajları filtrelenir

### Veri Güvenliği
- Kurye konum bilgileri şifrelenir
- AI kararları loglanır
- Sistem aktiviteleri izlenir

## 📞 Destek

### Sorun Giderme
1. Browser console'da hata loglarını kontrol edin
2. Network sekmesinde API isteklerini inceleyin
3. Supabase dashboard'da veritabanı durumunu kontrol edin
4. OpenAI API kullanım limitlerini kontrol edin

### Test Senaryoları
```javascript
// 1. Tek sipariş atama testi
POST /api/ai-courier-assignment
{ "orderId": "test-order-id" }

// 2. Sistem durumu testi
GET /api/ai-courier-monitor

// 3. Otomatik atama testi
POST /api/ai-courier-monitor
```

## 🚀 Gelecek Geliştirmeler

### Planlanan Özellikler
- **Makine Öğrenmesi**: Geçmiş verilerden öğrenme
- **Rota Optimizasyonu**: Çoklu teslimat rotaları
- **Müşteri Tercihleri**: Kurye seçim kriterleri
- **Gerçek Zamanlı Takip**: Kurye konumu izleme
- **Performans Analizi**: Detaylı raporlama

### Entegrasyonlar
- **Google Maps**: Rota hesaplama
- **WhatsApp**: Bildirim sistemi
- **Telegram**: Bot entegrasyonu
- **Slack**: Yönetici bildirimleri

---

## 📝 Notlar

- Sistem GPT-4o-mini kullanarak maliyet-performans dengesini optimize eder
- Token kullanımı minimize edilmiş, verimli prompt tasarımı
- Gerçek zamanlı izleme ve otomatik atama özelliği
- Tam Türkçe destek ve yerel kullanım için optimize edilmiş

**🎉 AI Kurye Atama Sistemi aktif ve kullanıma hazır!** 