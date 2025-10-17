import { ReactNode } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { redirect } from 'next/navigation';
import AdminNavbar from '@/components/admin/AdminNavbar';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();

  // Eğer kullanıcı yüklenmemişse, yükleniyor göster
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  }

  // Kullanıcı oturum açmamışsa veya admin değilse, ana sayfaya yönlendir
  if (!user || role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 p-6 bg-gray-100">{children}</main>
      </div>
    </div>
  );
}