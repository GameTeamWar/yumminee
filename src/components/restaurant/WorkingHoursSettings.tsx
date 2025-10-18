"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { WorkingHours } from '@/lib/utils/restaurantHours';
import {
  closeDayFromSettings,
  openDayFromSettings,
  updateDayWorkingHours,
  setUniformHoursForAllDays,
  setWeekdayHours,
  setWeekendHours
} from '@/lib/utils/restaurantDayManagement';
import { Clock, Save, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WorkingHoursSettingsProps {
  restaurantId: string;
  initialHours: WorkingHours;
  onUpdate?: () => void;
}

const DAYS_TR = {
  monday: 'Pazartesi',
  tuesday: 'Salı',
  wednesday: 'Çarşamba',
  thursday: 'Perşembe',
  friday: 'Cuma',
  saturday: 'Cumartesi',
  sunday: 'Pazar'
};

// Günlerin sıralı listesi
const DAY_ORDER: (keyof WorkingHours)[] = [
  'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday'
];

export default function WorkingHoursSettings({
  restaurantId,
  initialHours,
  onUpdate
}: WorkingHoursSettingsProps) {
  const [hours, setHours] = useState<WorkingHours>(initialHours);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);

  // Props güncellendiğinde state'i güncelle
  useEffect(() => {
    setHours(initialHours);
    setHasChanges(false);
  }, [initialHours]);

  // Değişiklik olduğunda işaretle
  const markAsChanged = () => {
    setHasChanges(true);
  };

  // Bir günün çalışma saatini güncelle
  const updateDayHours = (day: keyof WorkingHours, field: 'open' | 'close', value: string) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
    markAsChanged();
  };

  // Bir günü aç/kapat
  const toggleDay = async (day: keyof WorkingHours) => {
    try {
      setIsSaving(true);
      const currentStatus = hours[day].isClosed;

      if (currentStatus) {
        // Açmak istiyoruz
        await openDayFromSettings(restaurantId, day, hours);
        toast.success(`${DAYS_TR[day]} açıldı`);
      } else {
        // Kapatmak istiyoruz
        await closeDayFromSettings(restaurantId, day, hours);
        toast.success(`${DAYS_TR[day]} kapatıldı`);
      }

      // State'i güncelle
      setHours(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          isClosed: !currentStatus
        }
      }));

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Gün durumu güncellenirken hata:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  // Değişiklikleri kaydet
  const saveChanges = async () => {
    try {
      setIsSaving(true);

      // Her günü tek tek güncelle
      const days: (keyof WorkingHours)[] = [
        'monday', 'tuesday', 'wednesday', 'thursday',
        'friday', 'saturday', 'sunday'
      ];

      for (const day of days) {
        await updateDayWorkingHours(
          restaurantId,
          day,
          hours[day].open,
          hours[day].close,
          hours[day].isClosed,
          hours
        );
      }

      toast.success('Çalışma saatleri güncellendi');
      setHasChanges(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Çalışma saatleri güncellenirken hata:', error);
      toast.error('Güncelleme başarısız oldu');
    } finally {
      setIsSaving(false);
    }
  };

  // Tüm günlere aynı saatleri uygula
  const applyToAllDays = async () => {
    const firstDay = hours.monday;
    if (!firstDay.open || !firstDay.close) {
      toast.error('Önce Pazartesi için saat belirleyin');
      return;
    }

    setShowApplyModal(true);
  };

  // Tüm günlere aynı saatleri uygula (modal onayından sonra)
  const confirmApplyToAllDays = async () => {
    const firstDay = hours.monday;

    try {
      setIsSaving(true);
      setShowApplyModal(false);

      await setUniformHoursForAllDays(
        restaurantId,
        firstDay.open,
        firstDay.close,
        [] // Hiçbir günü kapatma
      );

      // State'i güncelle
      setHours(prev => {
        const newHours = { ...prev };
        DAY_ORDER.forEach(day => {
          newHours[day] = {
            ...newHours[day],
            open: firstDay.open,
            close: firstDay.close
          };
        });
        return newHours;
      });

      toast.success('Tüm günlere uygulandı');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Tüm günlere uygulama hatası:', error);
      toast.error('Uygulama başarısız oldu');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Çalışma Saatleri
        </CardTitle>
        <CardDescription>
          Restoranınızın haftalık çalışma saatlerini ayarlayın. Kapalı günleri işaretleyebilirsiniz.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Hızlı İşlemler */}
          <div className="flex gap-2 p-4 bg-gray-50 rounded-lg">
            <Button
              variant="outline"
              size="sm"
              onClick={applyToAllDays}
              disabled={isSaving}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Pazartesi'yi Tüm Günlere Uygula
            </Button>
          </div>

          {/* Günler */}
          <div className="space-y-3">
            {DAY_ORDER.map((day) => (
              <div
                key={day}
                className={`border rounded-lg p-4 transition-colors ${
                  hours[day].isClosed ? 'bg-gray-50 opacity-60' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Label className="font-semibold min-w-[100px]">
                      {DAYS_TR[day]}
                    </Label>
                    <Switch
                      checked={!hours[day].isClosed}
                      onCheckedChange={() => toggleDay(day)}
                      disabled={isSaving}
                    />
                    <span className="text-sm text-gray-500">
                      {hours[day].isClosed ? 'Kapalı' : 'Açık'}
                    </span>
                  </div>
                </div>

                {!hours[day].isClosed && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <Label className="text-xs text-gray-600">Açılış</Label>
                      <Input
                        type="time"
                        value={hours[day].open}
                        onChange={(e) => updateDayHours(day, 'open', e.target.value)}
                        disabled={isSaving}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Kapanış</Label>
                      <Input
                        type="time"
                        value={hours[day].close}
                        onChange={(e) => updateDayHours(day, 'close', e.target.value)}
                        disabled={isSaving}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Kaydet Butonu */}
          {hasChanges && (
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={saveChanges}
                disabled={isSaving}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </Button>
            </div>
          )}

          {/* Bilgilendirme */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h4 className="font-medium text-blue-900 mb-2">ℹ️ Önemli Bilgiler</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Bir günü kapalı işaretlerseniz, o gün boyunca restoran kapalı kalır</li>
              <li>• Açık günlerde, çalışma saatlerine göre otomatik açılıp kapanırsınız</li>
              <li>• Sidebar'dan geçici kapatma yapabilirsiniz (5-120 dakika arasında)</li>
              <li>• Ayarlardan kapatılan günler kalıcıdır, manuel açmanız gerekir</li>
               <li>• Bir Sorun Yaşama Durumunda Destek Ekibimizden Destek Alabilirsiniz</li>
            </ul>
          </div>
        </div>
      </CardContent>

      {/* Pazartesi Saatlerini Tüm Günlere Uygula Modal */}
      <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tüm Günlere Uygula</DialogTitle>
            <DialogDescription>
              Pazartesi günü çalışma saatlerini ({hours.monday.open} - {hours.monday.close}) tüm günlere uygulamak istediğinizden emin misiniz?
            </DialogDescription>
          </DialogHeader>

         

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyModal(false)}>
              İptal
            </Button>
            <Button
              onClick={confirmApplyToAllDays}
              disabled={isSaving}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSaving ? 'Uygulanıyor...' : 'Tüm Günlere Uygula'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}