# 🤖 Vercel MCP Kullanım Kılavuzu

## 📋 Genel Bakış

Bu proje, Vercel Functions üzerinde çalışan bir MCP (Model Context Protocol) server'ı içerir. Bu server, yapay zeka modellerinin kurye sistemi veritabanına güvenli bir şekilde erişmesini sağlar.

## 🚀 Kurulum

### 1. Vercel'e Deploy Etme

```bash
# Projeyi Vercel'e deploy edin
vercel --prod
```

### 2. Environment Variables Ayarlama

Vercel dashboard'da şu environment variables'ları ekleyin:

```env
NEXT_PUBLIC_SUPABASE_URL=https://nijfrqlruefhnjnynnfx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 🔧 MCP Server Endpoints

### MCP Server URL
```
https://your-domain.vercel.app/api/mcp-server
```

### MCP Client URL
```
https://your-domain.vercel.app/api/mcp-client
```

## 🛠️ Kullanılabilir Tools

### 1. get_couriers
Müsait kuryeleri listeler.

**Parametreler:**
- `restaurant_id` (opsiyonel): Restoran ID

**Örnek Kullanım:**
```javascript
const response = await fetch('/api/mcp-client', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'call_tool',
    toolName: 'get_couriers',
    args: { restaurant_id: 'restaurant-123' }
  })
})
```

### 2. get_orders
Siparişleri listeler.

**Parametreler:**
- `status` (opsiyonel): Sipariş durumu (pending, preparing, delivered)
- `restaurant_id` (opsiyonel): Restoran ID

**Örnek Kullanım:**
```javascript
const response = await fetch('/api/mcp-client', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'call_tool',
    toolName: 'get_orders',
    args: { status: 'pending', restaurant_id: 'restaurant-123' }
  })
})
```

### 3. assign_courier
Kurye atama işlemi yapar.

**Parametreler:**
- `order_id` (zorunlu): Sipariş ID
- `courier_id` (zorunlu): Kurye ID

**Örnek Kullanım:**
```javascript
const response = await fetch('/api/mcp-client', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'call_tool',
    toolName: 'assign_courier',
    args: { 
      order_id: 'order-123', 
      courier_id: 'courier-456' 
    }
  })
})
```

### 4. get_restaurants
Restoranları listeler.

**Parametreler:**
- `city` (opsiyonel): Şehir filtresi

**Örnek Kullanım:**
```javascript
const response = await fetch('/api/mcp-client', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'call_tool',
    toolName: 'get_restaurants',
    args: { city: 'Istanbul' }
  })
})
```

### 5. update_order_status
Sipariş durumunu günceller.

**Parametreler:**
- `order_id` (zorunlu): Sipariş ID
- `status` (zorunlu): Yeni durum

**Örnek Kullanım:**
```javascript
const response = await fetch('/api/mcp-client', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'call_tool',
    toolName: 'update_order_status',
    args: { 
      order_id: 'order-123', 
      status: 'delivered' 
    }
  })
})
```

## 🤖 Yapay Zeka Entegrasyonu

### Claude/Anthropic ile Kullanım

```javascript
// Claude API ile MCP kullanımı
const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-claude-api-key',
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: 'Müsait kuryeleri listele ve en uygun olanını sipariş #123 için ata'
      }
    ],
    system: 'Sen bir kurye yönetim asistanısın. MCP tools kullanarak işlemleri gerçekleştir.'
  })
})
```

### OpenAI GPT ile Kullanım

```javascript
// OpenAI API ile MCP kullanımı
const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-openai-api-key'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'Sen bir kurye yönetim asistanısın. MCP tools kullanarak işlemleri gerçekleştir.'
      },
      {
        role: 'user',
        content: 'Bekleyen siparişleri listele ve kurye ata'
      }
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_orders',
          description: 'Siparişleri listele',
          parameters: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                description: 'Sipariş durumu'
              }
            }
          }
        }
      }
    ]
  })
})
```

## 🔒 Güvenlik

### CORS Ayarları
```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/mcp-server',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS'
          }
        ]
      }
    ]
  }
}
```

### API Key Doğrulama
```javascript
// api/mcp-server.ts
export default async function handler(req: any, res: any) {
  // API key doğrulama
  const apiKey = req.headers['x-api-key']
  if (apiKey !== process.env.MCP_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  // ... diğer işlemler
}
```

## 📊 Monitoring ve Logging

### Vercel Analytics
```javascript
// api/mcp-server.ts
import { log } from '@vercel/analytics'

export default async function handler(req: any, res: any) {
  try {
    // İşlem logla
    log('mcp_tool_called', {
      tool: req.body.toolName,
      timestamp: new Date().toISOString()
    })
    
    // ... işlemler
  } catch (error) {
    log('mcp_error', {
      error: error.message,
      tool: req.body.toolName
    })
  }
}
```

## 🚀 Performans Optimizasyonu

### Caching
```javascript
// api/mcp-server.ts
import { kv } from '@vercel/kv'

async function getCachedCouriers(restaurantId: string) {
  const cacheKey = `couriers:${restaurantId}`
  const cached = await kv.get(cacheKey)
  
  if (cached) {
    return cached
  }
  
  // Veritabanından al
  const couriers = await fetchCouriersFromDB(restaurantId)
  
  // Cache'e kaydet (5 dakika)
  await kv.set(cacheKey, couriers, { ex: 300 })
  
  return couriers
}
```

## 🔧 Geliştirme

### Local Development
```bash
# Geliştirme sunucusunu başlat
npm run dev

# MCP server'ı test et
curl -X POST http://localhost:3000/api/mcp-server \
  -H "Content-Type: application/json" \
  -d '{"action": "list_tools"}'
```

### Testing
```bash
# Test dosyalarını çalıştır
npm test

# MCP integration testleri
npm run test:mcp
```

## 📚 Kaynaklar

- [Vercel MCP Documentation](https://vercel.com/docs/mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [OpenAI API](https://platform.openai.com/docs)

---

Bu MCP server, yapay zeka modellerinin kurye sistemi veritabanına güvenli ve kontrollü bir şekilde erişmesini sağlar. Tüm işlemler loglanır ve güvenlik önlemleri alınır. 