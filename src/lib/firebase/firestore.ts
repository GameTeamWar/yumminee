"use client";

import { db } from './config';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  serverTimestamp,
  GeoPoint,
  DocumentReference,
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp
} from 'firebase/firestore';
import { 
  User, 
  Restaurant, 
  Product, 
  Order, 
  OrderStatus, 
  Courier,
  SystemSettings 
} from '@/types';

// Sistem ayarlarını getir
export const getSystemSettings = async (): Promise<SystemSettings> => {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'system'));
    if (settingsDoc.exists()) {
      return settingsDoc.data() as SystemSettings;
    }
    
    // Varsayılan ayarlar
    const defaultSettings: SystemSettings = {
      defaultDeliveryFee: Number(process.env.NEXT_PUBLIC_DEFAULT_DELIVERY_FEE || 15),
      defaultCourierFee: Number(process.env.NEXT_PUBLIC_DEFAULT_PER_KM_FEE || 2.5),
      orderTimeoutSeconds: 300, // 5 dakika
      maxServiceRadius: Number(process.env.NEXT_PUBLIC_MAX_SERVICE_RADIUS || 20)
    };
    
    // Varsayılan ayarları kaydet
    await setDoc(doc(db, 'settings', 'system'), defaultSettings);
    return defaultSettings;
  } catch (error) {
    console.error('Sistem ayarları getirme hatası:', error);
    throw error;
  }
};

// Restoran listesi getir
export const getRestaurants = async (
  lastVisible?: QueryDocumentSnapshot<DocumentData>,
  itemsPerPage = 10
) => {
  try {
    let restaurantsQuery = query(
      collection(db, 'restaurants'),
      orderBy('createdAt', 'desc'),
      limit(itemsPerPage)
    );
    
    if (lastVisible) {
      restaurantsQuery = query(
        collection(db, 'restaurants'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(itemsPerPage)
      );
    }
    
    const restaurantsSnapshot = await getDocs(restaurantsQuery);
    const restaurants: Restaurant[] = [];
    
    restaurantsSnapshot.forEach((doc) => {
      const data = doc.data();
      restaurants.push({
        id: doc.id,
        name: data.name,
        email: data.email,
        phoneNumber: data.phone || data.phoneNumber || '',
        phone: data.phone || data.phoneNumber || '',
        address: data.address,
        location: data.location,
        coverImage: data.coverImage || data.image,
        image: data.image,
        description: data.description || '',
        cuisine: data.categories || [], // Use categories as cuisine for backward compatibility
        categories: data.categories || [],
        rating: data.rating || 0,
        reviewCount: data.reviewCount || data.totalReviews || 0,
        serviceRadius: data.serviceRadius || 5,
        deliveryTime: data.deliveryTime || data.estimatedDeliveryTime || 30,
        minimumOrderAmount: data.minimumOrderAmount || 0,
        isOpen: data.isOpen || false,
        ownerId: data.ownerId || '',
        workingHours: data.workingHours || data.openingHours,
        paymentMethods: data.paymentMethods || ['cash', 'card'],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    
    return {
      restaurants,
      lastVisible: restaurantsSnapshot.docs[restaurantsSnapshot.docs.length - 1],
      isEmpty: restaurantsSnapshot.empty,
    };
  } catch (error) {
    console.error('Restoranları getirme hatası:', error);
    throw error;
  }
};

// Restoran detayı getir
export const getRestaurant = async (restaurantId: string): Promise<Restaurant | null> => {
  try {
    const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
    if (!restaurantDoc.exists()) return null;
    
    const data = restaurantDoc.data();
    return {
      id: restaurantDoc.id,
      name: data.name,
      email: data.email,
      phoneNumber: data.phone || data.phoneNumber || '',
      phone: data.phone || data.phoneNumber || '',
      address: data.address,
      location: data.location,
      coverImage: data.coverImage || data.image,
      image: data.image,
      description: data.description || '',
      cuisine: data.categories || [], // Use categories as cuisine for backward compatibility
      categories: data.categories || [],
      rating: data.rating || 0,
      reviewCount: data.reviewCount || data.totalReviews || 0,
      serviceRadius: data.serviceRadius || 5,
      deliveryTime: data.deliveryTime || data.estimatedDeliveryTime || 30,
      minimumOrderAmount: data.minimumOrderAmount || 0,
      isOpen: data.isOpen || false,
      ownerId: data.ownerId || '',
      workingHours: data.workingHours || data.openingHours,
      paymentMethods: data.paymentMethods || ['cash', 'card'],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error('Restoran detayı getirme hatası:', error);
    throw error;
  }
};

// Restoran menüsü getir
export const getRestaurantMenu = async (restaurantId: string) => {
  try {
    const productsQuery = query(
      collection(db, 'products'),
      where('restaurantId', '==', restaurantId),
      orderBy('category'),
      orderBy('name')
    );
    
    const productsSnapshot = await getDocs(productsQuery);
    const products: Product[] = [];
    
    productsSnapshot.forEach((doc) => {
      const data = doc.data();
      products.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        price: data.price,
        imageUrl: data.imageUrl || data.image,
        category: data.category,
        categoryIds: data.categoryIds,
        categoryNames: data.categoryNames,
        preparationTime: data.preparationTime,
        options: data.options || [],
        optionIds: data.optionIds,
        optionNames: data.optionNames,
        isAvailable: data.isAvailable,
        allergens: data.allergens,
        nutritionalInfo: data.nutritionalInfo,
        shopId: data.shopId || data.restaurantId,
        customId: data.customId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    
    return products;
  } catch (error) {
    console.error('Restoran menüsü getirme hatası:', error);
    throw error;
  }
};

// Ürün ekle
export const addProduct = async (
  restaurantId: string,
  product: Omit<Product, 'id' | 'createdAt'>
) => {
  try {
    const productData = {
      ...product,
      restaurantId,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'products'), productData);
    return { id: docRef.id, ...productData };
  } catch (error) {
    console.error('Ürün ekleme hatası:', error);
    throw error;
  }
};

// Sipariş oluştur
export const createOrder = async (
  userId: string,
  restaurantId: string,
  order: Omit<Order, 'id' | 'createdAt' | 'orderAcceptDeadline' | 'status'>
) => {
  try {
    const settings = await getSystemSettings();
    const restaurant = await getRestaurant(restaurantId);
    
    if (!restaurant) {
      throw new Error('Restoran bulunamadı');
    }
    
    const now = Timestamp.now();
    const deadline = Timestamp.fromMillis(
      now.toMillis() + (settings.orderTimeoutSeconds * 1000)
    );
    
    const orderData = {
      ...order,
      userId,
      restaurantId,
      status: 'pending' as OrderStatus,
      createdAt: now,
      orderAcceptDeadline: deadline,
      estimatedPreparationTime: null,
      preparationStartTime: null,
      preparationEndTime: null,
      assignedCourier: null,
      deliveryStartTime: null,
      deliveryEndTime: null
    };
    
    const orderRef = await addDoc(collection(db, 'orders'), orderData);
    return { id: orderRef.id, ...orderData };
  } catch (error) {
    console.error('Sipariş oluşturma hatası:', error);
    throw error;
  }
};

// Sipariş durumunu güncelle
export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus,
  additionalData: Partial<Order> = {}
) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      throw new Error('Sipariş bulunamadı');
    }
    
    const updateData: Record<string, any> = {
      status,
      ...additionalData
    };
    
    // Status değişimine göre ek alanlar ekle
    if (status === 'accepted' && !additionalData.preparationStartTime) {
      updateData.preparationStartTime = serverTimestamp();
    } else if (status === 'ready' && !additionalData.preparationEndTime) {
      updateData.preparationEndTime = serverTimestamp();
    } else if (status === 'delivering' && !additionalData.deliveryStartTime) {
      updateData.deliveryStartTime = serverTimestamp();
    } else if (status === 'completed' && !additionalData.deliveryEndTime) {
      updateData.deliveryEndTime = serverTimestamp();
    }
    
    await updateDoc(orderRef, updateData);
    
    const updatedOrder = await getDoc(orderRef);
    return { id: updatedOrder.id, ...updatedOrder.data() } as Order;
  } catch (error) {
    console.error('Sipariş durumu güncelleme hatası:', error);
    throw error;
  }
};

// Restoran siparişlerini getir
export const getRestaurantOrders = async (
  restaurantId: string,
  status?: OrderStatus | OrderStatus[],
  lastVisible?: QueryDocumentSnapshot<DocumentData>,
  itemsPerPage = 20
) => {
  try {
    let ordersQuery;
    
    if (status) {
      // Tek veya çoklu durum filtresi
      const statusCondition = Array.isArray(status) 
        ? status 
        : [status];
        
      ordersQuery = query(
        collection(db, 'orders'),
        where('restaurantId', '==', restaurantId),
        where('status', 'in', statusCondition),
        orderBy('createdAt', 'desc'),
        limit(itemsPerPage)
      );
    } else {
      // Tüm siparişleri getir
      ordersQuery = query(
        collection(db, 'orders'),
        where('restaurantId', '==', restaurantId),
        orderBy('createdAt', 'desc'),
        limit(itemsPerPage)
      );
    }
    
    if (lastVisible) {
      ordersQuery = query(
        ordersQuery,
        startAfter(lastVisible)
      );
    }
    
    const ordersSnapshot = await getDocs(ordersQuery);
    const orders: Order[] = [];
    
    ordersSnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as Order);
    });
    
    return {
      orders,
      lastVisible: ordersSnapshot.docs[ordersSnapshot.docs.length - 1],
      isEmpty: ordersSnapshot.empty
    };
  } catch (error) {
    console.error('Restoran siparişleri getirme hatası:', error);
    throw error;
  }
};

