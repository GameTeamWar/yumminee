"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import {
  ChefHat,
  Clock,
  DollarSign,
  Package,
  Star,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Truck,
  Eye,
  Search,
  Plus,
  Store,
  BarChart3,
  Settings,
  Menu,
  Shield,
  Zap,
  Target,
  Award,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRestaurantByOwnerId, subscribeToRestaurantOrders, getUserProfileByCustomId, createUserProfile, getUserProfileByEmailAndRole, createRestaurant, createShopUser } from '@/lib/firebase/db';
import { Order as DBOrder, Shop } from '@/types';
import { GeoPoint } from 'firebase/firestore';

// Login ve Register için schema'lar
const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

const registerSchema = z.object({
  // Step 1: Kişisel Bilgiler
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  confirmPassword: z.string().min(6, 'Şifre tekrarı en az 6 karakter olmalıdır'),
  
  // Step 2: Restoran Temel Bilgileri
  restaurantName: z.string().min(2, 'Restoran adı en az 2 karakter olmalıdır'),
  description: z.string().optional(),
  phone: z.string().min(10, 'Geçerli bir telefon numarası giriniz'),
  website: z.string().url('Geçerli bir website adresi giriniz').optional().or(z.literal('')),
  instagram: z.string().optional(),
  
  // Step 3: Konum ve İş Bilgileri
  address: z.string().min(5, 'Adres en az 5 karakter olmalıdır'),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  tradeRegistryNumber: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

const mockRecentOrders = [
  {
    id: 'ORD-001',
    orderNumber: '#12345',
    customer: 'Ahmet Yılmaz',
    items: ['Pizza Margherita', 'Coca Cola'],
    itemCount: 2,
    total: 45.00,
    status: 'pending',
    time: '14:30',
    date: '2025-10-13',
    address: 'Kadıköy, İstanbul'
  },
  {
    id: 'ORD-002',
    orderNumber: '#12346',
    customer: 'Ayşe Kaya',
    items: ['Burger Menü', 'Patates Kızartması'],
    itemCount: 2,
    total: 32.50,
    status: 'preparing',
    time: '14:15',
    date: '2025-10-13',
    address: 'Beşiktaş, İstanbul'
  },
  {
    id: 'ORD-003',
    orderNumber: '#12347',
    customer: 'Mehmet Demir',
    items: ['Lahmacun', 'Ayran'],
    itemCount: 2,
    total: 28.00,
    status: 'ready',
    time: '13:45',
    date: '2025-10-13',
    address: 'Üsküdar, İstanbul'
  },
  {
    id: 'ORD-004',
    orderNumber: '#12348',
    customer: 'Zeynep Aydın',
    items: ['Döner', 'Ayran'],
    itemCount: 2,
    total: 35.00,
    status: 'delivering',
    time: '13:30',
    date: '2025-10-13',
    address: 'Şişli, İstanbul'
  },
  {
    id: 'ORD-005',
    orderNumber: '#12349',
    customer: 'Can Özkan',
    items: ['Mantı', 'Salata'],
    itemCount: 2,
    total: 42.00,
    status: 'delivered',
    time: '13:00',
    date: '2025-10-13',
    address: 'Sarıyer, İstanbul'
  },
  {
    id: 'ORD-006',
    orderNumber: '#12350',
    customer: 'Fatma Güneş',
    items: ['Kebap', 'Pilav'],
    itemCount: 2,
    total: 55.00,
    status: 'delivered',
    time: '12:30',
    date: '2025-10-12',
    address: 'Beyoğlu, İstanbul'
  },
  {
    id: 'ORD-007',
    orderNumber: '#12351',
    customer: 'Ali Kara',
    items: ['Çorba', 'Salata'],
    itemCount: 2,
    total: 25.00,
    status: 'cancelled',
    time: '11:45',
    date: '2025-10-13',
    address: 'Maltepe, İstanbul'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'ready': return 'bg-green-100 text-green-800 border-green-200';
    case 'delivering': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'canceled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'Yeni';
    case 'accepted': return 'Hazırlanıyor';
    case 'ready': return 'Hazır';
    case 'delivering': return 'Yolda';
    case 'completed': return 'Teslim Edildi';
    case 'canceled': return 'İptal';
    default: return status;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return <Clock className="h-4 w-4" />;
    case 'accepted': return <ChefHat className="h-4 w-4" />;
    case 'ready': return <CheckCircle className="h-4 w-4" />;
    case 'delivering': return <Truck className="h-4 w-4" />;
    case 'completed': return <CheckCircle className="h-4 w-4" />;
    case 'canceled': return <XCircle className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

export default function ShopPage() {
  const [restaurant, setRestaurant] = useState<Shop | null>(null);
  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    averageRating: 0,
    pendingOrders: 0,
    activeOrders: 0
  });
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const panelId = searchParams.get('panel');
  const mode = searchParams.get('mode');

  // Login/Register form states
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const { signIn, signUp, resetPassword } = useAuth();

  // Form hooks
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      restaurantName: '',
      description: '',
      phone: '',
      website: '',
      instagram: '',
      address: '',
      taxNumber: '',
      taxOffice: '',
      tradeRegistryNumber: '',
    },
  });

  // Panel parametresi varsa dashboard göster, mode varsa auth formu, yoksa tanıtım sayfası
  const isDashboard = !!panelId;
  const isAuthMode = mode === 'login' || mode === 'register' || mode === 'forgot-password';
  const isRegisterMode = mode === 'register';
  const isForgotPasswordMode = mode === 'forgot-password';

  // Mod değiştiğinde URL'yi güncelle
  const toggleMode = () => {
    const newMode = mode === 'register' ? 'login' : 'register';
    const newUrl = `/shop?mode=${newMode}`;
    router.replace(newUrl, { scroll: false });
  };

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      
      // Bu role için kullanıcı profili var mı kontrol et
      const userProfile = await getUserProfileByEmailAndRole(data.email, 'restaurant');
      
      if (!userProfile) {
        toast.error('Bu e-posta adresi ile müşteri hesabı bulunmuyor. Lütfen doğru bilgileri girdiğinizdan emin olun veya hesap oluşturun.');
        return;
      }
      
      const user = await signIn(data.email, data.password, 'restaurant');
      toast.success('Başarıyla giriş yapıldı');
      
      // Restoranı bul ve dashboard'a yönlendir
      const restaurant = await getRestaurantByOwnerId(user.uid);
      if (restaurant) {
        router.push(`/shop?panel=${restaurant.id}`);
      } else {
        router.push('/shop');
      }
      router.refresh();
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Giriş yapılamadı: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    // Şifre eşleşmesi kontrolü
    if (data.password !== data.confirmPassword) {
      toast.error('Şifreler eşleşmiyor. Lütfen aynı şifreyi girdiğinizden emin olun.');
      return;
    }

    try {
      setIsLoading(true);
      
      // E-posta ile mevcut kullanıcı var mı kontrol et
      const existingProfile = await getUserProfileByEmailAndRole(data.email, 'restaurant');
      if (existingProfile) {
        toast.error('Bu e-posta adresi ile zaten kayıtlı bir hesap bulunuyor.');
        return;
      }

      // Hesap oluştur
      const user = await signUp(data.email, data.password, 'restaurant');
      
      // Kullanıcı profilini oluştur (shop user olarak)
      await createShopUser(user.uid, {
        displayName: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phoneNumber: data.phone,
        businessName: data.restaurantName,
        businessType: 'restaurant',
        isVerified: false,
        isActive: true
      });

      // Restoran oluştur
      await createRestaurant(user.uid, {
        name: data.restaurantName,
        email: data.email,
        phoneNumber: data.phone,
        phone: data.phone,
        address: data.address,
        image: '/images/restaurants/default.jpg',
        description: data.description || '',
        cuisine: [],
        categories: [],
        rating: 0,
        reviewCount: 0,
        serviceRadius: 5,
        deliveryTime: 30,
        minimumOrderAmount: 25,
        isOpen: true,
        openingHours: {},
        deliveryFee: 0,
        estimatedDeliveryTime: 30,
        totalReviews: 0,
        isActive: true,
        location: new GeoPoint(41.0082, 28.9784),
      });

      toast.success('Hesabınız ve restoranınız başarıyla oluşturuldu!');
      router.push('/shop');
      router.refresh();
    } catch (error: any) {
      console.error('Register error:', error);
      toast.error('Kayıt olunurken hata: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof RegisterFormValues)[] = [];

    if (registerStep === 1) {
      fieldsToValidate = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
    } else if (registerStep === 2) {
      fieldsToValidate = ['restaurantName', 'phone'];
    } else if (registerStep === 3) {
      fieldsToValidate = ['address'];
    }

    const isValid = await registerForm.trigger(fieldsToValidate);
    if (isValid) {
      setRegisterStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setRegisterStep(prev => Math.max(prev - 1, 1));
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Restoran ve sipariş verilerini yükle (sadece dashboard için)
  useEffect(() => {
    if (!isDashboard || !user?.uid) return;

    const loadRestaurantAndOrders = async () => {
      try {
        // Restoranı getir
        const restaurantData = await getRestaurantByOwnerId(user.uid);
        if (!restaurantData) {
          // Restoran bulunamadı, ayarlar sayfasına yönlendir
          router.push('/shop/settings');
          return;
        }
        setRestaurant(restaurantData);

        // Siparişleri gerçek zamanlı dinle
        const unsubscribe = subscribeToRestaurantOrders(restaurantData.id, (ordersData) => {
          setOrders(ordersData);

          // İstatistikleri hesapla
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          const todayOrders = ordersData.filter(order => {
            const orderDate = order.createdAt.toDate();
            return orderDate >= today;
          });

          const totalRevenue = ordersData
            .filter(order => order.status === 'delivered')
            .reduce((sum, order) => sum + order.total, 0);

          const pendingOrders = ordersData.filter(order => order.status === 'pending').length;
          const activeOrders = ordersData.filter(order =>
            ['accepted', 'ready', 'delivering'].includes(order.status)
          ).length;

          setStats({
            totalOrders: ordersData.length,
            todayOrders: todayOrders.length,
            totalRevenue,
            averageRating: restaurantData.rating || 0,
            pendingOrders,
            activeOrders
          });

          // Müşteri isimlerini getir
          const uniqueUserIds = [...new Set(ordersData.map(order => order.userId))].filter(userId =>
            userId && typeof userId === 'string' && userId.trim() !== ''
          );
          uniqueUserIds.forEach(async (userId) => {
            if (!customerNames[userId]) {
              try {
                const userProfile = await getUserProfileByCustomId(userId);
                setCustomerNames(prev => ({
                  ...prev,
                  [userId]: userProfile?.displayName || 'Bilinmeyen Müşteri'
                }));
              } catch (error) {
                console.error('Müşteri bilgisi alınamadı:', error);
                setCustomerNames(prev => ({
                  ...prev,
                  [userId]: 'Bilinmeyen Müşteri'
                }));
              }
            }
          });
        });

        return unsubscribe;
      } catch (error) {
        console.error('Restoran bilgileri yüklenirken hata:', error);
      }
    };

    loadRestaurantAndOrders();
  }, [user, router, isDashboard]);

  const filteredOrders = orders
    .filter(order => selectedTab === 'all' || order.status === selectedTab)
    .filter(order =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customerNames[order.userId] && customerNames[order.userId].toLowerCase().includes(searchTerm.toLowerCase())) ||
      order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      order.address?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(order => {
      const orderDate = order.createdAt.toDate();
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day
      return orderDate >= start && orderDate <= end;
    });

  const getTabCount = (status: string) => {
    return orders
      .filter(order => status === 'all' || order.status === status)
      .filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customerNames[order.userId] && customerNames[order.userId].toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.address?.toLowerCase().includes(searchTerm.toLowerCase())
      ).length;
  };

  // Auth formu
  if (isAuthMode) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        {/* Sol kısım - Görsel Alan */}
        <div className="w-full md:w-3/5 bg-gray-100 relative overflow-hidden hidden md:block">
          <div className="absolute inset-0 bg-orange-50 flex items-center justify-center">
            <div className="max-w-md p-8">
              <div className="relative mx-auto w-64 h-[500px]">
                {/* Animasyonlu yemek ikonları */}
                <div className="absolute -right-4 -bottom-10 w-40 h-40 bg-orange-300 rounded-full flex items-center justify-center animate-bounce">
                  <span className="text-4xl">🍔</span>
                </div>
                <div className="absolute -left-16 top-10 w-32 h-32 bg-orange-200 rounded-full flex items-center justify-center animate-bounce" style={{animationDelay: "0.5s"}}>
                  <span className="text-4xl">🍟</span>
                </div>
                <div className="absolute left-10 bottom-32 w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center animate-bounce" style={{animationDelay: "1s"}}>
                  <span className="text-2xl">🍕</span>
                </div>
                
                <div className="relative mx-auto">
                {/*   <img 
                    src="/images/customer-app-mockup.png" 
                    alt="Müşteri Uygulaması" 
                    className="w-full h-full object-contain z-10 relative"
                  />*/}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sağ kısım - Giriş Formu */}
        <div className="w-full md:w-2/5 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <img src="/images/logo.png" alt="Yummine Logo" className="h-12" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Yummine Restoran Paneli
              </h1>
            </div>
            
            <div className="w-full">
              {mode === 'login' && (
                <div className="mt-6">
                  {/* Giriş Formu */}
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder="E-Posta" 
                                type="email" 
                                autoComplete="email"
                                disabled={isLoading}
                                className="h-12"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="relative">
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  placeholder="Şifre" 
                                  type={showPassword ? "text" : "password"} 
                                  autoComplete="current-password"
                                  disabled={isLoading}
                                  className="h-12 pr-10"
                                  {...field} 
                                />
                                <button
                                  type="button"
                                  onClick={togglePasswordVisibility}
                                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                >
                                  {showPassword ? (
                                    <EyeOffIcon className="h-5 w-5" />
                                  ) : (
                                    <EyeIcon className="h-5 w-5" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full h-12 bg-orange-600 hover:bg-orange-700" 
                        disabled={isLoading}
                      >
                        {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                      </Button>
                    </form>
                  </Form>
                  <div className="mt-6 text-center space-y-2">
                    <p className="text-sm text-gray-600">
                      Hesabınız yok mu? <Link href="/shop?mode=register" className="text-orange-600 hover:underline font-medium">Kayıt olun</Link>
                    </p>
                    <p className="text-sm text-gray-600">
                      <Link href="/shop?mode=forgot-password" className="text-orange-600 hover:underline font-medium">Şifremi unuttum</Link>
                    </p>
                  </div>
                </div>
              )}

              {mode === 'register' && (
                <div className="mt-6">
                  {/* Kayıt Formu - Step-by-step */}
                  <div className="w-full">
                    {/* Step Indicator */}
                    <div className="flex items-center justify-center mb-8">
                      <div className="flex items-center space-x-4">
                        {[1, 2, 3].map((step) => (
                          <div key={step} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              step <= registerStep
                                ? 'bg-orange-600 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {step}
                            </div>
                            {step < 3 && (
                              <div className={`w-12 h-0.5 mx-2 ${
                                step < registerStep ? 'bg-orange-600' : 'bg-gray-200'
                              }`} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
                        {/* Step 1: Kişisel Bilgiler */}
                        {registerStep === 1 && (
                          <div className="space-y-6">
                            <div className="text-center mb-6">
                              <h3 className="text-lg font-semibold text-gray-900">Kişisel Bilgiler</h3>
                              <p className="text-sm text-gray-600">Hesap bilgilerinizi girin</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={registerForm.control}
                                name="firstName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        placeholder="Ad"
                                        disabled={isLoading}
                                        className="h-12"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={registerForm.control}
                                name="lastName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        placeholder="Soyad"
                                        disabled={isLoading}
                                        className="h-12"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={registerForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder="E-Posta"
                                      type="email"
                                      autoComplete="email"
                                      disabled={isLoading}
                                      className="h-12"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={registerForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem className="relative">
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        placeholder="Şifre"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        disabled={isLoading}
                                        className="h-12 pr-10"
                                        {...field}
                                      />
                                      <button
                                        type="button"
                                        onClick={togglePasswordVisibility}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                      >
                                        {showPassword ? (
                                          <EyeOffIcon className="h-5 w-5" />
                                        ) : (
                                          <EyeIcon className="h-5 w-5" />
                                        )}
                                      </button>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={registerForm.control}
                              name="confirmPassword"
                              render={({ field }) => (
                                <FormItem className="relative">
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        placeholder="Şifre Tekrarı"
                                        type={showConfirmPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        disabled={isLoading}
                                        className="h-12 pr-10"
                                        {...field}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                      >
                                        {showConfirmPassword ? (
                                          <EyeOffIcon className="h-5 w-5" />
                                        ) : (
                                          <EyeIcon className="h-5 w-5" />
                                        )}
                                      </button>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        {/* Step 2: Restoran Temel Bilgileri */}
                        {registerStep === 2 && (
                          <div className="space-y-6">
                            <div className="text-center mb-6">
                              <h3 className="text-lg font-semibold text-gray-900">Restoran Temel Bilgileri</h3>
                              <p className="text-sm text-gray-600">Restoranınızın bilgilerini girin</p>
                            </div>

                            <FormField
                              control={registerForm.control}
                              name="restaurantName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder="Restoran Adı"
                                      disabled={isLoading}
                                      className="h-12"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={registerForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <textarea
                                      placeholder="Restoranınız hakkında kısa bir açıklama..."
                                      disabled={isLoading}
                                      rows={3}
                                      className="w-full px-3 py-2 h-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                                      {...field}
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={registerForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder="Telefon (05XX XXX XX XX)"
                                      disabled={isLoading}
                                      className="h-12"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={registerForm.control}
                                name="website"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        placeholder="Website (İsteğe bağlı)"
                                        disabled={isLoading}
                                        className="h-12"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={registerForm.control}
                                name="instagram"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        placeholder="Instagram (@kullaniciadi)"
                                        disabled={isLoading}
                                        className="h-12"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}

                        {/* Step 3: Konum ve İş Bilgileri */}
                        {registerStep === 3 && (
                          <div className="space-y-6">
                            <div className="text-center mb-6">
                              <h3 className="text-lg font-semibold text-gray-900">Konum ve İş Bilgileri</h3>
                              <p className="text-sm text-gray-600">Restoranınızın adresini ve iş bilgilerini girin</p>
                            </div>

                            <FormField
                              control={registerForm.control}
                              name="address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <textarea
                                      placeholder="Örn: Bağdat Cad. No:123, Kadıköy/İstanbul"
                                      disabled={isLoading}
                                      rows={3}
                                      className="w-full px-3 py-2 h-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                                      {...field}
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <p className="text-sm text-blue-800">
                                <strong>Bilgilendirme:</strong> Kayıt işlemini tamamladıktan sonra restoran ayarlarınızda daha detaylı konum bilgilerini ekleyebilirsiniz.
                              </p>
                            </div>

                            <div className="border-t pt-6">
                              <h4 className="text-md font-medium text-gray-900 mb-4">İş Bilgileri (İsteğe bağlı)</h4>
                              <p className="text-sm text-gray-600 mb-4">Bu bilgileri daha sonra da ekleyebilirsiniz.</p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={registerForm.control}
                                  name="taxNumber"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          placeholder="Vergi Numarası"
                                          disabled={isLoading}
                                          className="h-12"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={registerForm.control}
                                  name="taxOffice"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          placeholder="Vergi Dairesi"
                                          disabled={isLoading}
                                          className="h-12"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <FormField
                                control={registerForm.control}
                                name="tradeRegistryNumber"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        placeholder="Ticaret Sicil Numarası"
                                        disabled={isLoading}
                                        className="h-12"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between pt-6">
                          {registerStep > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={prevStep}
                              disabled={isLoading}
                              className="flex-1 mr-2"
                            >
                              Geri
                            </Button>
                          )}

                          {registerStep < 3 ? (
                            <Button
                              type="button"
                              onClick={nextStep}
                              disabled={isLoading}
                              className="flex-1 ml-2 bg-orange-600 hover:bg-orange-700"
                            >
                              İleri
                            </Button>
                          ) : (
                            <Button
                              type="submit"
                              disabled={isLoading}
                              className="flex-1 ml-2 bg-orange-600 hover:bg-orange-700"
                            >
                              {isLoading ? 'Kaydediliyor...' : 'Kayıt Ol'}
                            </Button>
                          )}
                        </div>
                      </form>
                    </Form>
                  </div>
                  <div className="mt-6 text-center space-y-2">
                    <p className="text-sm text-gray-600">
                      Zaten hesabınız var mı? <Link href="/shop?mode=login" className="text-orange-600 hover:underline font-medium">Giriş yapın</Link>
                    </p>
                    <p className="text-sm text-gray-600">
                      <Link href="/shop?mode=forgot-password" className="text-orange-600 hover:underline font-medium">Şifremi unuttum</Link>
                    </p>
                  </div>
                </div>
              )}

              {mode === 'forgot-password' && (
                <div className="mt-6">
                  {/* Şifre Sıfırlama Formu */}
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Şifremi Unuttum</h3>
                      <p className="text-sm text-gray-600">
                        Şifre yenileme bağlantısını sana gönderebilmemiz için e-posta adresinize ihtiyacımız var.
                      </p>
                    </div>

                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(async (data) => {
                        try {
                          setIsLoading(true);
                          await resetPassword(data.email);
                          toast.success('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi');
                          loginForm.reset();
                        } catch (error: any) {
                          console.error('Password reset error:', error);
                          toast.error('Şifre sıfırlama bağlantısı gönderilemedi: ' + (error.message || 'Bilinmeyen hata'));
                        } finally {
                          setIsLoading(false);
                        }
                      })} className="space-y-6">
                        <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="E-posta adresinizi girin" 
                                  type="email" 
                                  autoComplete="email"
                                  disabled={isLoading}
                                  className="h-12"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full h-12 bg-orange-600 hover:bg-orange-700" 
                          disabled={isLoading}
                        >
                          {isLoading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Bağlantısı Gönder'}
                        </Button>
                      </form>
                    </Form>
                  </div>
                  <div className="mt-6 text-center space-y-2">
                    <p className="text-sm text-gray-600">
                      Hesabınız yok mu? <Link href="/shop?mode=register" className="text-orange-600 hover:underline font-medium">Kayıt olun</Link>
                    </p>
                    <p className="text-sm text-gray-600">
                      Zaten hesabınız var mı? <Link href="/shop?mode=login" className="text-orange-600 hover:underline font-medium">Giriş yapın</Link>
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Hesabınızla ilgili sorun mu yaşıyorsunuz? Destek ekibimizle iletişime geçin.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tanıtım sayfası
  if (!isDashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
        {/* Hero Section */}
        <section className="relative py-20 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-orange-100 rounded-full">
                <Store className="h-16 w-16 text-orange-600" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Restoranınızı <span className="text-orange-600">Yummine</span>'de Açın
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Binlerce müşteriye ulaşın, siparişlerinizi kolayca yönetin, gelirinizi artırın.
              Yummine ile restoran işletmenizi dijitalleştirin.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 text-lg"
                onClick={() => router.push('/shop?mode=register')}
              >
                Ücretsiz Başlayın <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-orange-600 text-orange-600 hover:bg-orange-50 px-8 py-4 text-lg"
                onClick={() => router.push('/shop?mode=login')}
              >
                Zaten Hesabım Var
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Restoranınız İçin Neler Sunuyoruz?
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Modern teknolojilerle restoran işletmenizi kolaylaştırıyoruz
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="p-4 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">Detaylı Raporlar</h3>
                  <p className="text-gray-600">
                    Satış raporlarınızı anlık takip edin, gelir analizi yapın, müşteri davranışlarını inceleyin.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="p-4 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Menu className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">Kolay Menü Yönetimi</h3>
                  <p className="text-gray-600">
                    Menünüzü dijital ortamda kolayca düzenleyin, fiyatları güncelleyin, yeni ürünler ekleyin.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="p-4 bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">Müşteri Yönetimi</h3>
                  <p className="text-gray-600">
                    Müşteri bilgilerini takip edin, sipariş geçmişlerini görün, özel kampanyalar düzenleyin.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="p-4 bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Zap className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">Hızlı Sipariş İşleme</h3>
                  <p className="text-gray-600">
                    Gelen siparişleri anında görün, hazırlık sürelerini takip edin, teslimatları organize edin.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="p-4 bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">Güvenli Ödeme</h3>
                  <p className="text-gray-600">
                    PCI DSS uyumlu güvenli ödeme sistemi ile müşteri ödemelerini güvenle alın.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="p-4 bg-indigo-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Target className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">Hedef Kitlenize Ulaşın</h3>
                  <p className="text-gray-600">
                    Binlerce aç müşteriye ulaşın, restoranınızı tanıtın, markanızı büyütün.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 px-4 bg-orange-600 text-white">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-16">
              Yummine Restoranları
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">500+</div>
                <div className="text-orange-100">Aktif Restoran</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">50K+</div>
                <div className="text-orange-100">Günlük Sipariş</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">4.8</div>
                <div className="text-orange-100">Ortalama Puan</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">2M+</div>
                <div className="text-orange-100">Mutlu Müşteri</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <Award className="h-16 w-16 text-orange-500 mx-auto mb-8" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Restoranınızı Bugün Kaydedin
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Ücretsiz başlayın, komisyon alın, müşterilerinize en iyi hizmeti verin.
            </p>
            <Button
              size="lg"
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 text-lg"
              onClick={() => router.push('/shop?mode=register')}
            >
              Hemen Başlayın <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      </div>
    );
  }

  // Dashboard (panel parametresi varsa)
  return (
    <div className="p-6 space-y-6 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{restaurant?.name} - Siparişler</h1>
          <p className="text-gray-600">Siparişlerinizi yönetin ve takip edin</p>
        </div>
        <Button
          className="bg-orange-500 hover:bg-orange-600"
          onClick={() => router.push('/shop/dashboard/create-order')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Özel Sipariş Oluştur
        </Button>
      </div>

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Sipariş numarası, müşteri adı, ürün veya adres ile ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white border-gray-200"
        />
      </div>

      {/* Tarih Filtreleme */}
      <div className="flex items-center space-x-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Başlangıç:</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Bitiş:</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const today = new Date().toISOString().split('T')[0];
            setStartDate(today);
            setEndDate(today);
          }}
          className="ml-2"
        >
          Bugün
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 bg-white border border-gray-200">
          <TabsTrigger value="all" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            Tümü ({getTabCount('all')})
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            Yeni ({getTabCount('pending')})
          </TabsTrigger>
          <TabsTrigger value="accepted" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            Hazırlanıyor ({getTabCount('confirmed')})
          </TabsTrigger>
          <TabsTrigger value="ready" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            Hazır ({getTabCount('ready')})
          </TabsTrigger>
          <TabsTrigger value="delivering" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            Yolda ({getTabCount('delivering')})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            Teslim Edildi ({getTabCount('completed')})
          </TabsTrigger>
          <TabsTrigger value="canceled" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            İptal Edildi ({getTabCount('canceled')})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Sipariş Listesi */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sipariş Bulunamadı</h3>
              <p className="text-gray-500">Bu kategoride henüz sipariş bulunmuyor.</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  {/* Sol Taraf - Sipariş Bilgileri */}
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Sipariş Numarası */}
                    <div className="bg-gray-100 rounded-lg p-4 text-center min-w-[80px]">
                      <div className="text-xs text-gray-500 mb-1">Sipariş No</div>
                      <div className="text-sm font-bold text-gray-900">{order.id}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {order.createdAt.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.createdAt.toDate().toLocaleDateString('tr-TR')}
                      </div>
                    </div>

                    {/* Müşteri ve Ürün Bilgileri */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {customerNames[order.userId] || (order.userId && typeof order.userId === 'string' && order.userId.trim() !== '' ? 'Yükleniyor...' : 'Bilinmeyen Müşteri')}
                        </h3>
                        <Badge className={`${getStatusColor(order.status)} border flex items-center space-x-1`}>
                          {getStatusIcon(order.status)}
                          <span>{getStatusText(order.status)}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {order.items.map(item => item.name).join(', ')} ({order.items.length} ürün)
                      </p>
                      <p className="text-xs text-gray-500 flex items-center">
                        <Package className="h-3 w-3 mr-1" />
                        {order.address}
                      </p>
                    </div>
                  </div>

                  {/* Sağ Taraf - Tutar ve İşlemler */}
                  <div className="flex items-center space-x-4 ml-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">Tutar</div>
                      <div className="text-xl font-bold text-green-600">₺{order.total.toFixed(2)}</div>
                    </div>

                    {/* İşlem Butonları */}
                    <div className="flex flex-col space-y-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        Detay
                      </Button>
                      {order.status === 'pending' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Onayla
                        </Button>
                      )}
                      {order.status === 'confirmed' && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Hazır
                        </Button>
                      )}
                      {order.status === 'ready' && (
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          <Truck className="h-4 w-4 mr-1" />
                          Kurye Çağır
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}