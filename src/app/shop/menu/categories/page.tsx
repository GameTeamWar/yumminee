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
          where('restaurantId', '==', restaurantData.ownerId || restaurantData.id),
          orderBy('sortOrder', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const categoriesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Category[];

          // Sıralamaya göre sırala
          categoriesData.sort((a, b) => a.sortOrder - b.sortOrder);

          setCategories(categoriesData);
          setLoading(false);
        }, (error) => {
          console.error('Kategoriler yüklenirken hata:', error);
          toast.error('Kategoriler yüklenirken hata oluştu');
          setLoading(false);
        });

        // Bağlantı hatası durumunda yeniden bağlanma
        const reconnectTimeout = setTimeout(() => {
          if (!categories.length) {
            console.log('Kategoriler yüklenemedi, yeniden deneniyor...');
            // Yeniden yükleme işlemi
          }
        }, 10000);

        return () => {
          unsubscribe();
          clearTimeout(reconnectTimeout);
        };
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
        restaurantId: restaurant.ownerId || restaurant.id
      };

      if (editingCategory) {
        // Güncelleme - customId'yi koru
        categoryData.customId = editingCategory.customId;
        await updateDoc(doc(db, 'categories', editingCategory.id), categoryData);
        toast.success('Kategori güncellendi');
      } else {
        // Yeni kategori - custom ID oluştur
        const customId = await generateUniqueEntityId('categories', restaurant.ownerId || restaurant.id, db);
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Kategoriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Kategori Yönetimi</h1>
          <p className="text-muted-foreground text-lg">Menü kategorilerinizi yönetin ve düzenleyin</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2 bg-white/80 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-9 w-9 p-0"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-9 w-9 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={openAddDialog}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 rounded-lg font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Yeni Kategori Ekle
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-3xl font-bold text-blue-900">{categories.length}</p>
                <p className="text-sm font-medium text-blue-700">Toplam Kategori</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl shadow-sm">
                <Grid3X3 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-3xl font-bold text-green-900">{categories.filter(c => c.isActive).length}</p>
                <p className="text-sm font-medium text-green-700">Aktif Kategori</p>
              </div>
              <div className="p-3 bg-green-500 rounded-xl shadow-sm">
                <div className="h-3 w-3 bg-white rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-3xl font-bold text-red-900">{categories.filter(c => !c.isActive).length}</p>
                <p className="text-sm font-medium text-red-700">Pasif Kategori</p>
              </div>
              <div className="p-3 bg-red-500 rounded-xl shadow-sm">
                <div className="h-3 w-3 bg-white rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-3xl font-bold text-purple-900">{filteredCategories.length}</p>
                <p className="text-sm font-medium text-purple-700">Filtrelenmiş</p>
              </div>
              <div className="p-3 bg-purple-500 rounded-xl shadow-sm">
                <List className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Kategori adı ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-base border-gray-200 focus:border-blue-300 focus:ring-blue-200 rounded-lg"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-56 h-12 border-gray-200 focus:border-blue-300 focus:ring-blue-200 rounded-lg">
                <SelectValue placeholder="Durum seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                <SelectItem value="active">Aktif Kategoriler</SelectItem>
                <SelectItem value="inactive">Pasif Kategoriler</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Categories Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="shadow-sm border-0 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-200 group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="font-semibold text-lg text-gray-900 capitalize">{category.name}</h3>
                      <Badge variant={category.isActive ? "default" : "secondary"} className={`text-xs px-2 py-1 ${category.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {category.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 leading-relaxed">{category.description || 'Açıklama yok'}</p>
                    <p className="text-xs text-gray-500 font-medium">Sıra: {category.sortOrder}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                      className="h-9 w-9 p-0 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors duration-150"
                      title="Kategoriyi düzenle"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                      className="h-9 w-9 p-0 hover:bg-red-100 text-red-600 rounded-lg transition-colors duration-150"
                      title="Kategoriyi sil"
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
                      className="w-full h-32 object-cover rounded-xl shadow-sm"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={category.isActive}
                      onCheckedChange={() => toggleCategoryStatus(category)}
                      className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {category.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                    #{category.sortOrder}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="shadow-sm border-0 bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {category.imageUrl ? (
                      <div className="relative group">
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="w-16 h-16 object-cover rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-200"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                        <Grid3X3 className="w-7 h-7 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900 capitalize">{category.name}</h3>
                        <Badge variant={category.isActive ? "default" : "secondary"} className={`text-xs px-2 py-1 ${category.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {category.isActive ? 'Aktif' : 'Pasif'}
                        </Badge>
                        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md font-medium">
                          #{category.sortOrder}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{category.description || 'Açıklama yok'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center space-x-3">
                      <Switch
                        checked={category.isActive}
                        onCheckedChange={() => toggleCategoryStatus(category)}
                        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700 min-w-[40px]">
                        {category.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        className="h-10 w-10 p-0 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors duration-150"
                        title="Kategoriyi düzenle"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                        className="h-10 w-10 p-0 hover:bg-red-100 text-red-600 rounded-lg transition-colors duration-150"
                        title="Kategoriyi sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredCategories.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-6">
            <Grid3X3 className="h-12 w-12 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            {searchTerm || statusFilter !== 'all'
              ? 'Arama kriterlerinize uygun kategori bulunamadı'
              : 'Henüz kategori eklenmemiş'
            }
          </h3>
          <p className="text-muted-foreground text-base mb-6 max-w-md mx-auto">
            {searchTerm || statusFilter !== 'all'
              ? 'Filtrelerinizi değiştirerek farklı kategoriler arayabilirsiniz.'
              : 'İlk kategorinizi ekleyerek menünüzü organize etmeye başlayın.'
            }
          </p>
          {(!searchTerm && statusFilter === 'all') && (
            <Button
              onClick={openAddDialog}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 rounded-lg font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              İlk Kategoriyi Ekle
            </Button>
          )}
        </div>
      )}

      {/* Add/Edit Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md border-0 shadow-xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              Kategori bilgilerini doldurun ve kaydedin.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">Kategori Adı *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Örn: Ana Yemekler"
                required
                className="h-12 border-gray-200 focus:border-blue-300 focus:ring-blue-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="sortOrder" className="text-sm font-medium text-gray-700">Sıralama</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                  min="0"
                  className="h-12 border-gray-200 focus:border-blue-300 focus:ring-blue-200 rounded-lg"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">Durum</Label>
                <div className="flex items-center justify-between h-12 px-4 py-3 border border-gray-200 rounded-lg bg-gray-50">
                  <span className="text-sm font-medium text-gray-700">
                    {formData.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="px-6 py-2 h-11 border-gray-200 hover:bg-gray-50 rounded-lg"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2 h-11 rounded-lg font-medium"
              >
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