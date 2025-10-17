"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Plus, X, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { generateUniqueEntityId } from '@/lib/utils/idGenerator';
import { getRestaurantByOwnerId } from '@/lib/firebase/db';
import { uploadImage } from '@/lib/firebase/storage';

export default function AddProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [newAllergen, setNewAllergen] = useState('');

  // Form state
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    price: '',
    categoryIds: [] as string[],
    optionIds: [] as string[],
    imageUrl: '',
    isAvailable: true,
    preparationTime: '',
    allergens: [] as string[],
    nutritionalInfo: {
      calories: '',
      protein: '',
      carbs: '',
      fat: ''
    }
  });

  // Common allergens
  const commonAllergens = [
    'Fıstık',
    'Ceviz',
    'Badem',
    'Süt',
    'Yumurta',
    'Balık',
    'Kabuklu Deniz Ürünleri',
    'Buğday',
    'Soya',
    'Susam'
  ];

  // Load restaurant and related data
  useEffect(() => {
    if (!user?.uid) return;

    const loadRestaurantData = async () => {
      try {
        // Önce restoranı bul
        const restaurantData = await getRestaurantByOwnerId(user.uid);
        if (!restaurantData) {
          console.error('Restoran bulunamadı');
          return;
        }
        setRestaurant(restaurantData);

        const restaurantId = restaurantData.id;

        // Kategorileri yükle
        const categoriesQuery = query(
          collection(db, 'restaurants', restaurantId, 'categories'),
          where('isActive', '==', true)
        );

        const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
          const categoriesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setCategories(categoriesData);
        });

        // Opsiyonları yükle
        const optionsQuery = query(
          collection(db, 'restaurants', restaurantId, 'options'),
          where('isActive', '==', true)
        );

        const unsubscribeOptions = onSnapshot(optionsQuery, (snapshot) => {
          const optionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setOptions(optionsData);
        });

        return () => {
          unsubscribeCategories();
          unsubscribeOptions();
        };
      } catch (error) {
        console.error('Restoran verileri yüklenirken hata:', error);
      }
    };

    loadRestaurantData();
  }, [user?.uid]);

  const handleAllergenToggle = (allergen: string) => {
    setProductData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }));
  };

  const handleAddAllergen = () => {
    if (newAllergen.trim() && !productData.allergens.includes(newAllergen.trim())) {
      setProductData(prev => ({
        ...prev,
        allergens: [...prev.allergens, newAllergen.trim()]
      }));
      setNewAllergen('');
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setProductData(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId]
    }));
  };

  const handleOptionToggle = (optionId: string) => {
    setProductData(prev => ({
      ...prev,
      optionIds: prev.optionIds.includes(optionId)
        ? prev.optionIds.filter(id => id !== optionId)
        : [...prev.optionIds, optionId]
    }));
  };

  const handleRemoveAllergen = (allergen: string) => {
    setProductData(prev => ({
      ...prev,
      allergens: prev.allergens.filter(a => a !== allergen)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.uid || !restaurant) {
      toast.error('Restoran bilgisi bulunamadı');
      return;
    }

    if (!productData.name || !productData.price || productData.categoryIds.length === 0) {
      toast.error('Lütfen ürün adı, fiyat ve en az bir kategori seçin');
      return;
    }

    try {
      setIsLoading(true);

      // Generate custom ID for the product
      const customId = await generateUniqueEntityId('products', restaurant.id, db);

      // Get selected categories and options
      const selectedCategories = productData.categoryIds.map(id =>
        categories.find(cat => (cat.customId || cat.id) === id)
      ).filter(Boolean);

      const selectedOptions = productData.optionIds.map(id =>
        options.find(opt => (opt.customId || opt.id) === id)
      ).filter(Boolean);

      // Prepare product data for Firebase
      const productToSave = {
        customId,
        name: productData.name,
        description: productData.description,
        price: parseFloat(productData.price),
        categoryIds: productData.categoryIds,
        categoryNames: selectedCategories.map(cat => cat.name),
        optionIds: productData.optionIds,
        optionNames: selectedOptions.map(opt => opt.name),
        imageUrl: productData.imageUrl,
        isAvailable: productData.isAvailable,
        preparationTime: productData.preparationTime ? parseInt(productData.preparationTime) : null,
        allergens: productData.allergens,
        nutritionalInfo: {
          calories: productData.nutritionalInfo.calories ? parseFloat(productData.nutritionalInfo.calories) : null,
          protein: productData.nutritionalInfo.protein ? parseFloat(productData.nutritionalInfo.protein) : null,
          carbs: productData.nutritionalInfo.carbs ? parseFloat(productData.nutritionalInfo.carbs) : null,
          fat: productData.nutritionalInfo.fat ? parseFloat(productData.nutritionalInfo.fat) : null,
        },
        restaurantId: restaurant.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to Firebase
      await addDoc(collection(db, 'products'), productToSave);

      toast.success('Ürün başarıyla eklendi!');
      router.push('/shop/menu/products');

    } catch (error) {
      console.error('Ürün eklenirken hata:', error);
      toast.error('Ürün eklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Önce geçici URL oluştur (yükleme sırasında göstermek için)
      const tempUrl = URL.createObjectURL(file);
      setProductData(prev => ({ ...prev, imageUrl: tempUrl }));

      // Firebase Storage'a yükle
      const imageUrl = await uploadImage(file, 'product', `temp_${Date.now()}`, (progress) => {
        console.log('Upload progress:', progress);
      });

      // Geçici URL'yi gerçek URL ile değiştir
      setProductData(prev => ({ ...prev, imageUrl }));
      toast.success('Resim başarıyla yüklendi');
    } catch (error) {
      console.error('Resim yükleme hatası:', error);
      toast.error('Resim yüklenirken hata oluştu');
      // Hata durumunda geçici URL'yi temizle
      setProductData(prev => ({ ...prev, imageUrl: '' }));
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
            <h1 className="text-2xl font-bold text-gray-900">Yeni Ürün Ekle</h1>
            <p className="text-gray-600">Menünüze yeni bir ürün ekleyin</p>
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
                  Ürününüzün temel bilgilerini girin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Ürün Adı *</Label>
                  <Input
                    id="name"
                    value={productData.name}
                    onChange={(e) => setProductData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Örn: Margarita Pizza"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea
                    id="description"
                    value={productData.description}
                    onChange={(e) => setProductData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Ürününüz hakkında kısa bir açıklama..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Fiyat (₺) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={productData.price}
                      onChange={(e) => setProductData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="29.90"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="preparationTime">Hazırlama Süresi (dk)</Label>
                    <Input
                      id="preparationTime"
                      type="number"
                      value={productData.preparationTime}
                      onChange={(e) => setProductData(prev => ({ ...prev, preparationTime: e.target.value }))}
                      placeholder="30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Kategori *</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex-1 justify-start text-left font-normal"
                          >
                            {(() => {
                              const validCategoryIds = productData.categoryIds.filter(id =>
                                categories.some(cat => (cat.customId || cat.id) === id)
                              );
                              return validCategoryIds.length > 0
                                ? `${validCategoryIds.length} kategori seçildi`
                                : categories.length > 0
                                  ? "Kategori seçilmedi"
                                  : "Önce kategori ekleyin";
                            })()}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">Kategoriler</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {categories.map((category) => (
                                <div key={category.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`category-${category.id}`}
                                    checked={productData.categoryIds.includes(category.customId || category.id)}
                                    onCheckedChange={() => handleCategoryToggle(category.customId || category.id)}
                                  />
                                  <Label
                                    htmlFor={`category-${category.id}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {category.name}
                                  </Label>
                                </div>
                              ))}
                              {categories.length === 0 && (
                                <p className="text-sm text-gray-500">Henüz kategori eklenmemiş</p>
                              )}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/shop/menu/categories')}
                        className="px-3"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="option">Opsiyon (İsteğe bağlı)</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex-1 justify-start text-left font-normal"
                          >
                            {(() => {
                              const validOptionIds = productData.optionIds.filter(id =>
                                options.some(opt => (opt.customId || opt.id) === id)
                              );
                              return validOptionIds.length > 0
                                ? `${validOptionIds.length} opsiyon seçildi`
                                : options.length > 0
                                  ? "Opsiyon seçilmedi"
                                  : "Önce opsiyon ekleyin";
                            })()}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">Opsiyonlar</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {options.map((option) => (
                                <div key={option.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`option-${option.id}`}
                                    checked={productData.optionIds.includes(option.customId || option.id)}
                                    onCheckedChange={() => handleOptionToggle(option.customId || option.id)}
                                  />
                                  <Label
                                    htmlFor={`option-${option.id}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {option.name}
                                  </Label>
                                </div>
                              ))}
                              {options.length === 0 && (
                                <p className="text-sm text-gray-500">Henüz opsiyon eklenmemiş</p>
                              )}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/shop/menu/options')}
                        className="px-3"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isAvailable"
                    checked={productData.isAvailable}
                    onCheckedChange={(checked) =>
                      setProductData(prev => ({ ...prev, isAvailable: checked as boolean }))
                    }
                  />
                  <Label htmlFor="isAvailable">Mevcut</Label>
                </div>
              </CardContent>
            </Card>

            {/* Nutritional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Besin Değerleri (100g için)</CardTitle>
                <CardDescription>
                  İsteğe bağlı: Ürününüzün besin değerlerini belirtin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="calories">Kalori</Label>
                    <Input
                      id="calories"
                      type="number"
                      value={productData.nutritionalInfo.calories}
                      onChange={(e) => setProductData(prev => ({
                        ...prev,
                        nutritionalInfo: { ...prev.nutritionalInfo, calories: e.target.value }
                      }))}
                      placeholder="250"
                    />
                  </div>

                  <div>
                    <Label htmlFor="protein">Protein (g)</Label>
                    <Input
                      id="protein"
                      type="number"
                      step="0.1"
                      value={productData.nutritionalInfo.protein}
                      onChange={(e) => setProductData(prev => ({
                        ...prev,
                        nutritionalInfo: { ...prev.nutritionalInfo, protein: e.target.value }
                      }))}
                      placeholder="15.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="carbs">Karbonhidrat (g)</Label>
                    <Input
                      id="carbs"
                      type="number"
                      step="0.1"
                      value={productData.nutritionalInfo.carbs}
                      onChange={(e) => setProductData(prev => ({
                        ...prev,
                        nutritionalInfo: { ...prev.nutritionalInfo, carbs: e.target.value }
                      }))}
                      placeholder="25.0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fat">Yağ (g)</Label>
                    <Input
                      id="fat"
                      type="number"
                      step="0.1"
                      value={productData.nutritionalInfo.fat}
                      onChange={(e) => setProductData(prev => ({
                        ...prev,
                        nutritionalInfo: { ...prev.nutritionalInfo, fat: e.target.value }
                      }))}
                      placeholder="8.5"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Image and Allergens */}
          <div className="space-y-6">
            {/* Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Ürün Görseli</CardTitle>
                <CardDescription>
                  Ürününüzün yüksek kaliteli bir fotoğrafını yükleyin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productData.imageUrl ? (
                    <div className="relative">
                      <img
                        src={productData.imageUrl}
                        alt="Ürün görseli"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setProductData(prev => ({ ...prev, imageUrl: '' }))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">
                        Ürün görselini sürükleyin veya seçin
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <Label htmlFor="image-upload">
                        <Button type="button" variant="outline" asChild>
                          <span>Görsel Seç</span>
                        </Button>
                      </Label>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Allergens */}
            <Card>
              <CardHeader>
                <CardTitle>Alerjenler</CardTitle>
                <CardDescription>
                  Ürününüzde bulunan alerjenleri seçin veya yeni alerjen ekleyin
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add new allergen */}
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Yeni alerjen ekleyin..."
                    value={newAllergen}
                    onChange={(e) => setNewAllergen(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAllergen())}
                  />
                  <Button
                    type="button"
                    onClick={handleAddAllergen}
                    disabled={!newAllergen.trim()}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Common allergens */}
                <div className="mb-4">
                  <Label className="text-sm font-medium mb-2 block">Yaygın Alerjenler:</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {commonAllergens.map((allergen) => (
                      <div key={allergen} className="flex items-center space-x-2">
                        <Checkbox
                          id={`allergen-${allergen}`}
                          checked={productData.allergens.includes(allergen)}
                          onCheckedChange={() => handleAllergenToggle(allergen)}
                        />
                        <Label
                          htmlFor={`allergen-${allergen}`}
                          className="text-sm cursor-pointer"
                        >
                          {allergen}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected allergens */}
                {productData.allergens.length > 0 && (
                  <div className="mt-4">
                    <Label>Seçilen Alerjenler:</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {productData.allergens.map((allergen) => (
                        <Badge key={allergen} variant="secondary">
                          {allergen}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => handleRemoveAllergen(allergen)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
            {isLoading ? 'Kaydediliyor...' : 'Ürünü Kaydet'}
          </Button>
        </div>
      </form>
    </div>
  );
}