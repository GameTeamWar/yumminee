import { ReactNode, Suspense } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <Header />
      </Suspense>
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}