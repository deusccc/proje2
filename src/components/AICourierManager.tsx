'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/index'
import { 
  CpuChipIcon, 
  PlayIcon, 
  PauseIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface SystemStatus {
  system_status: string
  unassigned_orders_count: number
  available_couriers_count: number
  recent_ai_assignments_count: number
  last_check: string
  recommendation: string
}

interface AssignmentResult {
  order_id: string
  customer_name: string
  success: boolean
  courier_name?: string
  error?: string
  ai_reasoning?: string
}

interface MonitorResult {
  message: string
  processed_orders: number
  success_count: number
  failed_count: number
  results: AssignmentResult[]
  timestamp: string
}

export default function AICourierManager() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [lastMonitorResult, setLastMonitorResult] = useState<MonitorResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sistem durumunu yükle
  const loadSystemStatus = async () => {
    try {
      const response = await fetch('/api/ai-courier-monitor')
      const data = await response.json()
      
      if (response.ok) {
        setSystemStatus(data)
        setError(null)
      } else {
        setError(data.error || 'Sistem durumu alınamadı')
      }
    } catch (err) {
      setError('Sistem durumu kontrol hatası')
      console.error('Sistem durumu hatası:', err)
    }
  }

  // Otomatik AI atama çalıştır
  const runAIAssignment = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai-courier-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setLastMonitorResult(data)
        // Sistem durumunu güncelle
        await loadSystemStatus()
      } else {
        setError(data.error || 'AI atama hatası')
      }
    } catch (err) {
      setError('AI atama sistemi hatası')
      console.error('AI atama hatası:', err)
    } finally {
      setLoading(false)
    }
  }

  // Tek sipariş için AI atama
  const assignSingleOrder = async (orderId: string) => {
    try {
      const response = await fetch('/api/ai-courier-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert(`✅ Sipariş başarıyla atandı: ${data.courier_name}`)
        await loadSystemStatus()
      } else {
        alert(`❌ Atama hatası: ${data.error}`)
      }
    } catch (err) {
      alert('Atama sistemi hatası')
      console.error('Tek sipariş atama hatası:', err)
    }
  }

  // Otomatik monitoring başlat/durdur
  useEffect(() => {
    let interval: number | null = null

    if (isMonitoring) {
      // İlk çalıştırma
      runAIAssignment()
      
      // 2 dakikada bir otomatik kontrol
      interval = window.setInterval(() => {
        runAIAssignment()
      }, 2 * 60 * 1000) // 2 dakika
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isMonitoring, runAIAssignment])

  // Sistem durumunu yükle
  useEffect(() => {
    loadSystemStatus()
    const statusInterval: number = window.setInterval(loadSystemStatus, 30000)
    
    return () => {
      clearInterval(statusInterval)
    }
  }, [])

  // Otomatik yenileme
  useEffect(() => {
    if (isMonitoring) {
      const autoRefreshInterval: number = window.setInterval(() => {
        loadSystemStatus()
      }, 10000) // 10 saniye
      
      return () => clearInterval(autoRefreshInterval)
    }
  }, [isMonitoring])

  // Real-time subscription ekle
  useEffect(() => {
    const subscription = supabase
      .channel('ai-courier-manager')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'delivery_assignments' },
        (payload: any) => {
          loadSystemStatus()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'delivery_assignments' },
        (payload: any) => {
          loadSystemStatus()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload: any) => {
          if (payload.new.status === 'pending') {
            loadSystemStatus()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload: any) => {
          loadSystemStatus()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couriers' },
        (payload: any) => {
          loadSystemStatus()
        }
      )
      .subscribe()

    // Custom event listener
    const handleCourierAssignmentsUpdate = () => {
      loadSystemStatus()
    }
    
    window.addEventListener('courier-assignments-updated', handleCourierAssignmentsUpdate)
    window.addEventListener('couriers-updated', handleCourierAssignmentsUpdate)

    // 4 saniyede bir otomatik güncelleme
    const autoRefreshInterval = setInterval(() => {
      loadSystemStatus()
    }, 4000)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('courier-assignments-updated', handleCourierAssignmentsUpdate)
      window.removeEventListener('couriers-updated', handleCourierAssignmentsUpdate)
      clearInterval(autoRefreshInterval)
    }
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CpuChipIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Kurye Atama Sistemi</h2>
            <p className="text-sm text-gray-600">
              Yapay zeka destekli otomatik kurye atama ve izleme
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isMonitoring 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isMonitoring ? (
              <>
                <PauseIcon className="h-5 w-5" />
                <span>Otomatik İzlemeyi Durdur</span>
              </>
            ) : (
              <>
                <PlayIcon className="h-5 w-5" />
                <span>Otomatik İzleme Başlat</span>
              </>
            )}
          </button>
          
          <button
            onClick={runAIAssignment}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Çalışıyor...' : 'Manuel Atama Çalıştır'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <span className="text-red-700 font-medium">Hata:</span>
            <span className="text-red-600">{error}</span>
          </div>
        </div>
      )}

      {/* Sistem Durumu */}
      {systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Atanmamış Sipariş</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {systemStatus.unassigned_orders_count}
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <TruckIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Müsait Kurye</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {systemStatus.available_couriers_count}
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <CpuChipIcon className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">AI Atama (1h)</span>
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {systemStatus.recent_ai_assignments_count}
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${
                systemStatus.system_status === 'active' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm font-medium text-gray-900">Sistem Durumu</span>
            </div>
            <p className="text-sm font-medium text-gray-600 mt-1">
              {systemStatus.recommendation}
            </p>
          </div>
        </div>
      )}

      {/* Otomatik İzleme Durumu */}
      {isMonitoring && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-blue-700 font-medium">
              Otomatik AI atama aktif - 2 dakikada bir kontrol ediliyor
            </span>
          </div>
        </div>
      )}

      {/* Son Çalıştırma Sonuçları */}
      {lastMonitorResult && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Son Çalıştırma Sonuçları
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {lastMonitorResult.processed_orders}
              </p>
              <p className="text-sm text-gray-600">İşlenen Sipariş</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {lastMonitorResult.success_count}
              </p>
              <p className="text-sm text-gray-600">Başarılı Atama</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {lastMonitorResult.failed_count}
              </p>
              <p className="text-sm text-gray-600">Başarısız Atama</p>
            </div>
          </div>
          
          {lastMonitorResult.results && lastMonitorResult.results.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Detaylı Sonuçlar:</h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {lastMonitorResult.results.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border ${
                      result.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {result.success ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-red-600" />
                        )}
                        <span className="font-medium text-gray-900">
                          {result.customer_name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {result.order_id.slice(-8)}
                      </span>
                    </div>
                    
                    {result.success && result.courier_name && (
                      <p className="text-sm text-green-700 mt-1">
                        ✅ Kurye: {result.courier_name}
                      </p>
                    )}
                    
                    {result.ai_reasoning && (
                      <p className="text-sm text-gray-600 mt-1">
                        🤖 AI: {result.ai_reasoning}
                      </p>
                    )}
                    
                    {result.error && (
                      <p className="text-sm text-red-600 mt-1">
                        ❌ Hata: {result.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-3">
            Son çalıştırma: {new Date(lastMonitorResult.timestamp).toLocaleString('tr-TR')}
          </p>
        </div>
      )}
    </div>
  )
} 