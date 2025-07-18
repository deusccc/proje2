'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { User, Order } from '@/types'
import NewOrderPopup from './NewOrderPopup'
import { supabase } from '@/lib/supabase/index'
import { 
  HomeIcon, 
  ShoppingCartIcon, 
  PlusIcon, 
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  BuildingStorefrontIcon,
  BookOpenIcon,
  ShoppingBagIcon,
  CubeIcon,
  UsersIcon,
  TruckIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface DashboardLayoutProps {
  children: React.ReactNode
  user: User | null
  onSignOut: () => void
  allowedRoles?: User['role'][]
}

const navigation = [
  { name: 'Ana Sayfa', href: '/dashboard', icon: HomeIcon, roles: ['admin', 'manager', 'staff'] },
  { name: 'Siparişler', href: '/dashboard/orders', icon: ShoppingCartIcon, roles: ['admin', 'manager', 'staff'] },
  { name: 'Yeni Sipariş', href: '/dashboard/orders/new', icon: PlusIcon, roles: ['admin', 'manager', 'staff'] },
  { name: 'Harici Siparişler', href: '/dashboard/external-orders', icon: TruckIcon, roles: ['admin', 'manager', 'staff'] },
  { name: 'Menü Yönetimi', href: '/dashboard/menu', icon: ClipboardDocumentListIcon, roles: ['admin', 'manager'] },
  { name: 'Trendyol Menü', href: '/dashboard/trendyol-menu', icon: ShoppingBagIcon, roles: ['admin', 'manager'] },
  { name: 'Müşteriler', href: '/dashboard/customers', icon: UsersIcon, roles: ['admin', 'manager'] },
  { name: 'Entegrasyonlar', href: '/dashboard/integrations', icon: Cog6ToothIcon, roles: ['admin', 'manager'] },
  { name: 'Ayarlar', href: '/dashboard/settings', icon: Cog6ToothIcon, roles: ['admin', 'manager'] },
]

const companyNavigation = [
  { name: 'Şirket Ana Sayfa', href: '/company', icon: BuildingStorefrontIcon },
  { name: 'Restoranlar', href: '/company/restaurants', icon: BookOpenIcon },
  { name: 'Kuryeler', href: '/company/couriers', icon: TruckIcon },
]

const courierNavigation = [
  { name: 'Kurye Ana Sayfa', href: '/courier', icon: HomeIcon },
  { name: 'Teslimatlarım', href: '/courier/deliveries', icon: TruckIcon },
]

export default function DashboardLayout({ children, user, onSignOut, allowedRoles }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [newOrder, setNewOrder] = useState<(Order & { order_items: any[] }) | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!user) return;

    // Rol tabanlı erişim kontrolü
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Kullanıcının rolüne göre yönlendir
      switch (user.role) {
        case 'owner':
        case 'companymanager':
          router.push('/company')
          break
        case 'courier':
          router.push('/courier')
          break
        case 'admin':
        case 'manager':
        case 'staff':
          router.push('/dashboard')
          break
        default:
          router.push('/')
      }
      return
    }

    // Kullanıcının restaurant_id'si null ise ve restoran paneline erişmeye çalışıyorsa
    if (!user.restaurant_id && (user.role === 'admin' || user.role === 'manager' || user.role === 'staff')) {
      console.error('Kullanıcının restaurant_id değeri null')
      router.push('/')
      return
    }

    // Eğer kullanıcının restaurant_id'si yoksa, ilk aktif restoranı al
    const setupRealtimeSubscription = async () => {
      let restaurantId = user.restaurant_id
      if (!restaurantId) {
        const { data: firstRestaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .single()
        
        if (restaurantError || !firstRestaurant) {
          console.error('Aktif restoran bulunamadı:', restaurantError)
          return
        }
        restaurantId = firstRestaurant.id
      }

      const channel = supabase.channel(`new-orders-for-restaurant-${restaurantId}`)
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'orders', 
            filter: `restaurant_id=eq.${restaurantId}` 
          },
          async (payload) => {
            if (payload.new && payload.new.status === 'pending') {
              // Fetch order items for the new order
              const { data: itemsData, error } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', payload.new.id)
              
              if (error) {
                console.error('Error fetching items for new order notification', error)
                return
              }

              const fullOrder = { ...payload.new, order_items: itemsData || [] }
              setNewOrder(fullOrder as Order & { order_items: any[] })
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    setupRealtimeSubscription()
  }, [user, allowedRoles, router])

  const handleConfirmOrder = (orderId: string) => {
    setNewOrder(null);
    router.push(`/dashboard/orders/${orderId}`);
  };

  useEffect(() => {
    // If there's a user and a list of allowed roles, check for authorization
    if (user && allowedRoles && !allowedRoles.includes(user.role)) {
      // If user's role is not allowed, sign them out and redirect
      onSignOut()
      // Optional: Show an alert or redirect to a specific "unauthorized" page
      // For now, redirecting to login is handled by the parent component's onSignOut
    }
  }, [user, allowedRoles, onSignOut, router])

  // If user is null, or if they are being redirected, don't render the layout
  if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        </div>
    )
  }

  // Rol bazında navigation filtreleme
  const getNavigationForRole = (userRole: User['role']) => {
    switch (userRole) {
      case 'owner':
      case 'companymanager':
        return companyNavigation
      case 'courier':
        return courierNavigation
      case 'admin':
      case 'manager':
      case 'staff':
        return navigation.filter(item => item.roles.includes(userRole))
      default:
        return []
    }
  }

  const filteredNavigation = getNavigationForRole(user.role)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <BuildingStorefrontIcon className="h-8 w-8 text-primary-600 mr-2" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {user?.restaurants?.name || 'Restoran'}
                </h1>
                <p className="text-xs text-gray-500">Yönetim Paneli</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4">
            <ul className="space-y-2">
              {filteredNavigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:bg-white lg:border-r lg:border-gray-200">
        <div className="flex h-16 items-center px-6 border-b border-gray-200">
          <BuildingStorefrontIcon className="h-8 w-8 text-primary-600 mr-3" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {user?.restaurants?.name || 'Restoran'}
            </h1>
            <p className="text-xs text-gray-500">Yönetim Paneli</p>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {filteredNavigation.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.full_name || 'Kullanıcı'}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role || 'user'}</p>
                </div>
              </div>
              <button
                onClick={onSignOut}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                Çıkış
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {newOrder && (
        <NewOrderPopup
          order={newOrder}
          onClose={() => setNewOrder(null)}
          onConfirm={handleConfirmOrder}
        />
      )}
    </div>
  )
} 