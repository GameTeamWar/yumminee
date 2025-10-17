"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Truck,
  ShoppingBag,
  ChefHat,
  Bike,
  Users
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const loginOptions = [
    {
      id: "customer",
      title: "Müşteri Girişi",
      description: "Yemek siparişi vermek için giriş yapın",
      icon: ShoppingBag,
      path: "/shops-login",
      color: "bg-blue-500",
      badge: "Müşteri"
    },
    {
      id: "restaurant",
      title: "Restoran Girişi",
      description: "Restoranınızı yönetmek için giriş yapın",
      icon: ChefHat,
      path: "/shop-login",
      color: "bg-green-500",
      badge: "Restoran"
    },
    {
      id: "courier",
      title: "Kurye Girişi",
      description: "Teslimat yapmak için giriş yapın",
      icon: Bike,
      path: "/courier-login",
      color: "bg-orange-500",
      badge: "Kurye"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Store className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Yummine
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Hangi kullanıcı türü ile giriş yapmak istiyorsunuz?
          </p>
        </div>

        {/* Login Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loginOptions.map((option) => (
            <Card
              key={option.id}
              className="relative overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
              onClick={() => router.push(option.path)}
            >
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 ${option.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <option.icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl mb-2">{option.title}</CardTitle>
                <CardDescription className="text-sm">
                  {option.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-center">
                  <Badge variant="secondary" className="mb-4">
                    {option.badge}
                  </Badge>
                </div>
                <Button className="w-full" variant="outline">
                  {option.title} Yap
                </Button>
              </CardContent>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Hesabınız yok mu?{" "}
            <button
              onClick={() => router.push('/register')}
              className="text-primary hover:underline font-medium"
            >
              Kayıt olun
            </button>
          </p>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="p-3 bg-primary/10 rounded-full mb-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Kolay Kullanım</h3>
            <p className="text-sm text-muted-foreground">Sezgisel arayüz ile hızlı erişim</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="p-3 bg-primary/10 rounded-full mb-3">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Geniş Seçenek</h3>
            <p className="text-sm text-muted-foreground">Binlerce restoran ve ürün</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="p-3 bg-primary/10 rounded-full mb-3">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Hızlı Teslimat</h3>
            <p className="text-sm text-muted-foreground">Kapınıza kadar güvenilir teslimat</p>
          </div>
        </div>
      </div>
    </div>
  );
}