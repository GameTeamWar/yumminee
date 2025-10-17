"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Monitor, AlertTriangle, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

const MultiTabHelpModal: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Çoklu Sekme ve Oturum Yönetimi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Firebase Sınırlamaları */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-2" />
              <h3 className="font-semibold text-amber-900">Firebase Güvenlik Sınırlaması</h3>
            </div>
            <div className="space-y-2 text-amber-800">
              <div className="flex items-start">
                <XCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">Aynı Rolde Tek Oturum</p>
                  <p className="text-sm">Güvenlik nedeniyle aynı email ile aynı rolde sadece bir aktif oturum olabilir</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">Farklı Roller İçin Çoklu Sekme</p>
                  <p className="text-sm">Aynı email ile farklı roller için ayrı sekmelerde oturum açabilirsiniz</p>
                </div>
              </div>
            </div>
          </div>

          {/* Önerilen Kullanım */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Monitor className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="font-semibold text-blue-900">Önerilen Kullanım Şekli</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="bg-white rounded p-3 border border-blue-200">
                <div className="text-lg mb-2">👤</div>
                <h4 className="font-medium text-gray-900">Sekme 1: Müşteri</h4>
                <p className="text-sm text-gray-600">Restoranları gör, sipariş ver, favorilerini yönet</p>
              </div>
              <div className="bg-white rounded p-3 border border-blue-200">
                <div className="text-lg mb-2">🏪</div>
                <h4 className="font-medium text-gray-900">Sekme 2: Restoran</h4>
                <p className="text-sm text-gray-600">Siparişleri yönet, menü düzenle, raporları incele</p>
              </div>
              <div className="bg-white rounded p-3 border border-blue-200">
                <div className="text-lg mb-2">🚚</div>
                <h4 className="font-medium text-gray-900">Sekme 3: Kurye</h4>
                <p className="text-sm text-gray-600">Teslimatları takip et, konum güncelle</p>
              </div>
            </div>
          </div>

          {/* Nasıl Çalışır */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Nasıl Çalışır?</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</div>
                <div>
                  <p className="font-medium">Farklı Sekmeler Açın</p>
                  <p className="text-sm text-gray-600">Ayrı sekmelerde uygulamayı açın</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</div>
                <div>
                  <p className="font-medium">Rol Seçin</p>
                  <p className="text-sm text-gray-600">Header'dan farklı roller seçin</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</div>
                <div>
                  <p className="font-medium">Aynı Anda Çalışın</p>
                  <p className="text-sm text-gray-600">Farklı panellerde eş zamanlı çalışın</p>
                </div>
              </div>
            </div>
          </div>

          {/* İpuçları */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-3">💡 İpuçları</h3>
            <ul className="space-y-1 text-green-800 text-sm">
              <li>• Header'da aktif sekme sayısı gösterilir</li>
              <li>• Bir sekmede çıkış yaparsanız diğerleri etkilenmez</li>
              <li>• Rol değiştirirken sadece mevcut olduğunuz roller görünür</li>
              <li>• localStorage ile sekmeler arası iletişim sağlanır</li>
              <li>• Toast mesajları ile oturum değişiklikleri bildirilir</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MultiTabHelpModal;