export interface Restaurant {
  id: string
  name: string
  address?: string
  detailed_address?: string
  city?: string
  district?: string
  neighborhood?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  phone?: string
  email?: string
  is_active: boolean
  created_at: string
}

export interface User {
  id: string
  restaurant_id: string
  username: string
  password: string
  full_name: string
  role: 'admin' | 'manager' | 'staff' | 'courier' | 'companymanager'
  is_active: boolean
  created_at: string
  restaurants?: Restaurant
}

export interface Category {
  id: string
  restaurant_id: string
  name: string
  description?: string
  image_url?: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  description?: string
  image_url?: string
  base_price: number
  preparation_time: number
  is_available: boolean
  is_featured?: boolean
  created_at: string
}

export interface ProductOption {
  id: string
  product_id: string
  name: string
  type: 'size' | 'sauce' | 'extra' | 'side' | 'drink'
  is_required: boolean
  is_multiple: boolean
  created_at: string
}

export interface ProductOptionValue {
  id: string
  option_id: string
  name: string
  price_modifier: number
  sort_order: number
  created_at: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  notes?: string
  created_at: string
  customer_addresses?: CustomerAddress[]
}

export interface CustomerAddress {
  id: string
  customer_id: string
  label: string
  address_title?: string
  address_line_1?: string
  city?: string
  postal_code?: string
  province?: string
  district?: string
  neighborhood?: string
  street?: string
  lat: string | null
  lng: string | null
  latitude?: number | null
  longitude?: number | null
  description: string | null
  is_verified: boolean
  created_at: string
}

export interface ProductWithRelations extends Product {
  categories: Category
}

export interface Order {
  id: number
  restaurant_id: string
  order_number?: string // Optional çünkü Supabase'de yok, client-side'da türetilecek
  created_at: string
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_address_lat: string | null
  customer_address_lng: string | null
  customer_address_description: string | null
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'ready_for_pickup' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled'
  total_amount: number
  subtotal: number
  tax_amount: number
  delivery_fee: number
  discount_amount: number
  payment_method: 'cash' | 'card'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  notes?: string | null
  estimated_delivery_time?: string
  order_items: any[]
  location_verification_token: string | null
  is_location_verified: boolean
  customer_id: string | null
}

export interface OrderItem {
  id: number
  order_id: string
  product_id: string
  product_name: string
  variant_id?: number
  portion_id?: number
  quantity: number
  unit_price: number
  total_price: number
  special_instructions?: string
  notes?: string
  created_at: string
  products?: Product
  product_variants?: ProductVariant
  product_portions?: ProductPortion
}

export interface OrderItemOption {
  id: string
  order_item_id: string
  option_name: string
  option_value: string
  price_modifier: number
  created_at: string
}

export interface Unit {
  id: number
  restaurant_id: string
  name: string
  symbol: string
  is_active: boolean
  created_at: string
}

export interface ProductVariant {
  id: number
  product_id: string
  name: string
  description?: string
  price_modifier: number
  is_default: boolean
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface ProductPortion {
  id: number
  product_id: string
  name: string
  description?: string
  unit_id?: number
  price_modifier: number
  quantity_multiplier: number
  is_default: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  units?: Unit
}

export interface OrderDetail extends Order {
  users: {
    full_name: string
  } | null
}

export interface Courier {
  id: string
  user_id: string
  full_name: string
  phone: string
  email?: string
  vehicle_type?: string
  license_plate?: string
  current_latitude?: number
  current_longitude?: number
  last_location_update?: string
  is_available: boolean
  is_active: boolean
  courier_status?: 'offline' | 'online' | 'available' | 'busy' | 'on_delivery' | 'break' | 'unavailable' | 'inactive'
  active_assignments?: number
  created_at: string
}

export interface DeliveryAssignment {
  id: string
  order_id: string
  courier_id: string
  restaurant_id?: string
  status: 'assigned' | 'accepted' | 'rejected' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled'
  delivery_fee: number
  estimated_delivery_time?: string
  accepted_at?: string
  picked_up_at?: string
  delivered_at?: string
  cancelled_at?: string
  notes?: string
  created_at: string
  updated_at: string
  order?: Order
  restaurant?: Restaurant
  courier?: Courier
}

export interface CourierLocation {
  id: string
  courier_id: string
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: string
}

export interface CourierStats {
  earnings_today: number
  completed_today: number
  average_rating: number
  total_deliveries: number
  total_earnings: number
  active_since: string
}

export interface CourierNotification {
  id: string
  courier_id: string
  type: string
  title: string
  message: string
  data?: any
  is_read: boolean
  created_at: string
}