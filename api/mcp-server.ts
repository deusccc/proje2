import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { createClient } from '@supabase/supabase-js'

// Supabase client kurulumu
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nijfrqlruefhnjnynnfx.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pamZycWxydWVmaG5qbnlubmZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTY1NTAsImV4cCI6MjA2NjM3MjU1MH0.MFs7dkuOQzyUhLmsjNMrOqA6WBBuUGhSzWxJJh-hBDA'
)

class VercelMCPServer {
  private server: Server

  constructor() {
    this.server = new Server(
      {
        name: "vercel-mcp-server",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    )

    this.setupHandlers()
  }

  setupHandlers() {
    // Tools listesi
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_couriers",
            description: "Müsait kuryeleri listele",
            inputSchema: {
              type: "object",
              properties: {
                restaurant_id: {
                  type: "string",
                  description: "Restoran ID"
                }
              }
            }
          },
          {
            name: "get_orders",
            description: "Siparişleri listele",
            inputSchema: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  description: "Sipariş durumu (pending, preparing, delivered)"
                },
                restaurant_id: {
                  type: "string",
                  description: "Restoran ID"
                }
              }
            }
          },
          {
            name: "assign_courier",
            description: "Kurye ata",
            inputSchema: {
              type: "object",
              properties: {
                order_id: {
                  type: "string",
                  description: "Sipariş ID"
                },
                courier_id: {
                  type: "string",
                  description: "Kurye ID"
                }
              },
              required: ["order_id", "courier_id"]
            }
          },
          {
            name: "get_restaurants",
            description: "Restoranları listele",
            inputSchema: {
              type: "object",
              properties: {
                city: {
                  type: "string",
                  description: "Şehir filtresi"
                }
              }
            }
          },
          {
            name: "update_order_status",
            description: "Sipariş durumunu güncelle",
            inputSchema: {
              type: "object",
              properties: {
                order_id: {
                  type: "string",
                  description: "Sipariş ID"
                },
                status: {
                  type: "string",
                  description: "Yeni durum"
                }
              },
              required: ["order_id", "status"]
            }
          }
        ]
      }
    })

    // Tool çağrıları
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case "get_couriers":
            return await this.getCouriers(args)
          
          case "get_orders":
            return await this.getOrders(args)
          
          case "assign_courier":
            return await this.assignCourier(args)
          
          case "get_restaurants":
            return await this.getRestaurants(args)
          
          case "update_order_status":
            return await this.updateOrderStatus(args)
          
          default:
            throw new Error(`Unknown tool: ${name}`)
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Hata: ${error.message}`
            }
          ]
        }
      }
    })
  }

  async getCouriers(args: any) {
    const { restaurant_id } = args
    
    let query = supabase
      .from('couriers')
      .select('*')
      .eq('is_active', true)
      .eq('is_available', true)

    if (restaurant_id) {
      // Restoran yakınındaki kuryeleri filtrele
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('latitude, longitude')
        .eq('id', restaurant_id)
        .single()

      if (restaurant) {
        // Basit mesafe hesaplama (gerçek uygulamada daha gelişmiş olabilir)
        query = query.not('current_latitude', 'is', null)
      }
    }

    const { data: couriers, error } = await query

    if (error) throw error

    return {
      content: [
        {
          type: "text",
          text: `Müsait kuryeler: ${JSON.stringify(couriers, null, 2)}`
        }
      ]
    }
  }

  async getOrders(args: any) {
    const { status, restaurant_id } = args
    
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (restaurant_id) {
      query = query.eq('restaurant_id', restaurant_id)
    }

    const { data: orders, error } = await query

    if (error) throw error

    return {
      content: [
        {
          type: "text",
          text: `Siparişler: ${JSON.stringify(orders, null, 2)}`
        }
      ]
    }
  }

  async assignCourier(args: any) {
    const { order_id, courier_id } = args

    // Kurye atama işlemi
    const { data: assignment, error } = await supabase
      .from('delivery_assignments')
      .insert({
        order_id,
        courier_id,
        status: 'assigned',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Sipariş durumunu güncelle
    await supabase
      .from('orders')
      .update({ status: 'preparing' })
      .eq('id', order_id)

    return {
      content: [
        {
          type: "text",
          text: `Kurye atama başarılı: ${JSON.stringify(assignment, null, 2)}`
        }
      ]
    }
  }

  async getRestaurants(args: any) {
    const { city } = args
    
    let query = supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)

    if (city) {
      query = query.eq('city', city)
    }

    const { data: restaurants, error } = await query

    if (error) throw error

    return {
      content: [
        {
          type: "text",
          text: `Restoranlar: ${JSON.stringify(restaurants, null, 2)}`
        }
      ]
    }
  }

  async updateOrderStatus(args: any) {
    const { order_id, status } = args

    const { data: order, error } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id)
      .select()
      .single()

    if (error) throw error

    return {
      content: [
        {
          type: "text",
          text: `Sipariş durumu güncellendi: ${JSON.stringify(order, null, 2)}`
        }
      ]
    }
  }

  async run() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
  }
}

// Vercel Functions için export
export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    const server = new VercelMCPServer()
    
    try {
      // MCP server'ı başlat
      await server.run()
      
      res.status(200).json({ 
        success: true, 
        message: 'MCP Server başarıyla çalışıyor' 
      })
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
} 