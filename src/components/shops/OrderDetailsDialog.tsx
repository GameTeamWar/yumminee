"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Order, OrderStatus } from "@/types";
import { useState } from "react";
import { updateOrderStatus } from "@/lib/firebase/firestore";
import { toast } from "sonner";

interface OrderDetailsDialogProps {
  order: any; // Tam Order tipi gelene kadar
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderDetailsDialog({ 
  order, 
  isOpen, 
  onClose 
}: OrderDetailsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [preparationTime, setPreparationTime] = useState(20); // dakika cinsinden
  
  const getOrderStatusText = (status: OrderStatus) => {
    switch(status) {
      case 'pending': return 'Beklemede';
      case 'accepted': return 'Hazırlanıyor';
      case 'ready': return 'Hazır';
      case 'delivering': return 'Teslimatta';
      case 'completed': return 'Tamamlandı';
      case 'canceled': return 'İptal Edildi';
      default: return status;
    }
  };
  
  const getNextStatus = (status: OrderStatus): OrderStatus | null => {
    switch(status) {
      case 'pending': return 'accepted';
      case 'accepted': return 'ready';
      case 'ready': return 'delivering';
      case 'delivering': return 'completed';
      default: return null;
    }
  };
  
  const getStatusActionText = (status: OrderStatus): string => {
    switch(status) {
      case 'pending': return 'Siparişi Kabul Et';
      case 'accepted': return 'Sipariş Hazır';
      case 'ready': return 'Teslimata Çıkar';
      case 'delivering': return 'Teslim Edildi İşaretle';
      default: return '';
    }
  };
  
  const handleUpdateStatus = async () => {
    const nextStatus = getNextStatus(order.status);
    if (!nextStatus) return;
    
    setIsLoading(true);
    try {
      // Normalde firebase fonksiyonu çağrılacak
      // await updateOrderStatus(order.id, nextStatus, 
      //   nextStatus === 'accepted' ? { estimatedPreparationTime: new Date(Date.now() + preparationTime * 60000) } : {}
      // );
      
      toast.success('Sipariş durumu güncellendi');
      
      // Tam uygulamada, sayfayı yenilemek yerine state güncellenir
      // onClose();
      // window.location.reload();
      
      // Şimdilik state değiştiriyoruz
      order.status = nextStatus;
      setIsLoading(false);
      onClose();
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
      setIsLoading(false);
    }
  };
  
  const handleCancelOrder = async () => {
    if (!confirm('Siparişi iptal etmek istediğinizden emin misiniz?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Normalde firebase fonksiyonu çağrılacak
      // await updateOrderStatus(order.id, 'canceled');
      
      toast.success('Sipariş iptal edildi');
      
      // Tam uygulamada, sayfayı yenilemek yerine state güncellenir
      // onClose();
      // window.location.reload();
      
      // Şimdilik state değiştiriyoruz
      order.status = 'canceled';
      setIsLoading(false);
      onClose();
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
      setIsLoading(false);
    }
  };
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Sipariş #{order.id}</DialogTitle>
          <DialogDescription>
            <span className={`inline-block px-2 py-1 text-xs rounded-full bg-${order.status === 'pending' ? 'yellow' : order.status === 'accepted' ? 'blue' : order.status === 'ready' ? 'purple' : order.status === 'delivering' ? 'orange' : order.status === 'completed' ? 'green' : 'red'}-100 text-${order.status === 'pending' ? 'yellow' : order.status === 'accepted' ? 'blue' : order.status === 'ready' ? 'purple' : order.status === 'delivering' ? 'orange' : order.status === 'completed' ? 'green' : 'red'}-800`}>
              {getOrderStatusText(order.status)}
            </span>
            <span className="ml-2">{formatDate(order.createdAt)}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Müşteri Bilgileri</h3>
              <p>{order.customer.name}</p>
              <p>{order.customer.phone}</p>
              <p className="text-sm">{order.customer.address}</p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Sipariş Özeti</h3>
              <p>Ara Toplam: <span className="font-semibold">{order.subtotal.toFixed(2)} TL</span></p>
              <p>Teslimat Ücreti: <span className="font-semibold">{order.deliveryFee.toFixed(2)} TL</span></p>
              <p>Toplam: <span className="font-semibold">{order.total.toFixed(2)} TL</span></p>
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="font-medium mb-2">Sipariş Detayları</h3>
            <div className="divide-y">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between py-2">
                  <div>
                    <span className="font-medium">{item.quantity}x</span> {item.name}
                    {item.options && item.options.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {item.options.map((opt: any) => opt.name).join(', ')}
                      </div>
                    )}
                  </div>
                  <div>{(item.price * item.quantity).toFixed(2)} TL</div>
                </div>
              ))}
            </div>
          </div>
          
          {order.status === 'pending' && (
            <div className="mt-4">
              <Label htmlFor="preparationTime">Tahmini Hazırlama Süresi (dk)</Label>
              <Input
                id="preparationTime"
                type="number"
                value={preparationTime}
                onChange={(e) => setPreparationTime(parseInt(e.target.value))}
                min={5}
                max={120}
              />
            </div>
          )}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {getNextStatus(order.status) && (
            <Button 
              className="flex-1"
              onClick={handleUpdateStatus} 
              disabled={isLoading}
            >
              {getStatusActionText(order.status)}
            </Button>
          )}
          
          {order.status === 'pending' && (
            <Button 
              variant="destructive"
              className="flex-1" 
              onClick={handleCancelOrder}
              disabled={isLoading}
            >
              Siparişi İptal Et
            </Button>
          )}
          
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}