"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Plus, X, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, query, where, onSnapshot, getDoc, collection } from 'firebase/firestore';
import { getRestaurantByOwnerId } from '@/lib/firebase/db';
import { uploadImage } from '@/lib/firebase/storage';

export default function EditProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [newAllergen, setNewAllergen] = useState('');
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    isRemovable: true,
    isDefault: true,
    price: ''
  });
  const [originalProductPrice, setOriginalProductPrice] = useState<number | null>(null);

  // Form state
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    categoryIds: [] as string[],
    optionIds: [] as string[],
    ingredients: [] as Ingredient[],
    imageUrl: '',
    isAvailable: true,
    preparationTime: '',
    brand: '',
    vatRate: '',
    specialCategory: '',
    allergens: [] as string[]
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

  interface Ingredient {
    id: string;
    name: string;
    isRemovable: boolean;
    isDefault: boolean;
    price?: number;
  }

  // Load restaurant and related data
  useEffect(() => {
    if (!user?.uid || !productId) return;

    const loadData = async () => {
      try {
        setIsLoadingData(true);

        // Önce restoranı bul
        const restaurantData = await getRestaurantByOwnerId(user.uid);
        if (!restaurantData) {
          console.error('Restoran bulunamadı');
          return;
        }
        setRestaurant(restaurantData);
        const restaurantId = restaurantData.id;

        // Ürün verilerini yükle
        const productDoc = await getDoc(doc(db, 'products', productId));
        if (!productDoc.exists()) {
          toast.error('Ürün bulunamadı');
          router.push('/shop/menu/products?panel=' + new URLSearchParams(window.location.search).get('panel'));
          return;
        }

        const product = productDoc.data();
        const originalPrice = product.price;
        setOriginalProductPrice(originalPrice);
        setProductData({
          name: product.name || '',
          description: product.description || '',
          price: product.price?.toString() || '',
          originalPrice: product.originalPrice?.toString() || '',
          categoryIds: product.categoryIds || [],
          optionIds: product.optionIds || [],
          ingredients: product.ingredients || [],
          imageUrl: product.imageUrl || '',
          isAvailable: product.isAvailable !== false,
          preparationTime: product.preparationTime?.toString() || '',
          brand: product.brand || '',
          vatRate: product.vatRate?.toString() || '',
          specialCategory: product.specialCategory || '',
          allergens: product.allergens || []
        });

        // Kategorileri yükle
        const categoriesQuery = query(
          collection(db, 'categories'),
          where('restaurantId', '==', restaurantData.ownerId || restaurantData.id),
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
          collection(db, 'options'),
          where('restaurantId', '==', restaurantData.id),
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
        console.error('Veri yüklenirken hata:', error);
        toast.error('Veri yüklenirken hata oluştu');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [user?.uid, productId]);

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

  const handleAddIngredient = () => {
    if (!newIngredient.name.trim()) return;

    const ingredient: Ingredient = {
      id: Date.now().toString(),
      name: newIngredient.name.trim(),
      isRemovable: newIngredient.isRemovable,
      isDefault: newIngredient.isDefault,
      price: newIngredient.price ? parseFloat(newIngredient.price) : undefined
    };

    setProductData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, ingredient]
    }));

    setNewIngredient({
      name: '',
      isRemovable: true,
      isDefault: true,
      price: ''
    });
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    setProductData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(ing => ing.id !== ingredientId)
    }));
  };

  const handleUpdateIngredient = (ingredientId: string, field: keyof Ingredient, value: any) => {
    setProductData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(ing =>
        ing.id === ingredientId ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.uid || !restaurant || !productId) {
      toast.error('Gerekli bilgiler bulunamadı');
      return;
    }

    if (!productData.name || !productData.price || productData.categoryIds.length === 0) {
      toast.error('Lütfen ürün adı, fiyat ve en az bir kategori seçin');
      return;
    }

    try {
      setIsLoading(true);

      // Get selected categories and options
      const selectedCategories = (productData.categoryIds || []).map(id =>
        categories.find(cat => cat.id === id)
      ).filter(Boolean);

      const selectedOptions = (productData.optionIds || []).map(id =>
        options.find(opt => opt.id === id)
      ).filter(Boolean);

      // Prepare product data for Firebase - ensure no undefined values
      const productToUpdate: any = {
        name: productData.name || '',
        description: productData.description || '',
        price: parseFloat(productData.price) || 0,
        originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : null,
        categoryIds: productData.categoryIds || [],
        categoryNames: selectedCategories.map(cat => cat?.name).filter(Boolean) || [],
        optionIds: productData.optionIds || [],
        optionNames: selectedOptions.map(opt => opt?.name).filter(Boolean) || [],
        ingredients: (productData.ingredients || []).map(ing => ({
          id: ing?.id || '',
          name: ing?.name || '',
          isRemovable: ing?.isRemovable || false,
          isDefault: ing?.isDefault || false,
          price: ing?.price || null
        })),
        imageUrl: productData.imageUrl || '',
        isActive: productData.isAvailable !== false,
        preparationTime: productData.preparationTime ? parseInt(productData.preparationTime) : null,
        brand: productData.brand || null,
        vatRate: productData.vatRate ? parseInt(productData.vatRate) : null,
        specialCategory: productData.specialCategory || null,
        allergens: productData.allergens || [],
        updatedAt: new Date()
      };

      // Remove any undefined values from the object
      Object.keys(productToUpdate).forEach(key => {
        if (productToUpdate[key] === undefined) {
          delete productToUpdate[key];
        }
      });

      // Update in Firebase
      await updateDoc(doc(db, 'products', productId), productToUpdate);

      toast.success('Ürün başarıyla güncellendi!');
      router.push('/shop/menu/products?panel=' + new URLSearchParams(window.location.search).get('panel'));

    } catch (error) {
      console.error('Ürün güncellenirken hata:', error);
      toast.error('Ürün güncellenirken bir hata oluştu');
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

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Ürün bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Ürün Düzenle</h1>
            <p className="text-gray-600">Ürün bilgilerini güncelleyin</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ürün Bilgileri */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ürün Bilgileri</CardTitle>
              <div className="flex items-center space-x-2">
                <Label htmlFor="isAvailable">Satışa Açık</Label>
                <Switch
                  id="isAvailable"
                  checked={productData.isAvailable}
                  onCheckedChange={(checked) =>
                    setProductData(prev => ({ ...prev, isAvailable: checked }))
                  }
                />
              </div>
            </div>
            <CardDescription>
              Ürün adının net olması, ürün açıklamasının detaylı yapılması ve ürünün fotoğraflarının bulunması, müşterilerin ne sipariş vereceğine karar vermelerine yardımcı olur ve satışları artırır!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Ürün Adı ve Fiyat */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="mb-2">Ürün Adı *</Label>
                <Input
                  id="name"
                  value={productData.name}
                  onChange={(e) => setProductData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ürün Adı Giriniz"
                  required
                  className="capitalize"
                />
              </div>
              <div>
                <Label htmlFor="price" className="mb-2">Satış Fiyatı *</Label>
                <div className="flex items-center gap-4">
                  <Input
                  className='w-41'
                    id="price"
                    type="number"
                    step="0.01"
                    value={productData.price}
                    onChange={(e) => {
                      const newPrice = e.target.value;
                      setProductData(prev => ({
                        ...prev,
                        price: newPrice,
                        originalPrice: originalProductPrice && parseFloat(newPrice) < originalProductPrice
                          ? originalProductPrice.toString()
                          : prev.originalPrice
                      }));
                    }}
                    placeholder="0.00"
                    required
                  />
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-orange-500 text-white border-orange-500">
                      Uygulamada görünen fiyatlardır.
                    </Badge>
                    {originalProductPrice && parseFloat(productData.price || '0') < originalProductPrice && (
                      <Badge variant="destructive" className="text-xs text-white">
                        İndirim uygulandı!
                      </Badge>
                    )}
                  </div>
                </div>
                {originalProductPrice && parseFloat(productData.price || '0') < originalProductPrice && (
                  <p className="text-sm text-gray-600 mt-1">
                    Önceki fiyat: <span className="line-through text-red-500">{originalProductPrice.toFixed(2)} ₺</span>
                  </p>
                )}
              </div>
              
            </div>

            {/* Hazırlama Süresi */}
            <div>
              <Label htmlFor="preparationTime" className="mb-2">Ürün Hazırlama Süresi (dakika)</Label>
              <Input
               className='w-52'  
                id="preparationTime"
                type="number"
                min="0"
                value={productData.preparationTime}
                onChange={(e) => setProductData(prev => ({ ...prev, preparationTime: e.target.value }))}
                placeholder="örn: 15"
              />
            </div>

            {/* Ürün Görseli */}
            <div>
              <Label className="mb-2">Ürün Görseli</Label>
              <div className="flex gap-4 mt-2">
                <div>
                  {productData.imageUrl ? (
                    <div className="relative">
                      <img
                        src={productData.imageUrl}
                        alt="Ürün görseli"
                        className="w-36 h-36 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => setProductData(prev => ({ ...prev, imageUrl: '' }))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-36 h-36 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 text-center">Görsel Ekle</p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <Label htmlFor="image-upload" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" className="mt-2">
                          Dosya Seç
                        </Button>
                      </Label>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Dosya Boyutu:</span>
                    <span className="text-muted-foreground ml-1">10 MB'a kadar JPG veya PNG</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Gereken Minimum Pixel:</span>
                    <span className="font-medium ml-1">Genişlik için 375px, yükseklik için 375px</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Ürün Açıklaması */}
            <div>
              <Label htmlFor="description" className="mb-2">Ürün Açıklaması</Label>
              <Textarea
                id="description"
                value={productData.description}
                onChange={(e) => setProductData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ürün Açıklaması Giriniz"
                rows={5}
              />
            </div>

            {/* Malzemeler */}
            <div>
              <Label className="mb-2">Ürün Malzemeleri</Label>
              <Card className="border border-gray-200">
                <CardContent className="p-4">
                  {/* Yeni malzeme ekleme */}
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <Input
                          placeholder="Malzeme adı"
                          value={newIngredient.name}
                          onChange={(e) => setNewIngredient(prev => ({ ...prev, name: e.target.value }))}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddIngredient())}
                          className="capitalize"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Ek fiyat (opsiyonel)"
                          value={newIngredient.price}
                          onChange={(e) => setNewIngredient(prev => ({ ...prev, price: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={handleAddIngredient}
                          disabled={!newIngredient.name.trim()}
                          size="sm"
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Ekle
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isDefault"
                          checked={newIngredient.isDefault}
                          onCheckedChange={(checked) => setNewIngredient(prev => ({ ...prev, isDefault: checked as boolean }))}
                        />
                        <Label htmlFor="isDefault" className="text-sm">
                          <span className="font-medium">Varsayılan dahil</span>
                          <span className="text-gray-500 text-xs block">Ürünle birlikte gelir</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isRemovable"
                          checked={newIngredient.isRemovable}
                          onCheckedChange={(checked) => setNewIngredient(prev => ({ ...prev, isRemovable: checked as boolean }))}
                        />
                        <Label htmlFor="isRemovable" className="text-sm">
                          <span className="font-medium">Müşteri çıkarabilir</span>
                          <span className="text-gray-500 text-xs block">Müşteri bu malzemeyi çıkarabilir</span>
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Mevcut malzemeler */}
                  {productData.ingredients.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Eklenen Malzemeler:</Label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {productData.ingredients.map((ingredient) => (
                          <div key={ingredient.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{ingredient.name}</span>
                                {ingredient.price && ingredient.price > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    +₺{ingredient.price.toFixed(2)}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center space-x-1">
                                  <Checkbox
                                    id={`default-${ingredient.id}`}
                                    checked={ingredient.isDefault}
                                    onCheckedChange={(checked) => handleUpdateIngredient(ingredient.id, 'isDefault', checked)}
                                  />
                                  <Label htmlFor={`default-${ingredient.id}`} className="text-xs">
                                    <span className="font-medium">Varsayılan</span>
                                    <span className="text-gray-500 block">Ürünle gelir</span>
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Checkbox
                                    id={`removable-${ingredient.id}`}
                                    checked={ingredient.isRemovable}
                                    onCheckedChange={(checked) => handleUpdateIngredient(ingredient.id, 'isRemovable', checked)}
                                  />
                                  <Label htmlFor={`removable-${ingredient.id}`} className="text-xs">
                                    <span className="font-medium">Çıkarılabilir</span>
                                    <span className="text-gray-500 block">Müşteri çıkarabilir</span>
                                  </Label>
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveIngredient(ingredient.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {productData.ingredients.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <p className="text-sm">Henüz malzeme eklenmemiş</p>
                      <p className="text-xs mt-1">Ürününüze malzeme ekleyerek müşterilerin kişiselleştirme yapmasını sağlayın</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Kategoriler */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="category" className="mb-2">Ürünün Bulunduğu Kategori *</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 justify-start text-left font-normal"
                      >
                        {(() => {
                          const validCategoryIds = productData.categoryIds.filter(id =>
                            categories.some(cat => cat.id === id)
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
                                checked={productData.categoryIds.includes(category.id)}
                                onCheckedChange={() => handleCategoryToggle(category.id)}
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
                    onClick={() => router.push('/shop/menu/categories?panel=' + new URLSearchParams(window.location.search).get('panel'))}
                    className="px-3"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Opsiyonlar */}
              <div>
                <Label htmlFor="options" className="mb-2">Ürün Opsiyonları</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 justify-start text-left font-normal"
                      >
                        {(() => {
                          const validOptionIds = productData.optionIds.filter(id =>
                            options.some(opt => opt.id === id)
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
                                checked={productData.optionIds.includes(option.id)}
                                onCheckedChange={() => handleOptionToggle(option.id)}
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
                    onClick={() => router.push('/shop/menu/options?panel=' + new URLSearchParams(window.location.search).get('panel'))}
                    className="px-3"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* <div>
                <Label htmlFor="specialCategory">Ürünün Özel Menü Kategorisi</Label>
                <Select value={productData.specialCategory} onValueChange={(value) => setProductData(prev => ({ ...prev, specialCategory: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coca-cola">Coca-Cola Doyuran Menüleri</SelectItem>
                    <SelectItem value="algida">Avantajlı Algida Menüleri</SelectItem>
                  </SelectContent>
                </Select>
              </div> */}
            </div>

            {/* Marka ve KDV */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brand" className="mb-2">Ürünün Markası</Label>
                <Select value={productData.brand} onValueChange={(value) => setProductData(prev => ({ ...prev, brand: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pepsi">Pepsi</SelectItem>
                    <SelectItem value="coca-cola">Coca Cola</SelectItem>
                    <SelectItem value="tropicana">Tropicana</SelectItem>
                    <SelectItem value="fruko">Fruko</SelectItem>
                    <SelectItem value="yedigun">Yedigün</SelectItem>
                    <SelectItem value="7up">7up</SelectItem>
                    <SelectItem value="lipton">Lipton Ice Tea</SelectItem>
                    <SelectItem value="damla">Damla</SelectItem>
                    <SelectItem value="sprite">Sprite</SelectItem>
                    <SelectItem value="fanta">Fanta</SelectItem>
                    <SelectItem value="cappy">Cappy</SelectItem>
                    <SelectItem value="fusetea">Fusetea</SelectItem>
                    <SelectItem value="burn">Burn</SelectItem>
                    <SelectItem value="monster">Monster Energy</SelectItem>
                    <SelectItem value="powerade">Powerade</SelectItem>
                    <SelectItem value="schweppes">Schweppes</SelectItem>
                    <SelectItem value="aquafina">Aquafina</SelectItem>
                    <SelectItem value="predator">Predator</SelectItem>
                    <SelectItem value="cola-turka">Cola Turka</SelectItem>
                    <SelectItem value="algida">Algida</SelectItem>
                    <SelectItem value="yumurta">Yumurta</SelectItem>
                    <SelectItem value="kuruyemis">Kuruyemiş</SelectItem>
                    <SelectItem value="manav">Manav</SelectItem>
                    <SelectItem value="meze">Meze</SelectItem>
                    <SelectItem value="firin">Fırın</SelectItem>
                    <SelectItem value="kaplan">Kaplan</SelectItem>
                    <SelectItem value="mezeturk">Mezetürk</SelectItem>
                    <SelectItem value="sozen">Sözen</SelectItem>
                    <SelectItem value="pastoral">Pastoral Mandıra</SelectItem>
                    <SelectItem value="esendag">Esendağ</SelectItem>
                    <SelectItem value="sahin">Şahin Avm</SelectItem>
                    <SelectItem value="sosyete">Sosyete Manavı</SelectItem>
                    <SelectItem value="dubai">Dubai Fusion</SelectItem>
                    <SelectItem value="apart">Apart</SelectItem>
                    <SelectItem value="ekmekcioglu">Ekmekçioğlu</SelectItem>
                    <SelectItem value="nutmaster">Nutmaster</SelectItem>
                    <SelectItem value="sekerci">Şekerci Mustafa</SelectItem>
                    <SelectItem value="mixflor">Mixflor</SelectItem>
                    <SelectItem value="bionero">bionero</SelectItem>
                    <SelectItem value="teakina">teakina</SelectItem>
                    <SelectItem value="apero">Apero</SelectItem>
                    <SelectItem value="ekodia">Ekodia</SelectItem>
                    <SelectItem value="koffo">Koffo</SelectItem>
                    <SelectItem value="hero">HERO</SelectItem>
                    <SelectItem value="oymak">Oymak</SelectItem>
                    <SelectItem value="altintas">Altıntaş</SelectItem>
                    <SelectItem value="ilica">ILICA</SelectItem>
                    <SelectItem value="akel">Akel</SelectItem>
                    <SelectItem value="bereketli">Bereketli</SelectItem>
                    <SelectItem value="desni">Desni</SelectItem>
                    <SelectItem value="kozlu">Kozlu Yumurta</SelectItem>
                    <SelectItem value="tema">Tema</SelectItem>
                    <SelectItem value="oznur">Öznur Gıda</SelectItem>
                    <SelectItem value="emin">Emin Karlıdağ</SelectItem>
                    <SelectItem value="mutlukal">Mutlukal</SelectItem>
                    <SelectItem value="turk-seker">Türk Şeker</SelectItem>
                    <SelectItem value="arslanzade">Arslanzade</SelectItem>
                    <SelectItem value="qclean">Qclean</SelectItem>
                    <SelectItem value="spon">Spon</SelectItem>
                    <SelectItem value="tiyum">Tiyum</SelectItem>
                    <SelectItem value="toruna">Toruna Kasap</SelectItem>
                    <SelectItem value="nesil">Nesil Gıda</SelectItem>
                    <SelectItem value="odeyyo">Odeyyo</SelectItem>
                    <SelectItem value="asya">ASYA</SelectItem>
                    <SelectItem value="tezcanlar">Tezcanlar</SelectItem>
                    <SelectItem value="akyudum">Akyudum</SelectItem>
                    <SelectItem value="cute-cat">Cute cat</SelectItem>
                    <SelectItem value="berry-life">Berry Life</SelectItem>
                    <SelectItem value="manga">Manga</SelectItem>
                    <SelectItem value="renart">Renart</SelectItem>
                    <SelectItem value="turcel">Turcel Market</SelectItem>
                    <SelectItem value="la-mere">La Mere Poulard</SelectItem>
                    <SelectItem value="viora">Viora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="vatRate" className="mb-2">KDV Oranı</Label>
                <Select value={productData.vatRate} onValueChange={(value) => setProductData(prev => ({ ...prev, vatRate: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerjenler */}
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
                className="capitalize"
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

        {/* Submit Button */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6 -mb-6 mt-8 shadow-lg">
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
              {isLoading ? 'Güncelleniyor...' : 'Ürünü Güncelle'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}