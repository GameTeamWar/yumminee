"use client";

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Minus,
  ShoppingCart,
  Clock,
  Star,
  Heart,
  Share2
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Product } from '@/types';

const Header = dynamic(() => import('@/components/Header'), {
  ssr: false
});

interface ProductOption {
  id: string;
  name: string;
  price: number;
  isRequired: boolean;
  maxSelections: number;
  items: {
    id: string;
    name: string;
    price: number;
    isAvailable: boolean;
  }[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.id as string;
  const productId = params.productId as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<{[key: string]: string[]}>({});
  const [specialInstructions, setSpecialInstructions] = useState('');

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return;

      try {
        setLoading(true);
        const productDoc = await getDoc(doc(db, 'products', productId));

        if (!productDoc.exists()) {
          toast.error('Ürün bulunamadı');
          router.back();
          return;
        }

        const productData = productDoc.data() as Product;
        setProduct(productData);
      } catch (error) {
        console.error('Ürün yüklenirken hata:', error);
        toast.error('Ürün bilgileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId, router]);

  const handleOptionChange = (optionId: string, itemId: string, isMultiple: boolean = false) => {
    setSelectedOptions(prev => {
      const currentSelections = prev[optionId] || [];

      if (isMultiple) {
        // Çoklu seçim için
        if (currentSelections.includes(itemId)) {
          // Seçili ise kaldır
          return {
            ...prev,
            [optionId]: currentSelections.filter(id => id !== itemId)
          };
        } else {
          // Seçili değilse ekle
          return {
            ...prev,
            [optionId]: [...currentSelections, itemId]
          };
        }
      } else {
        // Tek seçim için
        return {
          ...prev,
          [optionId]: [itemId]
        };
      }
    });
  };

  const calculateTotalPrice = () => {
    if (!product) return 0;

    let total = product.price;

    // Seçilen opsiyonların fiyatlarını ekle
    Object.entries(selectedOptions).forEach(([optionId, selectedItems]) => {
      selectedItems.forEach(itemId => {
        // Burada opsiyon verilerini kullanarak fiyat hesaplaması yapılacak
        // Şimdilik basit bir hesaplama
        total += 0; // Gerçek implementasyonda opsiyon fiyatı eklenecek
      });
    });

    return total * quantity;
  };

  const handleAddToCart = () => {
    if (!product) return;

    // Sepet işlemleri burada yapılacak
    // Şimdilik sadece toast göster
    toast.success(`${product.name} sepete eklendi!`);

    // Ana sayfaya dön
    router.push(`/shops/${restaurantId}`);
  };

  const increaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decreaseQuantity = () => {
    setQuantity(prev => prev > 1 ? prev - 1 : 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Ürün yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ürün Bulunamadı</h1>
          <p className="text-gray-600 mb-4">Aradığınız ürün mevcut değil.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <Header />
      </Suspense>

      {/* Ana İçerik */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Geri Butonu */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sol Taraf - Ürün Görseli */}
            <div className="space-y-4">
              <Card className="overflow-hidden">
                <div className="aspect-square bg-gray-100 relative">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-50 to-orange-200 flex items-center justify-center">
                      <span className="text-orange-400 text-8xl">🍽️</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Küçük Aksiyon Butonları */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Heart className="h-4 w-4 mr-2" />
                  Favorilere Ekle
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Share2 className="h-4 w-4 mr-2" />
                  Paylaş
                </Button>
              </div>
            </div>

            {/* Sağ Taraf - Ürün Detayları */}
            <div className="space-y-6">
              {/* Ürün Başlığı ve Fiyat */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-3xl font-bold text-orange-600">₺{product.price.toFixed(2)}</span>
                  {product.preparationTime && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {product.preparationTime} dk
                    </Badge>
                  )}
                </div>

                {/* Ürün Açıklaması */}
                {product.description && (
                  <p className="text-gray-600 leading-relaxed">{product.description}</p>
                )}
              </div>

              <Separator />

              {/* Opsiyonlar */}
              {product.options && product.options.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Opsiyonlar</h3>

                  {product.options.map((optionGroup: any, index: number) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{optionGroup.name}</h4>
                          {optionGroup.isRequired && (
                            <span className="text-sm text-red-600">* Zorunlu</span>
                          )}
                        </div>
                        {optionGroup.maxSelections > 1 && (
                          <span className="text-sm text-gray-500">
                            Max {optionGroup.maxSelections} seçim
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {optionGroup.maxSelections === 1 ? (
                          // Tek seçim (radio)
                          <RadioGroup
                            value={selectedOptions[optionGroup.id]?.[0] || ''}
                            onValueChange={(value) => handleOptionChange(optionGroup.id, value)}
                          >
                            {optionGroup.items?.map((item: any) => (
                              <div key={item.id} className="flex items-center space-x-3">
                                <RadioGroupItem value={item.id} id={item.id} />
                                <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                                  <div className="flex justify-between items-center">
                                    <span>{item.name}</span>
                                    {item.price > 0 && (
                                      <span className="text-orange-600 font-medium">
                                        +₺{item.price.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        ) : (
                          // Çoklu seçim (checkbox)
                          optionGroup.items?.map((item: any) => (
                            <div key={item.id} className="flex items-center space-x-3">
                              <Checkbox
                                id={item.id}
                                checked={selectedOptions[optionGroup.id]?.includes(item.id) || false}
                                onCheckedChange={() => handleOptionChange(optionGroup.id, item.id, true)}
                              />
                              <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                                <div className="flex justify-between items-center">
                                  <span>{item.name}</span>
                                  {item.price > 0 && (
                                    <span className="text-orange-600 font-medium">
                                      +₺{item.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Özel Talimatlar */}
              <Card className="p-4">
                <Label htmlFor="instructions" className="text-sm font-medium mb-2 block">
                  Özel Talimatlar (İsteğe bağlı)
                </Label>
                <textarea
                  id="instructions"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Özel isteklerinizi yazın..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={3}
                />
              </Card>

              {/* Miktar ve Sepete Ekle */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-sm font-medium">Miktar</Label>
                  <div className="flex items-center space-x-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                      className="h-10 w-10 p-0"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-bold text-lg min-w-[2rem] text-center">{quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={increaseQuantity}
                      className="h-10 w-10 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold">Toplam:</span>
                  <span className="text-2xl font-bold text-orange-600">
                    ₺{calculateTotalPrice().toFixed(2)}
                  </span>
                </div>

                <Button
                  onClick={handleAddToCart}
                  className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg"
                  size="lg"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Sepete Ekle
                </Button>
              </Card>

              {/* Alerjen Bilgileri */}
              {product.allergens && product.allergens.length > 0 && (
                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <h4 className="font-medium text-yellow-800 mb-2">⚠️ Alerjen Uyarısı</h4>
                  <p className="text-sm text-yellow-700">
                    Bu ürün şu alerjenleri içerir: {product.allergens.join(', ')}
                  </p>
                </Card>
              )}

              {/* Besin Değerleri */}
              {product.nutritionalInfo && (
                <Card className="p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Besin Değerleri (100g için)</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {product.nutritionalInfo.calories && (
                      <div>
                        <span className="text-gray-600">Kalori:</span>
                        <span className="font-medium ml-2">{product.nutritionalInfo.calories} kcal</span>
                      </div>
                    )}
                    {product.nutritionalInfo.protein && (
                      <div>
                        <span className="text-gray-600">Protein:</span>
                        <span className="font-medium ml-2">{product.nutritionalInfo.protein}g</span>
                      </div>
                    )}
                    {product.nutritionalInfo.carbs && (
                      <div>
                        <span className="text-gray-600">Karbonhidrat:</span>
                        <span className="font-medium ml-2">{product.nutritionalInfo.carbs}g</span>
                      </div>
                    )}
                    {product.nutritionalInfo.fat && (
                      <div>
                        <span className="text-gray-600">Yağ:</span>
                        <span className="font-medium ml-2">{product.nutritionalInfo.fat}g</span>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}