// Firebase Firestore Database Operations
// Clean Architecture with 4 Main User Types: Admin, Courier, Shop, Customer

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  GeoPoint,
  DocumentData,
  QuerySnapshot,
  deleteField
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { db, storage } from './config';

// Import legacy types for compatibility
import type { ProductOption, UserRole } from '../../types/index';

// ================== TYPES ==================

export interface AdminUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  role: 'admin';
  permissions: string[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
}

export interface CourierUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  role: 'courier';
  vehicleType: 'motorcycle' | 'car' | 'bicycle';
  licensePlate?: string;
  isOnline: boolean;
  isAvailable: boolean;
  currentLocation?: GeoPoint;
  rating: number;
  totalDeliveries: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
}

export interface ShopUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  role: 'shop';
  businessName: string;
  businessType: string;
  taxNumber?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
}

export interface CustomerUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  role: 'customer';
  loyaltyPoints: number;
  membershipLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalOrders: number;
  totalSpent: number;
  averageRating: number;
  isActive: boolean;
  preferences: {
    notifications: {
      orders: boolean;
      promotions: boolean;
      email: boolean;
      sms: boolean;
    };
    language: string;
    theme: 'light' | 'dark';
  };
  // Legacy compatibility fields for UserProfile
  firstName?: string;
  lastName?: string;
  address?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  profilePicture?: string | undefined;
  dateOfBirth?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
}

