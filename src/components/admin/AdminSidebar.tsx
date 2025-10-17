import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard,
  Store,
  Users,
  UserCheck,
  Settings,
  LineChart,
  DollarSign
} from 'lucide-react';

const AdminSidebar = () => {
  const pathname = usePathname();

  // Menü öğeleri
  const menuItems = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard
    },
    {
      name: 'Restoranlar',
      href: '/admin/restaurants',
      icon: Store
    },
    {
      name: 'Kuryeler',
      href: '/admin/couriers',
      icon: UserCheck
    },
    {
      name: 'Kullanıcılar',
      href: '/admin/users',
      icon: Users
    },
    {
      name: 'Raporlar',
      href: '/admin/reports',
      icon: LineChart
    },
    {
      name: 'Finans',
      href: '/admin/finance',
      icon: DollarSign
    },
    {
      name: 'Ayarlar',
      href: '/admin/settings',
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

export default AdminSidebar;