import { Metadata } from 'next';
import { Suspense } from 'react';
import LoginForm from '@/components/forms/LoginForm';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Kurye Giriş - Yummine',
  description: 'Yummine kurye hesabınıza giriş yapın ve teslimatları yönetin.',
};

export default function CourierLoginPage() {
  return (
    <div className="container max-w-md mx-auto px-4 py-12">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Kurye Girişi</CardTitle>
          <CardDescription>
            Hesabınıza giriş yaparak teslimatları yönetmeye başlayın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Yükleniyor...</div>}>
            <LoginForm role="courier" redirectTo="/courier/dashboard" />
          </Suspense>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 items-center">
          <div className="text-sm text-gray-500">
            Henüz kurye hesabınız yok mu?{' '}
            <Link href="/courier-register" className="text-primary font-medium hover:underline">
              Kayıt Ol
            </Link>
          </div>
          <div className="text-sm text-gray-500">
            <Link href="/courier/forgot-password" className="text-primary font-medium hover:underline">
              Şifremi Unuttum
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
