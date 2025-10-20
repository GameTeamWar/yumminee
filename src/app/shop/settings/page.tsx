"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Store,
  CreditCard,
  Bell,
  Shield,
  Save,
  Upload,
  Loader2,
  Clock,
  MapPin,
  Trash2,
  Plus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRestaurantByOwnerId, updateRestaurant, uploadRestaurantLogo, Shop, deleteField } from '@/lib/firebase/db';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import DragDrawer from '@/components/drag-drawer';
import WorkingHoursSettings from '@/components/restaurant/WorkingHoursSettings';
import { WorkingHours } from '@/lib/utils/restaurantHours';
import { GoogleMap, LoadScript, Polygon, Marker, useJsApiLoader } from '@react-google-maps/api';

export default function SettingsPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const panelId = searchParams.get('panel');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [restaurant, setRestaurant] = useState<Shop | null>(null);
  
  // Aktif sekme durumu
  const [activeTab, setActiveTab] = useState('general');
  
  // Drawer durumu
  const [isServiceAreaDrawerOpen, setIsServiceAreaDrawerOpen] = useState(false);
  
  // Bölge yönetimi için state'ler
  const [regions, setRegions] = useState<Array<{
    id: string;
    name: string;
    color: string;
    minOrderAmount: number;
    deliveryTime: string;
    isActive: boolean;
    coordinates?: { lat: number; lng: number }[];
  }>>([]);
  
  // Debounce için ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Aktif sekme'yi localStorage'dan yükle
  useEffect(() => {
    const savedTab = localStorage.getItem('shop-settings-active-tab');
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  const [restaurantInfo, setRestaurantInfo] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    cuisine: [] as string[],
    deliveryTime: 30,
    minimumOrderAmount: 25
  });

  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    monday: { open: '09:00', close: '22:00', isClosed: false },
    tuesday: { open: '09:00', close: '22:00', isClosed: false },
    wednesday: { open: '09:00', close: '22:00', isClosed: false },
    thursday: { open: '09:00', close: '22:00', isClosed: false },
    friday: { open: '09:00', close: '22:00', isClosed: false },
    saturday: { open: '09:00', close: '22:00', isClosed: false },
    sunday: { open: '09:00', close: '22:00', isClosed: true }
  });

  // Her gün için kaydedilmiş saatleri sakla (kapalı günlerde saatleri kaybetmemek için)
  const [savedHours, setSavedHours] = useState<{[key: string]: { open: string; close: string } }>({
    monday: { open: '09:00', close: '22:00' },
    tuesday: { open: '09:00', close: '22:00' },
    wednesday: { open: '09:00', close: '22:00' },
    thursday: { open: '09:00', close: '22:00' },
    friday: { open: '09:00', close: '22:00' },
    saturday: { open: '09:00', close: '22:00' },
    sunday: { open: '09:00', close: '22:00' }
  });

  // Günleri sıralı olarak tanımla
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const dayNames = {
    monday: 'Pazartesi',
    tuesday: 'Salı',
    wednesday: 'Çarşamba',
    thursday: 'Perşembe',
    friday: 'Cuma',
    saturday: 'Cumartesi',
    sunday: 'Pazar'
  };

  const [paymentSettings, setPaymentSettings] = useState({
    acceptCash: true,
    acceptCard: true,
    acceptOnline: true,
    deliveryFee: 5.00,
    freeDeliveryThreshold: 50.00
  });

  // Google Maps için hook
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places', 'geometry']
  });

  // Google Maps için state'ler
  const [mapCenter, setMapCenter] = useState({ lat: 39.9334, lng: 32.8597 }); // Ankara merkez
  const [serviceArea, setServiceArea] = useState<{ lat: number; lng: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Ödeme yöntemi değişikliğini hemen kaydet
  const handlePaymentMethodChange = useCallback(async (method: string, checked: boolean) => {
    console.log(`Payment method ${method} changed to:`, checked);
    
    if (!restaurant) {
      toast.error('Restoran bilgileri bulunamadı');
      return;
    }

    // Önce state'i güncelle
    setPaymentSettings(prev => ({
      ...prev,
      [method]: checked
    }));

    // Hemen Firestore'a kaydet
    try {
      // Güncel ödeme yöntemlerini oluştur
      const updatedPaymentMethods = {
        acceptCash: method === 'acceptCash' ? checked : paymentSettings.acceptCash,
        acceptCard: method === 'acceptCard' ? checked : paymentSettings.acceptCard,
        acceptOnline: method === 'acceptOnline' ? checked : paymentSettings.acceptOnline,
      };

      // Ödeme yöntemlerini array'e çevir
      const paymentMethods: string[] = [];
      if (updatedPaymentMethods.acceptCash) paymentMethods.push('Kapıda Ödeme');
      if (updatedPaymentMethods.acceptCard) paymentMethods.push('Banka & Kredi Kartı');
      if (updatedPaymentMethods.acceptOnline) paymentMethods.push('Online Ödeme');

      console.log('Saving payment methods:', paymentMethods);

      await updateRestaurant(restaurant.id, {
        paymentMethods: paymentMethods
      });

      // Restaurant state'ini güncelle
      setRestaurant(prev => prev ? { 
        ...prev, 
        paymentMethods: paymentMethods 
      } : null);

      toast.success('Ödeme ayarları güncellendi');
    } catch (error) {
      console.error('Ödeme ayarları kaydedilirken hata:', error);
      toast.error('Ödeme ayarları güncellenirken hata oluştu');
      
      // Hata durumunda state'i geri al
      setPaymentSettings(prev => ({
        ...prev,
        [method]: !checked
      }));
    }
  }, [restaurant, paymentSettings]);

  // Restoran verilerini yükle
  useEffect(() => {
    const loadRestaurantData = async () => {
      if (!user?.uid) return;

      try {
        setIsLoading(true);
        const restaurantData = await getRestaurantByOwnerId(user.uid);
        
        if (restaurantData) {
          setRestaurant(restaurantData);
          
          // Form state'lerini güncelle
          setRestaurantInfo({
            name: restaurantData.name || '',
            description: restaurantData.description || '',
            phone: restaurantData.phoneNumber || restaurantData.phone || '',
            email: restaurantData.email || '',
            address: restaurantData.address || '',
            cuisine: restaurantData.cuisine || [],
            deliveryTime: restaurantData.deliveryTime || 30,
            minimumOrderAmount: restaurantData.minimumOrderAmount || 25
          });

          // Ödeme ayarlarını güncelle - sadece ilk yüklemede
          console.log('Initial payment methods:', restaurantData.paymentMethods);
          setPaymentSettings({
            acceptCash: restaurantData.paymentMethods?.includes('Kapıda Ödeme') || true,
            acceptCard: restaurantData.paymentMethods?.includes('Banka & Kredi Kartı') || true,
            acceptOnline: restaurantData.paymentMethods?.includes('Online Ödeme') || true,
            deliveryFee: 5.00,
            freeDeliveryThreshold: 50.00
          });

          // Çalışma saatlerini güncelle
          if (restaurantData.openingHours) {
            setWorkingHours(restaurantData.openingHours as unknown as WorkingHours);
          }

          // Restaurant isOpen durumunu çalışma saatlerine göre ayarla
          const shouldBeOpen = restaurantData.openingHours 
            ? calculateRestaurantOpenStatus(restaurantData.openingHours as unknown as WorkingHours)
            : true;

          setRestaurant({ ...restaurantData, isOpen: shouldBeOpen });
        }
      } catch (error) {
        console.error('Restoran verileri yüklenirken hata:', error);
        toast.error('Restoran bilgileri yüklenirken bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    loadRestaurantData();
  }, [user?.uid]);

  // Çalışma saatleri için ayrı onSnapshot listener
  useEffect(() => {
    if (!restaurant?.id) return;

    const restaurantRef = doc(db, 'shops', restaurant.id);
    const unsubscribe = onSnapshot(restaurantRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.openingHours) {
          console.log('Settings: Çalışma saatleri güncellendi:', data.openingHours);
          setWorkingHours(data.openingHours as unknown as WorkingHours);
          
          // Restaurant durumunu da güncelle
          const shouldBeOpen = calculateRestaurantOpenStatus(data.openingHours as unknown as WorkingHours);
          setRestaurant(prev => prev ? { ...prev, isOpen: shouldBeOpen, openingHours: data.openingHours } : null);
        }
      }
    }, (error) => {
      console.error('Settings: Çalışma saatleri dinlenirken hata:', error);
    });

    return () => unsubscribe();
  }, [restaurant?.id]);

  // Restoran açık/kapalı durumunu çalışma saatlerine göre hesapla
  const calculateRestaurantOpenStatus = (hours: WorkingHours): boolean => {
    return Object.values(hours).some(day => !day.isClosed);
  };

  // Çalışma saatlerini güncelleme fonksiyonu
  const updateWorkingHours = (newHours: typeof workingHours) => {
    setWorkingHours(newHours);
    
    // Restoran durumunu güncelle
    const shouldBeOpen = calculateRestaurantOpenStatus(newHours);
    if (restaurant) {
      setRestaurant(prev => prev ? { ...prev, isOpen: shouldBeOpen } : null);
    }
  };

  const handleSave = useCallback(async () => {
    if (!restaurant) {
      toast.error('Restoran bilgileri bulunamadı');
      return;
    }

    console.log('handleSave called, paymentSettings:', paymentSettings);

    try {
      setIsSaving(true);

      // Ödeme yöntemlerini array'e çevir
      const paymentMethods: string[] = [];
      if (paymentSettings.acceptCash) paymentMethods.push('Kapıda Ödeme');
      if (paymentSettings.acceptCard) paymentMethods.push('Banka & Kredi Kartı');
      if (paymentSettings.acceptOnline) paymentMethods.push('Online Ödeme');

      console.log('paymentMethods array:', paymentMethods);

      // Güncellenecek veriler
      const updateData = {
        name: restaurantInfo.name,
        description: restaurantInfo.description,
        phoneNumber: restaurantInfo.phone,
        phone: restaurantInfo.phone,
        email: restaurantInfo.email,
        address: restaurantInfo.address,
        cuisine: restaurantInfo.cuisine,
        deliveryTime: restaurantInfo.deliveryTime,
        minimumOrderAmount: restaurantInfo.minimumOrderAmount,
        paymentMethods: paymentMethods,
        openingHours: workingHours as any,
        isOpen: calculateRestaurantOpenStatus(workingHours)
      };

      await updateRestaurant(restaurant.id, updateData);
      
      // Restaurant state'ini güncelle
      setRestaurant(prev => prev ? { ...prev, ...updateData } : null);
      
      toast.success('Ayarlar başarıyla kaydedildi');
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error);
      toast.error('Ayarlar kaydedilirken bir hata oluştu');
    } finally {
      setIsSaving(false);
    }
  }, [restaurant, restaurantInfo, paymentSettings, workingHours]);

  // Otomatik kaydetme fonksiyonu (debounce ile)
  const autoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 1000);
  }, [handleSave]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !restaurant) return;

    try {
      setIsUploadingLogo(true);
      const downloadURL = await uploadRestaurantLogo(restaurant.id, file);
      
      // Veritabanına kaydet
      await updateRestaurant(restaurant.id, { image: downloadURL });
      
      // Restaurant state'ini güncelle
      setRestaurant((prev: Shop | null) => prev ? { ...prev, image: downloadURL } : null);
      
      toast.success('Logo başarıyla yüklendi');
    } catch (error) {
      console.error('Logo yüklenirken hata:', error);
      toast.error('Logo yüklenirken bir hata oluştu');
    } finally {
      setIsUploadingLogo(false);
      // File input'u resetle
      event.target.value = '';
    }
  };

  const handleLogoDelete = async () => {
    if (!restaurant?.image) return;

    try {
      setIsUploadingLogo(true);
      
      // Firebase'de image alanını sil
      await updateRestaurant(restaurant.id, { image: deleteField() } as any);
      
      // Restaurant state'ini güncelle
      setRestaurant((prev: Shop | null) => prev ? { ...prev, image: undefined } : null);
      
      toast.success('Logo başarıyla silindi');
    } catch (error) {
      console.error('Logo silinirken hata:', error);
      toast.error('Logo silinirken bir hata oluştu');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Bölgeleri yükle
  useEffect(() => {
    if ((restaurant as any)?.serviceArea) {
      setRegions((restaurant as any).serviceArea);
    }
  }, [(restaurant as any)?.serviceArea]);
  useEffect(() => {
    const checkRestaurantStatus = () => {
      const now = new Date();
      const currentDay = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(now).toLowerCase();
      const currentTime = now.toTimeString().slice(0, 5);

      const todayHours = workingHours[currentDay as keyof typeof workingHours];
      
      if (!todayHours || todayHours.isClosed) {
        if (restaurant?.isOpen) {
          setRestaurant(prev => prev ? { ...prev, isOpen: false } : null);
        }
      } else {
        const isWithinHours = currentTime >= todayHours.open && currentTime <= todayHours.close;
        if (restaurant && restaurant.isOpen !== isWithinHours) {
          setRestaurant(prev => prev ? { ...prev, isOpen: isWithinHours } : null);
        }
      }
    };

    checkRestaurantStatus();
    const interval = setInterval(checkRestaurantStatus, 60000);

    return () => clearInterval(interval);
  }, [workingHours, restaurant]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Ayarlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-8xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-white via-orange-50 to-white rounded-xl shadow-sm border border-orange-100 p-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent flex items-center">
              <Settings className="h-6 w-6 mr-3 text-orange-600" />
              Restoran Ayarları
            </h1>
            <p className="text-gray-600 mt-1 text-sm">Restoran bilgilerinizi ve ayarlarınızı yönetin</p>
            <p className="text-xs text-gray-500 mt-2 flex items-center">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
              Değişiklikleriniz otomatik olarak kaydedilir
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          localStorage.setItem('shop-settings-active-tab', value);
        }} className="w-full">
          <TabsList className="flex w-full bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            <TabsTrigger value="general" className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border data-[state=active]:border-orange-200 data-[state=active]:shadow-sm transition-all duration-200 rounded-lg py-3 px-4 text-sm font-medium">
              <Store className="h-4 w-4" />
              <span>Genel</span>
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border data-[state=active]:border-orange-200 data-[state=active]:shadow-sm transition-all duration-200 rounded-lg py-3 px-4 text-sm font-medium">
              <Clock className="h-4 w-4" />
              <span>Çalışma Saatleri</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border data-[state=active]:border-orange-200 data-[state=active]:shadow-sm transition-all duration-200 rounded-lg py-3 px-4 text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              <span>Ödeme</span>
            </TabsTrigger>
            <TabsTrigger value="service-area" className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border data-[state=active]:border-orange-200 data-[state=active]:shadow-sm transition-all duration-200 rounded-lg py-3 px-4 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              <span>Hizmet Alanı</span>
            </TabsTrigger>
            {/* <TabsTrigger value="notifications" className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border data-[state=active]:border-orange-200 data-[state=active]:shadow-sm transition-all duration-200 rounded-lg py-3 px-4 text-sm font-medium">
              <Bell className="h-4 w-4" />
              <span>Bildirimler</span>
            </TabsTrigger> */}
            <TabsTrigger value="security" className="flex-1 flex items-center justify-center gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border data-[state=active]:border-orange-200 data-[state=active]:shadow-sm transition-all duration-200 rounded-lg py-3 px-4 text-sm font-medium">
              <Shield className="h-4 w-4" />
              <span>Güvenlik</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50 rounded-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-4">
                <CardTitle className="flex items-center text-blue-900 text-lg">
                  <Store className="h-5 w-5 mr-3 text-blue-600" />
                  Restoran Bilgileri
                </CardTitle>
                <CardDescription className="text-blue-700 text-sm mt-1">
                  Müşterilerinizin göreceği temel bilgiler
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-6">
                {/* Temel Bilgiler */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">Restoran Adı</Label>
                    <Input
                      id="name"
                      value={restaurantInfo.name}
                      onChange={(e) => setRestaurantInfo(prev => ({ ...prev, name: e.target.value }))}
                      onBlur={autoSave}
                      className="h-10"
                      placeholder="Restoranınızın adı"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Telefon</Label>
                    <Input
                      id="phone"
                      value={restaurantInfo.phone}
                      onChange={(e) => setRestaurantInfo(prev => ({ ...prev, phone: e.target.value }))}
                      onBlur={autoSave}
                      className="h-10"
                      placeholder="+90 5XX XXX XX XX"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-posta</Label>
                    <Input
                      id="email"
                      type="email"
                      value={restaurantInfo.email}
                      onChange={(e) => setRestaurantInfo(prev => ({ ...prev, email: e.target.value }))}
                      onBlur={autoSave}
                      className="h-11"
                      placeholder="info@restoran.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-gray-700">Adres</Label>
                  <Textarea
                    id="address"
                    value={restaurantInfo.address}
                    onChange={(e) => setRestaurantInfo(prev => ({ ...prev, address: e.target.value }))}
                    onBlur={autoSave}
                    rows={3}
                    className="resize-none"
                    placeholder="Restoranınızın tam adresi"
                  />
                </div>

                {/* Mutfak Türleri */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">Mutfak Türleri</Label>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {restaurantInfo.cuisine.length}/3 seçili
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[
                      'Türk Mutfağı',
                      'İtalyan',
                      'Fast Food',
                      'Kebap',
                      'Deniz Ürünleri',
                      'Çin Mutfağı',
                      'Japon Mutfağı',
                      'Meksika Mutfağı',
                      'Vejetaryen',
                      'Vegan',
                      'Tatlılar',
                      'Kahve & Çay',
                      'Street Food',
                      'Dünya Mutfağı'
                    ].map((cuisineType) => (
                      <div
                        key={cuisineType}
                        className={`relative p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                          restaurantInfo.cuisine.includes(cuisineType)
                            ? 'border-orange-500 bg-orange-50 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${restaurantInfo.cuisine.length >= 3 && !restaurantInfo.cuisine.includes(cuisineType) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => {
                          if (isSaving) return;
                          const currentValues = restaurantInfo.cuisine;
                          if (restaurantInfo.cuisine.includes(cuisineType)) {
                            setRestaurantInfo(prev => ({ ...prev, cuisine: currentValues.filter(v => v !== cuisineType) }));
                          } else if (currentValues.length < 3) {
                            setRestaurantInfo(prev => ({ ...prev, cuisine: [...currentValues, cuisineType] }));
                          }
                          setTimeout(autoSave, 100);
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`cuisine-${cuisineType}`}
                            checked={restaurantInfo.cuisine.includes(cuisineType)}
                            onChange={() => {}}
                            disabled={isSaving || (restaurantInfo.cuisine.length >= 3 && !restaurantInfo.cuisine.includes(cuisineType))}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`cuisine-${cuisineType}`}
                            className="text-sm font-medium cursor-pointer flex-1"
                          >
                            {cuisineType}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    En fazla 3 mutfak türü seçebilirsiniz. Bu bilgiler müşterileriniz tarafından görülecektir.
                  </p>
                </div>

                {/* Operasyonel Ayarlar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryTime" className="text-sm font-medium text-gray-700">Teslimat Süresi</Label>
                    <div className="relative">
                      <Input
                        id="deliveryTime"
                        type="number"
                        value={restaurantInfo.deliveryTime}
                        onChange={(e) => setRestaurantInfo(prev => ({ ...prev, deliveryTime: parseInt(e.target.value) || 30 }))}
                        onBlur={autoSave}
                        className="h-11 pr-12"
                        min="5"
                        max="120"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">dk</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimumOrder" className="text-sm font-medium text-gray-700">Minimum Sipariş</Label>
                    <div className="relative">
                      <Input
                        id="minimumOrder"
                        type="number"
                        value={restaurantInfo.minimumOrderAmount}
                        onChange={(e) => setRestaurantInfo(prev => ({ ...prev, minimumOrderAmount: parseFloat(e.target.value) || 25 }))}
                        onBlur={autoSave}
                        className="h-11 pr-8"
                        min="0"
                        step="0.01"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">₺</span>
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Restoran Logosu</Label>
                    <div className="space-y-3">
                      {/* Mevcut Logo Önizleme */}
                      <div className="flex items-center space-x-3 p-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                        <img
                          src={restaurant?.image || '/images/restaurants/default.jpg'}
                          alt="Restoran Logosu"
                          className="w-16 h-16 object-cover rounded-lg border-2 border-white shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/restaurants/default.jpg';
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {restaurant?.image ? 'Mevcut Logo' : 'Varsayılan Logo'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {restaurant?.image ? 'Logo müşterilerinize gösteriliyor' : 'Henüz logo yüklenmemiş'}
                          </p>
                        </div>
                        {restaurant?.image && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLogoDelete}
                            disabled={isUploadingLogo}
                            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                          >
                            {isUploadingLogo ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Sil'
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Yükleme Alanı */}
                      <div className="flex items-center space-x-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload"
                          disabled={isUploadingLogo}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          disabled={isUploadingLogo}
                          className="border-orange-200 text-orange-700 hover:bg-orange-50"
                        >
                          {isUploadingLogo ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {restaurant?.image ? 'Logo Değiştir' : 'Logo Yükle'}
                        </Button>
                        <span className="text-xs text-gray-500">PNG, JPG • Max 2MB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hours" className="space-y-6">
            <WorkingHoursSettings
              restaurantId={restaurant?.id || ''}
              initialHours={workingHours as WorkingHours}
              onUpdate={() => {
                if (restaurant?.id) {
                  const restaurantRef = doc(db, 'shops', restaurant.id);
                  const unsubscribe = onSnapshot(restaurantRef, (doc) => {
                    if (doc.exists()) {
                      const data = doc.data();
                      if (data.openingHours) {
                        setWorkingHours(data.openingHours as unknown as WorkingHours);
                        const shouldBeOpen = calculateRestaurantOpenStatus(data.openingHours as unknown as WorkingHours);
                        setRestaurant(prev => prev ? { ...prev, isOpen: shouldBeOpen, openingHours: data.openingHours } : null);
                      }
                    }
                  }, (error) => {
                    console.error('WorkingHoursSettings güncelleme sonrası hata:', error);
                  });

                  setTimeout(() => unsubscribe(), 1000);
                }
              }}
            />
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100 p-4">
                <CardTitle className="flex items-center text-green-900 text-lg">
                  <CreditCard className="h-5 w-5 mr-3 text-green-600" />
                  Ödeme ve Teslimat Ayarları
                </CardTitle>
                <CardDescription className="text-green-700 text-sm">
                  Ödeme yöntemleri ve teslimat ücretlerinizi yönetin
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-6">
                {/* Ödeme Yöntemleri */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 mb-3">Kabul Edilen Ödeme Yöntemleri</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-bold text-sm">₺</span>
                          </div>
                          <div>
                            <Label htmlFor="cash" className="font-medium text-gray-900">Nakit Ödeme</Label>
                            <p className="text-xs text-gray-500">Kapıda nakit kabul</p>
                          </div>
                        </div>
                        <Switch
                          id="cash"
                          checked={paymentSettings.acceptCash}
                          onCheckedChange={(checked) => handlePaymentMethodChange('acceptCash', checked)}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <Label htmlFor="card" className="font-medium text-gray-900">Kart ile Ödeme</Label>
                            <p className="text-xs text-gray-500">POS cihazı ile</p>
                          </div>
                        </div>
                        <Switch
                          id="card"
                          checked={paymentSettings.acceptCard}
                          onCheckedChange={(checked) => handlePaymentMethodChange('acceptCard', checked)}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-bold text-sm">₺</span>
                          </div>
                          <div>
                            <Label htmlFor="online" className="font-medium text-gray-900">Online Ödeme</Label>
                            <p className="text-xs text-gray-500">Mobil uygulama</p>
                          </div>
                        </div>
                        <Switch
                          id="online"
                          checked={paymentSettings.acceptOnline}
                          onCheckedChange={(checked) => handlePaymentMethodChange('acceptOnline', checked)}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Teslimat Ücretleri */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 mb-3">Teslimat Ücretleri</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label htmlFor="deliveryFee" className="text-sm font-medium text-gray-700">Standart Teslimat Ücreti</Label>
                        <div className="relative">
                          <Input
                            id="deliveryFee"
                            type="number"
                            step="0.01"
                            value={paymentSettings.deliveryFee}
                            onChange={(e) => setPaymentSettings(prev => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))}
                            onBlur={autoSave}
                            className="h-12 pl-4 pr-12 text-lg"
                            placeholder="0.00"
                          />
                          <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-lg font-medium text-gray-500">₺</span>
                        </div>
                        <p className="text-xs text-gray-500">Her teslimat için alınacak ücret</p>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="freeDelivery" className="text-sm font-medium text-gray-700">Ücretsiz Teslimat Eşiği</Label>
                        <div className="relative">
                          <Input
                            id="freeDelivery"
                            type="number"
                            step="0.01"
                            value={paymentSettings.freeDeliveryThreshold}
                            onChange={(e) => setPaymentSettings(prev => ({ ...prev, freeDeliveryThreshold: parseFloat(e.target.value) || 0 }))}
                            onBlur={autoSave}
                            className="h-12 pl-4 pr-12 text-lg"
                            placeholder="0.00"
                          />
                          <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-lg font-medium text-gray-500">₺</span>
                        </div>
                        <p className="text-xs text-gray-500">Bu tutar üstü siparişlerde ücretsiz teslimat</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">
                    <strong>💡 İpucu:</strong> Farklı ödeme yöntemleri sunarak müşteri memnuniyetini artırabilirsiniz.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="service-area" className="space-y-4">
            <div className="flex items-center justify-center min-h-[400px]">
              <Button
                onClick={() => setIsServiceAreaDrawerOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
              >
                <MapPin className="h-6 w-6 mr-3" />
                Hizmet Alanını Yönet
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-gray-100 p-4">
                <CardTitle className="flex items-center text-red-900 text-lg">
                  <Shield className="h-5 w-5 mr-3 text-red-600" />
                  Güvenlik ve Hesap Yönetimi
                </CardTitle>
                <CardDescription className="text-red-700 text-sm">
                  Hesabınızın güvenliğini yönetin ve önemli ayarları yapın
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-6">
                {/* Şifre Değiştirme */}
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        🔒
                      </span>
                      Şifre Değiştir
                    </h4>
                    <div className="grid grid-cols-1 gap-3 max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">Mevcut Şifre</Label>
                        <Input id="currentPassword" type="password" className="h-11" placeholder="Mevcut şifrenizi girin" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">Yeni Şifre</Label>
                        <Input id="newPassword" type="password" className="h-11" placeholder="Yeni şifre oluşturun" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Yeni Şifre (Tekrar)</Label>
                        <Input id="confirmPassword" type="password" className="h-11" placeholder="Yeni şifreyi tekrar girin" />
                      </div>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11">
                        Şifre Değiştir
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />

                {/*
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        🛡️
                      </span>
                      İki Faktörlü Doğrulama
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-base font-medium text-gray-900">İki Faktörlü Doğrulama</Label>
                        <p className="text-sm text-gray-600 mt-1">Hesabınızı daha güvenli hale getirin ve ekstra koruma katmanı ekleyin</p>
                      </div>
                      <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
                        Etkinleştir
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />
                */}

                <div className="mt-8 p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800">
                    <strong>🔐 Güvenlik İpuçları:</strong> Düzenli şifre değişikliği ve iki faktörlü doğrulama kullanarak hesabınızı koruyun.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* DragDrawer Component */}
        <DragDrawer
          isServiceAreaDrawerOpen={isServiceAreaDrawerOpen}
          setIsServiceAreaDrawerOpen={setIsServiceAreaDrawerOpen}
          regions={regions}
          setRegions={setRegions}
          restaurant={restaurant}
          isLoaded={isLoaded}
          loadError={!!loadError}
          mapCenter={mapCenter}
        />
      </div>
    </div>
  );
}