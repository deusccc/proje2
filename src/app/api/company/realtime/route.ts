import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/index'

// Dynamic route - static generation'da çalışmasın
export const dynamic = 'force-dynamic'

// Server-Sent Events endpoint for real-time updates
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`
      controller.enqueue(encoder.encode(data))

      // Set up Supabase real-time subscription
      const channel = supabase.channel('company-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          (payload) => {
            const data = `data: ${JSON.stringify({
              type: 'new_order',
              data: payload.new,
              timestamp: new Date().toISOString()
            })}\n\n`
            controller.enqueue(encoder.encode(data))
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders' },
          (payload) => {
            const data = `data: ${JSON.stringify({
              type: 'order_updated',
              data: payload.new,
              old: payload.old,
              timestamp: new Date().toISOString()
            })}\n\n`
            controller.enqueue(encoder.encode(data))
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'couriers' },
          (payload) => {
            const data = `data: ${JSON.stringify({
              type: 'courier_updated',
              data: payload.new,
              old: payload.old,
              timestamp: new Date().toISOString()
            })}\n\n`
            controller.enqueue(encoder.encode(data))
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'delivery_assignments' },
          (payload) => {
            const data = `data: ${JSON.stringify({
              type: 'assignment_created',
              data: payload.new,
              timestamp: new Date().toISOString()
            })}\n\n`
            controller.enqueue(encoder.encode(data))
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'delivery_assignments' },
          (payload) => {
            const data = `data: ${JSON.stringify({
              type: 'assignment_updated',
              data: payload.new,
              old: payload.old,
              timestamp: new Date().toISOString()
            })}\n\n`
            controller.enqueue(encoder.encode(data))
          }
        )
        .subscribe()

      // Send periodic heartbeat
      const heartbeat = setInterval(() => {
        const data = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`
        try {
          controller.enqueue(encoder.encode(data))
        } catch (error) {
          // Connection closed
          clearInterval(heartbeat)
          supabase.removeChannel(channel)
        }
      }, 30000) // Every 30 seconds

      // Cleanup when connection closes
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        supabase.removeChannel(channel)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
} 