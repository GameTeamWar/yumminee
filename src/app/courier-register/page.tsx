import { Metadata } from 'next';
import RegisterForm from '@/components/forms/RegisterForm';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Kurye Kayıt - Yummine',
  description: 'Yummine\'ye kurye olarak kayıt olun ve kazanmaya başlayın.',
};

export default function CourierRegisterPage() {
  return (
    <div className="container max-w-md mx-auto px-4 py-12">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Kurye Kayıt</CardTitle>
          <CardDescription>
            Yummine kurye ekibine katılın ve esnek çalışma saatleriyle kazanç elde edin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm role="courier" accountMode="strict" />
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            Zaten bir kurye hesabınız var mı?{' '}
            <Link href="/courier-login" className="text-primary font-medium hover:underline">
              Giriş Yap
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
