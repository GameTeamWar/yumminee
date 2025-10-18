"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Search,
  Filter,
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Star,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRestaurantByOwnerId, Shop } from '@/lib/firebase/db';

// Mock customers data
const customers = [
  {
    id: '1',
    name: 'Ahmet Yılmaz',
    email: 'ahmet.yilmaz@email.com',
    phone: '+90 555 123 4567',
    avatar: '',
    totalOrders: 12,
    totalSpent: 345.50,
    avgOrderValue: 28.79,
    lastOrder: '2025-10-07',
    favoriteItems: ['Margherita Pizza', 'Köfte Burger'],
    rating: 4.8,
    status: 'active',
    address: 'Kadıköy, İstanbul'
  },
  {
    id: '2',
    name: 'Ayşe Kaya',
    email: 'ayse.kaya@email.com',
    phone: '+90 555 234 5678',
    avatar: '',
    totalOrders: 8,
    totalSpent: 234.00,
    avgOrderValue: 29.25,
    lastOrder: '2025-10-06',
    favoriteItems: ['Çiğ Köfte', 'Baklava'],
    rating: 4.5,
    status: 'active',
    address: 'Beşiktaş, İstanbul'
  },
  {
    id: '3',
    name: 'Mehmet Demir',
    email: 'mehmet.demir@email.com',
    phone: '+90 555 345 6789',
    avatar: '',
    totalOrders: 5,
    totalSpent: 156.75,
    avgOrderValue: 31.35,
    lastOrder: '2025-10-05',
    favoriteItems: ['Pepperoni Pizza'],
    rating: 3.2,
    status: 'active',
    address: 'Şişli, İstanbul'
  },
  {
    id: '4',
    name: 'Fatma Çelik',
    email: 'fatma.celik@email.com',
    phone: '+90 555 456 7890',
    avatar: '',
    totalOrders: 15,
    totalSpent: 412.25,
    avgOrderValue: 27.48,
    lastOrder: '2025-10-04',
    favoriteItems: ['Lahmacun', 'Çiğ Köfte'],
    rating: 4.9,
    status: 'vip',
    address: 'Üsküdar, İstanbul'
  },
  {
    id: '5',
    name: 'Ali Öztürk',
    email: 'ali.ozturk@email.com',
    phone: '+90 555 567 8901',
    avatar: '',
    totalOrders: 3,
    totalSpent: 89.50,
    avgOrderValue: 29.83,
    lastOrder: '2025-10-03',
    favoriteItems: ['Köfte Burger'],
    rating: 4.0,
    status: 'new',
    address: 'Kartal, İstanbul'
  }
];

export default function CustomersPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const panelId = searchParams.get('panel');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'vip':
        return <Badge className="bg-purple-100 text-purple-800">VIP</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Aktif</Badge>;
      case 'new':
        return <Badge className="bg-blue-100 text-blue-800">Yeni</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Pasif</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Müşteriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Müşteriler</h1>
          <p className="text-gray-600">Müşteri bilgilerini görüntüleyin ve yönetin</p>
        </div>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Müşterilerde ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="new">Yeni</SelectItem>
              <SelectItem value="inactive">Pasif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{customers.length}</p>
                <p className="text-sm text-gray-600">Toplam Müşteri</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">₺{customers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString('tr-TR')}</p>
                <p className="text-sm text-gray-600">Toplam Gelir</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{customers.reduce((sum, c) => sum + c.totalOrders, 0)}</p>
                <p className="text-sm text-gray-600">Toplam Sipariş</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">
                  {(customers.reduce((sum, c) => sum + c.rating, 0) / customers.length).toFixed(1)}
                </p>
                <p className="text-sm text-gray-600">Ort. Puan</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={customer.avatar} />
                    <AvatarFallback>
                      {customer.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-lg">{customer.name}</h3>
                      {getStatusBadge(customer.status)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-1" />
                        {customer.email}
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {customer.phone}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {customer.address}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{customer.totalOrders}</p>
                    <p className="text-sm text-gray-600">Sipariş</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">₺{customer.totalSpent.toLocaleString('tr-TR')}</p>
                    <p className="text-sm text-gray-600">Toplam</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      {renderStars(customer.rating)}
                    </div>
                    <p className="text-sm text-gray-600">{customer.rating}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {new Date(customer.lastOrder).toLocaleDateString('tr-TR')}
                    </p>
                    <p className="text-xs text-gray-500">Son Sipariş</p>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{customer.name} - Detaylı Bilgiler</DialogTitle>
                        <DialogDescription>
                          Müşteri bilgileri ve sipariş geçmişi
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-6">
                        {/* Customer Info */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Ad Soyad</label>
                            <p className="text-sm text-gray-900">{customer.name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">E-posta</label>
                            <p className="text-sm text-gray-900">{customer.email}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Telefon</label>
                            <p className="text-sm text-gray-900">{customer.phone}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Adres</label>
                            <p className="text-sm text-gray-900">{customer.address}</p>
                          </div>
                        </div>

                        {/* Statistics */}
                        <div className="grid grid-cols-4 gap-4">
                          <Card>
                            <CardContent className="p-4 text-center">
                              <p className="text-2xl font-bold">{customer.totalOrders}</p>
                              <p className="text-sm text-gray-600">Toplam Sipariş</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <p className="text-2xl font-bold">₺{customer.totalSpent.toLocaleString('tr-TR')}</p>
                              <p className="text-sm text-gray-600">Toplam Harcama</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <p className="text-2xl font-bold">₺{customer.avgOrderValue.toFixed(2)}</p>
                              <p className="text-sm text-gray-600">Ort. Sipariş</p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="flex items-center justify-center mb-1">
                                {renderStars(customer.rating)}
                              </div>
                              <p className="text-sm text-gray-600">{customer.rating} puan</p>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Favorite Items */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">Favori Ürünler</label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {customer.favoriteItems.map((item, index) => (
                              <Badge key={index} variant="secondary">{item}</Badge>
                            ))}
                          </div>
                        </div>

                        {/* Recent Orders */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">Son Siparişler</label>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">Sipariş #{customer.id}-001</p>
                                <p className="text-sm text-gray-600">Margherita Pizza, Köfte Burger</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">₺45.50</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(customer.lastOrder).toLocaleDateString('tr-TR')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Müşteri bulunamadı</h3>
          <p className="text-gray-500">Arama kriterlerinize uygun müşteri bulunmuyor.</p>
        </div>
      )}
    </div>
  );
}