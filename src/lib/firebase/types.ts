// ID generator utility
export const generateId = (length: number = 11): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  const combined = timestamp + random;
  
  // Sadece rakam kullanarak ID oluştur
  let numericId = '';
  for (let i = 0; i < combined.length && numericId.length < length; i++) {
    const char = combined[i];
    if (/\d/.test(char)) {
      numericId += char;
    }
  }
  
  // Eksik rakamları tamamla
  while (numericId.length < length) {
    numericId += Math.floor(Math.random() * 10).toString();
  }
  
  return numericId.substring(0, length);
};

// User profile type with extended fields
export interface UserProfile {
  id: string;
  uid: string; // Firebase Auth UID
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  address: string;
  role: 'customer' | 'restaurant' | 'courier' | 'admin';
  profilePicture?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  loyaltyPoints: number;
  membershipLevel: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'vip';
  totalOrders: number;
  totalSpent: number;
  averageRating: number;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  preferences: {
    notifications: {
      orders: boolean;
      promotions: boolean;
      email: boolean;
      sms: boolean;
    };
    language: string;
    theme: 'light' | 'dark' | 'system';
  };
  createdAt: any;
  updatedAt: any;
  lastLoginAt: any;
}

// Address type with extended fields
export interface UserAddress {
  id: string;
  userId: string;
  title: string;
  fullAddress: string;
  district: string;
  city: string;
  postalCode: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  instructions?: string;
  isDefault: boolean;
  addressType: 'home' | 'work' | 'other';
  createdAt: any;
  updatedAt: any;
}

// Order type with extended fields
export interface OrderDetails {
  id: string;
  customerId: string;
  restaurantId: string;
  courierId?: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    options?: Array<{
      name: string;
      value: string;
      price: number;
    }>;
    notes?: string;
  }>;
  deliveryAddress: UserAddress;
  paymentMethod: {
    type: 'card' | 'cash';
    cardId?: string;
  };
  pricing: {
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    discount: number;
    total: number;
  };
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled';
  timeline: {
    orderedAt: any;
    acceptedAt?: any;
    preparingAt?: any;
    readyAt?: any;
    deliveringAt?: any;
    completedAt?: any;
    cancelledAt?: any;
  };
  estimatedDeliveryTime?: any;
  actualDeliveryTime?: any;
  rating?: {
    food: number;
    delivery: number;
    service: number;
    comment?: string;
    createdAt: any;
  };
  createdAt: any;
  updatedAt: any;
}