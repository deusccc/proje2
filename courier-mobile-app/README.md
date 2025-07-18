# Kurye Mobil Uygulaması

Bu uygulama, mevcut kurye yönetim sisteminizin mobil versiyonudur. Kuryeler bu uygulama ile siparişlerini yönetebilir, konum takibi yapabilir ve teslimat süreçlerini gerçekleştirebilir.

## Özellikler

### 🔐 Giriş ve Kimlik Doğrulama
- Güvenli kullanıcı girişi
- Otomatik oturum yönetimi
- Kurye hesabı doğrulama

### 📍 Konum Takibi
- Gerçek zamanlı konum paylaşımı
- Otomatik konum güncelleme
- Harita entegrasyonu
- Mesafe hesaplama

### 📦 Sipariş Yönetimi
- Yeni sipariş bildirimleri
- Sipariş kabul/reddetme
- Sipariş durum güncelleme
- Detaylı sipariş bilgileri

### 🗺️ Navigasyon
- Google Maps entegrasyonu
- Teslimat adresine yönlendirme
- Müşteri konumu görüntüleme

### 📊 İstatistikler
- Günlük kazanç takibi
- Teslimat sayısı
- Performans metrikleri
- Puan ortalaması

### 🔔 Bildirimler
- Anlık push bildirimleri
- Sipariş durumu güncellemeleri
- Sistem bildirimleri

### 📱 Kullanıcı Deneyimi
- Modern ve kullanıcı dostu arayüz
- Kolay navigasyon
- Hızlı erişim butonları
- Offline çalışma desteği

## Teknolojiler

- **React Native**: Mobil uygulama geliştirme
- **Expo**: Geliştirme ve deployment platformu
- **TypeScript**: Type-safe JavaScript
- **React Navigation**: Sayfa yönlendirme
- **Supabase**: Backend ve veritabanı
- **Expo Location**: Konum servisleri
- **Expo Notifications**: Push bildirimler
- **React Native Maps**: Harita entegrasyonu

## Kurulum

### Gereksinimler

- Node.js 18+
- npm veya yarn
- Expo CLI
- iOS Simulator (Mac) veya Android Emulator

### Adımlar

1. **Projeyi klonlayın**
```bash
git clone <repository-url>
cd courier-mobile-app
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
```

3. **Uygulamayı başlatın**
```bash
npx expo start
```

4. **Cihazda çalıştırın**
- iOS: `i` tuşuna basın
- Android: `a` tuşuna basın
- Web: `w` tuşuna basın

## Yapılandırma

### Supabase Ayarları

`lib/supabase.ts` dosyasında Supabase URL ve anahtarları güncelleyin:

```typescript
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'
```

### Harita Ayarları

`app.json` dosyasında Google Maps API anahtarını ekleyin:

```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
        }
      }
    },
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY"
      }
    }
  }
}
```

## Test Kullanıcıları

Uygulama test kullanıcıları ile gelir:

| Kullanıcı Adı | Şifre | Açıklama |
|---------------|-------|----------|
| kurye1 | kurye123 | Test Kurye 1 |
| kurye2 | kurye123 | Test Kurye 2 |
| kurye3 | kurye123 | Test Kurye 3 |

## Ekran Yapısı

### 1. Giriş Ekranı (`LoginScreen`)
- Kullanıcı adı ve şifre girişi
- Test kullanıcıları listesi
- Otomatik giriş hatırlama

### 2. Ana Panel (`DashboardScreen`)
- Kurye durumu (çevrimiçi/çevrimdışı)
- Günlük istatistikler
- Aktif siparişler listesi
- Konum haritası
- Hızlı erişim butonları

### 3. Sipariş Detayı (`OrderDetailScreen`)
- Sipariş bilgileri
- Müşteri bilgileri
- Teslimat adresi
- Harita görünümü
- Durum güncelleme butonları

### 4. Bildirimler (`NotificationsScreen`)
- Bildirim listesi
- Okundu/okunmadı durumu
- Bildirim türleri

### 5. Geçmiş (`HistoryScreen`)
- Tamamlanan teslimatlar
- Teslimat detayları
- Kazanç bilgileri

### 6. Profil (`ProfileScreen`)
- Kullanıcı bilgileri
- Ayarlar
- Çıkış yapma

## API Entegrasyonu

Uygulama mevcut web sisteminizdeki API'leri kullanır:

- **Authentication**: Kullanıcı girişi
- **Delivery Management**: Sipariş yönetimi
- **Location Services**: Konum takibi
- **Notifications**: Bildirim sistemi

## Geliştirme

### Yeni Özellik Ekleme

1. `types/index.ts` dosyasına gerekli type'ları ekleyin
2. `lib/` klasöründe servis dosyalarını oluşturun
3. `screens/` klasöründe yeni ekranları ekleyin
4. `App.tsx` dosyasında navigation'ı güncelleyin

### Stil Rehberi

- **Renkler**: Tailwind CSS renk paleti
- **Tipografi**: System fontları
- **Spacing**: 4px grid sistemi
- **Iconlar**: Ionicons

## Deployment

### Android

```bash
npx expo build:android
```

### iOS

```bash
npx expo build:ios
```

### Web

```bash
npx expo build:web
```

## Sorun Giderme

### Konum İzinleri
- Android: `android.permission.ACCESS_FINE_LOCATION`
- iOS: `NSLocationWhenInUseUsageDescription`

### Bildirim İzinleri
- Android: Otomatik
- iOS: Kullanıcı onayı gerekli

### Harita Sorunları
- Google Maps API anahtarının aktif olduğundan emin olun
- Billing hesabının etkin olduğunu kontrol edin

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## Destek

Herhangi bir sorun veya öneriniz için:
- GitHub Issues
- E-posta: support@example.com
- Telefon: +90 555 123 45 67 