# Google Maps API Kurulum Rehberi

## 🔧 Google Maps API Hatası Çözümü

### Hata: `RefererNotAllowedMapError`

Bu hata, Google Maps API anahtarınızın localhost için yetkilendirilmemesinden kaynaklanıyor.

## 📋 Çözüm Adımları:

### 1. Google Cloud Console'a Gidin
- [Google Cloud Console](https://console.cloud.google.com/) adresine gidin
- Projenizi seçin

### 2. API Anahtarınızı Bulun
- Sol menüden "APIs & Services" > "Credentials" seçin
- API anahtarınızı bulun ve düzenleyin

### 3. Referer Kısıtlamalarını Ayarlayın
- API anahtarınızı tıklayın
- "Application restrictions" bölümünde:
  - **"HTTP referrers (web sites)"** seçin
  - **"Add an item"** tıklayın
  - Aşağıdaki URL'leri ekleyin:

```
http://localhost:3000/*
http://localhost:3001/*
http://127.0.0.1:3000/*
http://127.0.0.1:3001/*
```

### 4. API Kısıtlamalarını Kontrol Edin
- "API restrictions" bölümünde:
  - **"Restrict key"** seçin
  - Aşağıdaki API'leri seçin:
    - Maps JavaScript API
    - Places API (opsiyonel)
    - Geocoding API (opsiyonel)

### 5. Değişiklikleri Kaydedin
- **"Save"** butonuna tıklayın
- Değişikliklerin etkili olması birkaç dakika sürebilir

## 🚀 Test Etme

1. Uygulamayı yeniden başlatın:
```bash
npm run dev
```

2. Kurye dashboard'una gidin:
```
http://localhost:3000/courier/dashboard
```

3. Haritanın yüklendiğini kontrol edin

## 🔍 Alternatif Çözümler

### Geçici Çözüm (Geliştirme için)
Eğer API anahtarını hemen düzenleyemiyorsanız, `.env.local` dosyasında test anahtarı kullanabilirsiniz:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="test-key"
```

Bu durumda uygulama basit bir konum gösterimi yapacaktır.

### Production için
Production ortamında domain'inizi eklemeyi unutmayın:

```
https://yourdomain.com/*
```

## 📞 Destek

Eğer sorun devam ederse:
1. Google Cloud Console'da API kullanımını kontrol edin
2. API kotanızı kontrol edin
3. Faturalandırma ayarlarınızı kontrol edin

## ✅ Başarılı Kurulum Kontrolü

Harita başarıyla yüklendiğinde:
- Kurye konumu mavi daire olarak görünür
- Restoranlar kırmızı kare olarak görünür
- Müşteriler yeşil daire olarak görünür
- Marker'lara tıklayabilirsiniz 