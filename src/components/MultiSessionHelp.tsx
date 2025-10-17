"use client";

import React from 'react';
import { Monitor, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const MultiSessionHelp: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Çoklu Oturum ve Sekme Yönetimi
        </h1>
        <p className="text-lg text-gray-600">
          Yummine platformunda farklı sekmelerde nasıl çalışabileceğinizi öğrenin
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Firebase Sınırlamaları */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-yellow-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Firebase Sınırlamaları</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start">
              <XCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Aynı Rolde Çoklu Oturum</p>
                <p className="text-sm text-gray-600">Aynı email ile aynı rolde sadece bir aktif oturum olabilir</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Farklı Roller</p>
                <p className="text-sm text-gray-600">Aynı email ile farklı roller için ayrı sekmelerde oturum açabilirsiniz</p>
              </div>
            </div>
          </div>
        </div>

        {/* Önerilen Kullanım */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Monitor className="h-6 w-6 text-blue-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Önerilen Kullanım</h2>
          </div>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-medium text-gray-900">Sekme 1: Müşteri</h3>
              <p className="text-sm text-gray-600">Restoranları gör, sipariş ver, favorilerini yönet</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-medium text-gray-900">Sekme 2: Restoran Sahibi</h3>
              <p className="text-sm text-gray-600">Siparişleri yönet, menü düzenle, raporları incele</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-medium text-gray-900">Sekme 3: Kurye</h3>
              <p className="text-sm text-gray-600">Teslimatları takip et, konum güncelle</p>
            </div>
          </div>
        </div>
      </div>

      {/* Nasıl Çalışır */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Nasıl Çalışır?</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-blue-600 font-bold">1</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Farklı Sekmeler Açın</h3>
            <p className="text-sm text-gray-600">Ayrı sekmelerde uygulamayı açın</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-green-600 font-bold">2</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Rol Seçin</h3>
            <p className="text-sm text-gray-600">Header'dan farklı roller seçin</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-purple-600 font-bold">3</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Aynı Anda Çalışın</h3>
            <p className="text-sm text-gray-600">Farklı panellerde eş zamanlı çalışın</p>
          </div>
        </div>
      </div>

      {/* İpuçları */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">💡 İpuçları</h2>
        <ul className="space-y-2 text-blue-800">
          <li>• Header'da aktif sekme sayısı gösterilir</li>
          <li>• Bir sekmede çıkış yaparsanız diğerleri etkilenmez</li>
          <li>• Rol değiştirirken sadece mevcut olduğunuz roller görünür</li>
          <li>• Farklı roller için localStorage ile iletişim sağlanır</li>
          <li>• Güvenlik için aynı rolde çoklu oturum engellenmiştir</li>
        </ul>
      </div>
    </div>
  );
};

export default MultiSessionHelp;