export interface Shop {
  id: string;
  ownerId: string; // shopUsers/{shopUserId}
  name: string;
  description: string;
  image?: string;
  phone: string;
  phoneNumber: string; // Legacy compatibility
  email: string;
  address: string;
  location: GeoPoint;
  isOpen: boolean;
  openingHours: {
    [key: string]: { open: string; close: string; isClosed: boolean };
  };
  minimumOrderAmount: number;
  deliveryFee: number;
  estimatedDeliveryTime: number;
  rating: number;
  totalReviews: number;
  reviewCount: number; // Legacy compatibility
  categories: string[]; // category IDs
  cuisine: string[]; // Legacy compatibility
  serviceRadius: number; // Legacy compatibility
  deliveryTime: number; // Legacy compatibility
  workingHours?: any; // Legacy compatibility
  paymentMethods?: string[]; // Legacy compatibility
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Category {
  id: string;
  shopId: string;
  name: string;
  description?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Product {
  id: string;
  shopId: string;
  categoryId: string;
  name: string;
  description: string;
  image?: string;
  price: number;
  originalPrice?: number;
  isAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
  options: string[]; // option IDs
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Option {
  id: string;
  shopId: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  minSelections?: number;
  maxSelections?: number;
  values: OptionValue[];
  sortOrder: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OptionValue {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
}

export interface Order {
  id: string;
  customerId: string; // customerUsers/{customerId}
  shopId: string; // shops/{shopId}
  courierId?: string; // courierUsers/{courierId}
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
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

// Import UserAddress for compatibility
import { UserAddress } from '@/types';

export interface CustomerAddress extends UserAddress {
  customerId: string;
  title: string;
  location: GeoPoint;
  phoneNumber?: string;
  instructions?: string;
  isActive: boolean;
}

export interface CartItem {
  id: string;
  customerId: string;
  shopId: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  selectedOptions: {
    optionId: string;
    optionName: string;
    values: {
      valueId: string;
      valueName: string;
      price: number;
    }[];
  }[];
  // Legacy compatibility fields for CartContext
  restaurantId?: string;
  restaurantName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FavoriteShop {
  id: string;
  customerId: string;
  shopId: string;
  createdAt: Timestamp;
}

export interface DeliveryZone {
  id: string;
  shopId: string;
  name: string;
  coordinates: GeoPoint[];
  deliveryFee: number;
  minimumOrder: number;
  estimatedTime: number;
  isActive: boolean;
  // Legacy compatibility fields for old DeliveryZone
  minPrice: number;
  deliveryTime: number;
  color: string;
  hexagonIds: string[];
  restaurantId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ================== UTILITY FUNCTIONS ==================

export const generateId = (length: number = 11): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  const combined = timestamp + random;

  let numericId = '';
  for (let i = 0; i < combined.length && numericId.length < length; i++) {
    const char = combined[i];
    if (/\d/.test(char)) {
      numericId += char;
    }
  }

  while (numericId.length < length) {
    numericId += Math.floor(Math.random() * 10).toString();
  }

  return numericId.substring(0, length);
};

// Re-export Firestore utilities for convenience
export { deleteField };

// ================== UID MAPPINGS ==================

// UID to User ID mappings for all user types
export const getUserIdFromUID = async (uid: string, userType: 'admin' | 'courier' | 'shop' | 'customer'): Promise<string | null> => {
  try {
    const mappingDoc = await getDoc(doc(db, 'uidMappings', uid));
    if (mappingDoc.exists()) {
      const data = mappingDoc.data();
      return data?.[`${userType}UserId`] || null;
    }
    return null;
  } catch (error) {
    console.error('UID mapping getirme hatası:', error);
    return null;
  }
};

export const setUserIdMapping = async (uid: string, userId: string, userType: 'admin' | 'courier' | 'shop' | 'customer'): Promise<void> => {
  try {
    const mappingRef = doc(db, 'uidMappings', uid);
    await setDoc(mappingRef, {
      [`${userType}UserId`]: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('UID mapping kaydetme hatası:', error);
    throw error;
  }
};

// ================== ADMIN USER OPERATIONS ==================

export const createAdminUser = async (uid: string, userData: Omit<AdminUser, 'id' | 'uid' | 'role' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>): Promise<AdminUser> => {
  try {
    const adminId = generateId(11);
    const adminUser: AdminUser = {
      id: adminId,
      uid,
      role: 'admin',
      ...userData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastLoginAt: Timestamp.now()
    };

    await setDoc(doc(db, 'adminUsers', adminId), adminUser);
    await setUserIdMapping(uid, adminId, 'admin');

    return adminUser;
  } catch (error) {
    console.error('Admin user oluşturma hatası:', error);
    throw error;
  }
};

export const getAdminUser = async (uid: string): Promise<AdminUser | null> => {
  try {
    const adminId = await getUserIdFromUID(uid, 'admin');
    if (!adminId) return null;

    const docSnap = await getDoc(doc(db, 'adminUsers', adminId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as AdminUser : null;
  } catch (error) {
    console.error('Admin user getirme hatası:', error);
    return null;
  }
};

// ================== COURIER USER OPERATIONS ==================

export const createCourierUser = async (uid: string, userData: Omit<CourierUser, 'id' | 'uid' | 'role' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>): Promise<CourierUser> => {
  try {
    const courierId = generateId(11);
    const courierUser: CourierUser = {
      id: courierId,
      uid,
      role: 'courier',
      ...userData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastLoginAt: Timestamp.now()
    };

    await setDoc(doc(db, 'courierUsers', courierId), courierUser);
    await setUserIdMapping(uid, courierId, 'courier');

    return courierUser;
  } catch (error) {
    console.error('Courier user oluşturma hatası:', error);
    throw error;
  }
};

export const getCourierUser = async (uid: string): Promise<CourierUser | null> => {
  try {
    const courierId = await getUserIdFromUID(uid, 'courier');
    if (!courierId) return null;

    const docSnap = await getDoc(doc(db, 'courierUsers', courierId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as CourierUser : null;
  } catch (error) {
    console.error('Courier user getirme hatası:', error);
    return null;
  }
};

export const updateCourierStatus = async (courierId: string, isOnline: boolean, isAvailable: boolean, location?: GeoPoint): Promise<void> => {
  try {
    const updateData: any = {
      isOnline,
      isAvailable,
      updatedAt: serverTimestamp()
    };

    if (location) {
      updateData.currentLocation = location;
    }

    await updateDoc(doc(db, 'courierUsers', courierId), updateData);
  } catch (error) {
    console.error('Courier status güncelleme hatası:', error);
    throw error;
  }
};

export const getAvailableCouriers = async (shopLocation: GeoPoint, maxDistance = 10): Promise<CourierUser[]> => {
  try {
    const couriersQuery = query(
      collection(db, 'courierUsers'),
      where('isOnline', '==', true),
      where('isAvailable', '==', true),
      where('isActive', '==', true)
    );

    const querySnapshot = await getDocs(couriersQuery);
    const couriers: CourierUser[] = [];
    querySnapshot.forEach((doc) => {
      couriers.push({ id: doc.id, ...doc.data() } as CourierUser);
    });

    // TODO: Implement distance filtering with GeoPoint
    return couriers;
  } catch (error) {
    console.error('Available couriers getirme hatası:', error);
    throw error;
  }
};

// ================== SHOP USER OPERATIONS ==================

export const createShopUser = async (uid: string, userData: Omit<ShopUser, 'id' | 'uid' | 'role' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>): Promise<ShopUser> => {
  try {
    const shopUserId = generateId(11);
    const shopUser: ShopUser = {
      id: shopUserId,
      uid,
      role: 'shop',
      ...userData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastLoginAt: Timestamp.now()
    };

    await setDoc(doc(db, 'shopUsers', shopUserId), shopUser);
    await setUserIdMapping(uid, shopUserId, 'shop');

    return shopUser;
  } catch (error) {
    console.error('Shop user oluşturma hatası:', error);
    throw error;
  }
};

export const getShopUser = async (uid: string): Promise<ShopUser | null> => {
  try {
    const shopUserId = await getUserIdFromUID(uid, 'shop');
    if (!shopUserId) return null;

    const docSnap = await getDoc(doc(db, 'shopUsers', shopUserId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as ShopUser : null;
  } catch (error) {
    console.error('Shop user getirme hatası:', error);
    return null;
  }
};

export const getShopUserById = async (shopUserId: string): Promise<ShopUser | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'shopUsers', shopUserId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as ShopUser : null;
  } catch (error) {
    console.error('Shop user by ID getirme hatası:', error);
    return null;
  }
};

// ================== CUSTOMER USER OPERATIONS ==================

export const createCustomerUser = async (uid: string, userData: Omit<CustomerUser, 'id' | 'uid' | 'role' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>): Promise<CustomerUser> => {
  try {
    const customerId = generateId(11);
    const customerUser: CustomerUser = {
      id: customerId,
      uid,
      role: 'customer',
      ...userData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastLoginAt: Timestamp.now()
    };

    await setDoc(doc(db, 'customerUsers', customerId), customerUser);
    await setUserIdMapping(uid, customerId, 'customer');

    return customerUser;
  } catch (error) {
    console.error('Customer user oluşturma hatası:', error);
    throw error;
  }
};

export const getCustomerUser = async (uid: string): Promise<CustomerUser | null> => {
  try {
    const customerId = await getUserIdFromUID(uid, 'customer');
    if (!customerId) return null;

    const docSnap = await getDoc(doc(db, 'customerUsers', customerId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as CustomerUser : null;
  } catch (error) {
    console.error('Customer user getirme hatası:', error);
    return null;
  }
};

export const getCustomerUserById = async (customerId: string): Promise<CustomerUser | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'customerUsers', customerId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as CustomerUser : null;
  } catch (error) {
    console.error('Customer user by ID getirme hatası:', error);
    return null;
  }
};

export const updateCustomerUser = async (customerId: string, updates: Partial<CustomerUser>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'customerUsers', customerId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Customer user güncelleme hatası:', error);
    throw error;
  }
};

// ================== SHOP OPERATIONS ==================

export const createShop = async (ownerId: string, shopData: Omit<Shop, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<Shop> => {
  try {
    const shopId = generateId(11);
    const shop: Shop = {
      id: shopId,
      ownerId,
      ...shopData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await setDoc(doc(db, 'shops', shopId), shop);
    return shop;
  } catch (error) {
    console.error('Shop oluşturma hatası:', error);
    throw error;
  }
};

export const getShop = async (shopId: string): Promise<Shop | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'shops', shopId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Shop : null;
  } catch (error) {
    console.error('Shop getirme hatası:', error);
    return null;
  }
};

export const getShopsByOwner = async (ownerId: string): Promise<Shop[]> => {
  try {
    const shopsQuery = query(
      collection(db, 'shops'),
      where('ownerId', '==', ownerId),
      where('isActive', '==', true)
    );

    const querySnapshot = await getDocs(shopsQuery);
    const shops: Shop[] = [];
    querySnapshot.forEach((doc) => {
      shops.push({ id: doc.id, ...doc.data() } as Shop);
    });

    return shops;
  } catch (error) {
    console.error('Owner shops getirme hatası:', error);
    throw error;
  }
};

export const updateShop = async (shopId: string, updates: Partial<Shop> & Record<string, any>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'shops', shopId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Shop güncelleme hatası:', error);
    throw error;
  }
};

export const subscribeToAllShops = (callback: (shops: Shop[]) => void) => {
  const shopsQuery = query(
    collection(db, 'shops'),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(shopsQuery, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const shops: Shop[] = [];
    querySnapshot.forEach((doc) => {
      shops.push({ id: doc.id, ...doc.data() } as Shop);
    });
    callback(shops);
  }, (error) => {
    console.error('Shops dinleme hatası:', error);
  });
};

// ================== CATEGORY OPERATIONS ==================

export const createCategory = async (shopId: string, categoryData: Omit<Category, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>): Promise<Category> => {
  try {
    const categoryId = generateId(8);
    const category: Category = {
      id: categoryId,
      shopId,
      ...categoryData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await setDoc(doc(db, 'categories', categoryId), category);
    return category;
  } catch (error) {
    console.error('Category oluşturma hatası:', error);
    throw error;
  }
};

export const getCategoriesByShop = async (shopId: string): Promise<Category[]> => {
  try {
    const categoriesQuery = query(
      collection(db, 'categories'),
      where('shopId', '==', shopId),
      where('isActive', '==', true),
      orderBy('sortOrder')
    );

    const querySnapshot = await getDocs(categoriesQuery);
    const categories: Category[] = [];
    querySnapshot.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() } as Category);
    });

    return categories;
  } catch (error) {
    console.error('Shop categories getirme hatası:', error);
    throw error;
  }
};

export const updateCategory = async (categoryId: string, updates: Partial<Category>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'categories', categoryId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Category güncelleme hatası:', error);
    throw error;
  }
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'categories', categoryId), {
      isActive: false,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Category silme hatası:', error);
    throw error;
  }
};

// ================== PRODUCT OPERATIONS ==================

export const createProduct = async (shopId: string, productData: Omit<Product, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
  try {
    const productId = generateId(10);
    const product: Product = {
      id: productId,
      shopId,
      ...productData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await setDoc(doc(db, 'products', productId), product);
    return product;
  } catch (error) {
    console.error('Product oluşturma hatası:', error);
    throw error;
  }
};

export const getProductsByShop = async (shopId: string): Promise<Product[]> => {
  try {
    const productsQuery = query(
      collection(db, 'products'),
      where('shopId', '==', shopId),
      where('isActive', '==', true),
      orderBy('sortOrder')
    );

    const querySnapshot = await getDocs(productsQuery);
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });

    return products;
  } catch (error) {
    console.error('Shop products getirme hatası:', error);
    throw error;
  }
};

export const getProductsByCategory = async (categoryId: string): Promise<Product[]> => {
  try {
    const productsQuery = query(
      collection(db, 'products'),
      where('categoryId', '==', categoryId),
      where('isActive', '==', true),
      where('isAvailable', '==', true),
      orderBy('sortOrder')
    );

    const querySnapshot = await getDocs(productsQuery);
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });

    return products;
  } catch (error) {
    console.error('Category products getirme hatası:', error);
    throw error;
  }
};

export const updateProduct = async (productId: string, updates: Partial<Product>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'products', productId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Product güncelleme hatası:', error);
    throw error;
  }
};

export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'products', productId), {
      isActive: false,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Product silme hatası:', error);
    throw error;
  }
};

