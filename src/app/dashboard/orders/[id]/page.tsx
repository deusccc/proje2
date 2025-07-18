'use client'

import { useEffect, useState } from 'react'
import { supabase, getCurrentUser } from '@/lib/supabase/index'
import { User } from '@/types'
import { OrderDetail } from '@/types/index'
import DashboardLayout from '@/components/DashboardLayout'
import GoogleMapsComponent from '@/components/GoogleMapsComponent'
import GoogleMapsProvider from '@/components/GoogleMapsProvider'
import { MapPinIcon, ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const statusMap: { [key in OrderDetail['status']]: { text: string; color: string; } } = {
    pending: { text: 'Onay Bekliyor', color: 'bg-yellow-100 text-yellow-800' },
    confirmed: { text: 'Onaylandı', color: 'bg-cyan-100 text-cyan-800' },
    preparing: { text: 'Hazırlanıyor', color: 'bg-blue-100 text-blue-800' },
    ready: { text: 'Hazır', color: 'bg-purple-100 text-purple-800' },
    ready_for_pickup: { text: 'Alınmaya Hazır', color: 'bg-purple-100 text-purple-800' },
    picked_up: { text: 'Alındı', color: 'bg-indigo-100 text-indigo-800' },
    in_transit: { text: 'Yolda', color: 'bg-orange-100 text-orange-800' },
    out_for_delivery: { text: 'Teslimat Yolunda', color: 'bg-orange-100 text-orange-800' },
    delivered: { text: 'Teslim Edildi', color: 'bg-teal-100 text-teal-800' },
    completed: { text: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
    cancelled: { text: 'İptal Edildi', color: 'bg-red-100 text-red-800' },
}

const actionButtonMap: { [key in OrderDetail['status']]?: { text: string; style: string; nextStatus: OrderDetail['status'] } } = {
    pending: { text: 'Siparişi Onayla', style: 'bg-blue-600 hover:bg-blue-700', nextStatus: 'confirmed' },
    confirmed: { text: 'Hazırlamaya Başla', style: 'bg-cyan-600 hover:bg-cyan-700', nextStatus: 'preparing' },
    preparing: { text: 'Hazırlandı Olarak İşaretle', style: 'bg-indigo-600 hover:bg-indigo-700', nextStatus: 'ready_for_pickup' },
    ready_for_pickup: { text: 'Kuryeye Teslim Et', style: 'bg-purple-600 hover:bg-purple-700', nextStatus: 'out_for_delivery' },
    out_for_delivery: { text: 'Teslim Edildi Olarak İşaretle', style: 'bg-green-600 hover:bg-green-700', nextStatus: 'delivered' },
};

export default function OrderDetailPage() {
    const params = useParams();
    const id = params.id;
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserAndOrder = async () => {
            setLoading(true);
            try {
                const currentUser = await getCurrentUser();
                if (!currentUser) {
                    throw new Error("Kullanıcı bulunamadı.");
                }
                setUser(currentUser);

                if (!id) {
                    throw new Error("Sipariş ID bulunamadı.");
                }

                const { data, error: orderError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (orderError) {
                    throw orderError;
                }

                if (!data) {
                    throw new Error("Sipariş bulunamadı.");
                }

                // Order items'ları ayrı olarak al
                const { data: orderItemsData, error: itemsError } = await supabase
                    .from('order_items')
                    .select(`
                        id,
                        product_id,
                        product_name,
                        portion_id,
                        quantity,
                        unit_price,
                        total_price,
                        special_instructions,
                        products:products(name, description)
                    `)
                    .eq('order_id', id);

                if (itemsError) {
                    console.warn('Order items alınırken hata:', itemsError);
                }

                // Users bilgisini al (eğer varsa)
                let userData = null;
                if (data.courier_id) {
                    const { data: userResponse } = await supabase
                        .from('users')
                        .select('full_name')
                        .eq('id', data.courier_id)
                        .single();
                    userData = userResponse;
                }

                // Veriyi birleştir
                const orderWithItems = {
                    ...data,
                    order_items: orderItemsData || [],
                    users: userData
                };

                setOrder(orderWithItems as OrderDetail);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserAndOrder();
    }, [id]);

    const handleStatusUpdate = async (newStatus: OrderDetail['status']) => {
        if (!order) return;
        setUpdating(true);
        try {
            const { data: updatedOrder, error } = await supabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', order.id)
                .select('*')
                .single();

            if (error) throw error;
            
            // Order items'ları ayrı olarak al
            const { data: orderItemsData, error: itemsError } = await supabase
                .from('order_items')
                .select(`
                    id,
                    product_id,
                    product_name,
                    portion_id,
                    quantity,
                    unit_price,
                    total_price,
                    special_instructions,
                    products:products(name, description)
                `)
                .eq('order_id', order.id);

            if (itemsError) {
                console.warn('Order items alınırken hata:', itemsError);
            }

            // Users bilgisini al (eğer varsa)
            let userData = null;
            if (updatedOrder.courier_id) {
                const { data: userResponse } = await supabase
                    .from('users')
                    .select('full_name')
                    .eq('id', updatedOrder.courier_id)
                    .single();
                userData = userResponse;
            }

            // Veriyi birleştir
            const orderWithItems = {
                ...updatedOrder,
                order_items: orderItemsData || [],
                users: userData
            };

            setOrder(orderWithItems as OrderDetail);

            // Send confirmation SMS
            if (newStatus === 'confirmed') {
                const message = `Sayin ${order.customer_name}, #${order.id} numarali siparisiniz onaylanmistir ve hazirlanmaya baslayacaktir. Afiyet olsun!`;
                
                try {
                    console.log('📱 Sipariş onay SMS gönderiliyor:', { phone: order.customer_phone, orderId: order.id });
                    
                    const smsResponse = await fetch('/api/test-sms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ to: order.customer_phone, message }),
                    });
                    
                    const smsResult = await smsResponse.json();
                    console.log('📱 Onay SMS API yanıtı:', smsResult);
                    
                    if (!smsResult.success) {
                        console.error('❌ Onay SMS gönderme başarısız:', smsResult);
                        // SMS başarısız olsa da sipariş onaylandı mesajı göster
                        alert(`Sipariş onaylandı! Ancak SMS gönderilemedi: ${smsResult.message}`);
                    } else {
                        console.log('✅ Onay SMS başarıyla gönderildi');
                    }
                } catch (smsError) {
                    console.error('💥 Onay SMS gönderme hatası:', smsError);
                    alert('Sipariş onaylandı! Ancak SMS gönderiminde bir hata oluştu.');
                }
            }

        } catch (err: any) {
            setError("Durum güncellenirken bir hata oluştu: " + err.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };
    
    const initialMapCenter = 
        order && order.customer_address_lat && order.customer_address_lng
        ? { lat: parseFloat(order.customer_address_lat), lng: parseFloat(order.customer_address_lng) }
        : { lat: 39.9334, lng: 32.8597 }; // Ankara varsayılan

    const renderContent = () => {
        if (loading) {
            return <div className="p-8 text-center">Yükleniyor...</div>;
        }
        
        if (error) {
            return <div className="p-8 text-red-500 text-center">Hata: {error}</div>;
        }
        
        if (!order) {
            return <div className="p-8 text-center">Sipariş bulunamadı.</div>;
        }

        const currentStatusInfo = statusMap[order.status] || { text: order.status, color: 'bg-gray-100 text-gray-800' };
        const mainAction = actionButtonMap[order.status];

        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <Link href="/dashboard/orders" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-4">
                        <ArrowLeftIcon className="h-4 w-4 mr-2" />
                        Tüm Siparişlere Dön
                    </Link>
                    <div className="bg-white shadow rounded-lg p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Sipariş Detayı</h1>
                                <p className="text-sm text-gray-500">Sipariş ID: #{order.id}</p>
                            </div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentStatusInfo.color}`}>
                                {currentStatusInfo.text}
                            </span>
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Customer and Address Info */}
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-medium text-gray-900">Müşteri Bilgileri</h2>
                                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                                        <p><span className="font-medium text-gray-800">Adı:</span> {order.customer_name}</p>
                                        <p><span className="font-medium text-gray-800">Telefon:</span> {order.customer_phone}</p>
                                    </div>
                                </div>
                                
                                <div>
                                    <h2 className="text-lg font-medium text-gray-900">Teslimat Adresi</h2>
                                    <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                                        <div className="flex items-center mb-2">
                                            {order.is_location_verified ? (
                                                <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2"/>
                                            ) : (
                                                <XCircleIcon className="h-6 w-6 text-red-500 mr-2"/>
                                            )}
                                            <h3 className={`text-md font-semibold ${order.is_location_verified ? 'text-green-700' : 'text-red-700'}`}>
                                               Konum {order.is_location_verified ? 'Doğrulandı' : 'Doğrulanmadı'}
                                            </h3>
                                        </div>
                                        
                                        <p className="text-sm text-gray-800 font-medium">{order.customer_address}</p>
                                        <p className="text-sm text-gray-600 mt-1">{order.customer_address_description || 'Ek adres tarifi yok.'}</p>
                                        
                                        {order.is_location_verified && (
                                            <div className="mt-2 p-2 bg-green-50 rounded-md">
                                                <p className="text-xs text-green-700 font-medium">
                                                    ✓ Bu adres müşteri tarafından doğrulanmıştır
                                                </p>
                                                {order.customer_address_lat && order.customer_address_lng && (
                                                    <p className="text-xs text-green-600 mt-1">
                                                        Konum: {parseFloat(order.customer_address_lat).toFixed(6)}, {parseFloat(order.customer_address_lng).toFixed(6)}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        
                                        {!order.is_location_verified && (
                                            <div className="mt-2 p-2 bg-yellow-50 rounded-md">
                                                <p className="text-xs text-yellow-700">
                                                    ⚠ Bu adres henüz doğrulanmamış. Müşteriye SMS gönderilmiş olabilir.
                                                </p>
                                            </div>
                                        )}
                                        
                                        {initialMapCenter && (
                                            <div className="mt-4 h-56 w-full rounded-lg overflow-hidden border">
                                                <GoogleMapsComponent 
                                                    initialCenter={initialMapCenter} 
                                                    onLocationChange={() => {}} // Read-only map
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <h2 className="text-lg font-medium text-gray-900">Sipariş Aksiyonları</h2>
                                    <div className="mt-2 space-y-3">
                                        {mainAction && (
                                            <button
                                                type="button"
                                                onClick={() => handleStatusUpdate(mainAction.nextStatus)}
                                                disabled={updating}
                                                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${mainAction.style} disabled:bg-gray-400`}
                                            >
                                                {updating ? 'Güncelleniyor...' : mainAction.text}
                                            </button>
                                        )}
                                        
                                        {/* AI Kurye Atama Butonu */}
                                        {order.status === 'pending' && (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        const response = await fetch('/api/ai-courier-assignment', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ orderId: order.id })
                                                        })
                                                        
                                                        const result = await response.json()
                                                        
                                                        if (result.success) {
                                                            alert(`🤖 AI Kurye Ataması Başarılı!\n\nKurye: ${result.courier_name}\nTeslimat Ücreti: ₺${result.delivery_fee}\nMesafe: ${result.estimated_distance} km\n\nAI Gerekçesi: ${result.ai_reasoning}`)
                                                            // Sayfayı yenile
                                                            window.location.reload()
                                                        } else {
                                                            alert(`❌ AI Kurye Ataması Başarısız!\n\nHata: ${result.error}\n\nAI Açıklaması: ${result.ai_reasoning || 'Açıklama yok'}`)
                                                        }
                                                    } catch (error) {
                                                        alert('AI kurye atama sistemi hatası!')
                                                        console.error('AI atama hatası:', error)
                                                    }
                                                }}
                                                disabled={updating}
                                                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400"
                                            >
                                                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                </svg>
                                                🤖 AI ile Kurye Ata
                                            </button>
                                        )}
                                        
                                        {order.status !== 'cancelled' && order.status !== 'completed' && order.status !== 'delivered' && (
                                            <button
                                                type="button"
                                                onClick={() => handleStatusUpdate('cancelled')}
                                                disabled={updating}
                                                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-200"
                                            >
                                                Siparişi İptal Et
                                            </button>
                                        )}
                                    </div>
                                </div>

                            </div>

                            {/* Order Items and Total */}
                            <div>
                                <h2 className="text-lg font-medium text-gray-900">Sipariş İçeriği</h2>
                                <ul className="mt-2 divide-y divide-gray-200 border-b border-t">
                                    {order.order_items.map((item: any, index: number) => (
                                        <li key={index} className="py-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-800">{item.product_name || item.products?.name || 'Ürün Adı Yok'}</p>
                                                    <div className="mt-1 space-y-1">
                                                        <p className="text-sm text-gray-600">
                                                            <span className="font-medium">Adet:</span> {item.quantity} adet
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            <span className="font-medium">Birim Fiyat:</span> {item.unit_price ? `${item.unit_price.toFixed(2)} TL` : 'Fiyat belirtilmemiş'}
                                                        </p>
                                                        {item.special_instructions && (
                                                            <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                                                                <span className="font-medium">Özel Talimat:</span> {item.special_instructions}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right ml-4">
                                                    <p className="text-lg font-bold text-gray-900">
                                                        {item.total_price ? `${item.total_price.toFixed(2)} TL` : 'Fiyat belirtilmemiş'}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                
                                {/* Order Summary */}
                                <div className="mt-6 space-y-2 border-t pt-4">
                                    <div className="flex justify-between text-sm">
                                        <span>Ara Toplam:</span>
                                        <span>{(order.total_amount - (order.delivery_fee || 0)).toFixed(2)} TL</span>
                                    </div>
                                    {order.delivery_fee && order.delivery_fee > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span>Teslimat Ücreti:</span>
                                            <span>{order.delivery_fee.toFixed(2)} TL</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                                        <span>Toplam Tutar:</span>
                                        <span>{order.total_amount.toFixed(2)} TL</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout user={user} onSignOut={handleSignOut} allowedRoles={['admin', 'manager', 'staff']}>
            <GoogleMapsProvider>
                {renderContent()}
            </GoogleMapsProvider>
        </DashboardLayout>
    );
} 