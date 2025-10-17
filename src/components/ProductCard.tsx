"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCartStore } from '@/lib/store/cart-store';
import { ProductOption } from '@/types';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  options?: ProductOption[];
}

interface ProductCardProps {
  product: Product;
  restaurantId: string;
}

const ProductCard = ({ product, restaurantId }: ProductCardProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<ProductOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  
  const addItem = useCartStore((state) => state.addItem);
  
  const handleAddToCart = () => {
    addItem(restaurantId, {
      productId: product.id,
      name: product.name,
      price: product.price,
      options: selectedOptions.length > 0 ? selectedOptions : undefined
    });
    
    toast.success('Ürün sepete eklendi');
    setIsDialogOpen(false);
    setSelectedOptions([]);
    setQuantity(1);
  };
  
  const toggleOption = (option: ProductOption) => {
    if (selectedOptions.find(opt => opt.id === option.id)) {
      setSelectedOptions(selectedOptions.filter(opt => opt.id !== option.id));
    } else {
      setSelectedOptions([...selectedOptions, option]);
    }
  };
  
  const calculateTotalPrice = () => {
    let total = product.price * quantity;
    selectedOptions.forEach(option => {
      total += option.price * quantity;
    });
    return total;
  };
  
  const isOptionSelected = (optionId: string) => {
    return selectedOptions.some(opt => opt.id === optionId);
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => setIsDialogOpen(true)}>
        <div className="flex h-full">
          <div className="flex-1 p-4">
            <h3 className="font-semibold mb-1">{product.name}</h3>
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
            <div className="mt-auto">
              <span className="font-medium">{product.price.toFixed(2)} TL</span>
              {product.options && product.options.length > 0 && (
                <span className="text-xs text-gray-500 ml-1">+ seçenekler</span>
              )}
            </div>
          </div>
          
          <div className="relative w-24 h-24 bg-gray-100">
            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
              <span className="text-xs text-gray-500">{product.name}</span>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Ürün Detay Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
            <DialogDescription>
              {product.description}
            </DialogDescription>
          </DialogHeader>
          
          {/* Ürün Görseli */}
          <div className="relative h-48 w-full mb-4 bg-gray-200">
            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">{product.name} Görsel</span>
            </div>
          </div>
          
          {/* Ürün Seçenekleri */}
          {product.options && product.options.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Seçenekler</h4>
              <div className="space-y-2">
                {product.options.map((option) => (
                  <div key={option.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id={`option-${option.id}`}
                        checked={isOptionSelected(option.id)}
                        onCheckedChange={() => toggleOption(option)}
                      />
                      <Label htmlFor={`option-${option.id}`}>{option.name}</Label>
                    </div>
                    <span className="text-sm">+{option.price.toFixed(2)} TL</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Miktar */}
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">Miktar</span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                disabled={quantity <= 1} 
                onClick={() => setQuantity(quantity - 1)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center">{quantity}</span>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <div className="w-full flex justify-between items-center">
              <span className="font-medium">Toplam:</span>
              <span className="font-bold">{calculateTotalPrice().toFixed(2)} TL</span>
            </div>
            
            <Button className="w-full" onClick={handleAddToCart}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Sepete Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductCard;