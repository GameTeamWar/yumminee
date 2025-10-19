"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const router = useRouter();

  useEffect(() => {
    // Cart drawer'a yönlendir - ana sayfaya geri dön
    router.replace('/');
  }, [router]);

  return null;
}