"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Utensils, 
  ShoppingBag, 
  Settings, 
  Users, 
  DollarSign,
  LayoutDashboard
} from 'lucide-react';

const ShopsSidebar = () => {
  const pathname = usePathname();

  // Menü öğeleri
  const menuItems = [
    {
      name: 'Dashboard',
      href: '/shops/dashboard',
      icon: LayoutDashboard
    },
    {
      name: 'Siparişler',
      href: '/shops/orders',
      icon: ShoppingBag
    },
    {
      name: 'Menü Yönetimi',
      href: '/shops/menu',
      icon: Utensils
    },
    {
      name: 'Kuryeler',
      href: '/shops/couriers',
      icon: Users
    },
    {
      name: 'Finans',
      href: '/shops/finance',
      icon: DollarSign
    },
    {
      name: 'Ayarlar',
      href: '/shops/settings',
      icon: Settings
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-auto min-h-[calc(100vh-64px)] hidden md:block">
      <div className="px-4 py-6">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-lg hover:bg-gray-100 transition ${
                  pathname === item.href ? 'bg-gray-100 text-primary' : 'text-gray-700'
                }`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default ShopsSidebar;