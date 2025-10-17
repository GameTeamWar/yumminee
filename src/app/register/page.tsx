"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Store,
  Truck,
  ShoppingBag,
  ChefHat,
  Bike,
  Users,
  Star
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [accountMode, setAccountMode] = useState<'flexible' | 'strict'>('flexible');

  const registerOptions = [
    {
      id: "customer",
      title: "Müşteri Kaydı",
      description: accountMode === 'strict' 
        ? "Müşteri hesabınız için ayrı email kullanın"
        : "Yemek siparişi vermek için kayıt olun",
      icon: ShoppingBag,
      path: "/shops-register",
      color: "bg-blue-500",
      badge: "Müşteri",
      features: accountMode === 'strict'
        ? ["Ayrı müşteri email'i", "Güvenli hesap ayrımı", "Rol tabanlı giriş"]
        : ["Ücretsiz kayıt", "Kolay sipariş", "Hızlı teslimat"]
    },
    {
      id: "restaurant",
      title: "Restoran Kaydı",
      description: accountMode === 'strict'
        ? "Restoran hesabınız için ayrı email kullanın" 
        : "Restoranınızı Yummine'de listeleyin",
      icon: ChefHat,
      path: "/shop?mode=register",
      color: "bg-green-500",
      badge: "Restoran",
      features: accountMode === 'strict'
        ? ["Ayrı restoran email'i", "İşletme bilgileri", "Müşteri yönetimi"]
        : ["Ücretsiz kayıt", "Geniş müşteri kitlesi", "Kolay yönetim"]
    },
    {
      id: "courier",
      title: "Kurye Kaydı",
      description: accountMode === 'strict'
        ? "Kurye hesabınız için ayrı email kullanın"
        : "Teslimat yaparak gelir elde edin",
      icon: Bike,
      path: "/courier-register",
      color: "bg-orange-500",
      badge: "Kurye",
      features: accountMode === 'strict'
        ? ["Ayrı kurye email'i", "Teslimat geçmişi", "Kazanç takibi"]
        : ["Esnek çalışma", "Yüksek kazanç", "Kolay kayıt"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Store className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Yummine'e Katılın
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Hangi kullanıcı türü olarak kayıt olmak istiyorsunuz?
          </p>
          
          {/* Account Mode Toggle */}
          <div className="flex items-center justify-center gap-4 mt-6 p-4 bg-white/50 backdrop-blur-sm rounded-lg">
            <span className={`text-sm font-medium ${accountMode === 'flexible' ? 'text-primary' : 'text-muted-foreground'}`}>
              Esnek Sistem
            </span>
            <Switch
              checked={accountMode === 'strict'}
              onCheckedChange={(checked) => setAccountMode(checked ? 'strict' : 'flexible')}
              className="data-[state=checked]:bg-primary"
            />
            <span className={`text-sm font-medium ${accountMode === 'strict' ? 'text-primary' : 'text-muted-foreground'}`}>
              Katı Sistem
            </span>
          </div>
          
          <div className="text-center mt-2">
            <p className="text-xs text-muted-foreground">
              {accountMode === 'strict' 
                ? "Her rol için ayrı email hesabı zorunludur"
                : "Tek email ile çoklu rol kullanabilirsiniz"
              }
            </p>
          </div>
        </div>

        {/* Register Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {registerOptions.map((option) => (
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
                <CardDescription className="text-sm mb-4">
                  {option.description}
                </CardDescription>
                <Badge variant="secondary" className="mb-4">
                  {option.badge}
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Features */}
                <div className="space-y-2 mb-6">
                  {option.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button className="w-full">
                  {option.title} Yap
                </Button>
              </CardContent>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Zaten hesabınız var mı?{" "}
            <button
              onClick={() => router.push('/login')}
              className="text-primary hover:underline font-medium"
            >
              Giriş yapın
            </button>
          </p>
        </div>

        {/* Benefits Section */}
        <div className="mt-12 bg-white/50 backdrop-blur-sm rounded-lg p-6">
          <h2 className="text-2xl font-bold text-center mb-6">Neden Yummine?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="p-3 bg-primary/10 rounded-full mb-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Milyonlarca Kullanıcı</h3>
              <p className="text-sm text-muted-foreground">Türkiye'nin en büyük yemek platformu</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="p-3 bg-primary/10 rounded-full mb-3">
                <Store className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Binlerce Restoran</h3>
              <p className="text-sm text-muted-foreground">Her damak zevkine uygun seçenek</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="p-3 bg-primary/10 rounded-full mb-3">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Hızlı Teslimat</h3>
              <p className="text-sm text-muted-foreground">Ortalama 30 dakikada kapınızda</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="p-3 bg-primary/10 rounded-full mb-3">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Güvenilir Hizmet</h3>
              <p className="text-sm text-muted-foreground">Müşteri memnuniyeti garantisi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}