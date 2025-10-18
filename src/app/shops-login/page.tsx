"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfileByEmailAndRole, createUserProfile } from '@/lib/firebase/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EyeIcon, EyeOffIcon } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

const registerSchema = z.object({
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  confirmPassword: z.string().min(6, 'Şifre tekrarı en az 6 karakter olmalıdır'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function ShopsLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp } = useAuth();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // URL parametresine göre mod belirleme
  useEffect(() => {
    const mode = searchParams.get('mode');
    setIsRegisterMode(mode === 'register');
  }, [searchParams]);

  // Mod değiştiğinde URL'yi güncelle
  const toggleMode = () => {
    const newMode = !isRegisterMode;
    setIsRegisterMode(newMode);
    const newUrl = newMode ? '/shops-login?mode=register' : '/shops-login';
    router.replace(newUrl, { scroll: false });
  };

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);

      // Bu role için kullanıcı profili var mı kontrol et
      const userProfile = await getUserProfileByEmailAndRole(data.email, 'customer');

      if (!userProfile) {
        toast.error('Bu e-posta adresi ile müşteri hesabı bulunmuyor. Lütfen doğru bilgileri girdiğinizdan emin olun veya hesap oluşturun.');
        return;
      }

      await signIn(data.email, data.password, 'customer');
      toast.success('Başarıyla giriş yapıldı');

      router.push('/');
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
      const existingProfile = await getUserProfileByEmailAndRole(data.email, 'customer');
      if (existingProfile) {
        toast.error('Bu e-posta adresi ile zaten kayıtlı bir hesap bulunuyor.');
        return;
      }

      // Hesap oluştur
      const user = await signUp(data.email, data.password, `${data.firstName} ${data.lastName}`);

      await createUserProfile(user.uid, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: '',
        displayName: `${data.firstName} ${data.lastName}`,
        isActive: true,
        isEmailVerified: false,
        isPhoneVerified: false,
        preferences: {
          notifications: {
            orders: true,
            promotions: true,
            email: true,
            sms: true
          },
          language: 'tr',
          theme: 'light'
        },
        loyaltyPoints: 0,
        membershipLevel: 'bronze',
        totalOrders: 0,
        totalSpent: 0,
        averageRating: 0,
      });

      toast.success('Hesabınız başarıyla oluşturuldu! Lütfen giriş yapın.');
      setIsRegisterMode(false);
    } catch (error: any) {
      console.error('Register error:', error);
      toast.error('Kayıt olunurken hata: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row" suppressHydrationWarning={true}>
      {/* Sol kısım - Görsel Alan */}
      <div className="w-full md:w-3/5 bg-gray-100 relative overflow-hidden hidden md:block" suppressHydrationWarning={true}>
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
      <div className="w-full md:w-2/5 flex items-center justify-center p-8 bg-white relative z-10" suppressHydrationWarning={true}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src="/images/logo.png" alt="Yummine Logo" className="h-12" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isRegisterMode ? 'Yummine Müşteri Kayıt' : 'Yummine Müşteri Girişi'}
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
                            type="mail"
                            autoComplete="mail"
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
                // Kayıt Formu
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
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
                      render={() => (
                        <FormItem>
                          <FormControl>
                            <input
                              placeholder="E-Posta"
                              type="text"
                              autoComplete="off"
                              disabled={isLoading}
                              {...registerForm.register("email")}
                              className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
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

                    <Button
                      type="submit"
                      className="w-full h-12 bg-orange-600 hover:bg-orange-700"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Kayıt Oluşturuluyor...' : 'Hesap Oluştur'}
                    </Button>
                  </form>
                </Form>
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