// Kuryeler listesini getir
export const getAvailableCouriers = async (restaurantLocation: GeoPoint, maxDistance: number = 10) => {
  try {
    // Gerçek uygulamada mesafe hesabına göre filtreleme yapılmalı
    // Bu örnekte basitçe aktif kuryeleri getiriyoruz
    const couriersQuery = query(
      collection(db, 'couriers'),
      where('isOnline', '==', true),
      where('isAvailable', '==', true)
    );
    
    const couriersSnapshot = await getDocs(couriersQuery);
    const couriers: Courier[] = [];
    
    couriersSnapshot.forEach((doc) => {
      couriers.push({ id: doc.id, ...doc.data() } as Courier);
    });
    
    return couriers;
  } catch (error) {
    console.error('Kurye listesi getirme hatası:', error);
    throw error;
  }
};

// Kurye siparişlerini getir
export const getCourierOrders = async (
  courierId: string,
  status?: OrderStatus | OrderStatus[]
) => {
  try {
    let ordersQuery;
    
    if (status) {
      const statusCondition = Array.isArray(status) ? status : [status];
      
      ordersQuery = query(
        collection(db, 'orders'),
        where('assignedCourier', '==', courierId),
        where('status', 'in', statusCondition),
        orderBy('createdAt', 'desc')
      );
    } else {
      ordersQuery = query(
        collection(db, 'orders'),
        where('assignedCourier', '==', courierId),
        orderBy('createdAt', 'desc')
      );
    }
    
    const ordersSnapshot = await getDocs(ordersQuery);
    const orders: Order[] = [];
    
    ordersSnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as Order);
    });
    
    return orders;
  } catch (error) {
    console.error('Kurye siparişleri getirme hatası:', error);
    throw error;
  }
};

// Kurye için sipariş ata
export const assignCourierToOrder = async (orderId: string, courierId: string) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    await updateDoc(orderRef, {
      assignedCourier: courierId,
      status: 'delivering' as OrderStatus,
      deliveryStartTime: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Kurye atama hatası:', error);
    throw error;
  }
};

// Kullanıcı bakiye bilgisi getir
export const getUserBalance = async (userId: string) => {
  try {
    const balanceDoc = await getDoc(doc(db, 'balances', userId));
    
    if (!balanceDoc.exists()) {
      // Kullanıcı bakiye bilgisi yoksa oluştur
      await setDoc(doc(db, 'balances', userId), {
        userId,
        amount: 0,
        updatedAt: serverTimestamp()
      });
      return 0;
    }
    
    return balanceDoc.data().amount;
  } catch (error) {
    console.error('Bakiye bilgisi getirme hatası:', error);
    throw error;
  }
};

// Kullanıcı bakiyesini güncelle
export const updateUserBalance = async (userId: string, amount: number, isDeposit: boolean) => {
  try {
    const balanceRef = doc(db, 'balances', userId);
    const balanceDoc = await getDoc(balanceRef);
    
    let currentBalance = 0;
    if (balanceDoc.exists()) {
      currentBalance = balanceDoc.data().amount;
    }
    
    const newBalance = isDeposit 
      ? currentBalance + amount 
      : currentBalance - amount;
      
    if (!isDeposit && newBalance < 0) {
      throw new Error('Yetersiz bakiye');
    }
    
    await setDoc(balanceRef, {
      userId,
      amount: newBalance,
      updatedAt: serverTimestamp()
    });
    
    // İşlem kaydı oluştur
    await addDoc(collection(db, 'transactions'), {
      userId,
      amount,
      type: isDeposit ? 'deposit' : 'withdrawal',
      description: isDeposit ? 'Bakiye yükleme' : 'Bakiye kullanımı',
      createdAt: serverTimestamp()
    });
    
    return newBalance;
  } catch (error) {
    console.error('Bakiye güncelleme hatası:', error);
    throw error;
  }
};

// Kurye teslimat ücreti hesapla ve kurye bakiyesine ekle
export const processCourierPayment = async (
  orderId: string, 
  courierId: string,
  distance: number // kilometre cinsinden
) => {
  try {
    // Sistem ayarlarını getir
    const settings = await getSystemSettings();
    
    // Kurye ücreti hesapla
    const courierFee = distance * settings.defaultCourierFee;
    
    // Kurye bakiyesini güncelle
    await updateUserBalance(courierId, courierFee, true);
    
    // Sipariş bilgisini güncelle
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      courierFee,
      distance
    });
    
    return courierFee;
  } catch (error) {
    console.error('Kurye ödeme hatası:', error);
    throw error;
  }
};