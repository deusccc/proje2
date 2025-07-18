#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { createClient } = require('@supabase/supabase-js');

// Supabase client kurulumu
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nijfrqlruefhnjnynnfx.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pamZycWxydWVmaG5qbnlubmZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTY1NTAsImV4cCI6MjA2NjM3MjU1MH0.MFs7dkuOQzyUhLmsjNMrOqA6WBBuUGhSzWxJJh-hBDA'
);

class SupabaseMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "supabase-mcp-server",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // Tool listesi
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_couriers",
            description: "Aktif kuryelerin listesini ve konumlarını getirir",
            inputSchema: {
              type: "object",
              properties: {
                is_active: {
                  type: "boolean",
                  description: "Sadece aktif kuryeleri getir"
                },
                is_available: {
                  type: "boolean", 
                  description: "Sadece müsait kuryeleri getir"
                },
                has_location: {
                  type: "boolean",
                  description: "Sadece konum bilgisi olan kuryeleri getir"
                }
              }
            }
          },
          {
            name: "update_courier_location",
            description: "Kurye konumunu günceller",
            inputSchema: {
              type: "object",
              properties: {
                courier_id: {
                  type: "string",
                  description: "Kurye ID'si"
                },
                latitude: {
                  type: "number",
                  description: "Enlem koordinatı"
                },
                longitude: {
                  type: "number", 
                  description: "Boylam koordinatı"
                },
                accuracy: {
                  type: "number",
                  description: "Konum doğruluğu (metre)"
                }
              },
              required: ["courier_id", "latitude", "longitude"]
            }
          },
          {
            name: "get_orders",
            description: "Siparişleri listeler ve filtreler",
            inputSchema: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  description: "Sipariş durumu (pending, assigned, in_progress, delivered, cancelled)"
                },
                customer_id: {
                  type: "string",
                  description: "Müşteri ID'si"
                },
                limit: {
                  type: "number",
                  description: "Maksimum sonuç sayısı"
                },
                order_by: {
                  type: "string",
                  description: "Sıralama kriteri (created_at, total_amount)"
                }
              }
            }
          },
          {
            name: "get_delivery_assignments",
            description: "Teslimat atamalarını getirir",
            inputSchema: {
              type: "object",
              properties: {
                courier_id: {
                  type: "string",
                  description: "Belirli kurye için filtrele"
                },
                status: {
                  type: "string", 
                  description: "Atama durumu (assigned, accepted, picked_up, on_the_way, delivered)"
                },
                include_details: {
                  type: "boolean",
                  description: "Sipariş ve kurye detaylarını dahil et"
                }
              }
            }
          },
          {
            name: "update_assignment_status",
            description: "Teslimat atama durumunu günceller",
            inputSchema: {
              type: "object",
              properties: {
                assignment_id: {
                  type: "string",
                  description: "Atama ID'si"
                },
                status: {
                  type: "string",
                  description: "Yeni durum (accepted, picked_up, on_the_way, delivered, cancelled)"
                },
                notes: {
                  type: "string",
                  description: "Ek notlar"
                }
              },
              required: ["assignment_id", "status"]
            }
          },
          {
            name: "execute_custom_query",
            description: "Özel Supabase sorgusu çalıştırır",
            inputSchema: {
              type: "object",
              properties: {
                table: {
                  type: "string",
                  description: "Tablo adı"
                },
                operation: {
                  type: "string", 
                  description: "İşlem türü (select, insert, update, delete)"
                },
                select_columns: {
                  type: "string",
                  description: "Seçilecek kolonlar (* varsayılan)"
                },
                filters: {
                  type: "object",
                  description: "Filtre koşulları"
                },
                data: {
                  type: "object",
                  description: "Insert/update verisi"
                },
                limit: {
                  type: "number",
                  description: "Sonuç limiti"
                }
              },
              required: ["table", "operation"]
            }
          },
          {
            name: "get_analytics",
            description: "İstatistik ve analitik verileri getirir",
            inputSchema: {
              type: "object",
              properties: {
                metric: {
                  type: "string",
                  description: "Metrik türü (courier_performance, order_stats, delivery_times)"
                },
                date_from: {
                  type: "string",
                  description: "Başlangıç tarihi (YYYY-MM-DD)"
                },
                date_to: {
                  type: "string",
                  description: "Bitiş tarihi (YYYY-MM-DD)"
                },
                courier_id: {
                  type: "string",
                  description: "Belirli kurye için filtrele"
                }
              },
              required: ["metric"]
            }
          }
        ]
      };
    });

    // Tool çağrısı
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_couriers":
            return await this.getCouriers(args);
          
          case "update_courier_location":
            return await this.updateCourierLocation(args);
          
          case "get_orders":
            return await this.getOrders(args);
          
          case "get_delivery_assignments":
            return await this.getDeliveryAssignments(args);
          
          case "update_assignment_status":
            return await this.updateAssignmentStatus(args);
          
          case "execute_custom_query":
            return await this.executeCustomQuery(args);
          
          case "get_analytics":
            return await this.getAnalytics(args);
          
          default:
            throw new Error(`Bilinmeyen tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Hata: ${error.message}`
            }
          ]
        };
      }
    });
  }

  async getCouriers(args = {}) {
    let query = supabase.from('couriers').select('*');

    if (args.is_active !== undefined) {
      query = query.eq('is_active', args.is_active);
    }
    
    if (args.is_available !== undefined) {
      query = query.eq('is_available', args.is_available);
    }

    if (args.has_location) {
      query = query.not('current_latitude', 'is', null)
                   .not('current_longitude', 'is', null);
    }

    const { data, error } = await query;
    
    if (error) throw error;

    return {
      content: [
        {
          type: "text",
          text: `Toplam ${data.length} kurye bulundu:\n\n${JSON.stringify(data, null, 2)}`
        }
      ]
    };
  }

  async updateCourierLocation(args) {
    const { courier_id, latitude, longitude, accuracy } = args;
    
    const updateData = {
      current_latitude: latitude,
      current_longitude: longitude,
      last_location_update: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (accuracy) {
      updateData.location_accuracy = accuracy;
    }

    const { data, error } = await supabase
      .from('couriers')
      .update(updateData)
      .eq('id', courier_id)
      .select();

    if (error) throw error;

    return {
      content: [
        {
          type: "text",
          text: `Kurye ${courier_id} konumu başarıyla güncellendi:\n${JSON.stringify(data[0], null, 2)}`
        }
      ]
    };
  }

  async getOrders(args = {}) {
    let query = supabase.from('orders').select('*');

    if (args.status) {
      query = query.eq('status', args.status);
    }

    if (args.customer_id) {
      query = query.eq('customer_id', args.customer_id);
    }

    if (args.limit) {
      query = query.limit(args.limit);
    }

    if (args.order_by) {
      query = query.order(args.order_by, { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    
    if (error) throw error;

    return {
      content: [
        {
          type: "text",
          text: `${data.length} sipariş bulundu:\n\n${JSON.stringify(data, null, 2)}`
        }
      ]
    };
  }

  async getDeliveryAssignments(args = {}) {
    let selectColumns = 'id, status, courier_id, order_id, created_at, accepted_at, picked_up_at, delivered_at';
    
    if (args.include_details) {
      selectColumns += `, orders:order_id (customer_name, customer_address, customer_phone, total_amount), couriers:courier_id (full_name, phone, vehicle_type)`;
    }

    let query = supabase.from('delivery_assignments').select(selectColumns);

    if (args.courier_id) {
      query = query.eq('courier_id', args.courier_id);
    }

    if (args.status) {
      query = query.eq('status', args.status);
    } else {
      // Varsayılan olarak aktif atamaları getir
      query = query.in('status', ['assigned', 'accepted', 'picked_up', 'on_the_way']);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;

    return {
      content: [
        {
          type: "text",
          text: `${data.length} teslimat atama bulundu:\n\n${JSON.stringify(data, null, 2)}`
        }
      ]
    };
  }

  async updateAssignmentStatus(args) {
    const { assignment_id, status, notes } = args;
    
    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };

    if (notes) {
      updateData.notes = notes;
    }

    // Durum bazlı timestamp'ler
    const statusTimestamps = {
      'accepted': 'accepted_at',
      'picked_up': 'picked_up_at',
      'on_the_way': 'on_the_way_at',
      'delivered': 'delivered_at',
      'cancelled': 'cancelled_at'
    };

    if (statusTimestamps[status]) {
      updateData[statusTimestamps[status]] = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('delivery_assignments')
      .update(updateData)
      .eq('id', assignment_id)
      .select();

    if (error) throw error;

    return {
      content: [
        {
          type: "text",
          text: `Atama ${assignment_id} durumu ${status} olarak güncellendi:\n${JSON.stringify(data[0], null, 2)}`
        }
      ]
    };
  }

  async executeCustomQuery(args) {
    const { table, operation, select_columns, filters, data, limit } = args;
    
    let query = supabase.from(table);
    
    switch (operation.toLowerCase()) {
      case 'select':
        query = query.select(select_columns || '*');
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              query = query.in(key, value);
            } else {
              query = query.eq(key, value);
            }
          });
        }
        
        if (limit) {
          query = query.limit(limit);
        }
        break;
        
      case 'insert':
        query = query.insert(data);
        break;
        
      case 'update':
        query = query.update(data);
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }
        break;
        
      case 'delete':
        query = query.delete();
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }
        break;
        
      default:
        throw new Error(`Desteklenmeyen işlem: ${operation}`);
    }

    const { data: result, error } = await query;
    
    if (error) throw error;

    return {
      content: [
        {
          type: "text",
          text: `${operation} işlemi ${table} tablosunda başarıyla gerçekleştirildi:\n${JSON.stringify(result, null, 2)}`
        }
      ]
    };
  }

  async getAnalytics(args) {
    const { metric, date_from, date_to, courier_id } = args;
    
    let result = {};
    
    switch (metric) {
      case 'courier_performance':
        let courierQuery = supabase
          .from('delivery_assignments')
          .select('courier_id, status, delivered_at, created_at, couriers:courier_id(full_name)');
        
        if (courier_id) {
          courierQuery = courierQuery.eq('courier_id', courier_id);
        }
        
        if (date_from) {
          courierQuery = courierQuery.gte('created_at', date_from);
        }
        
        if (date_to) {
          courierQuery = courierQuery.lte('created_at', date_to);
        }
        
        const { data: assignments } = await courierQuery;
        
        // Performans hesaplaması
        const performance = {};
        assignments?.forEach(assignment => {
          const id = assignment.courier_id;
          if (!performance[id]) {
            performance[id] = {
              courier_name: assignment.couriers?.full_name,
              total_assignments: 0,
              completed: 0,
              avg_delivery_time: 0
            };
          }
          performance[id].total_assignments++;
          if (assignment.status === 'delivered') {
            performance[id].completed++;
          }
        });
        
        result = performance;
        break;
        
      case 'order_stats':
        const { data: orderStats } = await supabase
          .from('orders')
          .select('status, total_amount, created_at')
          .gte('created_at', date_from || '2000-01-01')
          .lte('created_at', date_to || '2099-12-31');
        
        const stats = {
          total_orders: orderStats?.length || 0,
          pending: orderStats?.filter(o => o.status === 'pending').length || 0,
          completed: orderStats?.filter(o => o.status === 'delivered').length || 0,
          total_revenue: orderStats?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
        };
        
        result = stats;
        break;
        
      default:
        throw new Error(`Desteklenmeyen metrik: ${metric}`);
    }

    return {
      content: [
        {
          type: "text",
          text: `${metric} analitik veriler:\n${JSON.stringify(result, null, 2)}`
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Supabase MCP Server başlatıldı");
  }
}

if (require.main === module) {
  const server = new SupabaseMCPServer();
  server.run().catch(console.error);
}

module.exports = { SupabaseMCPServer }; 