"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const Header = dynamic(() => import('@/components/Header'), {
  ssr: false
});

const RestaurantsContent = dynamic(() => import('./shops/RestaurantsContent'), {
  ssr: false
});

export default function Home() {
  return (
    <>
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <Header />
      </Suspense>
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <RestaurantsContent />
      </Suspense>
    </>
  );
}
