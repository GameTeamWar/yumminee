"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { generateUniqueEntityId } from '@/lib/utils/idGenerator';

interface OptionValue {
  id: string;
  name: string;
  price: number;
  isDefault?: boolean;
}

export default function AddOptionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [optionData, setOptionData] = useState({
    name: '',
    description: '',
    type: 'single' as 'single' | 'multiple' | 'text',
    required: false,
    minSelections: 0,
    maxSelections: 1,
    values: [] as OptionValue[],
    isActive: true,
    sortOrder: 0
  });

  const addOptionValue = () => {
    const newValue: OptionValue = {
      id: Date.now().toString(),
      name: '',
      price: 0,
      isDefault: false
    };
    setOptionData(prev => ({
      ...prev,
      values: [...prev.values, newValue]
    }));
  };

  const updateOptionValue = (index: number, field: keyof OptionValue, value: any) => {
    setOptionData(prev => ({
      ...prev,
      values: prev.values.map((val, i) =>
        i === index ? { ...val, [field]: value } : val
      )
    }));
  };

  const removeOptionValue = (index: number) => {
    setOptionData(prev => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.uid) {
      toast.error('Kullanıcı bulunamadı');
      return;
    }

    if (!optionData.name.trim()) {
      toast.error('Opsiyon adı zorunludur');
      return;
    }

    if (optionData.type !== 'text' && optionData.values.length === 0) {
      toast.error('En az bir seçenek eklemelisiniz');
      return;
    }

    try {
      setIsLoading(true);

      // Generate custom ID for the option
      const customId = await generateUniqueEntityId('options', user.uid, db);

      // Prepare option data for Firebase
      const optionToSave = {
        customId,
        name: optionData.name,
        description: optionData.description,
        type: optionData.type,
        required: optionData.required,
        minSelections: optionData.minSelections,
        maxSelections: optionData.maxSelections,
        values: optionData.values,
        isActive: optionData.isActive,
        sortOrder: optionData.sortOrder,
        restaurantId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to Firebase
      await addDoc(collection(db, 'options'), optionToSave);

      toast.success('Opsiyon başarıyla eklendi!');
      router.push('/shop/menu/options');

    } catch (error) {
      console.error('Opsiyon eklenirken hata:', error);
      toast.error('Opsiyon eklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Yeni Opsiyon Ekle</h1>
            <p className="text-gray-600">Ürünlerinize seçenek ekleyin</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Temel Bilgiler</CardTitle>
                <CardDescription>
                  Opsiyonun temel bilgilerini girin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Opsiyon Adı *</Label>
                  <Input
                    id="name"
                    value={optionData.name}
                    onChange={(e) => setOptionData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Örn: Pizza Boyutu"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea
                    id="description"
                    value={optionData.description}
                    onChange={(e) => setOptionData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Opsiyon açıklaması..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Opsiyon Türü *</Label>
                    <Select
                      value={optionData.type}
                      onValueChange={(value: 'single' | 'multiple' | 'text') =>
                        setOptionData(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Tek Seçim</SelectItem>
                        <SelectItem value="multiple">Çoklu Seçim</SelectItem>
                        <SelectItem value="text">Metin Girişi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="sortOrder">Sıralama</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      value={optionData.sortOrder}
                      onChange={(e) => setOptionData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="required"
                    checked={optionData.required}
                    onCheckedChange={(checked) =>
                      setOptionData(prev => ({ ...prev, required: checked as boolean }))
                    }
                  />
                  <Label htmlFor="required">Zorunlu</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={optionData.isActive}
                    onCheckedChange={(checked) =>
                      setOptionData(prev => ({ ...prev, isActive: checked as boolean }))
                    }
                  />
                  <Label htmlFor="isActive">Aktif</Label>
                </div>
              </CardContent>
            </Card>

            {/* Selection Rules */}
            {optionData.type === 'multiple' && (
              <Card>
                <CardHeader>
                  <CardTitle>Seçim Kuralları</CardTitle>
                  <CardDescription>
                    Çoklu seçim için minimum ve maksimum seçim sayılarını belirleyin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="minSelections">Min. Seçim</Label>
                      <Input
                        id="minSelections"
                        type="number"
                        value={optionData.minSelections}
                        onChange={(e) => setOptionData(prev => ({ ...prev, minSelections: parseInt(e.target.value) || 0 }))}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxSelections">Max. Seçim</Label>
                      <Input
                        id="maxSelections"
                        type="number"
                        value={optionData.maxSelections}
                        onChange={(e) => setOptionData(prev => ({ ...prev, maxSelections: parseInt(e.target.value) || 1 }))}
                        min="1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Values */}
          <div className="space-y-6">
            {optionData.type !== 'text' && (
              <Card>
                <CardHeader>
                  <CardTitle>Seçenekler</CardTitle>
                  <CardDescription>
                    Bu opsiyon için kullanılabilecek seçenekleri ekleyin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addOptionValue}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Seçenek Ekle
                    </Button>

                    {optionData.values.map((value, index) => (
                      <div key={value.id} className="flex items-center gap-2 p-3 border rounded-lg">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Seçenek adı"
                            value={value.name}
                            onChange={(e) => updateOptionValue(index, 'name', e.target.value)}
                          />
                          <Input
                            type="number"
                            placeholder="Ek fiyat (₺)"
                            value={value.price}
                            onChange={(e) => updateOptionValue(index, 'price', parseFloat(e.target.value) || 0)}
                            step="0.01"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOptionValue(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {optionData.values.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Henüz seçenek eklenmemiş
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {optionData.type === 'text' && (
              <Card>
                <CardHeader>
                  <CardTitle>Metin Girişi</CardTitle>
                  <CardDescription>
                    Bu opsiyon için müşteriler metin girebilecek
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    Metin girişi tipi seçildiğinde ek seçenek tanımlamaya gerek yoktur.
                    Müşteriler bu alanda serbest metin girebilecekler.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? 'Kaydediliyor...' : 'Opsiyonu Kaydet'}
          </Button>
        </div>
      </form>
    </div>
  );
}
