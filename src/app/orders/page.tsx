"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function OrdersRedirectPage() {
  const router = useRouter();
  const { userProfile } = useAuth();

  useEffect(() => {
    // Restoran sahipleri sipariş sayfasına erişemez
    if (userProfile?.role === 'restaurant') {
      toast.error('Restoran sahipleri müşteri siparişlerine erişemez');
      router.replace('/restaurants');
      return;
    }

    // Otomatik olarak /profile?tab=orders sayfasına yönlendir
    router.replace('/profile?tab=orders');
  }, [router, userProfile]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Siparişlerinize yönlendiriliyorsunuz...</p>
      </div>
    </div>
  );
}