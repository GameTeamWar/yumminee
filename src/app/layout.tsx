import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { FavoriteProvider } from '@/contexts/FavoriteContext';
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yummine - Yemek Siparişi Platformu",
  description: "Favori restoranlarınızdan yemek siparişi verin, hızlı ve kolay teslimat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <CartProvider>
            <FavoriteProvider>
              {children}
              <Toaster />
            </FavoriteProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
