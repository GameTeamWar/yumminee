"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfileByEmailAndRole, createShopUser, getRestaurantByOwnerId, createRestaurant } from '@/lib/firebase/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { GeoPoint } from 'firebase/firestore';
import { Label } from '@/components/ui/label';

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
  cuisine: z.array(z.string()).min(1, 'En az 1 mutfak türü seçmelisiniz').max(3, 'En fazla 3 mutfak türü seçebilirsiniz'),
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

export default function ShopLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp, user } = useAuth();

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
      cuisine: [],
      website: '',
      instagram: '',
      address: '',
      taxNumber: '',
      taxOffice: '',
      tradeRegistryNumber: '',
    },
  });

  // URL parametresine göre mod belirleme
  useEffect(() => {
    const mode = searchParams.get('mode');
    setIsRegisterMode(mode === 'register');
  }, [searchParams]);

  // Kullanıcı zaten giriş yapmışsa panele yönlendir
  useEffect(() => {
    if (user && user.uid) {
      // Restoranı bul ve dashboard'a yönlendir
      getRestaurantByOwnerId(user.uid).then((restaurant) => {
        if (restaurant) {
          router.push(`/shop?panel=${restaurant.id}`);
        } else {
          router.push('/shop');
        }
      }).catch((error) => {
        console.error('Restoran kontrol hatası:', error);
        router.push('/shop');
      });
    }
  }, [user, router]);

  // Mod değiştiğinde URL'yi güncelle
  const toggleMode = () => {
    const newMode = !isRegisterMode;
    setIsRegisterMode(newMode);
    const newUrl = newMode ? '/shop-login?mode=register' : '/shop-login';
    router.replace(newUrl, { scroll: false });
  };

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      
      // Bu role için kullanıcı profili var mı kontrol et
      const userProfile = await getUserProfileByEmailAndRole(data.email, 'restaurant');
      
      if (!userProfile) {
        toast.error('Bu e-posta adresi ile restoran sahibi hesabı bulunmuyor. Lütfen doğru bilgileri girdiğinizdan emin olun veya hesap oluşturun.');
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
    try {
      setIsLoading(true);
      
      // E-posta ile mevcut kullanıcı var mı kontrol et
      const existingProfile = await getUserProfileByEmailAndRole(data.email, 'restaurant');
      if (existingProfile) {
        toast.error('Bu e-posta adresı ile zaten kayıtlı bir hesap bulunuyor.');
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
        cuisine: data.cuisine,
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
      fieldsToValidate = ['restaurantName', 'phone', 'cuisine'];
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
              {isRegisterMode ? 'Yummine Restoran Kayıt' : 'Yummine Restoran Girişi'}
            </h1>
          </div>
          
          <div className="w-full">
              {!isRegisterMode ? (
                // Giriş Formu
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
                  
                  <div className="text-right">
                    <Link href="/shop?mode=forgot-password" className="text-sm text-orange-600 hover:underline">
                      Şifremi Unuttum
                    </Link>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-orange-600 hover:bg-orange-700" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                  </Button>
                </form>
              </Form>
              ) : (
                // Kayıt Formu - Step-by-step
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

                          <FormField
                            control={registerForm.control}
                            name="cuisine"
                            render={({ field }) => (
                              <FormItem>
                                <div className="space-y-3">
                                  <Label className="text-sm font-medium">Mutfak Türleri (En az 1, en fazla 3)</Label>
                                  <div className="grid grid-cols-2 gap-3">
                                    {{
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
                                    }.map((cuisineType) => (
                                      <div key={cuisineType} className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id={`cuisine-${cuisineType}`}
                                          checked={field.value?.includes(cuisineType) || false}
                                          onChange={(e) => {
                                            const currentValues = field.value || [];
                                            if (e.target.checked) {
                                              if (currentValues.length < 3) {
                                                field.onChange([...currentValues, cuisineType]);
                                              }
                                            } else {
                                              field.onChange(currentValues.filter(v => v !== cuisineType));
                                            }
                                          }}
                                          disabled={isLoading}
                                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                        />
                                        <Label
                                          htmlFor={`cuisine-${cuisineType}`}
                                          className="text-sm font-normal cursor-pointer"
                                        >
                                          {cuisineType}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    Seçili: {field.value?.length || 0}/3
                                  </p>
                                </div>
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
              )}
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              {!isRegisterMode ? (
                <>
                  Henüz hesabınız yok mu? {' '}
                  <button 
                    onClick={toggleMode}
                    className="text-orange-600 font-medium hover:underline"
                  >
                    Hesap Oluştur
                  </button>
                </>
              ) : (
                <>
                  Zaten hesabınız var mı? {' '}
                  <button 
                    onClick={toggleMode}
                    className="text-orange-600 font-medium hover:underline"
                  >
                    Giriş Yap
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}