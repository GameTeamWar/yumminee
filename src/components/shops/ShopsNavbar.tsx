"use client";

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Bell } from 'lucide-react';
import { signOut } from '@/lib/firebase/auth';
import { useState } from 'react';

const ShopsNavbar = () => {
  const { user, userProfile } = useAuth();
  const [notifications, setNotifications] = useState<string[]>([]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/shops/dashboard" className="flex items-center">
            <span className="font-bold text-xl text-primary">Yummine</span>
            <span className="ml-2 text-sm text-gray-500">Restoran Panel</span>
          </Link>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Bildirimler */}
            <div className="relative">
              <button className="p-1 rounded-full hover:bg-gray-100">
                <Bell className="h-5 w-5 text-gray-700" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>

            {/* Kullanıcı Bilgisi */}
            <div className="flex items-center">
              <div className="mr-3 text-right hidden sm:block">
                <p className="text-sm font-medium">
                  {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : user?.displayName || 'Kullanıcı'}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center space-x-1"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Çıkış</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default ShopsNavbar;