"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Key, History, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const passwordResetSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(6, "Mevcut şifre en az 6 karakter olmalıdır"),
  newPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalıdır"),
  confirmPassword: z.string().min(6, "Şifre tekrarı en az 6 karakter olmalıdır"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Yeni şifre ve tekrarı eşleşmiyor",
  path: ["confirmPassword"],
});

interface SessionInfo {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastLogin: Date;
  isCurrent: boolean;
  isSuspicious: boolean;
}

export function PasswordResetForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState(false);
  const { resetPassword, user, updatePassword } = useAuth();

  const resetForm = useForm<z.infer<typeof passwordResetSchema>>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: "",
    },
  });

  const changeForm = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Oturum bilgilerini yükle
  useEffect(() => {
    loadSessionInfo();
  }, []);

  const loadSessionInfo = async () => {
    try {
      // Gerçek tarayıcı ve cihaz bilgilerini al
      const userAgent = navigator.userAgent;
      const deviceInfo = getDeviceInfo(userAgent);
      const browserInfo = getBrowserInfo(userAgent);

      // Ekran genişliği ve touch kontrolü ile daha iyi cihaz tespiti
      const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
      const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;

      // Eğer user agent mobile gösteriyorsa ama ekran genişse, desktop olarak düzelt
      let finalDeviceInfo = deviceInfo;
      if (deviceInfo.includes('iPhone') || deviceInfo.includes('Android') ||
          deviceInfo === 'Mobil Cihaz' || deviceInfo === 'Android Telefon') {
        if (!isMobile && !isTablet) {
          // Büyük ekranlı cihaz, muhtemelen desktop
          if (userAgent.includes('Windows NT')) {
            finalDeviceInfo = 'Windows PC';
          } else if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')) {
            finalDeviceInfo = 'Mac Computer';
          } else if (userAgent.includes('Linux') && !userAgent.includes('Android')) {
            finalDeviceInfo = 'Linux PC';
          } else if (userAgent.includes('CrOS')) {
            finalDeviceInfo = 'Chromebook';
          } else {
            finalDeviceInfo = 'Bilgisayar';
          }
        }
      }

      // IP adresini al (ücretsiz API kullanarak)
      let ipAddress = 'Bilinmiyor';
      let location = 'Bilinmiyor';

      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;

        // IP tabanlı konum bilgisi (ücretsiz API)
        const locationResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const locationData = await locationResponse.json();
        location = `${locationData.city}, ${locationData.country_name}`;
      } catch (error) {
        console.warn('IP/Location bilgisi alınamadı:', error);
      }

      // Gerçek oturum verileri (şimdilik tek oturum gösteriyoruz)
      const sessions: SessionInfo[] = [
        {
          id: "current",
          device: finalDeviceInfo,
          browser: browserInfo,
          ip: ipAddress,
          location: location,
          lastLogin: new Date(),
          isCurrent: true,
          isSuspicious: false,
        },
      ];

      setSessions(sessions);
      // Şimdilik şüpheli aktivite kontrolü devre dışı
      setSuspiciousActivity(false);
    } catch (error) {
      console.error("Oturum bilgileri yüklenirken hata:", error);
      // Hata durumunda en azından mevcut oturumu göster
      const fallbackSessions: SessionInfo[] = [
        {
          id: "current",
          device: "Bilinmeyen Cihaz",
          browser: "Bilinmeyen Tarayıcı",
          ip: "Bilinmiyor",
          location: "Bilinmiyor",
          lastLogin: new Date(),
          isCurrent: true,
          isSuspicious: false,
        },
      ];
      setSessions(fallbackSessions);
    }
  };

  // Tarayıcı bilgilerini parse eden yardımcı fonksiyon
  const getBrowserInfo = (userAgent: string): string => {
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      return 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      return 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return 'Safari';
    } else if (userAgent.includes('Edg')) {
      return 'Edge';
    } else if (userAgent.includes('Opera')) {
      return 'Opera';
    } else {
      return 'Bilinmeyen Tarayıcı';
    }
  };

  // Cihaz bilgilerini parse eden yardımcı fonksiyon
  const getDeviceInfo = (userAgent: string): string => {
    // Önce mobil cihazları kontrol et (daha spesifik)
    if (userAgent.includes('iPhone') || userAgent.includes('iPod')) {
      return 'iPhone';
    } else if (userAgent.includes('iPad')) {
      return 'iPad';
    } else if (userAgent.includes('Android') && userAgent.includes('Mobile')) {
      return 'Android Telefon';
    } else if (userAgent.includes('Android')) {
      return 'Android Tablet';
    } else if (userAgent.includes('BlackBerry') || userAgent.includes('BB10')) {
      return 'BlackBerry';
    } else if (userAgent.includes('Windows Phone')) {
      return 'Windows Phone';
    }

    // Tablet kontrolü
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      return 'Tablet';
    }

    // Desktop için işletim sistemi kontrolü
    if (userAgent.includes('Windows NT')) {
      return 'Windows PC';
    } else if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')) {
      return 'Mac Computer';
    } else if (userAgent.includes('Linux') && !userAgent.includes('Android')) {
      return 'Linux PC';
    } else if (userAgent.includes('CrOS')) {
      return 'Chromebook';
    } else {
      return 'Bilgisayar';
    }
  };

  const onResetSubmit = async (data: z.infer<typeof passwordResetSchema>) => {
    try {
      setIsLoading(true);
      await resetPassword(data.email);
      setIsSuccess(true);
      toast.success("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.");
    } catch (error: any) {
      console.error("Şifre sıfırlama hatası:", error);
      toast.error(
        "Şifre sıfırlama bağlantısı gönderilemedi: " +
          (error.message || "Bir hata oluştu")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onChangeSubmit = async (data: z.infer<typeof passwordChangeSchema>) => {
    try {
      setIsLoading(true);
      await updatePassword(data.currentPassword, data.newPassword);
      changeForm.reset();
      toast.success("Şifreniz başarıyla güncellendi.");
      // Şifre değiştirme sonrası oturum bilgilerini yeniden yükle
      await loadSessionInfo();
    } catch (error: any) {
      console.error("Şifre güncelleme hatası:", error);
      toast.error(
        "Şifre güncellenemedi: " +
          (error.message || "Bir hata oluştu")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    // Mevcut oturumu sonlandıramayız, sadece diğer oturumları sonlandırabiliriz
    if (sessionId === "current") {
      toast.error("Mevcut oturumu sonlandıramazsınız. Çıkış yapmak için çıkış butonunu kullanın.");
      return;
    }

    try {
      // Gerçek uygulamada burada oturum sonlandırma API çağrısı yapılacak
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success("Oturum sonlandırıldı.");
      // Oturum sonlandırma sonrası bilgileri yeniden yükle
      await loadSessionInfo();
    } catch (error) {
      toast.error("Oturum sonlandırılamadı.");
    }
  };

  if (isSuccess) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <div className="text-green-500 text-2xl mb-4">✓</div>
          <h3 className="text-lg font-medium">
            Şifre sıfırlama bağlantısı gönderildi
          </h3>
          <p className="text-muted-foreground">
            E-posta adresinize gönderilen şifre sıfırlama bağlantısını
            kullanarak şifrenizi yenileyebilirsiniz.
          </p>
          <Button
            onClick={() => {
              resetForm.reset();
              setIsSuccess(false);
            }}
            variant="outline"
            className="mt-4"
          >
            Yeni bir bağlantı gönder
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="change" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="change" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Şifre Değiştir
          </TabsTrigger>
          <TabsTrigger value="reset" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Şifre Sıfırla
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Oturumlar
          </TabsTrigger>
        </TabsList>

        {/* Şifre Değiştirme */}
        <TabsContent value="change">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Şifre Değiştir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...changeForm}>
                <form
                  onSubmit={changeForm.handleSubmit(onChangeSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={changeForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mevcut Şifre</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Mevcut şifrenizi girin"
                            type="password"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={changeForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yeni Şifre</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Yeni şifrenizi girin"
                            type="password"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={changeForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yeni Şifre Tekrarı</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Yeni şifrenizi tekrar girin"
                            type="password"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Güncelleniyor...
                      </>
                    ) : (
                      "Şifreyi Güncelle"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Şifre Sıfırlama */}
        <TabsContent value="reset">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Şifre Sıfırlama
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Şifrenizi mi unuttunuz?</h3>
                  <p className="text-muted-foreground">
                    E-posta adresinizi girin, şifre sıfırlama bağlantısı
                    göndereceğiz.
                  </p>
                </div>

                <Form {...resetForm}>
                  <form
                    onSubmit={resetForm.handleSubmit(onResetSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={resetForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-posta Adresi</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ornek@mail.com"
                              type="email"
                              disabled={isLoading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Gönderiliyor...
                        </>
                      ) : (
                        "Şifre Sıfırlama Bağlantısı Gönder"
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Oturum Geçmişi */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Aktif Oturumlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-lg border ${
                      session.isSuspicious
                        ? 'border-red-200 bg-red-50'
                        : session.isCurrent
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{session.device}</h4>
                          {session.isCurrent && (
                            <Badge variant="secondary" className="text-xs">
                              Mevcut Oturum
                            </Badge>
                          )}
                          {session.isSuspicious && (
                            <Badge variant="destructive" className="text-xs">
                              Şüpheli
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>🌐 {session.browser}</p>
                          <p>📍 {session.location}</p>
                          <p>🖥️ IP: {session.ip}</p>
                          <p>🕒 Son giriş: {session.lastLogin.toLocaleString('tr-TR')}</p>
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => terminateSession(session.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Oturumu Sonlandır
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}