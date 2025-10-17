"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  Filter,
  Search,
  Eye,
  ChefHat,
  Package
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  paymentMethod: 'cash' | 'card' | 'online';
  paymentStatus: 'pending' | 'paid' | 'failed';
  orderType: 'delivery' | 'pickup';
  deliveryFee?: number;
  notes?: string;
  estimatedTime?: number;
  createdAt: Date;
  restaurantId: string;
}

const statusConfig = {
  pending: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Onaylandı', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  preparing: { label: 'Hazırlanıyor', color: 'bg-orange-100 text-orange-800', icon: ChefHat },
  ready: { label: 'Hazır', color: 'bg-green-100 text-green-800', icon: Package },
  delivered: { label: 'Teslim Edildi', color: 'bg-gray-100 text-gray-800', icon: Truck },
  cancelled: { label: 'İptal Edildi', color: 'bg-red-100 text-red-800', icon: XCircle }
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Siparişleri yükle
  useEffect(() => {
    if (!user?.uid) return;

    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('restaurantId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as Order[];

      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error('Siparişler yüklenirken hata:', error);
      toast.error('Siparişler yüklenirken hata oluştu');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Filtrelenmiş siparişler
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerPhone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'active' && ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)) ||
                      (activeTab === 'completed' && ['delivered'].includes(order.status)) ||
                      (activeTab === 'cancelled' && order.status === 'cancelled');
    return matchesSearch && matchesStatus && matchesTab;
  });

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus
      });
      toast.success('Sipariş durumu güncellendi');
    } catch (error) {
      console.error('Sipariş durumu güncellenirken hata:', error);
      toast.error('Sipariş durumu güncellenirken hata oluştu');
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const config = statusConfig[status];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getOrderStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      delivered: orders.filter(o => ['delivered'].includes(o.status)).length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalRevenue: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.totalAmount, 0)
    };
    return stats;
  };

  const stats = getOrderStats();

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Siparişler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="ml-6">
          <h1 className="text-2xl font-bold text-gray-900">Siparişler</h1>
          <p className="text-gray-600">Gelen siparişlerinizi yönetin</p>
        </div>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Sipariş ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="pending">Bekliyor</SelectItem>
              <SelectItem value="confirmed">Onaylandı</SelectItem>
              <SelectItem value="preparing">Hazırlanıyor</SelectItem>
              <SelectItem value="ready">Hazır</SelectItem>
              <SelectItem value="delivered">Teslim Edildi</SelectItem>
              <SelectItem value="cancelled">İptal Edildi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Package className="h-6 w-6 text-blue-600 mr-2" />
              <div>
                <p className="text-lg font-bold">{stats.total}</p>
                <p className="text-xs text-gray-600">Toplam</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-yellow-600 mr-2" />
              <div>
                <p className="text-lg font-bold">{stats.pending}</p>
                <p className="text-xs text-gray-600">Bekliyor</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <ChefHat className="h-6 w-6 text-orange-600 mr-2" />
              <div>
                <p className="text-lg font-bold">{stats.preparing}</p>
                <p className="text-xs text-gray-600">Hazırlanıyor</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
              <div>
                <p className="text-lg font-bold">{stats.ready}</p>
                <p className="text-xs text-gray-600">Hazır</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Truck className="h-6 w-6 text-purple-600 mr-2" />
              <div>
                <p className="text-lg font-bold">{stats.delivered}</p>
                <p className="text-xs text-gray-600">Teslim Edildi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-6 w-6 text-green-600 mr-2" />
              <div>
                <p className="text-lg font-bold">₺{stats.totalRevenue.toLocaleString('tr-TR')}</p>
                <p className="text-xs text-gray-600">Toplam Gelir</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Tümü ({orders.length})</TabsTrigger>
          <TabsTrigger value="active">Aktif ({stats.pending + stats.preparing + stats.ready})</TabsTrigger>
          <TabsTrigger value="completed">Tamamlanan ({stats.delivered})</TabsTrigger>
          <TabsTrigger value="cancelled">İptal Edilen ({stats.cancelled})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback>
                        {order.customerName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium">Sipariş #{order.id.slice(-6)}</h3>
                        {getStatusBadge(order.status)}
                        <Badge variant="outline">
                          {order.orderType === 'delivery' ? 'Teslimat' : 'Gel Al'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{order.customerName}</p>
                      <p className="text-xs text-gray-500">
                        {order.createdAt?.toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-bold">₺{order.totalAmount.toLocaleString('tr-TR')}</p>
                      <p className="text-sm text-gray-600">{order.items.length} ürün</p>
                    </div>

                    {/* Status Actions */}
                    <div className="flex space-x-2">
                      {order.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(order.id, 'confirmed')}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(order.id, 'cancelled')}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            İptal
                          </Button>
                        </>
                      )}

                      {order.status === 'confirmed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(order.id, 'preparing')}
                          className="text-orange-600 border-orange-600 hover:bg-orange-50"
                        >
                          Hazırlamaya Başla
                        </Button>
                      )}

                      {order.status === 'preparing' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(order.id, 'ready')}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          Hazır
                        </Button>
                      )}

                      {order.status === 'ready' && order.orderType === 'delivery' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(order.id, 'delivered')}
                          className="text-purple-600 border-purple-600 hover:bg-purple-50"
                        >
                          Teslim Edildi
                        </Button>
                      )}

                      {order.status === 'ready' && order.orderType === 'pickup' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(order.id, 'delivered')}
                          className="text-purple-600 border-purple-600 hover:bg-purple-50"
                        >
                          Teslim Alındı
                        </Button>
                      )}
                    </div>

                    {/* Order Details Dialog */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Sipariş Detayları #{order.id.slice(-6)}</DialogTitle>
                          <DialogDescription>
                            {order.customerName} - {order.createdAt?.toLocaleString('tr-TR')}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                          {/* Customer Info */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-700">Müşteri</label>
                              <p className="text-sm text-gray-900">{order.customerName}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">Telefon</label>
                              <p className="text-sm text-gray-900">{order.customerPhone}</p>
                            </div>
                            <div className="col-span-2">
                              <label className="text-sm font-medium text-gray-700">Adres</label>
                              <p className="text-sm text-gray-900">{order.customerAddress}</p>
                            </div>
                          </div>

                          {/* Order Items */}
                          <div>
                            <label className="text-sm font-medium text-gray-700">Sipariş Ürünleri</label>
                            <div className="mt-2 space-y-2">
                              {order.items.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div>
                                    <p className="font-medium">{item.name}</p>
                                    {item.notes && (
                                      <p className="text-sm text-gray-600">Not: {item.notes}</p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">{item.quantity}x ₺{item.price.toLocaleString('tr-TR')}</p>
                                    <p className="text-sm text-gray-600">₺{(item.price * item.quantity).toLocaleString('tr-TR')}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Order Summary */}
                          <div className="border-t pt-4">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Ara Toplam</span>
                                <span>₺{(order.totalAmount - (order.deliveryFee || 0)).toLocaleString('tr-TR')}</span>
                              </div>
                              {order.deliveryFee && (
                                <div className="flex justify-between">
                                  <span>Teslimat Ücreti</span>
                                  <span>₺{order.deliveryFee.toLocaleString('tr-TR')}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-bold text-lg border-t pt-2">
                                <span>Toplam</span>
                                <span>₺{order.totalAmount.toLocaleString('tr-TR')}</span>
                              </div>
                            </div>
                          </div>

                          {/* Order Notes */}
                          {order.notes && (
                            <div>
                              <label className="text-sm font-medium text-gray-700">Sipariş Notu</label>
                              <p className="text-sm text-gray-900 mt-1 p-3 bg-yellow-50 rounded-lg">
                                {order.notes}
                              </p>
                            </div>
                          )}

                          {/* Payment Info */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-700">Ödeme Yöntemi</label>
                              <p className="text-sm text-gray-900 capitalize">{order.paymentMethod}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">Ödeme Durumu</label>
                              <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                                {order.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'}
                              </Badge>
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
        </TabsContent>
      </Tabs>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sipariş bulunamadı</h3>
          <p className="text-gray-500">Seçilen filtrelere uygun sipariş bulunmuyor.</p>
        </div>
      )}
    </div>
  );
}