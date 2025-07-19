# 🚚 Kurye Sistemi

Modern kurye yönetim sistemi - AI destekli kurye atama, gerçek zamanlı takip ve entegrasyonlar.

## ✨ Özellikler

- 🤖 **AI Destekli Kurye Atama** - OpenAI GPT ile akıllı kurye seçimi
- 📍 **Gerçek Zamanlı Konum Takibi** - Google Maps entegrasyonu
- 📱 **Mobil Uyumlu** - Responsive tasarım
- 🔄 **Platform Entegrasyonları** - Yemeksepeti, Trendyol, Getir
- 📊 **Detaylı Raporlama** - Performans analizi
- 🔔 **Bildirim Sistemi** - SMS ve push bildirimler
- 🛡️ **Güvenli Kimlik Doğrulama** - Supabase Auth

## 🛠️ Teknolojiler

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4
- **Maps**: Google Maps API
- **SMS**: NetGSM
- **Styling**: Tailwind CSS
- **UI**: Headless UI, Heroicons

## 🚀 Kurulum

### Gereksinimler

- Node.js 18+
- npm veya yarn
- Supabase hesabı
- Google Maps API anahtarı
- OpenAI API anahtarı

### Adımlar

1. **Repository'yi klonlayın**
```bash
git clone https://github.com/ufuks/courier-system.git
cd courier-system
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
```

3. **Environment variables'ları ayarlayın**
```bash
cp .env.local.example .env.local
```

`.env.local` dosyasını düzenleyin:
```env
# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# NetGSM SMS
NETGSM_USERCODE=your_netgsm_usercode
NETGSM_PASSWORD=your_netgsm_password
NETGSM_SENDER_TITLE=your_sender_title
```

4. **Geliştirme sunucusunu başlatın**
```bash
npm run dev
```

5. **Tarayıcıda açın**
```
http://localhost:3000
```

## 📁 Proje Yapısı

```
courier-system/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API Routes
│   │   ├── auth/           # Kimlik doğrulama
│   │   ├── dashboard/      # Dashboard sayfaları
│   │   └── globals.css     # Global stiller
│   ├── components/         # React bileşenleri
│   ├── lib/               # Yardımcı kütüphaneler
│   │   ├── supabase/      # Supabase konfigürasyonu
│   │   ├── yemeksepeti/   # Yemeksepeti entegrasyonu
│   │   ├── trendyol-go/   # Trendyol entegrasyonu
│   │   └── getir-food/    # Getir entegrasyonu
│   └── types/             # TypeScript tipleri
├── public/                # Statik dosyalar
├── images/               # Görseller
└── docs/                # Dokümantasyon
```

## 🤖 AI Kurye Atama Sistemi

Sistem, OpenAI GPT-4 kullanarak en optimal kurye atamasını yapar:

### Atama Kriterleri:
- 📍 **Mesafe** - En yakın kurye öncelikli
- 📦 **Yoğunluk** - Az aktif teslimatı olan öncelikli
- ⭐ **Performans** - Yüksek puanlı öncelikli
- 🚗 **Araç Tipi** - Sipariş büyüklüğüne uygun
- ⏱️ **Teslimat Süresi** - Optimizasyon

### API Endpoint:
```
POST /api/ai-courier-assignment
{
  "orderId": "order_id",
  "forceAssign": false
}
```

## 🔗 Platform Entegrasyonları

### Yemeksepeti
- Menü senkronizasyonu
- Sipariş webhook'ları
- Stok yönetimi

### Trendyol
- Ürün senkronizasyonu
- Fiyat güncellemeleri
- Kategori yönetimi

### Getir
- Sipariş entegrasyonu
- Durum takibi

## 📊 Veritabanı Şeması

### Ana Tablolar:
- `restaurants` - Restoran bilgileri
- `users` - Kullanıcı hesapları
- `couriers` - Kurye bilgileri
- `orders` - Siparişler
- `delivery_assignments` - Teslimat atamaları
- `products` - Ürünler
- `categories` - Kategoriler

## 🚀 Deployment

### Vercel (Önerilen)

1. **Vercel'e bağlayın**
```bash
npm install -g vercel
vercel
```

2. **Environment variables'ları ayarlayın**
Vercel dashboard'da tüm environment variables'ları ekleyin.

3. **Domain bağlayın**
Vercel dashboard'da custom domain ekleyin.

### Docker

```bash
docker build -t courier-system .
docker run -p 3000:3000 courier-system
```

## 📱 Mobil Uygulama

React Native ile geliştirilmiş kurye mobil uygulaması:
- Gerçek zamanlı konum takibi
- Sipariş bildirimleri
- Rota optimizasyonu
- Performans raporları

## 🔧 Geliştirme

### Scripts

```bash
npm run dev          # Geliştirme sunucusu
npm run build        # Production build
npm run start        # Production sunucusu
npm run lint         # ESLint kontrolü
npm run mcp:server   # MCP sunucusu
```

### MCP (Model Context Protocol)

Proje, MCP sunucusu ile Supabase veritabanına doğrudan erişim sağlar:

```bash
npm run mcp:server
```

## 📈 Performans

- ⚡ **Hızlı Yükleme** - Next.js optimizasyonları
- 🔄 **Gerçek Zamanlı** - Supabase realtime
- 📱 **Mobil Optimize** - Responsive tasarım
- 🛡️ **Güvenli** - JWT token tabanlı auth

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

- **Geliştirici**: Ufuk Sagin
- **Email**: [email protected]
- **GitHub**: [@ufuks](https://github.com/ufuks)

## 🙏 Teşekkürler

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [OpenAI](https://openai.com/) - AI API
- [Google Maps](https://developers.google.com/maps) - Maps API
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın! 