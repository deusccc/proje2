'use client'

import { Fragment, useState, useEffect, useCallback } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, PlusIcon, MinusIcon, ShoppingCartIcon, MagnifyingGlassIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { getCurrentUser, supabase } from '@/lib/supabase/index'
import { User, Category, Product, ProductPortion, ProductVariant, Customer, CustomerAddress } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { debounce } from 'lodash'

// Local Interfaces specific to this component
interface ProductWithRelations extends Product {
  product_portions: ProductPortion[];
  product_variants: ProductVariant[];
}
interface CartItem {
  id: string; // Composite ID for uniqueness
  product: Product;
  quantity: number;
  selectedPortion: ProductPortion;
  selectedVariants: ProductVariant[];
  unitPrice: number;
  special_instructions?: string;
}

interface NewOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onOrderCreated: () => void
}

type CustomerWithAddresses = Customer & { customer_addresses: CustomerAddress[] };

export default function NewOrderModal({ isOpen, onClose, onOrderCreated }: NewOrderModalProps) {
  const [user, setUser] = useState<User | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<ProductWithRelations[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Product-specific modal state
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null)
  const [selectedPortion, setSelectedPortion] = useState<ProductPortion | null>(null)
  const [selectedVariants, setSelectedVariants] = useState<ProductVariant[]>([])
  const [specialInstructions, setSpecialInstructions] = useState('')
  
  // Customer and Order form state
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [newAddressTitle, setNewAddressTitle] = useState('');
  const [newAddressLine1, setNewAddressLine1] = useState('');
  const [newAddressCity, setNewAddressCity] = useState('');
  const [orderNotes, setOrderNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')

  // Customer search state
  const [foundCustomer, setFoundCustomer] = useState<CustomerWithAddresses | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | 'new' | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const resetAndClose = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setNewAddressTitle('');
    setNewAddressLine1('');
    setNewAddressCity('');
    setOrderNotes('');
    setPaymentMethod('cash');
    setFoundCustomer(null);
    setSelectedAddress(null);
    setIsSearching(false);
    onClose();
  }

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        resetAndClose()
        return
      }
      setUser(currentUser)
      fetchData(currentUser)
    }
    if (isOpen) {
      init()
    }
  }, [isOpen])

  const fetchData = async (currentUser: User) => {
    setLoading(true)
    try {
      // Eğer kullanıcının restaurant_id'si yoksa, ilk aktif restoranı al
      let restaurantId = currentUser.restaurant_id
      if (!restaurantId) {
        const { data: firstRestaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .single()
        
        if (restaurantError || !firstRestaurant) {
          console.error('Aktif restoran bulunamadı:', restaurantError)
          throw new Error('Aktif restoran bulunamadı')
        }
        restaurantId = firstRestaurant.id
      }

      const { data: categoriesData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('sort_order')
        
      if (catError) throw catError
      
      const { data: productsData, error: prodError } = await supabase
        .from('products')
        .select('*, product_portions(*, units(*)), product_variants(*)')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)
        .order('name')
        
      if (prodError) throw prodError
      
      setCategories(categoriesData || [])
      setProducts(productsData as ProductWithRelations[] || [])
      if (categoriesData && categoriesData.length > 0) {
        setSelectedCategory(categoriesData[0].id)
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const debouncedSearch = useCallback(
    debounce(async (phone: string) => {
      if (phone.length < 10) {
        setFoundCustomer(null)
        setIsSearching(false)
        return
      }
      setIsSearching(true)

      // Step 1: Find the customer with a simple query that we know works.
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name, phone, created_at')
        .eq('phone', phone)
        .single()

      if (customerError || !customerData) {
        setFoundCustomer(null)
        setCustomerName('')
        setIsSearching(false)
        return
      }

      // Step 2: Now that we have the customer, fetch their addresses with a detailed, explicit query
      // to bypass Supabase's schema cache and get all columns, including lat/lng.
      const { data: addressesData, error: addressesError } = await supabase
        .from('customer_addresses')
        .select(`
            id, customer_id, address_title, address_line_1, city, postal_code,
            province, district, neighborhood, street, latitude, longitude, 
            is_verified, created_at, label
        `)
        .eq('customer_id', customerData.id)

      if (addressesError) {
        console.error("Error fetching customer addresses:", addressesError);
        // We still found the customer, so set them, but with empty addresses.
        setFoundCustomer({ ...customerData, customer_addresses: [] });
      } else {
        // Combine the customer data with their full, fresh address data.
        const addresses = addressesData || [];
        setFoundCustomer({ ...customerData, customer_addresses: addresses });
        
        // Auto-select the first verified address if available
        // Prioritize addresses that have both coordinates AND is_verified flag
        const fullyVerifiedAddresses = addresses.filter(addr => 
          addr.latitude && addr.longitude && (addr as any).is_verified
        );
        const coordinateVerifiedAddresses = addresses.filter(addr => 
          addr.latitude && addr.longitude && !(addr as any).is_verified
        );
        
        if (fullyVerifiedAddresses.length > 0) {
          // If multiple fully verified addresses, select the most recently created one
          const mostRecentVerified = fullyVerifiedAddresses.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          setSelectedAddress(mostRecentVerified);
        } else if (coordinateVerifiedAddresses.length > 0) {
          // Fallback to coordinate-only verified addresses
          const mostRecentCoordinate = coordinateVerifiedAddresses.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          setSelectedAddress(mostRecentCoordinate);
        } else {
          setSelectedAddress(null);
        }
      }
      
      setCustomerName(customerData.name || '')
      setIsSearching(false)
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSearch(customerPhone)
    return () => debouncedSearch.cancel()
  }, [customerPhone, debouncedSearch])
  
  useEffect(() => {
    if (selectedAddress && selectedAddress !== 'new') {
        setNewAddressLine1('');
        setNewAddressTitle('');
        setNewAddressCity('');
    } else if (selectedAddress === 'new') {
        setNewAddressLine1('');
        setNewAddressTitle('');
        setNewAddressCity('');
    }
  }, [selectedAddress])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cart.length === 0) return alert('Sepet boş!')
    
    if (!user) return alert('Kullanıcı bilgisi bulunamadı.')

    setSubmitting(true)

    try {
      // Eğer kullanıcının restaurant_id'si yoksa, ilk aktif restoranı al
      let restaurantId = user.restaurant_id
      if (!restaurantId) {
        const { data: firstRestaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .single()
        
        if (restaurantError || !firstRestaurant) {
          throw new Error('Aktif restoran bulunamadı')
        }
        restaurantId = firstRestaurant.id
      }

      const { subtotal, tax, deliveryFee, total } = calculateTotal()
      const verificationToken = crypto.randomUUID()
      
      // Check if address is pre-verified - more comprehensive check
      const isAddressPreVerified = foundCustomer && 
        selectedAddress && 
        selectedAddress !== 'new' && 
        typeof selectedAddress === 'object' && 
        selectedAddress.latitude && 
        selectedAddress.longitude &&
        (selectedAddress as any).is_verified;

      let customerIdToUse = foundCustomer?.id;
      let finalAddress: CustomerAddress | null = selectedAddress && selectedAddress !== 'new' ? selectedAddress : null;
      
      // Case 1: Create a new customer (and their first address)
      if (!foundCustomer && customerPhone && customerName) {
        const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({ 
              restaurant_id: restaurantId,
              phone: customerPhone, 
              name: customerName 
            })
            .select()
            .single();

        if (customerError) throw new Error('Yeni müşteri oluşturulamadı: ' + customerError.message)
        if (!newCustomer) throw new Error('Yeni müşteri oluşturulamadı.')
        customerIdToUse = newCustomer.id;

        if (newAddressLine1) {
            const addressTitle = newAddressTitle || 'Ev Adresi';
            const { data: newAddressData, error: addressError } = await supabase
                .from('customer_addresses')
                .insert({
                    customer_id: customerIdToUse,
                    address_line_1: newAddressLine1,
                    address_title: addressTitle,
                    city: newAddressCity || 'Belirtilmedi',
                    label: addressTitle,
                    latitude: null,
                    longitude: null,
                    is_verified: false
                })
                .select()
                .single();
            if (addressError) console.error('Yeni müşterinin adresi kaydedilemedi:', addressError.message);
            else finalAddress = newAddressData;
        }
      } 
      // Case 2: Existing customer, but adding a new address
      else if (foundCustomer && selectedAddress === 'new' && newAddressLine1) {
         const addressTitle = newAddressTitle || 'Yeni Adres';
         const { data: newAddressData, error: addressError } = await supabase
            .from('customer_addresses')
            .insert({
                customer_id: foundCustomer.id,
                address_line_1: newAddressLine1,
                address_title: addressTitle,
                city: newAddressCity || 'Belirtilmedi',
                label: addressTitle,
                latitude: null,
                longitude: null,
                is_verified: false
            })
            .select()
            .single();
        if (addressError) console.error('Var olan müşteri için yeni adres kaydedilemedi:', addressError.message);
        else finalAddress = newAddressData;
      }

      // Create comprehensive address text based on verification status
      let orderAddressText = 'Adres Yok';
      let orderAddressDescription = null;
      
      if (finalAddress) {
        if (isAddressPreVerified) {
          // For verified addresses, use complete address information
          const addressParts = [
            finalAddress.address_line_1,
            finalAddress.street,
            finalAddress.neighborhood,
            finalAddress.district,
            finalAddress.province || finalAddress.city
          ].filter(part => part && part.trim() !== '');
          
          orderAddressText = addressParts.join(', ');
          orderAddressDescription = `Doğrulanmış tam adres: ${finalAddress.address_title} - ${orderAddressText}`;
        } else {
          // For unverified addresses, use basic information
          orderAddressText = `${finalAddress.address_line_1}, ${finalAddress.city}`;
          orderAddressDescription = `Doğrulanmamış adres: ${finalAddress.address_title}`;
        }
      }

      const { data: orderData, error: orderError } = await supabase.from('orders').insert({ 
        restaurant_id: restaurantId, 
        customer_name: customerName, 
        customer_phone: customerPhone, 
        customer_address: orderAddressText,
        customer_address_description: orderAddressDescription,
        customer_id: customerIdToUse,
        status: 'pending', 
        payment_method: paymentMethod, 
        subtotal: subtotal,
        tax_amount: tax,
        delivery_fee: deliveryFee,
        total_amount: total, 
        notes: orderNotes,
        customer_address_lat: finalAddress?.latitude?.toString() || null,
        customer_address_lng: finalAddress?.longitude?.toString() || null,
        location_verification_token: !isAddressPreVerified ? verificationToken : null,
        is_location_verified: isAddressPreVerified
      }).select().single()

      if (orderError) throw orderError

      // --- START: Conditional SMS Logic ---
      // Only send SMS if address is NOT pre-verified and we have a verification token
      if (!isAddressPreVerified && customerPhone && verificationToken) {
        const verificationUrl = `${window.location.origin}/verify-location?token=${verificationToken}`;
        const message = `Siparişinizin teslimat adresini doğrulamak için lütfen linke tıklayın: ${verificationUrl}`;
        
        try {
          console.log('📱 Sipariş SMS gönderiliyor:', { phone: customerPhone, url: verificationUrl });
          
          const smsResponse = await fetch('/api/test-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: customerPhone, message: message }),
          });
          
          const smsResult = await smsResponse.json();
          console.log('📱 SMS API yanıtı:', smsResult);
          
          if (!smsResult.success) {
            console.error('❌ SMS gönderme başarısız:', smsResult);
            alert(`Sipariş başarıyla oluşturuldu! Ancak SMS gönderilemedi: ${smsResult.message}`);
          } else {
            console.log('✅ SMS başarıyla gönderildi');
          }
        } catch (smsError) {
          console.error('💥 SMS gönderme hatası:', smsError);
          alert('Sipariş başarıyla oluşturuldu! Ancak SMS gönderiminde bir hata oluştu.');
        }
      } else if (isAddressPreVerified) {
        console.log('✅ Doğrulanmış adres kullanıldı, SMS gönderilmedi');
      }
      // --- END: Conditional SMS Logic ---

      const orderItems = cart.map(item => ({ 
        order_id: orderData.id, 
        product_id: item.product.id, 
        product_name: `${item.product.name} (${item.selectedPortion.name}${item.selectedVariants.length > 0 ? ', ' + item.selectedVariants.map(v => v.name).join(', ') : ''})`, 
        portion_id: item.selectedPortion.id, 
        quantity: item.quantity, 
        unit_price: item.unitPrice, 
        total_price: item.unitPrice * item.quantity, 
        special_instructions: item.special_instructions, 
      }))
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      // Sipariş başarıyla oluşturuldu mesajı
      if (isAddressPreVerified) {
        alert('Sipariş başarıyla oluşturuldu! Otomatik kurye atama sistemi çalışacak.')
      } else {
        alert('Sipariş başarıyla oluşturuldu! Adres doğrulama SMS\'i gönderildi ve otomatik kurye atama sistemi çalışacak.')
      }

      onOrderCreated()
      resetAndClose()

    } catch (error: any) {
      console.error('Sipariş oluşturma hatası:', error)
      alert(`Sipariş oluşturulurken bir hata oluştu: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // --- Product Modal and Cart Logic ---

  const openProductModal = (product: ProductWithRelations) => {
    setSelectedProduct(product);
    const defaultPortion = product.product_portions?.find(p => p.is_default) || product.product_portions?.[0] || null;
    setSelectedPortion(defaultPortion);
    setSelectedVariants([]);
    setSpecialInstructions('');
    setShowProductModal(true);
  };
  const handlePortionChange = (portionId: number) => {
    const portion = selectedProduct?.product_portions.find(p => p.id === portionId) || null;
    setSelectedPortion(portion);
  };
  const handleVariantChange = (variant: ProductVariant) => {
    setSelectedVariants(prev => prev.some(v => v.id === variant.id) ? prev.filter(v => v.id !== variant.id) : [...prev, variant]);
  };
  const calculateProductPrice = () => {
    if (!selectedProduct || !selectedPortion) return 0;
    
    // Temel ürün fiyatı
    const basePrice = selectedProduct.base_price || 0;
    
    // Porsiyon fiyat değişikliği
    const portionPriceModifier = selectedPortion.price_modifier || 0;
    
    // Ek malzemeler fiyatı - price_modifier kullan
    const variantsPrice = selectedVariants.reduce((acc, v) => acc + (v.price_modifier || 0), 0);
    
    // Toplam fiyat = Temel fiyat + Porsiyon değişikliği + Ek malzemeler
    return basePrice + portionPriceModifier + variantsPrice;
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !selectedPortion) return;
    const cartItemId = `${selectedProduct.id}-${selectedPortion.id}-${selectedVariants.map(v => v.id).sort().join('-')}`;
    const existingItem = cart.find(item => item.id === cartItemId);

    if (existingItem) {
      // Mevcut ürün varsa sadece miktarı artır
      updateQuantity(cartItemId, existingItem.quantity + 1);
    } else {
      // Yeni ürün ekle
      const newItem = {
        id: cartItemId,
        product: selectedProduct,
        quantity: 1,
        selectedPortion,
        selectedVariants,
        unitPrice: calculateProductPrice(),
        special_instructions: specialInstructions || undefined,
      };
      setCart([...cart, newItem]);
    }
    setShowProductModal(false);
  };

  const removeFromCart = (cartItemId: string) => setCart(cart.filter(item => item.id !== cartItemId));
  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
    } else {
      setCart(cart.map(item => item.id === cartItemId ? { ...item, quantity } : item));
    }
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
    const tax = 0; // KDV zaten fiyatlara dahil
    const deliveryFee = 0; // Implement logic if needed
    const total = subtotal + tax + deliveryFee;
    return { subtotal, tax, deliveryFee, total };
  };

  const filteredProducts = products.filter(p => selectedCategory ? p.category_id === selectedCategory : true);
  const { subtotal, tax, deliveryFee, total } = calculateTotal();

  // The rest of the return statement (JSX)
  return (
    <>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="fixed z-10 inset-0 overflow-y-auto" onClose={resetAndClose}>
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            </Transition.Child>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <div className="inline-block align-bottom bg-gray-100 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-4 sm:align-middle w-full max-w-5xl">
                <div className="bg-white px-4 pt-4 pb-3 sm:p-4 sm:pb-3 flex justify-between items-center">
                  <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                    Yeni Sipariş Oluştur
                  </Dialog.Title>
                  <button onClick={resetAndClose} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                    
                    {/* Left Column: Customer and Order Details */}
                    <div className="md:col-span-1 space-y-3">
                      <div className="bg-white rounded-xl shadow-sm p-3">
                          <h2 className="text-sm font-semibold text-gray-900 mb-2">Müşteri Bilgileri</h2>
                          <div className="relative">
                              <MagnifyingGlassIcon className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-gray-400" />
                              <input type="tel" placeholder="Müşteri Telefon No..." value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full pl-8 pr-2 py-1.5 text-sm border-gray-300 rounded-md shadow-sm" />
                          </div>

                          {foundCustomer ? (
                              <div className="mt-2 p-2 bg-green-50 rounded-md">
                                  <h4 className="font-semibold text-green-700 text-sm">Müşteri Bulundu</h4>
                                  <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="mt-1 block w-full px-2 py-1 text-sm border-gray-300 rounded-md shadow-sm" required />
                                  
                                  {/* Show auto-selection message if verified address is selected */}
                                  {selectedAddress && selectedAddress !== 'new' && selectedAddress.latitude && selectedAddress.longitude && (
                                      <div className="mt-1 p-1 bg-blue-50 rounded-md border border-blue-200">
                                          <p className="text-xs text-blue-700 font-medium">
                                              ✓ Doğrulanmış adres otomatik seçildi
                                          </p>
                                      </div>
                                  )}
                                  
                                  {/* Show message when no verified addresses are available */}
                                  {foundCustomer.customer_addresses.length > 0 && !foundCustomer.customer_addresses.some(addr => addr.latitude && addr.longitude) && (
                                      <div className="mt-1 p-1 bg-yellow-50 rounded-md border border-yellow-200">
                                          <p className="text-xs text-yellow-700">
                                              ⚠ Hiç doğrulanmış adres yok. Müşteriye SMS gönderilecek.
                                          </p>
                                      </div>
                                  )}
                                  
                                  <select onChange={(e) => { const val = e.target.value; setSelectedAddress(val === 'new' ? 'new' : foundCustomer.customer_addresses.find(a => a.id === val) || null) }} className="mt-1 block w-full text-xs border-gray-300 rounded-md shadow-sm" value={selectedAddress && selectedAddress !== 'new' ? selectedAddress.id : selectedAddress === 'new' ? 'new' : ''}>
                                      <option value="" disabled>Kayıtlı Adres Seç</option>
                                      {(() => {
                                          // Fully verified addresses (both coordinates and is_verified flag)
                                          const fullyVerifiedAddresses = foundCustomer.customer_addresses.filter(addr => 
                                              addr.latitude && addr.longitude && (addr as any).is_verified
                                          );
                                          // Coordinate-only verified addresses (has coordinates but not flagged as verified)
                                          const coordinateVerifiedAddresses = foundCustomer.customer_addresses.filter(addr => 
                                              addr.latitude && addr.longitude && !(addr as any).is_verified
                                          );
                                          // Completely unverified addresses
                                          const unverifiedAddresses = foundCustomer.customer_addresses.filter(addr => 
                                              !addr.latitude || !addr.longitude
                                          );
                                          
                                          return [
                                              ...fullyVerifiedAddresses.map(addr => (
                                                  <option key={addr.id} value={addr.id}>
                                                      {addr.address_title} - {addr.address_line_1} ✓ Tam Doğrulanmış
                                                  </option>
                                              )),
                                              ...coordinateVerifiedAddresses.map(addr => (
                                                  <option key={addr.id} value={addr.id}>
                                                      {addr.address_title} - {addr.address_line_1} ◐ Konum Var
                                                  </option>
                                              )),
                                              ...unverifiedAddresses.map(addr => (
                                                  <option key={addr.id} value={addr.id}>
                                                      {addr.address_title} - {addr.address_line_1} (Doğrulanmamış)
                                                  </option>
                                              ))
                                          ];
                                      })()}
                                      <option value="new">Yeni Adres Ekle</option>
                                  </select>
                                  
                                  {/* Show address summary */}
                                  {foundCustomer.customer_addresses.length > 0 && (
                                      <div className="mt-1 text-xs text-gray-500">
                                          {(() => {
                                              const fullyVerified = foundCustomer.customer_addresses.filter(addr => 
                                                  addr.latitude && addr.longitude && (addr as any).is_verified
                                              ).length;
                                              const coordinateVerified = foundCustomer.customer_addresses.filter(addr => 
                                                  addr.latitude && addr.longitude && !(addr as any).is_verified
                                              ).length;
                                              const totalCount = foundCustomer.customer_addresses.length;
                                              const unverified = totalCount - fullyVerified - coordinateVerified;
                                              
                                              return `${fullyVerified} tam doğrulanmış, ${coordinateVerified} konum var, ${unverified} doğrulanmamış adres`;
                                          })()}
                                      </div>
                                  )}
                                  
                                  {selectedAddress && selectedAddress !== 'new' && (
                                      <div className="mt-1 p-1 bg-blue-50 rounded-md">
                                          <p className="text-xs text-blue-700">
                                              {selectedAddress.latitude && selectedAddress.longitude && (selectedAddress as any).is_verified
                                                  ? '✓ Bu adres tam doğrulanmış, SMS gönderilmeyecek'
                                                  : selectedAddress.latitude && selectedAddress.longitude
                                                  ? '◐ Bu adres koordinatlara sahip, SMS gönderilmeyecek'
                                                  : '⚠ Bu adres doğrulanmamış, SMS gönderilecek'
                                              }
                                          </p>
                                      </div>
                                  )}
                              </div>
                          ) : (customerPhone.length >= 10 && !isSearching && 
                              <div className="mt-2 p-2 bg-blue-50 rounded-md">
                                  <h4 className="font-semibold text-blue-700 text-sm">Yeni Müşteri</h4>
                                  <input type="text" placeholder="Müşteri Adı" value={customerName} onChange={e => setCustomerName(e.target.value)} className="mt-1 block w-full px-2 py-1 text-sm border-gray-300 rounded-md shadow-sm" required />
                              </div>
                          )}
                          {((selectedAddress === 'new') || (!foundCustomer && customerPhone.length >= 10)) &&
                           <div className="space-y-2 pt-2 border-t mt-2">
                              <h4 className="text-xs font-medium text-gray-800">Yeni Adres Bilgileri</h4>
                              <div className="p-2 bg-yellow-50 rounded-md border border-yellow-200">
                                  <p className="text-xs text-yellow-700">
                                      ⚠ Yeni adres doğrulanmamış olarak kaydedilecek. Müşteriye SMS gönderilecek.
                                  </p>
                              </div>
                              <input type="text" placeholder="Adres Başlığı (örn: Ev, İş)" value={newAddressTitle} onChange={e => setNewAddressTitle(e.target.value)} className="block w-full text-xs border-gray-300 rounded-md shadow-sm" required />
                              <textarea placeholder="Açık Adres (Sokak, No, Daire vb.)" value={newAddressLine1} onChange={e => setNewAddressLine1(e.target.value)} rows={2} className="block w-full text-xs border-gray-300 rounded-md shadow-sm" required />
                              <input type="text" placeholder="Şehir" value={newAddressCity} onChange={e => setNewAddressCity(e.target.value)} className="block w-full text-xs border-gray-300 rounded-md shadow-sm" required />
                           </div>
                          }
                      </div>

                      <div className="bg-white rounded-xl shadow-sm p-3 space-y-3">
                          <h2 className="text-sm font-semibold text-gray-900">Ödeme & Onay</h2>
                           <div>
                              <label htmlFor="modalNotes" className="block text-xs font-medium text-gray-700">Sipariş Notu</label>
                              <input type="text" id="modalNotes" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} className="mt-1 block w-full px-2 py-1 text-sm border-gray-300 rounded-md shadow-sm" />
                            </div>
                            <div>
                              <span className="block text-xs font-medium text-gray-700">Ödeme Yöntemi</span>
                              <div className="mt-1 flex space-x-2">
                                 <button type="button" onClick={() => setPaymentMethod('cash')} className={`px-3 py-1 text-xs rounded-md ${paymentMethod === 'cash' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>Nakit</button>
                                 <button type="button" onClick={() => setPaymentMethod('card')} className={`px-3 py-1 text-xs rounded-md ${paymentMethod === 'card' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>Kart</button>
                              </div>
                            </div>
                            <div className="pt-2 border-t">
                               <button type="submit" disabled={submitting || cart.length === 0} className="w-full bg-green-600 text-white py-2 rounded-md shadow-sm hover:bg-green-700 disabled:bg-gray-400 text-sm">
                                  {submitting ? 'Oluşturuluyor...' : `Siparişi Oluştur (${total.toFixed(2)} TL)`}
                                </button>
                                
                                {/* Show order summary info */}
                                {selectedAddress && selectedAddress !== 'new' && (
                                    <div className="mt-1 text-xs text-gray-600">
                                        {selectedAddress.latitude && selectedAddress.longitude && (selectedAddress as any).is_verified
                                            ? `✓ Tam doğrulanmış adres kullanılacak: ${selectedAddress.address_title}`
                                            : selectedAddress.latitude && selectedAddress.longitude
                                            ? `◐ Koordinatlı adres kullanılacak: ${selectedAddress.address_title} (SMS gönderilmeyecek)`
                                            : `⚠ Doğrulanmamış adres kullanılacak: ${selectedAddress.address_title} (SMS gönderilecek)`
                                        }
                                    </div>
                                )}
                                
                                {(selectedAddress === 'new' || (!foundCustomer && customerPhone.length >= 10)) && (
                                    <div className="mt-1 text-xs text-yellow-600">
                                        ⚠ Yeni adres ekleniyor - Müşteriye doğrulama SMS'i gönderilecek
                                    </div>
                                )}
                            </div>
                      </div>
                    </div>

                    {/* Right Column: Menu and Cart */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="bg-white rounded-xl shadow-sm p-4">
                        <h2 className="text-md font-semibold text-gray-900 mb-3">Menü</h2>
                        <div className="flex space-x-2 border-b pb-2 mb-2 overflow-x-auto">
                          {categories.map(cat => <button type="button" key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${selectedCategory === cat.id ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>{cat.name}</button>)}
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 max-h-80 overflow-y-auto">
                          {filteredProducts.map(p => <button type="button" key={p.id} onClick={() => openProductModal(p)} className="p-2 border rounded-md text-center hover:bg-gray-100 text-xs min-h-[60px] flex items-center justify-center"><span className="leading-tight">{p.name}</span></button>)}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-sm p-4">
                        <h2 className="text-md font-semibold text-gray-900 mb-3">Sepet</h2>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {cart.map(item => (
                            <div key={item.id} className="border rounded-lg p-2 bg-gray-50">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 text-sm">{item.product.name}</p>
                                  <p className="text-xs text-gray-600">{item.selectedPortion.name}</p>
                                  {item.selectedVariants.length > 0 && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      + {item.selectedVariants.map(v => v.name).join(', ')}
                                    </p>
                                  )}
                                  {item.special_instructions && (
                                    <p className="text-xs text-orange-600 mt-1 bg-orange-50 p-1 rounded">
                                      📝 {item.special_instructions}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1 ml-2">
                                  <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors">
                                    <MinusIcon className="h-3 w-3"/>
                                  </button>
                                  <span className="font-medium min-w-[1.5rem] text-center text-sm">{item.quantity}</span>
                                  <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors">
                                    <PlusIcon className="h-3 w-3"/>
                                  </button>
                                  <div className="text-right ml-2">
                                    <p className="text-xs text-gray-600">Birim: {item.unitPrice.toFixed(2)} TL</p>
                                    <p className="font-bold text-gray-900 text-sm">{(item.unitPrice * item.quantity).toFixed(2)} TL</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {cart.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Sepetiniz boş.</p>}
                        </div>
                        <div className="pt-3 mt-3 border-t">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Ara Toplam</span>
                              <span>{subtotal.toFixed(2)} TL</span>
                            </div>
                            <div className="border-t pt-1">
                              <div className="flex justify-between font-bold text-sm">
                                <span>Toplam</span>
                                <span>{total.toFixed(2)} TL</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {cart.length} ürün, {cart.reduce((acc, item) => acc + item.quantity, 0)} adet
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Product Detail Modal */}
      {selectedProduct && (
           <Transition.Root show={showProductModal} as={Fragment}>
              <Dialog as="div" className="relative z-20" onClose={() => setShowProductModal(false)}>
                   <Transition.Child
                      as={Fragment}
                      enter="ease-out duration-300"
                      enterFrom="opacity-0"
                      enterTo="opacity-100"
                      leave="ease-in duration-200"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                  >
                      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                  </Transition.Child>
                  <div className="fixed inset-0 z-10 overflow-y-auto">
                      <div className="flex min-h-full items-center justify-center p-4 text-center">
                          <Transition.Child
                              as={Fragment}
                              enter="ease-out duration-300"
                              enterFrom="opacity-0 scale-95"
                              enterTo="opacity-100 scale-100"
                              leave="ease-in duration-200"
                              leaveFrom="opacity-100 scale-100"
                              leaveTo="opacity-0 scale-95"
                          >
                              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-4 text-left align-middle shadow-xl transition-all">
                                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900 mb-3">
                                      {selectedProduct.name}
                                  </Dialog.Title>
                                  <div className="mt-2">
                                      {selectedProduct.description && (
                                          <p className="text-sm text-gray-500 mb-4">{selectedProduct.description}</p>
                                      )}
                                      
                                      <div className="mb-4">
                                          <h4 className="text-sm font-semibold text-gray-800 mb-2">Porsiyon Seçin</h4>
                                          <div className="space-y-1">
                                              {selectedProduct.product_portions.map(portion => {
                                                  // Her porsiyon için fiyat hesapla
                                                  const basePrice = selectedProduct.base_price || 0;
                                                  const portionPriceModifier = portion.price_modifier || 0;
                                                  const totalPrice = basePrice + portionPriceModifier;
                                                  
                                                  return (
                                                      <div key={portion.id} onClick={() => handlePortionChange(portion.id)} className={`flex justify-between items-center p-2 rounded-lg cursor-pointer transition-colors text-sm ${selectedPortion?.id === portion.id ? 'bg-blue-100 border border-blue-500' : 'bg-gray-50 border border-transparent hover:bg-gray-100'}`}>
                                                          <div>
                                                              <span className="font-medium">{portion.name}</span>
                                                              <span className="text-xs text-gray-500 ml-1">({portion.units?.name || 'Birim'})</span>
                                                          </div>
                                                          <div className="text-right">
                                                              <span className="font-bold">{totalPrice.toFixed(2)} TL</span>
                                                              {portionPriceModifier !== 0 && (
                                                                  <p className="text-xs text-gray-500">
                                                                      {portionPriceModifier > 0 ? '+' : ''}{portionPriceModifier.toFixed(2)} TL
                                                                  </p>
                                                              )}
                                                          </div>
                                                      </div>
                                                  );
                                              })}
                                          </div>
                                      </div>

                                      {selectedProduct.product_variants.length > 0 && (
                                          <div className="mb-4">
                                              <h4 className="text-sm font-semibold text-gray-800 mb-2">Ek Malzemeler</h4>
                                              <div className="space-y-1">
                                                  {selectedProduct.product_variants.map(variant => (
                                                       <div key={variant.id} onClick={() => handleVariantChange(variant)} className={`flex justify-between items-center p-2 rounded-lg cursor-pointer transition-colors text-sm ${selectedVariants.some(v => v.id === variant.id) ? 'bg-green-100 border border-green-500' : 'bg-gray-50 border border-transparent hover:bg-gray-100'}`}>
                                                          <span className="font-medium">{variant.name}</span>
                                                          <span className="font-bold">+ {(variant.price_modifier || 0).toFixed(2)} TL</span>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                      
                                      <div className="mb-4">
                                          <h4 className="text-sm font-semibold text-gray-800 mb-2">Özel Talimatlar</h4>
                                          <textarea
                                              value={specialInstructions}
                                              onChange={(e) => setSpecialInstructions(e.target.value)}
                                              placeholder="Örn: Az pişmiş, ekstra sos..."
                                              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                              rows={2}
                                          />
                                      </div>
                                  </div>
                                  
                                  <div className="flex justify-between items-center pt-3 border-t">
                                      <div>
                                          <span className="text-xl font-bold text-gray-900">{calculateProductPrice().toFixed(2)} TL</span>
                                          {selectedVariants.length > 0 && (
                                              <p className="text-xs text-gray-500 mt-1">
                                                  + {selectedVariants.reduce((acc, v) => acc + (v.price_modifier || 0), 0).toFixed(2)} TL ek malzeme
                                              </p>
                                          )}
                                      </div>
                                      <button
                                          type="button"
                                          onClick={handleAddToCart}
                                          className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                                      >
                                          Sepete Ekle
                                      </button>
                                  </div>
                              </Dialog.Panel>
                          </Transition.Child>
                      </div>
                  </div>
              </Dialog>
          </Transition.Root>
      )}
    </>
  )
} 