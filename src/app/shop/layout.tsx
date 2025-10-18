"use client";

import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import RestaurantHeader from '@/components/restaurant/RestaurantHeader';
import RestaurantSidebar from '@/components/restaurant/RestaurantSidebar';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { getRestaurantByOwnerId } from '@/lib/firebase/db';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  );
}

function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, userProfile } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const panelId = searchParams.get('panel');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authCheckLoading, setAuthCheckLoading] = useState(true);

  // Authorization kontrolü
  useEffect(() => {
    const checkAuthorization = async () => {
      if (loading) return;

      // Kullanıcı giriş yapmamışsa
      if (!user) {
        setIsAuthorized(false);
        setAuthCheckLoading(false);
        return;
      }

      // Kullanıcı restaurant/shop rolünde değilse
      if (userProfile?.role !== 'shop') {
        setIsAuthorized(false);
        setAuthCheckLoading(false);
        return;
      }

      // Panel ID yoksa
      if (!panelId) {
        setIsAuthorized(false);
        setAuthCheckLoading(false);
        return;
      }

      try {
        // Panel ID'nin kullanıcının restaurant ID'si ile eşleşip eşleşmediğini kontrol et
        const restaurant = await getRestaurantByOwnerId(user.uid);
        if (restaurant && restaurant.id === panelId) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Authorization kontrolü hatası:', error);
        setIsAuthorized(false);
      } finally {
        setAuthCheckLoading(false);
      }
    };

    checkAuthorization();
  }, [user, loading, userProfile, panelId]);

  // Auth durumları yüklenene kadar bekle
  if (loading || authCheckLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Yetkisiz erişim - hiçbir şey gösterme, sadece hata mesajı
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Yetkisiz Erişim</h2>
          <p className="text-gray-600 mb-6">
            Bu sayfaya erişim yetkiniz bulunmuyor. Lütfen kendi restoranınızın sayfasına gidin.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => router.push('/shop')}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              Ana Sayfaya Dön
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push('/shop-login')}
              className="w-full"
            >
              Giriş Yap
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Yetkili erişim - Dashboard göster
  if (isAuthorized === true) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <RestaurantSidebar />
        <div className="flex-1 flex flex-col ml-64">
          <RestaurantHeader />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Fallback - public mod
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}