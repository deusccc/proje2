# Google Maps API Kurulum Rehberi

## 🔧 API Yetkilendirme Sorunu Çözümü

### 1. Google Cloud Console'a Giriş
1. https://console.cloud.google.com adresine gidin
2. Projenizi seçin veya yeni proje oluşturun

### 2. API'leri Etkinleştirin
1. **Navigation Menu** → **APIs & Services** → **Library**
2. Aşağıdaki API'leri etkinleştirin:
   - **Maps JavaScript API**
   - **Geocoding API**
   - **Places API** (opsiyonel)

### 3. API Anahtarını Yetkilendirin
1. **Navigation Menu** → **APIs & Services** → **Credentials**
2. API anahtarınızı seçin
3. **Application restrictions** bölümünde:
   - **HTTP referrers (web sites)** seçin
   - Aşağıdaki URL'leri ekleyin:
     ```
     http://localhost:3000/*
     https://your-domain.com/*
     ```
4. **API restrictions** bölümünde:
   - **Restrict key** seçin
   - Aşağıdaki API'leri seçin:
     - Maps JavaScript API
     - Geocoding API
     - Places API

### 4. Environment Variables
`.env.local` dosyanızda API anahtarının doğru olduğundan emin olun:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-api-key-here"
```

### 5. Test
1. Uygulamayı yeniden başlatın
2. Harita bileşenlerinin yüklendiğini kontrol edin
3. Console'da hata mesajlarının kaybolduğunu doğrulayın

## 🚨 Yaygın Hatalar

### "This API project is not authorized"
- API anahtarının doğru yetkilendirilmediği anlamına gelir
- Google Cloud Console'da API'lerin etkin olduğunu kontrol edin
- Referrer restrictions'ları doğru ayarlayın

### "Quota exceeded"
- API kullanım limitlerini aştığınız anlamına gelir
- Google Cloud Console'da **Quotas** bölümünden limitleri kontrol edin
- Gerekirse ücretli plana geçin

## 📞 Destek
Sorun devam ederse:
1. Google Cloud Console'da **APIs & Services** → **Dashboard**'u kontrol edin
2. **Error reporting** bölümünden detaylı hata mesajlarını görün
3. API kullanım istatistiklerini kontrol edin