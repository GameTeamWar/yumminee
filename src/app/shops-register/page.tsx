import { Metadata } from 'next';
import RegisterForm from '@/components/forms/RegisterForm';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Müşteri Kayıt - Yummine',
  description: 'Yummine\'ye müşteri olarak kayıt olun ve yemek siparişi vermeye başlayın.',
};

export default function ShopsRegisterPage() {
  return (
    <div className="container max-w-md mx-auto px-4 py-12">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Müşteri Kayıt</CardTitle>
          <CardDescription>
            Yummine'ye katılın ve favori restoranlarınızdan sipariş verin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm role="customer" accountMode="strict" />
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            Zaten bir müşteri hesabınız var mı?{' '}
            <Link href="/shops-login" className="text-primary font-medium hover:underline">
              Giriş Yap
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}