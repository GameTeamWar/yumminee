"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Plus,
  Minus,
  ShoppingCart,
  X,
  AlertTriangle
} from 'lucide-react';
import { Product, Restaurant } from '@/types';
import { CustomerAddress } from '@/lib/firebase/db';
import { useCart } from '@/contexts/CartContext';
import { getRestaurantStatus } from '@/lib/utils/restaurantHours';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  restaurant: Restaurant | null;
  selectedAddress: CustomerAddress | null;
  onAddressSelect: () => void;
  options?: any[];
}

export default function ProductDetailModal({
  isOpen,
  onClose,
  product,
  restaurant,
  selectedAddress,
  onAddressSelect,
  options = []
}: ProductDetailModalProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<{[key: string]: string[]}>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showRestaurantClosed, setShowRestaurantClosed] = useState(false);
  const [showAddressRequired, setShowAddressRequired] = useState(false);
  const [optionGroups, setOptionGroups] = useState<any[]>([]);
  const [showReportDropdown, setShowReportDropdown] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setSelectedOptions({});
      setSpecialInstructions('');
      setShowRestaurantClosed(false);
      setShowAddressRequired(false);

      // Opsiyonları kontrol et - önce ürünün kendisindeki options'ı dene, yoksa prop'tan geleni kullan
      if (product.options && product.options.length > 0) {
        setOptionGroups(product.options);
      } else if (product.optionIds && product.optionIds.length > 0 && options.length > 0) {
        const productOptions = options.filter(option => product.optionIds!.includes(option.customId));
        setOptionGroups(productOptions);
      } else {
        setOptionGroups([]);
      }
    }
  }, [isOpen, product, options]);

  const handleOptionChange = (optionId: string, itemId: string, isMultiple: boolean = false) => {
    setSelectedOptions(prev => {
      const currentSelections = prev[optionId] || [];

      if (isMultiple) {
        // Çoklu seçim için
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
    optionGroups.forEach((optionGroup: any) => {
      const selectedItems = selectedOptions[optionGroup.id] || [];
      selectedItems.forEach((itemId: string) => {
        const item = optionGroup.values?.find((i: any) => i.id === itemId);
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
      if (optionGroup.required) {
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

  const handleReport = (reason: string) => {
    toast.success(`"${reason}" şikayeti bildirildi. Teşekkür ederiz!`);
    setShowReportDropdown(false);
  };

  if (!product || !restaurant) return null;

  const { isOpen: restaurantIsOpen, statusText } = getRestaurantStatus(restaurant);

  return (
    <>
      {/* Ana Ürün Modal */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
          <div className="flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="px-6 py-5 border-b border-neutral-lighter">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Ürün Detayları
              </DialogTitle>
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Ürün Görseli ve Temel Bilgiler */}
              <div className="flex gap-4 mb-6">
                <div className="flex-shrink-0">
                  <img
                    src={product.imageUrl || '/images/products/default.jpg'}
                    alt={product.name}
                    className="w-32 h-32 object-cover rounded-lg border border-neutral-lighter"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-600 break-words">{product.description || ''}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-orange-600">
                        {product.price.toFixed(2)} TL
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-sm text-gray-500 line-through">
                          {product.originalPrice.toFixed(2)} TL
                        </span>
                      )}
                    </div>
                    <DropdownMenu open={showReportDropdown} onOpenChange={setShowReportDropdown}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Bildir
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-80 p-4" align="end">
                        <div className="caption text-neutral-dark mb-3">Şikayet Nedenini Seçin</div>
                        <DropdownMenuItem
                          onClick={() => handleReport('Haksız fiyatlandırma / fiyat hatalı')}
                          className="cursor-pointer rounded-pill px-4 py-2 hover:bg-primary-contrast"
                        >
                          Haksız fiyatlandırma / fiyat hatalı
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleReport('Ürün seçenekleri eksik / hatalı')}
                          className="cursor-pointer rounded-pill px-4 py-2 hover:bg-primary-contrast"
                        >
                          Ürün seçenekleri eksik / hatalı
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleReport('Ürün ismi veya açıklaması eksik / hatalı')}
                          className="cursor-pointer rounded-pill px-4 py-2 hover:bg-primary-contrast"
                        >
                          Ürün ismi veya açıklaması eksik / hatalı
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleReport('Ürün görseli hatalı')}
                          className="cursor-pointer rounded-pill px-4 py-2 hover:bg-primary-contrast"
                        >
                          Ürün görseli hatalı
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Opsiyonlar */}
              {optionGroups && optionGroups.length > 0 && (
                <div className="space-y-5 mb-6">
                  {optionGroups.map((optionGroup: any, index: number) => (
                    <div key={index} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold text-gray-900">
                          {optionGroup.name}
                        </Label>
                        {optionGroup.required && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                            Zorunlu
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        {optionGroup.maxSelections === 1 ? (
                          // Tek seçim - Select
                          <Select
                            value={selectedOptions[optionGroup.id]?.[0] || ''}
                            onValueChange={(value) => handleOptionChange(optionGroup.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={`${optionGroup.name} seçin`} />
                            </SelectTrigger>
                            <SelectContent>
                              {optionGroup.values?.map((item: any) => (
                                <SelectItem key={item.id} value={item.id}>
                                  <div className="flex justify-between items-center w-full">
                                    <span>{item.name}</span>
                                    {item.price > 0 && (
                                      <span className="text-orange-600 font-medium ml-2">
                                        +{item.price.toFixed(2)} TL
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          // Çoklu seçim - Checkbox'lar
                          <div className="space-y-2">
                            {optionGroup.values?.map((item: any) => (
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
                                        +{item.price.toFixed(2)} TL
                                      </span>
                                    )}
                                  </div>
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Özel Talimatlar */}
              <div className="space-y-3 mb-6">
                <Label htmlFor="instructions" className="text-sm font-medium">
                  Özel Talimatlar (İsteğe bağlı)
                </Label>
                <Textarea
                  id="instructions"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 200))} // 200 karakter limiti
                  placeholder="Özel isteklerinizi yazın..."
                  className="resize-none"
                  rows={3}
                />
                <div className="text-xs text-gray-500 text-right">
                  {specialInstructions.length}/200 karakter
                </div>
              </div>
            </div>

            {/* Alt Kısım - Miktar, Toplam, Butonlar */}
            <div className="border-t border-neutral-lighter px-6 py-4 bg-white">
              <div className="flex items-center justify-between">
                {/* Miktar Seçimi */}
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium">Miktar:</Label>
                  <div className="flex items-center border border-neutral-lighter rounded-lg">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                      className="h-8 w-8 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
                      {quantity}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={increaseQuantity}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Toplam Fiyat */}
                <div className="text-right">
                  <div className="text-sm text-gray-600">Toplam</div>
                  <div className="text-lg font-bold text-orange-600">
                    {calculateTotalPrice().toFixed(2)} TL
                  </div>
                </div>
              </div>

              {/* Sepet Butonları */}
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={handleAddToCart}
                  className="flex-1"
                  disabled={!product.isAvailable}
                >
                  Hızlı Sipariş
                </Button>
                <Button
                  onClick={handleAddToCart}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={!product.isAvailable}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Sepete Ekle
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restoran Kapalı Modal */}
      <Dialog open={showRestaurantClosed} onOpenChange={() => setShowRestaurantClosed(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
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
              <AlertTriangle className="h-5 w-5 text-orange-500" />
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