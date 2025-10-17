import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Bu middleware, kullanıcı tipine göre sayfaları korur ve role-based yönlendirme yapar
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // URL'den role belirle
  const getRequiredRole = (pathname: string): string => {
    if (pathname.startsWith('/restaurant') || pathname.includes('restaurant')) {
      return 'restaurant';
    } else if (pathname.startsWith('/courier') || pathname.includes('courier')) {
      return 'courier';
    } else {
      return 'customer';
    }
  };
  
  const requiredRole = getRequiredRole(path);

  // Public rotaları korumuyoruz
  if (
    path === '/' ||
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.startsWith('/static') ||
    path.includes('.') ||
    path === '/login' ||
    path === '/register' ||
    path.startsWith('/restaurant-login') ||
    path.startsWith('/restaurant-register') ||
    path.startsWith('/courier-login') ||
    path.startsWith('/courier-register') ||
    path.startsWith('/shop-login') ||
    path.startsWith('/shop-register') ||
    path === '/restaurants' ||
    path === '/cart' ||
    path === '/checkout' ||
    path.startsWith('/restaurants/') ||
    path === '/profile' ||
    path === '/my-orders'
  ) {
    return NextResponse.next();
  }

  // Diğer rotalarda koruma uygulayacağız
  // Gerçek uygulamada Firebase Admin SDK veya JWT ile doğrulama yapılır
  // Bu basit bir örnek, gerçek uygulamanızda daha güçlü bir yöntem kullanın

  // Authentication token kontrolü
  const token = request.cookies.get('auth-token')?.value;
  
  // Restaurant routeları için
  if (path.startsWith('/restaurant/')) {
    // Token yoksa login sayfasına yönlendir
    if (!token) {
      return NextResponse.redirect(new URL('/restaurant-login', request.url));
    }
    // Token varsa devam et (gerçek uygulamada token doğrulaması yapılmalı)
    return NextResponse.next();
  }

  // Kurye routeları için
  if (path.startsWith('/courier/')) {
    if (!token) {
      return NextResponse.redirect(new URL('/courier-login', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}