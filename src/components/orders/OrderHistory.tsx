"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getUserOrders, subscribeToUserOrders } from "@/lib/firebase/db";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, Receipt, Store, MapPin, ArrowRight, ShoppingBag } from "lucide-react";

// Sipariş durumlarına göre renk ve metin
const orderStatusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: "bg-yellow-100 text-yellow-800", text: "Onay Bekliyor" },
  confirmed: { color: "bg-blue-100 text-blue-800", text: "Onaylandı" },
  preparing: { color: "bg-indigo-100 text-indigo-800", text: "Hazırlanıyor" },
  ready: { color: "bg-emerald-100 text-emerald-800", text: "Hazır" },
  delivering: { color: "bg-amber-100 text-amber-800", text: "Yolda" },
  delivered: { color: "bg-green-100 text-green-800", text: "Teslim Edildi" },
  canceled: { color: "bg-red-100 text-red-800", text: "İptal Edildi" },
};

export function OrderHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Siparişleri gerçek zamanlı dinle
    const unsubscribe = subscribeToUserOrders(user.uid, (userOrders) => {
      // Aktif siparişleri öne çıkar (teslim edilmediği ve iptal edilmediği siparişler)
      const activeStatuses = ['pending', 'accepted', 'ready', 'delivering'];
      const sortedOrders = userOrders.sort((a: any, b: any) => {
        const aIsActive = activeStatuses.includes(a.status);
        const bIsActive = activeStatuses.includes(b.status);
        
        if (aIsActive && !bIsActive) return -1;
        if (!aIsActive && bIsActive) return 1;
        
        // Aynı kategorideyseler tarihe göre sırala (en yeni önce)
        return b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.();
      });
      
      setOrders(sortedOrders);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const formatOrderDate = (timestamp: any) => {
    try {
      if (!timestamp) return "Tarih bilgisi yok";
      
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: tr,
      });
    } catch (error) {
      console.error("Tarih formatlanırken hata:", error);
      return "Tarih bilgisi yok";
    }
  };

  const getTotalPrice = (items: any[]) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce(
      (total, item) => total + (item.price || 0) * (item.quantity || 1),
      0
    );
  };

  // Sipariş detaylarını göster
  const handleShowDetails = (order: any) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  // Sipariş tekrar et
  const handleReorder = (order: any) => {
    // Burada sepet işlevini çağırarak siparişi tekrar oluşturabiliriz
    console.log("Sipariş tekrar edildi:", order);
    // TODO: Sepete ekleme işlevi uygulanacak
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Siparişlerim</h2>
        <p className="text-muted-foreground mt-1">Aktif siparişleriniz ve geçmiş siparişleriniz</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <Card className="bg-muted/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Henüz Siparişiniz Yok</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-6">
              Henüz hiç sipariş vermediniz. Hemen sipariş vermeye ne dersiniz?
            </p>
            <Button 
              className="w-full max-w-[200px]" 
              onClick={() => window.location.href = '/shops'}
            >
              Restoranları Keşfet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Store className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base font-medium">
                      {order.restaurantName || 'Restoran Adı Yok'}
                    </CardTitle>
                  </div>
                  <Badge
                    className={`${
                      orderStatusConfig[order.status]?.color || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {orderStatusConfig[order.status]?.text || "Durum Bilgisi Yok"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-0">
                <div className="grid gap-2">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Receipt className="h-4 w-4 mr-2" />
                      <span>
                        {order.items?.length || 0} ürün | ₺
                        {getTotalPrice(order.items).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{formatOrderDate(order.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-start text-sm">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                    <span className="line-clamp-1">
                      {order.deliveryAddress?.fullAddress || "Adres bilgisi yok"}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShowDetails(order)}
                >
                  Detaylar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReorder(order)}
                >
                  Tekrar Sipariş Ver
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Sipariş Detay Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Sipariş Detayı</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    {selectedOrder.restaurantName || 'Restoran Adı Yok'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Sipariş No: #{selectedOrder.id.slice(-6)}
                  </p>
                </div>
                <Badge
                  className={`${
                    orderStatusConfig[selectedOrder.status]?.color || "bg-gray-100"
                  }`}
                >
                  {orderStatusConfig[selectedOrder.status]?.text ||
                    "Durum Bilgisi Yok"}
                </Badge>
              </div>

              <div>
                <p className="font-medium mb-2">Sipariş Özeti</p>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <span className="font-medium">
                          {item.quantity}x
                        </span>{" "}
                        {item.name}
                      </div>
                      <div>₺{(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-2 border-t space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Ara Toplam</span>
                    <span>
                      ₺
                      {getTotalPrice(selectedOrder.items).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Teslimat Ücreti</span>
                    <span>
                      ₺{selectedOrder.deliveryFee?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  {selectedOrder.discount && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>İndirim</span>
                      <span>-₺{selectedOrder.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium pt-2 border-t mt-2">
                    <span>Toplam Tutar</span>
                    <span>
                      ₺
                      {(
                        getTotalPrice(selectedOrder.items) +
                        (selectedOrder.deliveryFee || 0) -
                        (selectedOrder.discount || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-medium mb-2">Teslimat Bilgileri</p>
                <div className="text-sm space-y-2">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                    <div>
                      <p>{selectedOrder.deliveryAddress?.title}</p>
                      <p className="text-muted-foreground">
                        {selectedOrder.deliveryAddress?.fullAddress}
                      </p>
                    </div>
                  </div>
                  {selectedOrder.deliveryAddress?.additionalInfo && (
                    <p className="text-muted-foreground pl-6">
                      Not: {selectedOrder.deliveryAddress.additionalInfo}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-between border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Kapat
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleReorder(selectedOrder)}
                >
                  Tekrar Sipariş Ver
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}