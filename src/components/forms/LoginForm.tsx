"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfileByEmailAndRole } from '@/lib/firebase/db';

// Giriş şeması
const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  role?: 'customer' | 'restaurant' | 'courier';
  redirectTo?: string;
}

export default function LoginForm({ role = 'customer', redirectTo }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = redirectTo || searchParams.get('callbackUrl') || '/';
  const { signIn } = useAuth();

  // Form hook'u
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      
      // Bu role için kullanıcı profili var mı kontrol et
      const userProfile = await getUserProfileByEmailAndRole(data.email, role);
      
      if (!userProfile) {
        const roleText = role === 'restaurant' ? 'restoran sahibi' : role === 'courier' ? 'kurye' : 'müşteri';
        toast.error(`Bu e-posta adresi ile ${roleText} hesabı bulunmuyor. Lütfen doğru bilgileri girdiğinizdan emin olun veya hesap oluşturun.`);
        return;
      }
      
      // Role belirterek giriş yap
      await signIn(data.email, data.password, role);
      toast.success('Başarıyla giriş yapıldı');
      
      // Müşteri girişi sonrası ana sayfaya yönlendir
      const redirectUrl = (role === 'customer' && callbackUrl === '/') ? '/' : callbackUrl;
      router.push(redirectUrl);
      router.refresh();
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Giriş yapılamadı: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-posta</FormLabel>
              <FormControl>
                <Input 
                  placeholder="ornek@mail.com" 
                  type="email" 
                  autoComplete="email"
                  disabled={isLoading}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Şifre</FormLabel>
              <FormControl>
                <Input 
                  placeholder="******" 
                  type="password" 
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
        </Button>
      </form>
    </Form>
  );
}