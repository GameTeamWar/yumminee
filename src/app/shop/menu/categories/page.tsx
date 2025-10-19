"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Grid3X3,
  List,
  Save
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { generateUniqueEntityId } from '@/lib/utils/idGenerator';
import { getRestaurantByOwnerId, deleteCategoryAndUpdateProducts } from '@/lib/firebase/db';

interface Category {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  restaurantId: string;
  customId: string; // 11-digit unique identifier
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
    sortOrder: 0
  });

  // Kategorileri yükle
  useEffect(() => {
    if (!user?.uid) return;

    const loadRestaurantAndCategories = async () => {
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
        const categoriesRef = collection(db, 'categories');
        const q = query(
          categoriesRef,
          where('shopId', '==', restaurantId),
          orderBy('sortOrder', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const categoriesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Category[];

          setCategories(categoriesData);
          setLoading(false);
        }, (error) => {
          console.error('Kategoriler yüklenirken hata:', error);
          toast.error('Kategoriler yüklenirken hata oluştu');
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Restoran verileri yüklenirken hata:', error);
        setLoading(false);
      }
    };

    loadRestaurantAndCategories();
  }, [user?.uid]);

  // Filtrelenmiş kategoriler
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && category.isActive) ||
                         (statusFilter === 'inactive' && !category.isActive);
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.uid || !restaurant) {
      toast.error('Kullanıcı veya restoran bilgisi bulunamadı');
      return;
    }

    try {
      let categoryData: any = {
        ...formData,
        shopId: restaurant.id
      };

      if (editingCategory) {
        // Güncelleme - customId'yi koru
        categoryData.customId = editingCategory.customId;
        await updateDoc(doc(db, 'categories', editingCategory.id), categoryData);
        toast.success('Kategori güncellendi');
      } else {
        // Yeni kategori - custom ID oluştur
        const customId = await generateUniqueEntityId('categories', restaurant.id, db);
        categoryData.customId = customId;
        await addDoc(collection(db, 'categories'), categoryData);
        toast.success('Kategori eklendi');
      }

      // Formu sıfırla
      setFormData({
        name: '',
        isActive: true,
        sortOrder: categories.length
      });
      setEditingCategory(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Kategori kaydedilirken hata:', error);
      toast.error('Kategori kaydedilirken hata oluştu');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      isActive: category.isActive,
      sortOrder: category.sortOrder
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!user?.uid) {
      toast.error('Kullanıcı bilgisi bulunamadı');
      return;
    }

    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve bu kategoriye ait ürünler kategorisiz kalacaktır.')) return;

    try {
      await deleteCategoryAndUpdateProducts(user.uid, categoryId);
      toast.success('Kategori silindi ve ilgili ürünler güncellendi');
    } catch (error) {
      console.error('Kategori silinirken hata:', error);
      toast.error('Kategori silinirken hata oluştu');
    }
  };

  const toggleCategoryStatus = async (category: Category) => {
    try {
      await updateDoc(doc(db, 'categories', category.id), {
        isActive: !category.isActive
      });
      toast.success(`Kategori ${!category.isActive ? 'aktif' : 'pasif'} yapıldı`);
    } catch (error) {
      console.error('Kategori durumu güncellenirken hata:', error);
      toast.error('Kategori durumu güncellenirken hata oluştu');
    }
  };

  const openAddDialog = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      isActive: true,
      sortOrder: categories.length
    });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Kategoriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="ml-6">
          <h1 className="text-2xl font-bold text-gray-900">Kategori Yönetimi</h1>
          <p className="text-gray-600">Menü kategorilerinizi yönetin</p>
        </div>
        <div className="flex space-x-2">
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Kategori
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Kategori ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Pasif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Grid3X3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-sm text-gray-600">Toplam Kategori</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-2xl font-bold">{categories.filter(c => c.isActive).length}</p>
                <p className="text-sm text-gray-600">Aktif Kategori</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                <div className="h-2 w-2 bg-red-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-2xl font-bold">{categories.filter(c => !c.isActive).length}</p>
                <p className="text-sm text-gray-600">Pasif Kategori</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <List className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredCategories.length}</p>
                <p className="text-sm text-gray-600">Filtrelenmiş</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium text-lg">{category.name}</h3>
                      <Badge variant={category.isActive ? 'default' : 'secondary'}>
                        {category.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                    <p className="text-xs text-gray-500">Sıra: {category.sortOrder}</p>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {category.imageUrl && (
                  <div className="mb-4">
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Switch
                    checked={category.isActive}
                    onCheckedChange={() => toggleCategoryStatus(category)}
                  />
                  <span className="text-xs text-gray-500">
                    Sıra: {category.sortOrder}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <Card key={category.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {category.imageUrl && (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{category.name}</h3>
                        <Badge variant={category.isActive ? 'default' : 'secondary'}>
                          {category.isActive ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Sıra: {category.sortOrder}</span>
                    <Switch
                      checked={category.isActive}
                      onCheckedChange={() => toggleCategoryStatus(category)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Grid3X3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Kategori bulunamadı</h3>
          <p className="text-gray-500">Arama kriterlerinize uygun kategori bulunmuyor.</p>
        </div>
      )}

      {/* Add/Edit Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
            </DialogTitle>
            <DialogDescription>
              Kategori bilgilerini doldurun.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Kategori Adı *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Örn: Ana Yemekler"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sıralama</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Aktif/Pasif</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <span className="text-sm">{formData.isActive ? 'Aktif' : 'Pasif'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                İptal
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                {editingCategory ? 'Güncelle' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}