// ================== OPTION OPERATIONS ==================

export const createOption = async (shopId: string, optionData: Omit<Option, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>): Promise<Option> => {
  try {
    const optionId = generateId(8);
    const option: Option = {
      id: optionId,
      shopId,
      ...optionData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await setDoc(doc(db, 'options', optionId), option);
    return option;
  } catch (error) {
    console.error('Option oluşturma hatası:', error);
    throw error;
  }
};

export const getOptionsByShop = async (shopId: string): Promise<Option[]> => {
  try {
    const optionsQuery = query(
      collection(db, 'options'),
      where('shopId', '==', shopId),
      where('isActive', '==', true),
      orderBy('sortOrder')
    );

    const querySnapshot = await getDocs(optionsQuery);
    const options: Option[] = [];
    querySnapshot.forEach((doc) => {
      options.push({ id: doc.id, ...doc.data() } as Option);
    });

    return options;
  } catch (error) {
    console.error('Shop options getirme hatası:', error);
    throw error;
  }
};

export const updateOption = async (optionId: string, updates: Partial<Option>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'options', optionId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Option güncelleme hatası:', error);
    throw error;
  }
};

export const deleteOption = async (optionId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'options', optionId), {
      isActive: false,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Option silme hatası:', error);
    throw error;
  }
};

// ================== ORDER OPERATIONS ==================

export const createOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const orderId = generateId(12);
    const order: Order = {
      id: orderId,
      ...orderData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await setDoc(doc(db, 'orders', orderId), order);
    return orderId;
  } catch (error) {
    console.error('Order oluşturma hatası:', error);
    throw error;
  }
};

export const getOrder = async (orderId: string): Promise<Order | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'orders', orderId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Order : null;
  } catch (error) {
    console.error('Order getirme hatası:', error);
    return null;
  }
};

export const getOrdersByCustomer = async (customerId: string): Promise<Order[]> => {
  try {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(ordersQuery);
    const orders: Order[] = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as Order);
    });

    return orders;
  } catch (error) {
    console.error('Customer orders getirme hatası:', error);
    throw error;
  }
};

export const getOrdersByShop = async (shopId: string): Promise<Order[]> => {
  try {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('shopId', '==', shopId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(ordersQuery);
    const orders: Order[] = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as Order);
    });

    return orders;
  } catch (error) {
    console.error('Shop orders getirme hatası:', error);
    throw error;
  }
};

export const getOrdersByCourier = async (courierId: string): Promise<Order[]> => {
  try {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('courierId', '==', courierId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(ordersQuery);
    const orders: Order[] = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as Order);
    });

    return orders;
  } catch (error) {
    console.error('Courier orders getirme hatası:', error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId: string, status: Order['status'], additionalData?: Partial<Order>): Promise<void> => {
  try {
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };

    // Update timeline based on status
    const now = serverTimestamp();
    switch (status) {
      case 'confirmed':
        updateData['timeline.confirmedAt'] = now;
        break;
      case 'preparing':
        updateData['timeline.preparingAt'] = now;
        break;
      case 'ready':
        updateData['timeline.readyAt'] = now;
        break;
      case 'picked_up':
        updateData['timeline.pickedUpAt'] = now;
        break;
      case 'delivered':
        updateData['timeline.deliveredAt'] = now;
        updateData.actualDeliveryTime = now;
        break;
      case 'cancelled':
        updateData['timeline.cancelledAt'] = now;
        break;
    }

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    await updateDoc(doc(db, 'orders', orderId), updateData);
  } catch (error) {
    console.error('Order status güncelleme hatası:', error);
    throw error;
  }
};

export const assignCourierToOrder = async (orderId: string, courierId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      courierId,
      status: 'picked_up',
      'timeline.pickedUpAt': serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Order courier assignment hatası:', error);
    throw error;
  }
};

// ================== CART OPERATIONS ==================

export const addToCart = async (customerId: string, cartItem: Omit<CartItem, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  try {
    const cartItemId = `${customerId}_${cartItem.productId}`;
    const existingItem = await getDoc(doc(db, 'cart', cartItemId));

    if (existingItem.exists()) {
      // Update quantity if item exists
      const currentQuantity = existingItem.data().quantity || 0;
      await updateDoc(doc(db, 'cart', cartItemId), {
        quantity: currentQuantity + cartItem.quantity,
        selectedOptions: cartItem.selectedOptions,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new cart item
      await setDoc(doc(db, 'cart', cartItemId), {
        id: cartItemId,
        customerId,
        ...cartItem,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Add to cart hatası:', error);
    throw error;
  }
};

export const getCartItems = async (customerId: string): Promise<CartItem[]> => {
  try {
    const cartQuery = query(
      collection(db, 'cart'),
      where('customerId', '==', customerId)
    );

    const querySnapshot = await getDocs(cartQuery);
    const cartItems: CartItem[] = [];
    querySnapshot.forEach((doc) => {
      cartItems.push({ id: doc.id, ...doc.data() } as CartItem);
    });

    return cartItems;
  } catch (error) {
    console.error('Cart items getirme hatası:', error);
    throw error;
  }
};

export const updateCartItemQuantity = async (cartItemId: string, quantity: number): Promise<void> => {
  try {
    if (quantity <= 0) {
      await deleteDoc(doc(db, 'cart', cartItemId));
    } else {
      await updateDoc(doc(db, 'cart', cartItemId), {
        quantity,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Cart item quantity güncelleme hatası:', error);
    throw error;
  }
};

export const clearCart = async (customerId: string): Promise<void> => {
  try {
    const cartQuery = query(
      collection(db, 'cart'),
      where('customerId', '==', customerId)
    );

    const querySnapshot = await getDocs(cartQuery);
    const batch = writeBatch(db);

    querySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error('Cart temizleme hatası:', error);
    throw error;
  }
};

export const subscribeToCart = (customerId: string, callback: (cartItems: CartItem[]) => void) => {
  const cartQuery = query(
    collection(db, 'cart'),
    where('customerId', '==', customerId)
  );

  return onSnapshot(cartQuery, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const cartItems: CartItem[] = [];
    querySnapshot.forEach((doc) => {
      cartItems.push({ id: doc.id, ...doc.data() } as CartItem);
    });
    callback(cartItems);
  }, (error) => {
    console.error('Cart dinleme hatası:', error);
  });
};

// ================== FAVORITE OPERATIONS ==================

export const addToFavorites = async (customerId: string, shopId: string): Promise<void> => {
  try {
    const favoriteId = `${customerId}_${shopId}`;
    await setDoc(doc(db, 'favorites', favoriteId), {
      id: favoriteId,
      customerId,
      shopId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Add to favorites hatası:', error);
    throw error;
  }
};

export const removeFromFavorites = async (customerId: string, shopId: string): Promise<void> => {
  try {
    const favoriteId = `${customerId}_${shopId}`;
    await deleteDoc(doc(db, 'favorites', favoriteId));
  } catch (error) {
    console.error('Remove from favorites hatası:', error);
    throw error;
  }
};

export const getFavoriteShops = async (customerId: string): Promise<string[]> => {
  try {
    const favoritesQuery = query(
      collection(db, 'favorites'),
      where('customerId', '==', customerId)
    );

    const querySnapshot = await getDocs(favoritesQuery);
    const shopIds: string[] = [];
    querySnapshot.forEach((doc) => {
      shopIds.push(doc.data().shopId);
    });

    return shopIds;
  } catch (error) {
    console.error('Favorite shops getirme hatası:', error);
    throw error;
  }
};

export const isShopFavorite = async (customerId: string, shopId: string): Promise<boolean> => {
  try {
    const favoriteId = `${customerId}_${shopId}`;
    const docSnap = await getDoc(doc(db, 'favorites', favoriteId));
    return docSnap.exists();
  } catch (error) {
    console.error('Is shop favorite kontrol hatası:', error);
    return false;
  }
};

// ================== CUSTOMER ADDRESS OPERATIONS ==================

export const createCustomerAddress = async (customerId: string, addressData: Omit<CustomerAddress, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>): Promise<CustomerAddress> => {
  try {
    const addressId = generateId(8);
    const address: CustomerAddress = {
      id: addressId,
      customerId,
      ...addressData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // If this is default, unset other defaults
    if (addressData.isDefault) {
      await unsetDefaultAddresses(customerId);
    }

    await setDoc(doc(db, 'customerAddresses', addressId), address);
    return address;
  } catch (error) {
    console.error('Customer address oluşturma hatası:', error);
    throw error;
  }
};

export const getCustomerAddresses = async (customerId: string): Promise<CustomerAddress[]> => {
  try {
    const addressesQuery = query(
      collection(db, 'customerAddresses'),
      where('customerId', '==', customerId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(addressesQuery);
    const addresses: CustomerAddress[] = [];
    querySnapshot.forEach((doc) => {
      addresses.push({ id: doc.id, ...doc.data() } as CustomerAddress);
    });

    return addresses;
  } catch (error) {
    console.error('Customer addresses getirme hatası:', error);
    throw error;
  }
};

export const updateCustomerAddress = async (addressId: string, updates: Partial<CustomerAddress>): Promise<void> => {
  try {
    const addressRef = doc(db, 'customerAddresses', addressId);

    if (updates.isDefault) {
      // Get current address to get customerId
      const addressDoc = await getDoc(addressRef);
      if (addressDoc.exists()) {
        const customerId = addressDoc.data().customerId;
        await unsetDefaultAddresses(customerId);
      }
    }

    await updateDoc(addressRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Customer address güncelleme hatası:', error);
    throw error;
  }
};

export const deleteCustomerAddress = async (addressId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'customerAddresses', addressId), {
      isActive: false,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Customer address silme hatası:', error);
    throw error;
  }
};

export const setDefaultAddress = async (addressId: string): Promise<void> => {
  try {
    const addressDoc = await getDoc(doc(db, 'customerAddresses', addressId));
    if (!addressDoc.exists()) {
      throw new Error('Address not found');
    }

    const customerId = addressDoc.data().customerId;
    await unsetDefaultAddresses(customerId);

    await updateDoc(doc(db, 'customerAddresses', addressId), {
      isDefault: true,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Set default address hatası:', error);
    throw error;
  }
};

const unsetDefaultAddresses = async (customerId: string): Promise<void> => {
  try {
    const addressesQuery = query(
      collection(db, 'customerAddresses'),
      where('customerId', '==', customerId),
      where('isDefault', '==', true)
    );

    const querySnapshot = await getDocs(addressesQuery);
    const batch = writeBatch(db);

    querySnapshot.forEach((doc) => {
      batch.update(doc.ref, { isDefault: false });
    });

    await batch.commit();
  } catch (error) {
    console.error('Unset default addresses hatası:', error);
    throw error;
  }
};

// ================== DELIVERY ZONE OPERATIONS ==================

export const createDeliveryZone = async (shopId: string, zoneData: Omit<DeliveryZone, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>): Promise<DeliveryZone> => {
  try {
    const zoneId = generateId(8);
    const zone: DeliveryZone = {
      id: zoneId,
      shopId,
      ...zoneData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await setDoc(doc(db, 'deliveryZones', zoneId), zone);
    return zone;
  } catch (error) {
    console.error('Delivery zone oluşturma hatası:', error);
    throw error;
  }
};

export const getDeliveryZonesByShop = async (shopId: string): Promise<DeliveryZone[]> => {
  try {
    const zonesQuery = query(
      collection(db, 'deliveryZones'),
      where('shopId', '==', shopId),
      where('isActive', '==', true),
      orderBy('createdAt')
    );

    const querySnapshot = await getDocs(zonesQuery);
    const zones: DeliveryZone[] = [];
    querySnapshot.forEach((doc) => {
      zones.push({ id: doc.id, ...doc.data() } as DeliveryZone);
    });

    return zones;
  } catch (error) {
    console.error('Delivery zones getirme hatası:', error);
    throw error;
  }
};

export const updateDeliveryZone = async (zoneId: string, updates: Partial<DeliveryZone>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'deliveryZones', zoneId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Delivery zone güncelleme hatası:', error);
    throw error;
  }
};

export const deleteDeliveryZone = async (zoneId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'deliveryZones', zoneId), {
      isActive: false,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Delivery zone silme hatası:', error);
    throw error;
  }
};

// ================== FILE UPLOAD OPERATIONS ==================

export const uploadImage = async (
  userId: string,
  file: File,
  folder: 'profiles' | 'shops' | 'products' | 'categories'
): Promise<string> => {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Sadece JPEG, PNG ve WebP formatları desteklenir.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('Dosya boyutu 5MB\'dan büyük olamaz.');
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${folder}_${userId}_${Date.now()}.${fileExtension}`;

    // Upload to storage
    const storageRef = ref(storage, `${folder}/${fileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Image upload hatası:', error);
    throw error;
  }
};

export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Image delete hatası:', error);
    throw error;
  }
};

// ================== VALIDATION FUNCTIONS ==================

export const checkEmailExists = async (email: string, userType: 'admin' | 'courier' | 'shop' | 'customer'): Promise<boolean> => {
  try {
    const collectionName = `${userType}Users`;
    const emailQuery = query(
      collection(db, collectionName),
      where('email', '==', email)
    );

    const querySnapshot = await getDocs(emailQuery);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Email kontrol hatası:', error);
    throw error;
  }
};

export const checkPhoneExists = async (phoneNumber: string, userType: 'admin' | 'courier' | 'shop' | 'customer'): Promise<boolean> => {
  try {
    const collectionName = `${userType}Users`;
    const phoneQuery = query(
      collection(db, collectionName),
      where('phoneNumber', '==', phoneNumber)
    );

    const querySnapshot = await getDocs(phoneQuery);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Phone kontrol hatası:', error);
    throw error;
  }
};

// ================== LEGACY FUNCTION ALIASES ==================
// These aliases maintain backward compatibility with existing code

// User profile aliases
export const getUserProfile = getCustomerUser;
export const getUserProfileByEmailAndRole = async (email: string, role: string) => {
  try {
    let collectionName = '';
    switch (role) {
      case 'admin':
        collectionName = 'adminUsers';
        break;
      case 'courier':
        collectionName = 'courierUsers';
        break;
      case 'restaurant':
      case 'shop':
        collectionName = 'shopUsers';
        break;
      case 'customer':
        collectionName = 'customerUsers';
        break;
      default:
        return null;
    }

    const querySnapshot = await getDocs(query(collection(db, collectionName), where('email', '==', email)));
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('getUserProfileByEmailAndRole error:', error);
    return null;
  }
};
export const createUserProfile = createCustomerUser;
export const updateUserProfile = updateCustomerUser;

// Restaurant/Shop aliases
export const getRestaurant = getShop;
export const getRestaurantByOwnerId = async (ownerId: string): Promise<Shop | null> => {
  const shops = await getShopsByOwner(ownerId);
  return shops.length > 0 ? shops[0] : null;
};
export const createRestaurant = (ownerId: string, shopData: Omit<Shop, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => createShop(ownerId, shopData);
export const updateRestaurant = updateShop;
export const subscribeToAllRestaurants = subscribeToAllShops;

// Menu aliases
export const getRestaurantMenu = async (shopId: string) => {
  const [categories, products] = await Promise.all([
    getCategoriesByShop(shopId),
    getProductsByShop(shopId)
  ]);
  return { categories, products };
};
export const getRestaurantCategories = getCategoriesByShop;

// Order aliases
export const getUserOrders = getOrdersByCustomer;
export const subscribeToUserOrders = (customerId: string, callback: (orders: Order[]) => void) => {
  return onSnapshot(
    query(collection(db, 'orders'), where('customerId', '==', customerId), orderBy('createdAt', 'desc')),
    (querySnapshot: QuerySnapshot<DocumentData>) => {
      const orders: Order[] = [];
      querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() } as Order);
      });
      callback(orders);
    }
  );
};
export const subscribeToRestaurantOrders = (shopId: string, callback: (orders: Order[]) => void) => {
  return onSnapshot(
    query(collection(db, 'orders'), where('shopId', '==', shopId), orderBy('createdAt', 'desc')),
    (querySnapshot: QuerySnapshot<DocumentData>) => {
      const orders: Order[] = [];
      querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() } as Order);
      });
      callback(orders);
    }
  );
};

// Cart aliases
export const subscribeToUserCart = subscribeToCart;
export const removeFromCart = (customerId: string, productId: string) => {
  const cartItemId = `${customerId}_${productId}`;
  return deleteDoc(doc(db, 'cart', cartItemId));
};
export const clearUserCart = clearCart;

// Additional cart functions for CartContext
export const addToCartFirestore = async (customerId: string, product: any, shopId: string, shopName: string) => {
  const cartItem: Omit<CartItem, 'id' | 'customerId' | 'createdAt' | 'updatedAt'> = {
    shopId,
    productId: product.id,
    productName: product.name,
    productImage: product.imageUrl,
    quantity: 1,
    unitPrice: product.price,
    selectedOptions: [], // This would need to be populated based on selected options
    restaurantId: shopId, // Legacy compatibility
    restaurantName: shopName // Legacy compatibility
  };
  return addToCart(customerId, cartItem);
};

export const updateCartItemQuantityFirestore = async (customerId: string, productId: string, quantity: number) => {
  const cartItemId = `${customerId}_${productId}`;
  return updateCartItemQuantity(cartItemId, quantity);
};

// Favorites aliases
export const addFavoriteRestaurant = addToFavorites;
export const removeFavoriteRestaurant = removeFromFavorites;
export const isRestaurantFavorite = isShopFavorite;
export const getFavoriteRestaurants = getFavoriteShops;
export const subscribeToUserFavorites = (customerId: string, callback: (favoriteIds: string[]) => void) => {
  const favoritesQuery = query(collection(db, 'favorites'), where('customerId', '==', customerId));
  return onSnapshot(favoritesQuery, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const favoriteIds: string[] = [];
    querySnapshot.forEach((doc) => {
      favoriteIds.push(doc.data().shopId);
    });
    callback(favoriteIds);
  });
};

// Address aliases
export const getUserAddresses = getCustomerAddresses;
export const addUserAddress = (customerId: string, addressData: Omit<CustomerAddress, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>) => createCustomerAddress(customerId, addressData);
export const updateUserAddress = (customerId: string, addressId: string, updates: Partial<CustomerAddress>) => updateCustomerAddress(addressId, updates);
export const deleteUserAddress = (addressId: string) => deleteCustomerAddress(addressId);
export const setDefaultUserAddress = (customerId: string, addressId: string) => setDefaultAddress(addressId);
export const subscribeToUserAddresses = (customerId: string, callback: (addresses: CustomerAddress[]) => void) => {
  const addressesQuery = query(
    collection(db, 'customerAddresses'),
    where('customerId', '==', customerId),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(addressesQuery, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const addresses: CustomerAddress[] = [];
    querySnapshot.forEach((doc) => {
      addresses.push({ id: doc.id, ...doc.data() } as CustomerAddress);
    });
    callback(addresses);
  });
};

// Delivery zone aliases
export const subscribeToDeliveryZones = (shopId: string, callback: (zones: DeliveryZone[]) => void) => {
  const zonesQuery = query(
    collection(db, 'deliveryZones'),
    where('shopId', '==', shopId),
    where('isActive', '==', true),
    orderBy('createdAt')
  );
  return onSnapshot(zonesQuery, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const zones: DeliveryZone[] = [];
    querySnapshot.forEach((doc) => {
      zones.push({ id: doc.id, ...doc.data() } as DeliveryZone);
    });
    callback(zones);
  });
};
export const addDeliveryZone = (shopId: string, zoneData: Omit<DeliveryZone, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>) => createDeliveryZone(shopId, zoneData);

// File upload aliases
export const uploadRestaurantLogo = (userId: string, file: File) => uploadImage(userId, file, 'shops');
export const uploadProfilePicture = (userId: string, file: File) => uploadImage(userId, file, 'profiles');
export const deleteProfilePicture = deleteImage;

// Validation aliases
export const checkPhoneExistsForRole = checkPhoneExists;

// Complex operations aliases
export const deleteCategoryAndUpdateProducts = async (userId: string, categoryId: string) => {
  // Get all products in this category
  const productsQuery = query(collection(db, 'products'), where('categoryId', '==', categoryId));
  const querySnapshot = await getDocs(productsQuery);

  const batch = writeBatch(db);
  querySnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { categoryId: null, updatedAt: serverTimestamp() });
  });

  // Soft delete the category
  batch.update(doc(db, 'categories', categoryId), {
    isActive: false,
    updatedAt: serverTimestamp()
  });

  await batch.commit();
};

export const deleteOptionAndUpdateProducts = async (userId: string, optionId: string) => {
  // This is complex - would need to update all products that reference this option
  // For now, just soft delete the option
  await updateDoc(doc(db, 'options', optionId), {
    isActive: false,
    updatedAt: serverTimestamp()
  });
};

// Additional aliases for missing functions
export const getUserProfileByCustomId = async (userId: string): Promise<CustomerUser | null> => {
  // Try to find user in all collections
  const collections = ['adminUsers', 'courierUsers', 'shopUsers', 'customerUsers'];
  for (const collectionName of collections) {
    try {
      const docSnap = await getDoc(doc(db, collectionName, userId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as CustomerUser;
      }
    } catch (error) {
      continue;
    }
  }
  return null;
};

export const setUserSelectedAddress = async (customerId: string, addressId: string) => {
  // This could be stored in user preferences or a separate collection
  // For now, just mark as default
  await setDefaultAddress(addressId);
};

export const getUserSelectedAddress = async (customerId: string) => {
  const addresses = await getCustomerAddresses(customerId);
  return addresses.find(addr => addr.isDefault) || null;
};
