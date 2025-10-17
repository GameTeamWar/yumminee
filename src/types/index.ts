import { Timestamp, GeoPoint } from 'firebase/firestore';

// Kullanıcı tipi
export interface User {
  id: string;
  uid?: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  address: string;
  role: UserRole;
  profilePicture?: string;
  shopId?: string; // Restoran sahibi için
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// Kullanıcı rolleri
export type UserRole = 'customer' | 'shop' | 'courier' | 'admin';

// Çalışma saatleri tipi
export interface WorkingHours {
  monday: { open: string; close: string; isOpen: boolean };
  tuesday: { open: string; close: string; isOpen: boolean };
  wednesday: { open: string; close: string; isOpen: boolean };
  thursday: { open: string; close: string; isOpen: boolean };
  friday: { open: string; close: string; isOpen: boolean };
  saturday: { open: string; close: string; isOpen: boolean };
  sunday: { open: string; close: string; isOpen: boolean };
}

// Shop tipi
export interface Shop {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  phone: string;
  address: string;
  location?: GeoPoint;
  coverImage?: string;
  image?: string;
  banner?: string; // Banner image URL
  description: string;
  cuisine: string[]; // Array of cuisine types
  categories: string[];
  rating: number;
  reviewCount: number;
  serviceRadius: number; // km cinsinden
  deliveryTime: number; // dakika cinsinden
  minimumOrderAmount: number; // TL cinsinden - minimum sipariş tutarı
  isOpen: boolean;
  ownerId: string; // Shop sahibi
  workingHours?: WorkingHours; // Çalışma saatleri
  // Yeni eklenen alanlar
  website?: string;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  businessInfo?: {
    taxNumber?: string;
    taxOffice?: string;
    tradeRegistryNumber?: string;
    kepAddress?: string;
    taxDocument?: string; // Vergi levhası URL'i
    licenseDocument?: string; // Çalışma ruhsatı URL'i
    companyType?: string; // Şirket türü
    deliveryService?: string; // Paket servis: 'evet kendi kuryem var', 'hayır', 'dışardan hizmet alıyorum'
    companyName?: string; // Şirket ismi
    neighborhood?: string; // Mahalle
  };
  paymentMethods?: string[]; // Ödeme yöntemleri
  hasLoyaltyDiscount?: boolean; // Sadakat indirimi var mı
  isNeighborhoodStar?: boolean; // Mahalle yıldızı mı
  usesYummineDelivery?: boolean; // Yummine teslimatı kullanıyor mu
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// Kategori tipi
export interface Category {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  image?: string;
  createdAt: Timestamp;
}

// Ürün seçeneği tipi
export interface ProductOption {
  id: string;
  name: string;
  price: number;
}

// Ürün tipi
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  imageUrl?: string;
  category: string;
  categoryIds?: string[]; // Kategori ID'leri
  categoryNames?: string[]; // Kategori isimleri
  preparationTime?: number; // dakika cinsinden
  options?: any[]; // Opsiyon grupları (güncellenmiş yapı)
  optionIds?: string[]; // Opsiyon ID'leri
  optionNames?: string[]; // Opsiyon isimleri
  isAvailable: boolean;
  allergens?: string[]; // Alerjenler
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  shopId: string;
  customId: string; // 11-digit unique identifier
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Menü tipi (Firebase'den gelen gerçek yapı)
export interface Menu {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  image?: string;
  category: string;
  preparationTime: number;
  options: string[];
  isActive: boolean;
  createdAt?: Timestamp;
}

// Sepet öğesi tipi
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  options?: ProductOption[];
}

// Sipariş durumu
export type OrderStatus = 
  | 'pending' // Beklemede (restoran onayı bekliyor)
  | 'confirmed' // Restoran tarafından kabul edildi, hazırlanıyor
  | 'preparing' // Hazırlanıyor
  | 'ready' // Hazır, kurye bekleniyor
  | 'picked_up' // Kurye tarafından alındı
  | 'delivered' // Teslim edildi
  | 'cancelled' // İptal edildi
  | 'accepted' // Backward compatibility
  | 'delivering' // Backward compatibility
  | 'completed' // Backward compatibility
  | 'canceled'; // Backward compatibility

// Sipariş öğesi tipi
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  options?: ProductOption[];
  // Legacy compatibility fields for checkout
  productName?: string;
  productImage?: string;
  unitPrice?: number;
  totalPrice?: number;
  selectedOptions?: {
    optionId: string;
    optionName: string;
    values: {
      valueId: string;
      valueName: string;
      price: number;
    }[];
  }[];
}

// Sipariş tipi
export interface Order {
  id: string;
  customerId: string; // customerUsers/{customerId}
  shopId: string; // shops/{shopId}
  courierId?: string; // courierUsers/{courierId}
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod: 'cash' | 'card' | 'online';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  deliveryAddress: CustomerAddress;
  deliveryLocation: GeoPoint;
  estimatedDeliveryTime?: Timestamp;
  actualDeliveryTime?: Timestamp;
  specialInstructions?: string;
  rating?: number;
  review?: string;
  timeline: {
    orderedAt: Timestamp;
    confirmedAt?: Timestamp;
    preparingAt?: Timestamp;
    readyAt?: Timestamp;
    pickedUpAt?: Timestamp;
    deliveredAt?: Timestamp;
    cancelledAt?: Timestamp;
  };
  // Legacy compatibility fields
  userId: string;
  restaurantId: string;
  address?: string;
  location?: GeoPoint;
  orderAcceptDeadline?: Timestamp;
  estimatedPreparationTime?: Timestamp | null;
  preparationStartTime?: Timestamp | null;
  preparationEndTime?: Timestamp | null;
  assignedCourier?: string | null;
  deliveryStartTime?: Timestamp | null;
  deliveryEndTime?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Kurye tipi
export interface Courier {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  isOnline: boolean;
  isAvailable: boolean;
  currentLocation: GeoPoint | null;
  createdAt: Timestamp;
}

// Sipariş özeti tipi (anasayfa için)
export interface OrderSummary {
  id: string;
  shopName: string;
  orderDate: Timestamp;
  total: number;
  status: OrderStatus;
}

// Sistem ayarları
export interface SystemSettings {
  defaultDeliveryFee: number;
  defaultCourierFee: number;
  orderTimeoutSeconds: number;
  maxServiceRadius: number;
}

// Yorum tipi
export interface Review {
  id: string;
  userId: string;
  userName: string;
  shopId: string;
  orderId: string;
  rating: number;
  comment: string;
  createdAt: Timestamp;
}

// Kullanıcı adresi tipi (detaylı)
export interface UserAddress {
  id: string;
  userId: string;
  addressName: string; // "Ev", "İş", "A Blok", "Annemler" vs.
  address: string; // Tam adres metni
  geoPoint: GeoPoint; // Koordinatlar
  addressDetails: {
    buildingNumber: string;
    floor?: string;
    apartment: string;
    hasElevator: boolean;
    apartmentComplex?: string; // Apartman/Site adı
    detailedAddress: string; // Detaylı açıklama
    block?: string; // Blok bilgisi
  };
  isDefault: boolean; // Varsayılan adres mi
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// Customer address tipi (db.ts'deki yapıya uygun)
export interface CustomerAddress extends UserAddress {
  customerId: string;
  title: string;
  location: GeoPoint;
  phoneNumber?: string;
  instructions?: string;
  isActive: boolean;
}

// Restaurant tipi (Shop ile aynı, backward compatibility için)
export type Restaurant = Shop;