// Migros Yemek API Types

export interface MigrosYemekConfig {
  secretKey: string;
  apiKey: string;
  baseUrl: string;
  webhookUrl: string;
  isActive: boolean;
}

export interface MigrosYemekStore {
  id: number;
  name: string;
  group: {
    id: number;
    name: string;
  };
}

export interface MigrosYemekCustomer {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber: string;
  deliveryAddress: {
    id: number;
    direction: string;
    detail: string;
    city: {
      id: number;
      name: string;
    };
    town: {
      id: number;
      name: string;
    };
    district: {
      id: number;
      name: string;
    };
    geoLocation: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface MigrosYemekPrices {
  total: {
    amountAsPenny: number;
    text: string;
  };
  discounted: {
    amountAsPenny: number;
    text: string;
  };
  restaurantDiscounted: {
    amountAsPenny: number;
    text: string;
  };
  migrosDiscounted: {
    amountAsPenny: number;
    text: string;
  };
}

export interface MigrosYemekOrderItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  priceText: string;
  amount: number;
  note: string;
  options?: MigrosYemekOrderOption[];
}

export interface MigrosYemekOrderOption {
  optionHeaderId: number;
  objectOptionItemId: number;
  optionItemId: number;
  productId: number;
  parentObjectOptionItemId: number;
  headerName: string;
  itemNames: string;
  primaryDiscountedPrice: number;
  primaryPrice: number;
  primaryDiscountedPriceText: string;
  primaryPriceText: string;
  quantity: number;
  excluded: boolean;
  subOptions: any[];
  objectOptionHeaderPriority: number;
  objectOptionItemPriority: number;
  optionType: string;
}

export interface MigrosYemekPayment {
  type: {
    hashedNameId: number;
    name: string;
    description: string;
    isOnlinePayment: boolean;
    simplifiedName: string;
    simplifiedHashedNameId: number;
  };
}

export interface MigrosYemekOrder {
  id: number;
  description: string;
  status: 'NEW_PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED';
  deliveryProvider: string;
  store: MigrosYemekStore;
  customer: MigrosYemekCustomer;
  prices: MigrosYemekPrices;
  items: MigrosYemekOrderItem[];
  payment: MigrosYemekPayment;
  extendedProperties: {
    orderNote: string;
    saveGreen: boolean;
    contactlessDelivery: boolean;
    ringDoorBell: boolean;
  };
  log: {
    createdAsMs: number;
  };
}

export interface MigrosYemekOrderStatusUpdate {
  orderId: number;
  status: 'CONFIRMED' | 'PREPARING' | 'READY' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED';
  estimatedDeliveryTime?: string;
  cancelReason?: string;
}

export interface MigrosYemekApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface MigrosYemekWebhookPayload {
  order: MigrosYemekOrder;
  eventType: 'ORDER_CREATED' | 'ORDER_UPDATED' | 'ORDER_CANCELLED';
  timestamp: number;
}

// Internal mapping types
export interface MigrosYemekOrderMapping {
  migrosOrderId: number;
  internalOrderId: string;
  restaurantId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MigrosYemekProductMapping {
  migrosProductId: number;
  internalProductId: string;
  restaurantId: string;
  migrosName: string;
  internalName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
} 