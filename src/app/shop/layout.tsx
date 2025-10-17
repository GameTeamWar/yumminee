"use client";

import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import RestaurantHeader from '@/components/restaurant/RestaurantHeader';
import RestaurantSidebar from '@/components/restaurant/RestaurantSidebar';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

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

  // Kullanıcı giriş yapmış ve restaurant rolündeyse dashboard göster
  const isAuthenticatedRestaurant = !!user && userProfile?.role === 'restaurant';

  // Restaurant oturumu sonlanmışsa giriş sayfasına yönlendir
  useEffect(() => {
    if (!loading && !isAuthenticatedRestaurant) {
      router.push('/shops-login');
    }
  }, [loading, isAuthenticatedRestaurant, router]);

  // Auth durumu yüklenene kadar bekle
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticatedRestaurant) {
    // Dashboard modu - RestaurantSidebar ve RestaurantHeader ile
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
  } else {
    // Oturum sonlanmışsa yönlendirme sırasında loading göster
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Giriş sayfasına yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }
}