'use client'

import { useState } from 'react'

export default function SMSTestPage() {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('Test mesajı - SMS sistemi çalışıyor.')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [useHeader, setUseHeader] = useState(true)

  const sendTestSMS = async (withHeader = true) => {
    if (!phone.trim() || !message.trim()) {
      alert('Telefon numarası ve mesaj gereklidir!')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const endpoint = withHeader ? '/api/test-sms' : '/api/test-sms-no-header'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phone,
          message: message
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ success: false, message: 'Network hatası', error: error })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">SMS Test Paneli</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefon Numarası (5XXXXXXXXX formatında)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5551234567"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mesaj İçeriği
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => sendTestSMS(true)}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'SMS Gönderiliyor...' : 'Başlık ile SMS Gönder'}
            </button>

            <button
              onClick={() => sendTestSMS(false)}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'SMS Gönderiliyor...' : 'Başlık Olmadan SMS Gönder'}
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-6 p-4 rounded-md bg-gray-50">
            <h3 className="font-medium text-gray-800 mb-2">Sonuç:</h3>
            <div className={`p-3 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <div className="font-medium">
                {result.success ? '✅ Başarılı' : '❌ Başarısız'}
              </div>
              <div className="text-sm mt-1">
                <strong>Mesaj:</strong> {result.message}
              </div>
              {result.response && (
                <div className="text-sm mt-1">
                  <strong>Netgsm Yanıt:</strong> {result.response}
                </div>
              )}
              {result.errorCode && (
                <div className="text-sm mt-1">
                  <strong>Hata Kodu:</strong> {result.errorCode}
                </div>
              )}
              {result.suggestion && (
                <div className="text-sm mt-1 p-2 bg-yellow-100 rounded">
                  <strong>Öneri:</strong> {result.suggestion}
                </div>
              )}
              {result.workaround && (
                <div className="text-sm mt-1 p-2 bg-blue-100 rounded">
                  <strong>Çözüm:</strong> {result.workaround}
                </div>
              )}
              {result.details && (
                <div className="text-sm mt-1">
                  <strong>Detaylar:</strong> {JSON.stringify(result.details, null, 2)}
                </div>
              )}
              {result.error && (
                <div className="text-sm mt-1">
                  <strong>Hata:</strong> {JSON.stringify(result.error)}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="p-4 bg-yellow-50 rounded-md">
            <h4 className="font-medium text-yellow-800 mb-2">💡 Durum Açıklaması:</h4>
            <p className="text-sm text-yellow-700">
              Netgsm API'niz çalışıyor! Sadece "UFUK SAGIN" mesaj başlığı henüz onaylanmamış. 
              Başlık olmadan SMS gönderebilirsiniz (alıcı normal telefon numarası görecek).
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-md">
            <h4 className="font-medium text-blue-800 mb-2">🔧 Mesaj Başlığı Onaylatma:</h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Netgsm.com.tr'ye giriş yapın</li>
              <li>"SMS" → "Mesaj Başlığı" menüsüne gidin</li>
              <li>"UFUK SAGIN" başlığını onaylatın</li>
              <li>Onay süreci 1-2 gün sürebilir</li>
            </ol>
          </div>

          <div className="p-4 bg-blue-50 rounded-md">
            <h4 className="font-medium text-blue-800 mb-2">Netgsm Hata Kodları:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>00:</strong> ✅ Başarılı</li>
              <li><strong>20:</strong> Mesaj metni boş</li>
              <li><strong>30:</strong> Geçersiz kullanıcı adı / şifre</li>
              <li><strong>40:</strong> ⚠️ Mesaj başlığı onaylanmamış (Normal!)</li>
              <li><strong>50:</strong> Geçersiz numara formatı</li>
              <li><strong>60:</strong> Operatör desteklenmiyor</li>
              <li><strong>70:</strong> Hatalı mesaj formatı</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 