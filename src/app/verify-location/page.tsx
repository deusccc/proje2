'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Order, CustomerAddress } from '@/types'
import GoogleMapsComponent from '@/components/GoogleMapsComponent'
import GoogleMapsProvider from '@/components/GoogleMapsProvider'

// A type combining Order and its associated address
type OrderWithAddress = Order & { customer_addresses: CustomerAddress | null }

function VerifyLocationContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get('token')

    const [order, setOrder] = useState<OrderWithAddress | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Form state, pre-filled from address if available
    const [province, setProvince] = useState('')
    const [district, setDistrict] = useState('')
    const [neighborhood, setNeighborhood] = useState('')
    const [street, setStreet] = useState('')
    const [addressLine1, setAddressLine1] = useState('')
    
    // Map state
    const [mapCenter, setMapCenter] = useState({ lat: 39.9334, lng: 32.8597 }) // Default to Ankara
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)

    const fetchOrder = useCallback(async () => {
        if (!token) {
            setError('Geçersiz doğrulama linki.')
            setLoading(false)
            return
        }

        setLoading(true)
        
        // Önce siparişi al
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('location_verification_token', token)
            .single()

        if (orderError || !orderData) {
            setError('Sipariş bulunamadı veya link geçersiz.')
            setLoading(false)
            return
        }

        // Eğer customer_id varsa müşteri adresini ayrı olarak al
        let customerAddress = null
        if (orderData.customer_id) {
            const { data: addressData } = await supabase
                .from('customer_addresses')
                .select('*')
                .eq('customer_id', orderData.customer_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()
            
            customerAddress = addressData
        }

        const typedData = { ...orderData, customer_addresses: customerAddress } as OrderWithAddress

        if (typedData.is_location_verified) {
            setError('Bu adres zaten doğrulanmış.')
            setSuccess(true) // Still show success state
        }
        
        setOrder(typedData)
        const address = typedData.customer_addresses
        if (address) {
            setProvince(address.province || '')
            setDistrict(address.district || '')
            setNeighborhood(address.neighborhood || '')
            setStreet(address.street || '')
            setAddressLine1(address.address_line_1 || '')
            if(address.latitude && address.longitude) {
                const initialLocation = { lat: Number(address.latitude), lng: Number(address.longitude) }
                setMapCenter(initialLocation)
                setCurrentLocation(initialLocation)
            }
        } else {
            // Fallback for older orders with no linked address object
            setAddressLine1(typedData.customer_address || '')
        }
        
        setLoading(false)
    }, [token])

    useEffect(() => {
        fetchOrder()
    }, [fetchOrder])
    
    const handleLocationChange = (newLocation: { lat: number; lng: number }) => {
        setCurrentLocation(newLocation)
    }

    // Reverse geocoding ile gelen adres verilerini form alanlarına otomatik doldur
    const handleAddressChange = (addressData: {
        province?: string;
        district?: string;
        neighborhood?: string;
        street?: string;
        formattedAddress?: string;
    }) => {
        console.log('📍 Adres verileri alındı:', addressData);
        
        // Sadece boş olan alanları doldur (kullanıcının manuel girdiği verileri korumak için)
        if (addressData.province && !province.trim()) {
            setProvince(addressData.province);
        }
        if (addressData.district && !district.trim()) {
            setDistrict(addressData.district);
        }
        if (addressData.neighborhood && !neighborhood.trim()) {
            setNeighborhood(addressData.neighborhood);
        }
        if (addressData.street && !street.trim()) {
            setStreet(addressData.street);
        }
        
        // Eğer addressLine1 boşsa ve formattedAddress varsa, onu kullan
        if (!addressLine1.trim() && addressData.formattedAddress) {
            // Formatlanmış adresi daha kullanışlı hale getir
            const cleanAddress = addressData.formattedAddress
                .replace(/\d{5,6}\s/, '') // Posta kodunu kaldır
                .replace(/Turkey$/, '') // Sonundaki Turkey'i kaldır
                .replace(/Türkiye$/, '') // Sonundaki Türkiye'yi kaldır
                .trim();
            setAddressLine1(cleanAddress);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!order) {
            setError('Sipariş bilgisi bulunamadı.')
            return
        }

        setLoading(true)
        setError(null)

        const newAddressDetails = {
            province,
            district,
            neighborhood,
            street,
            address_line_1: addressLine1,
            latitude: currentLocation?.lat,
            longitude: currentLocation?.lng,
        }

        let addressIdToLink: string | undefined

        // Case 1: Address exists. We just UPDATE it.
        if (order.customer_addresses?.id) {
            const { error: addressError } = await supabase
                .from('customer_addresses')
                .update({
                    ...newAddressDetails,
                    is_verified: true // Mark address as verified
                })
                .eq('id', order.customer_addresses.id)

            if (addressError) {
                setError('Adres güncellenirken bir hata oluştu: ' + addressError.message)
                setLoading(false)
                return
            }
            addressIdToLink = order.customer_addresses.id
        }
        // Case 2: No linked address (old order). We INSERT a new one and get its ID.
        else if (order.customer_id) {
            const addressTitle = 'Doğrulanan Adres'
            const { data: newAddress, error: addressError } = await supabase
                .from('customer_addresses')
                .insert({ 
                    ...newAddressDetails, 
                    customer_id: order.customer_id, 
                    address_title: addressTitle,
                    label: addressTitle,
                    is_verified: true // Mark new address as verified
                })
                .select('id')
                .single()

            if (addressError || !newAddress) {
                setError('Yeni adres oluşturulurken bir hata oluştu: ' + (addressError?.message || ''))
                setLoading(false)
                return
            }
            addressIdToLink = newAddress.id
        } else {
            setError('Adresi ilişkilendirecek bir müşteri bulunamadı.')
            setLoading(false)
            return
        }
        
        // Create a comprehensive address text with all verified details
        const addressParts = [
            addressLine1,
            street,
            neighborhood,
            district,
            province
        ].filter(part => part && part.trim() !== '')
        
        const verifiedAddressText = addressParts.join(', ')
        
        // Update the order with complete verified address information
        const { error: orderError } = await supabase
            .from('orders')
            .update({ 
                is_location_verified: true,
                customer_address: verifiedAddressText, // Complete verified address text
                customer_address_lat: currentLocation?.lat?.toString() || null,
                customer_address_lng: currentLocation?.lng?.toString() || null,
                customer_address_description: `Doğrulanmış tam adres: ${province} ${district} ${neighborhood}${street ? ' ' + street : ''} - ${addressLine1}`
            })
            .eq('id', order.id)

        if (orderError) {
            setError('Sipariş durumu güncellenirken bir hata oluştu: ' + orderError.message)
        } else {
            setSuccess(true)
        }

        setLoading(false)
    }

    if (loading && !order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Sipariş bilgileri yükleniyor...</p>
                </div>
            </div>
        )
    }
    
    if (error && !success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50">
                <div className="text-center p-8">
                    <div className="text-red-600 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-red-700 mb-2">Hata</h1>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-xl p-8">
                    {success ? (
                        <div className="text-center">
                            <div className="text-green-600 mb-4">
                                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-green-600">Teşekkürler!</h1>
                            <p className="mt-2 text-gray-700">Adresiniz başarıyla doğrulandı ve güncellendi. Siparişiniz hazırlanıyor.</p>
                            <button 
                                onClick={() => router.push('/')} 
                                className="mt-6 inline-block bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Ana Sayfaya Dön
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-bold text-gray-900">Teslimat Adresinizi Doğrulayın</h1>
                                <p className="mt-2 text-gray-600">
                                    Merhaba <strong>{order?.customer_name}</strong>, lütfen aşağıdaki adres bilgilerini kontrol edip harita üzerinden tam konumunuzu işaretleyin.
                                </p>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">İl</label>
                                        <input 
                                            type="text" 
                                            value={province} 
                                            onChange={e => setProvince(e.target.value)} 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                            required 
                                            placeholder="Örn: İstanbul"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">İlçe</label>
                                        <input 
                                            type="text" 
                                            value={district} 
                                            onChange={e => setDistrict(e.target.value)} 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                            required 
                                            placeholder="Örn: Kadıköy"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Mahalle</label>
                                        <input 
                                            type="text" 
                                            value={neighborhood} 
                                            onChange={e => setNeighborhood(e.target.value)} 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                            required 
                                            placeholder="Örn: Moda Mahallesi"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Sokak / Cadde</label>
                                        <input 
                                            type="text" 
                                            value={street} 
                                            onChange={e => setStreet(e.target.value)} 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                            placeholder="Örn: Caferağa Mahallesi Sokağı"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Bina, Daire No ve Diğer Detaylar</label>
                                        <textarea 
                                            value={addressLine1} 
                                            onChange={e => setAddressLine1(e.target.value)} 
                                            rows={3} 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                            required 
                                            placeholder="Örn: No: 15, Daire: 3, Mavi kapılı bina"
                                        />
                                    </div>
                                </div>
                                
                                <div className="h-96 md:h-full">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-medium text-gray-700 mb-2">Harita Üzerinden Konumunuzu İşaretleyin</h3>
                                        <p className="text-xs text-gray-500">Kırmızı işareti sürükleyerek tam konumunuzu belirleyebilirsiniz.</p>
                                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                            <p className="text-xs text-blue-700">
                                                💡 <strong>İpucu:</strong> Harita üzerinde bir noktaya tıkladığınızda veya işareti sürüklediğinizde, 
                                                adres bilgileri otomatik olarak doldurulacaktır.
                                            </p>
                                        </div>
                                    </div>
                                    <GoogleMapsComponent 
                                        initialCenter={mapCenter}
                                        onLocationChange={handleLocationChange}
                                        onAddressChange={handleAddressChange}
                                    />
                                </div>

                                <div className="md:col-span-2 mt-6">
                                    {error && (
                                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                                            <p className="text-red-600 text-sm">{error}</p>
                                        </div>
                                    )}
                                    <button 
                                        type="submit" 
                                        disabled={loading || !currentLocation} 
                                        className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {loading ? 'Kaydediliyor...' : 'Adresimi Doğrula ve Kaydet'}
                                    </button>
                                    {!currentLocation && (
                                        <p className="mt-2 text-sm text-amber-600 text-center">
                                            Lütfen harita üzerinden konumunuzu işaretleyin.
                                        </p>
                                    )}
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function VerifyLocationPage() {
    return (
        <GoogleMapsProvider>
            <VerifyLocationContent />
        </GoogleMapsProvider>
    )
} 