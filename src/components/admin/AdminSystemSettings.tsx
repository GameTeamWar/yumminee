import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { updateUserBalance } from '@/lib/firebase/firestore';

interface BalanceCardProps {
  userId: string;
  balance: number;
  onBalanceUpdated: () => void;
}

export default function AdminSystemSettings() {
  const [deliveryFee, setDeliveryFee] = useState(15);
  const [kmFee, setKmFee] = useState(2.5);
  const [maxRadius, setMaxRadius] = useState(20);
  const [loading, setLoading] = useState(false);
  
  const handleSaveSettings = async () => {
    setLoading(true);
    
    try {
      // Firebase'e sistem ayarlarını kaydetme
      await updateSystemSettings({
        defaultDeliveryFee: deliveryFee,
        defaultCourierFee: kmFee,
        maxServiceRadius: maxRadius,
        orderTimeoutSeconds: 300 // Sabit değer: 5 dakika
      });
      
      toast.success('Sistem ayarları başarıyla güncellendi');
    } catch (error) {
      toast.error('Ayarlar kaydedilirken bir hata oluştu');
      console.error('Sistem ayarları kaydetme hatası:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sistem Ayarları</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Teslimat Ücretlendirmesi</CardTitle>
          <CardDescription>
            Teslimat için kilometre başına ve sabit ücretleri ayarlayın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="deliveryFee">Sabit Teslimat Ücreti (TL)</Label>
              <Input
                id="deliveryFee"
                type="number"
                min={0}
                step={0.5}
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Number(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Her sipariş için uygulanacak temel teslimat ücreti
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="kmFee">Kilometre Başına Ücret (TL)</Label>
              <Input
                id="kmFee"
                type="number"
                min={0}
                step={0.1}
                value={kmFee}
                onChange={(e) => setKmFee(Number(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Kuryelere kilometre başına ödenecek ücret
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxRadius">Maksimum Servis Mesafesi (km)</Label>
              <Input
                id="maxRadius"
                type="number"
                min={1}
                value={maxRadius}
                onChange={(e) => setMaxRadius(Number(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Restoranların maksimum servis mesafesi
              </p>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSaveSettings}
              disabled={loading}
            >
              {loading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Bakiye yönetim kartı bileşeni
export function BalanceCard({ userId, balance, onBalanceUpdated }: BalanceCardProps) {
  const [amount, setAmount] = useState(100);
  const [paymentMethod, setPaymentMethod] = useState('credit-card');
  const [loading, setLoading] = useState(false);
  
  const handleAddBalance = async () => {
    if (amount <= 0) {
      toast.error('Lütfen geçerli bir tutar girin');
      return;
    }
    
    setLoading(true);
    try {
      // Firebase'e bakiye yükleme isteği
      await updateUserBalance(userId, amount, true);
      
      toast.success(`${amount} TL bakiyenize eklendi`);
      onBalanceUpdated();
    } catch (error) {
      toast.error('Bakiye yükleme işlemi başarısız oldu');
      console.error('Bakiye yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const predefinedAmounts = [50, 100, 200, 500];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bakiye İşlemleri</CardTitle>
        <CardDescription>
          Hesabınıza bakiye yükleyin veya bakiyenizi görüntüleyin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-lg">Mevcut Bakiye</span>
            <span className="text-2xl font-bold">{balance.toFixed(2)} TL</span>
          </div>
          
          <div>
            <Label>Yüklenecek Tutar</Label>
            <div className="grid grid-cols-4 gap-2 mb-4 mt-2">
              {predefinedAmounts.map((presetAmount) => (
                <Button
                  key={presetAmount}
                  variant={amount === presetAmount ? "default" : "outline"}
                  onClick={() => setAmount(presetAmount)}
                  className="h-10"
                >
                  {presetAmount} TL
                </Button>
              ))}
            </div>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={10}
              className="mb-4"
            />
          </div>
          
          <div>
            <Label>Ödeme Yöntemi</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="mt-2 space-y-3"
            >
              <div className="flex items-center space-x-3 border rounded-lg p-3">
                <RadioGroupItem value="credit-card" id="credit-card" />
                <Label htmlFor="credit-card" className="flex-1 cursor-pointer">Kredi Kartı</Label>
              </div>
              <div className="flex items-center space-x-3 border rounded-lg p-3">
                <RadioGroupItem value="bank-transfer" id="bank-transfer" />
                <Label htmlFor="bank-transfer" className="flex-1 cursor-pointer">Banka Transferi</Label>
              </div>
            </RadioGroup>
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleAddBalance}
            disabled={loading || amount <= 0}
          >
            {loading ? 'İşleniyor...' : 'Bakiye Yükle'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Sistem ayarlarını güncelleme fonksiyonu
async function updateSystemSettings(settings: {
  defaultDeliveryFee: number;
  defaultCourierFee: number;
  maxServiceRadius: number;
  orderTimeoutSeconds: number;
}) {
  // Bu fonksiyon normalde Firebase'e istek gönderir
  return new Promise<void>((resolve) => {
    // Simüle edilmiş gecikme
    setTimeout(() => {
      resolve();
    }, 1000);
  });
}