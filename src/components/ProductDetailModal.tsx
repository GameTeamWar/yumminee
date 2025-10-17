"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Plus,
  Minus,
  ShoppingCart,
  Clock,
  Star,
  AlertTriangle,
  MapPin
} from 'lucide-react';
import { Product, Restaurant } from '@/types';
import { CustomerAddress } from '@/lib/firebase/db';
import { useCart } from '@/contexts/CartContext';
import { getRestaurantStatus } from '@/lib/utils/restaurantHours';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  restaurant: Restaurant | null;
  selectedAddress: CustomerAddress | null;
  onAddressSelect: () => void;
}

export default function ProductDetailModal({
  isOpen,
  onClose,
  product,
  restaurant,
  selectedAddress,
  onAddressSelect
}: ProductDetailModalProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<{[key: string]: string[]}>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showRestaurantClosed, setShowRestaurantClosed] = useState(false);
  const [showAddressRequired, setShowAddressRequired] = useState(false);
  const [optionGroups, setOptionGroups] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setSelectedOptions({});
      setSpecialInstructions('');
      setShowRestaurantClosed(false);
      setShowAddressRequired(false);

      // Opsiyon gruplarını yükle
      if (product.optionIds && product.optionIds.length > 0 && restaurant) {
        const loadOptionGroups = async () => {
          try {
            const optionGroupsData: any[] = [];
            for (const optionId of product.optionIds!) {
              const optionDoc = await getDoc(doc(db, 'restaurants', restaurant.id, 'options', optionId));
              if (optionDoc.exists()) {
                optionGroupsData.push({
                  id: optionDoc.id,
                  ...optionDoc.data()
                });
              }
            }
            setOptionGroups(optionGroupsData);
          } catch (error) {
            console.error('Opsiyon grupları yüklenirken hata:', error);
            setOptionGroups([]);
          }
        };
        loadOptionGroups();
      } else {
        setOptionGroups([]);
      }
    }
  }, [isOpen, product, restaurant]);

  const handleOptionChange = (optionId: string, itemId: string, isMultiple: boolean = false) => {
    setSelectedOptions(prev => {
      const currentSelections = prev[optionId] || [];

      if (isMultiple) {
        // Çoklu seçim için - aynı item zaten varsa kaldır, yoksa ekle
        const isAlreadySelected = currentSelections.includes(itemId);
        if (isAlreadySelected) {
          return {
            ...prev,
            [optionId]: currentSelections.filter(id => id !== itemId)
          };
        } else {
          return {
            ...prev,
            [optionId]: [...currentSelections, itemId]
          };
        }
      } else {
        // Tek seçim için - sadece bu item'i seç
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
    optionGroups.forEach((optionGroup: any) => {
      const selectedItems = selectedOptions[optionGroup.id] || [];
      selectedItems.forEach((itemId: string) => {
        const item = optionGroup.items?.find((i: any) => i.id === itemId);
        if (item && item.price > 0) {
          total += item.price;
        }
      });
    });

    return total * quantity;
  };

  const validateSelections = () => {
    if (!optionGroups || optionGroups.length === 0) return true;

    // Zorunlu opsiyonları kontrol et
    for (const optionGroup of optionGroups) {
      if (optionGroup.isRequired) {
        const selectedItems = selectedOptions[optionGroup.id] || [];
        if (selectedItems.length === 0) {
          toast.error(`${optionGroup.name} seçimi zorunludur`);
          return false;
        }
      }
    }

    return true;
  };

  const handleAddToCart = async () => {
    if (!product || !restaurant) return;

    // Restoran durumu kontrolü
    const { isOpen } = getRestaurantStatus(restaurant);
    if (!isOpen) {
      setShowRestaurantClosed(true);
      return;
    }

    // Adres kontrolü
    if (!selectedAddress) {
      setShowAddressRequired(true);
      return;
    }

    // Opsiyon seçimlerini doğrula
    if (!validateSelections()) return;

    try {
      // Ürünü özelleştirilmiş seçeneklerle sepete ekle
      const customizedProduct = {
        ...product,
        selectedOptions,
        specialInstructions: specialInstructions.trim() || undefined,
        totalPrice: calculateTotalPrice()
      };

      await addToCart(customizedProduct, restaurant.id, restaurant.name);
      toast.success(`${product.name} sepete eklendi!`);
      onClose();
    } catch (error) {
      console.error('Sepete ekleme hatası:', error);
      toast.error('Ürün sepete eklenirken bir hata oluştu');
    }
  };

  const increaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decreaseQuantity = () => {
    setQuantity(prev => prev > 1 ? prev - 1 : 1);
  };

  if (!product || !restaurant) return null;

  const { isOpen: restaurantIsOpen, statusText } = getRestaurantStatus(restaurant);

  return (
    <>
      {/* Ana Ürün Modal */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{product.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Ürün Görseli */}
            <div className="aspect-video bg-gray-100 relative overflow-hidden rounded-lg">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-50 to-orange-200 flex items-center justify-center">
                  <span className="text-orange-400 text-6xl">🍽️</span>
                </div>
              )}
            </div>

            {/* Ürün Bilgileri */}
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                  {product.description && (
                    <p className="text-gray-600 mt-1">{product.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-orange-600">
                    ₺{product.price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Ürün Detayları */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {product.preparationTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{product.preparationTime} dk</span>
                  </div>
                )}
                {!product.isAvailable && (
                  <Badge variant="destructive">Mevcut Değil</Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Opsiyonlar */}
            {optionGroups && optionGroups.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Opsiyonlar</h4>

                {optionGroups.map((optionGroup: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className="font-medium text-gray-900">{optionGroup.name}</h5>
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
                  </div>
                ))}
              </div>
            )}

            {/* Özel Talimatlar */}
            <div className="space-y-2">
              <Label htmlFor="instructions" className="text-sm font-medium">
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
            </div>

            {/* Miktar ve Toplam */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Label className="text-sm font-medium">Miktar:</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="font-bold text-lg min-w-[2rem] text-center">{quantity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={increaseQuantity}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-600">Toplam:</div>
                <div className="text-2xl font-bold text-orange-600">
                  ₺{calculateTotalPrice().toFixed(2)}
                </div>
              </div>
            </div>

            {/* Sepete Ekle Butonu */}
            <Button
              onClick={handleAddToCart}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg"
              disabled={!product.isAvailable}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {!product.isAvailable ? 'Mevcut Değil' : 'Sepete Ekle'}
            </Button>

            {/* Alerjen Bilgileri */}
            {product.allergens && product.allergens.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-yellow-800">Alerjen Uyarısı</h5>
                    <p className="text-sm text-yellow-700 mt-1">
                      Bu ürün şu alerjenleri içerir: {product.allergens.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Restoran Kapalı Modal */}
      <Dialog open={showRestaurantClosed} onOpenChange={() => setShowRestaurantClosed(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-500" />
              Restoran Şu Anda Hizmet Vermiyor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              {restaurant.name} restoranı şu anda {statusText.toLowerCase()}.
              Lütfen çalışma saatleri içinde tekrar deneyin.
            </p>
            <Button
              onClick={() => setShowRestaurantClosed(false)}
              className="w-full"
            >
              Tamam
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adres Gerekli Modal */}
      <Dialog open={showAddressRequired} onOpenChange={() => setShowAddressRequired(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-500" />
              Adres Seçimi Gerekli
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Sipariş verebilmek için önce teslimat adresinizi seçmeniz gerekiyor.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowAddressRequired(false);
                  onAddressSelect();
                }}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                Adres Seç
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddressRequired(false)}
              >
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}