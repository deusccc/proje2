# Restoran Sipariş Yönetim Sistemi

## 🌟 Özellikler

### 🔴 CANLI VERİ GÜNCELLEMELERİ (Real-time)

Tüm sayfalarda Supabase PostgreSQL real-time subscription'ları ile anlık veri güncellenmesi:

#### 📱 Kurye Dashboard (`/courier/dashboard`)
- ✅ Yeni atama bildirimleri (ses + vibrasyon)
- ✅ Atama durumu değişiklikleri
- ✅ Kurye bilgisi güncellemeleri
- ✅ Sipariş durumu değişiklikleri
- ✅ Bildirim sistemi

#### 🏢 Company Dashboard (`/company/dashboard`)
- ✅ Yeni siparişler
- ✅ Sipariş durumu değişiklikleri
- ✅ Kurye konumu güncellemeleri
- ✅ Kurye atama değişiklikleri
- ✅ İstatistik güncellemeleri

#### 🏪 Restoran Dashboard (`/dashboard`)
- ✅ Ana sayfa tüm bileşen güncellemeleri
- ✅ Custom event'ler ile bileşen senkronizasyonu

#### 📋 Sipariş Sayfası (`/dashboard/orders`)
- ✅ Yeni sipariş ekleme
- ✅ Sipariş durumu değişiklikleri
- ✅ Sipariş silme işlemleri
- ✅ Sipariş kalemi güncellemeleri

#### 🍕 Menü Sayfası (`/dashboard/menu`)
- ✅ Kategori ekleme/güncelleme/silme
- ✅ Ürün ekleme/güncelleme/silme
- ✅ Ürün varyantı değişiklikleri
- ✅ Ürün porsiyonu değişiklikleri

#### 📊 Bileşenler (Components)
- ✅ **StatsCards**: İstatistik kartları otomatik güncelleme
- ✅ **OrdersOverview**: Sipariş genel bakış otomatik güncelleme
- ✅ **AICourierManager**: AI kurye atama sistemi otomatik güncelleme
- ✅ **DashboardLayout**: Yeni sipariş popup bildirimleri

#### 🔔 Bildirim Sistemi
- ✅ Toast mesajları (3-5 saniye)
- ✅ Ses efektleri (kurye dashboard'da)
- ✅ Vibrasyon (mobil cihazlarda)
- ✅ Visual feedback (loading states)

#### 🎯 Event Sistemi
- `orders-updated`: Sipariş güncellemeleri
- `stats-updated`: İstatistik güncellemeleri
- `courier-assignments-updated`: Kurye atama güncellemeleri
- `couriers-updated`: Kurye bilgi güncellemeleri
- `menu-updated`: Menü güncellemeleri

### 🚀 Teknoloji Stack
- **Frontend**: Next.js 14, React, TypeScript
- **Real-time**: Supabase PostgreSQL Subscriptions
- **State Management**: React useState/useEffect hooks
- **UI**: Tailwind CSS + Heroicons
- **Maps**: Google Maps API

### 📈 Performans Optimizasyonları
- ✅ Restaurant ID filtreleme (sadece ilgili veriler)
- ✅ Channel'lar per sayfa (subscription izolasyonu)
- ✅ Automatic cleanup (component unmount)
- ✅ Dependency tracking (useCallback, useMemo)
- ✅ Loading states ve error handling

### 🎮 Kullanıcı Deneyimi
- ✅ Anında görsel geri bildirim
- ✅ Console log'larda detaylı takip
- ✅ Emoji'li status mesajları
- ✅ Progressive enhancement (graceful degradation)

---

## 🚀 Kurulum ve Çalıştırma

```bash
npm install
npm run dev
```

**Port:** http://localhost:3001 (3000 kullanımdaysa otomatik 3001)

## 🔐 Environment Variables

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyBPzef2STffOZCyPZpTRlBbFnEeSEzO7eo"
NETGSM_USERCODE="8503080779"
NETGSM_PASSWORD="C6-Fn6hn"
NETGSM_SENDER_TITLE="UFUK SAGIN"
NEXT_PUBLIC_SUPABASE_URL=https://nijfrqlruefhnjnynnfx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pamZycWxydWVmaG5qbnlubmZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTY1NTAsImV4cCI6MjA2NjM3MjU1MH0.MFs7dkuOQzyUhLmsjNMrOqA6WBBuUGhSzWxJJh-hBDA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pamZycWxydWVmaG5qbnlubmZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc5NjU1MCwiZXhwIjoyMDY2MzcyNTUwfQ.TVOy-A6b8eoUFCodX_Atjk9-al1tg_uGcdrpHKZ6no4
```

## 📞 İletişim

**Geliştirici:** Ufuk Sağın
**Sistem Durumu:** ✅ CANLI - REAL-TIME GÜNCELLEMELER AKTİF 