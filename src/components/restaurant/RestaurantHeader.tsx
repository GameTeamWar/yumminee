"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Settings, LogOut, User, Wallet, TrendingUp, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RestaurantHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [balance] = useState(12450.50); // Mock balance - gerçekte API'den gelecek
  const [todayEarnings] = useState(850.00); // Bugünkü kazanç

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/shop?mode=login');
    } catch (error) {
      console.error('Çıkış hatası:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-medium text-gray-700">Yönetim Paneli</h1>
        </div>

        <div className="flex items-center space-x-3">
          {/* Bakiye Kartı */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-green-200 bg-green-50 hover:bg-green-100">
                <Wallet className="h-4 w-4 text-green-600" />
                <div className="flex flex-col items-start">
                  <span className="text-xs text-gray-500">Bakiye</span>
                  <span className="font-bold text-green-700">₺{balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
              <DropdownMenuLabel>Finansal Özet</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Toplam Bakiye</span>
                  </div>
                  <span className="font-bold text-green-700">₺{balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Bugünkü Kazanç</span>
                  </div>
                  <span className="font-bold text-blue-700">₺{todayEarnings.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/shop/reports')}>
                <Eye className="mr-2 h-4 w-4" />
                <span>Detaylı Rapor</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Bildirimler */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </Button>

          {/* Çıkış Yap Butonu */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSignOut}
            className="gap-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800"
          >
            <LogOut className="h-4 w-4" />
            Çıkış Yap
          </Button>

          {/* Kullanıcı Menüsü */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || ''} />
                  <AvatarFallback>
                    {user?.displayName ? getInitials(user.displayName) : 'R'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.displayName || 'Restaurant'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Ayarlar</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Çıkış Yap</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}