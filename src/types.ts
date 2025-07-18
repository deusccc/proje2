export interface User {
  id: string;
  aud: string;
  role: 'admin' | 'owner' | 'courier' | 'user' | 'manager' | 'staff' | 'companymanager';
  email: string;
  email_confirmed_at: string;
  phone: string;
  confirmed_at: string;
  last_sign_in_at: string;
  app_metadata: {
    provider: string;
    providers: string[];
  };
  user_metadata: {
    full_name: string;
    restaurant_id: string;
  };
  identities: any[];
  created_at: string;
  updated_at: string;
  restaurants?: {
    name: string;
  };
  restaurant_id?: string;
  full_name?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  address?: string;
  detailed_address?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  district?: string;
  neighborhood?: string;
  postal_code?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  restaurant_id: string;
  sort_order: number;
  is_active: boolean;
}

export interface Unit {
    id: number;
    name: string;
    symbol: string;
    abbreviation: string;
    is_active?: boolean;
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    category_id: string;
    restaurant_id: string;
    base_price: number;
    preparation_time?: number;
    is_available: boolean;
    is_featured?: boolean;
    image_url?: string;
}

export interface ProductPortion {
    id: number;
    product_id: string;
    name: string;
    description?: string;
    price: number;
    price_modifier?: number;
    quantity_multiplier?: number;
    unit_id: number;
    is_default: boolean;
    is_active?: boolean;
    units: Unit;
}

export interface ProductVariant {
    id: number;
    product_id: string;
    name: string;
    price_change: number;
    price_modifier?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  address_title: string;
  address_line_1: string;
  city: string;
  postal_code?: string;
  province?: string;
  district?: string;
  neighborhood?: string;
  street?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export interface Order {
    id: string;
    restaurant_id: string;
    customer_id?: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    customer_address_description?: string;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'ready_for_pickup' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled';
    payment_method: 'cash' | 'card';
    payment_status: 'pending' | 'paid' | 'failed';
    subtotal: number;
    tax_amount: number;
    delivery_fee: number;
    discount_amount: number;
    total_amount: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    estimated_delivery_time?: string;
    location_verification_token?: string;
    is_location_verified: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  portion_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions?: string;
}

export interface Courier {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  vehicle_type: 'bike' | 'motorcycle' | 'car' | 'walking';
  is_active: boolean;
  is_available: boolean;
  courier_status?: 'offline' | 'online' | 'available' | 'busy' | 'on_delivery' | 'break' | 'unavailable' | 'inactive';
  current_latitude?: number;
  current_longitude?: number;
  last_location_update?: string;
  rating?: number;
  total_deliveries: number;
  active_assignments?: number;
  created_at: string;
  updated_at: string;
}

export interface CourierLocation {
  id: string;
  courier_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: string;
  created_at: string;
}

export interface DeliveryAssignment {
  id: string;
  order_id: string;
  courier_id: string;
  restaurant_id: string;
  status: 'assigned' | 'accepted' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';
  assigned_at: string;
  accepted_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  delivery_fee: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  order: Order;
  restaurant: Restaurant;
  courier: Courier;
}

export interface CourierStats {
  total_deliveries: number;
  completed_today: number;
  earnings_today: number;
  average_rating: number;
  total_earnings: number;
  active_since: string;
}

export interface DeliveryRoute {
  id: string;
  assignment_id: string;
  restaurant_location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  customer_location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  estimated_distance: number;
  estimated_duration: number;
  actual_distance?: number;
  actual_duration?: number;
  route_points?: Array<{
    latitude: number;
    longitude: number;
    timestamp: string;
  }>;
  created_at: string;
}

export interface CourierNotification {
  id: string;
  courier_id: string;
  type: 'new_assignment' | 'order_cancelled' | 'system_message';
  title: string;
  message: string;
  is_read: boolean;
  data?: any;
  created_at: string;
} 