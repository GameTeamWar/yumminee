"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Mock data for reports
const salesData = [
  { date: '2025-10-01', orders: 45, revenue: 1250.50, customers: 38 },
  { date: '2025-10-02', orders: 52, revenue: 1450.75, customers: 42 },
  { date: '2025-10-03', orders: 38, revenue: 980.25, customers: 31 },
  { date: '2025-10-04', orders: 61, revenue: 1680.00, customers: 55 },
  { date: '2025-10-05', orders: 49, revenue: 1320.50, customers: 41 },
  { date: '2025-10-06', orders: 55, revenue: 1520.75, customers: 47 },
  { date: '2025-10-07', orders: 43, revenue: 1180.25, customers: 36 },
];

const topProducts = [
  { name: 'Margherita Pizza', orders: 45, revenue: 2025.00 },
  { name: 'Köfte Burger', orders: 32, revenue: 1040.00 },
  { name: 'Çiğ Köfte', orders: 28, revenue: 784.00 },
  { name: 'Baklava', orders: 25, revenue: 625.00 },
  { name: 'Lahmacun', orders: 22, revenue: 528.00 },
];

const customerStats = {
  total: 1247,
  new: 89,
  returning: 1158,
  avgOrderValue: 28.50,
  avgOrdersPerCustomer: 3.2
};

export default function ReportsPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('7days');
  const [reportType, setReportType] = useState('sales');

  const totalRevenue = salesData.reduce((sum, day) => sum + day.revenue, 0);
  const totalOrders = salesData.reduce((sum, day) => sum + day.orders, 0);
  const totalCustomers = salesData.reduce((sum, day) => sum + day.customers, 0);
  const avgOrderValue = totalRevenue / totalOrders;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="ml-6">
          <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
          <p className="text-gray-600">İşletmenizin performansını analiz edin</p>
        </div>
        <div className="flex space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Son 7 Gün</SelectItem>
              <SelectItem value="30days">Son 30 Gün</SelectItem>
              <SelectItem value="90days">Son 90 Gün</SelectItem>
              <SelectItem value="1year">Son 1 Yıl</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Dışa Aktar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">₺{totalRevenue.toLocaleString('tr-TR')}</p>
                <p className="text-sm text-gray-600">Toplam Gelir</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12.5%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{totalOrders}</p>
                <p className="text-sm text-gray-600">Toplam Sipariş</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8.2%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{totalCustomers}</p>
                <p className="text-sm text-gray-600">Toplam Müşteri</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +15.3%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">₺{avgOrderValue.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Ortalama Sipariş</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +5.1%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs value={reportType} onValueChange={setReportType} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales">Satış Raporu</TabsTrigger>
          <TabsTrigger value="products">Ürün Raporu</TabsTrigger>
          <TabsTrigger value="customers">Müşteri Raporu</TabsTrigger>
          <TabsTrigger value="performance">Performans</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Günlük Satış Grafiği</CardTitle>
              <CardDescription>
                Son 7 gündeki satış trendinizi görüntüleyin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Grafik burada görüntülenecek</p>
                  <p className="text-sm text-gray-400">Chart.js veya benzeri kütüphane ile entegre edilebilir</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Günlük Detaylar</CardTitle>
              <CardDescription>
                Günlük satış ve sipariş detayları
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Tarih</th>
                      <th className="text-left py-2">Sipariş</th>
                      <th className="text-left py-2">Gelir</th>
                      <th className="text-left py-2">Müşteri</th>
                      <th className="text-left py-2">Ort. Sipariş</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.map((day) => (
                      <tr key={day.date} className="border-b">
                        <td className="py-2">{new Date(day.date).toLocaleDateString('tr-TR')}</td>
                        <td className="py-2">{day.orders}</td>
                        <td className="py-2">₺{day.revenue.toLocaleString('tr-TR')}</td>
                        <td className="py-2">{day.customers}</td>
                        <td className="py-2">₺{(day.revenue / day.orders).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>En Çok Satan Ürünler</CardTitle>
              <CardDescription>
                Bu dönemdeki en popüler ürünleriniz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-600 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-gray-600">{product.orders} sipariş</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₺{product.revenue.toLocaleString('tr-TR')}</p>
                      <p className="text-sm text-gray-600">₺{(product.revenue / product.orders).toFixed(2)} ort.</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">{customerStats.total.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Toplam Müşteri</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">{customerStats.new}</p>
                    <p className="text-sm text-gray-600">Yeni Müşteri</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">₺{customerStats.avgOrderValue.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Ort. Sipariş Değeri</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Müşteri Dağılımı</CardTitle>
              <CardDescription>
                Yeni ve tekrar eden müşterilerinizin dağılımı
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>Yeni Müşteriler</span>
                  </div>
                  <span className="font-bold">{customerStats.new}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Tekrar Eden Müşteriler</span>
                  </div>
                  <span className="font-bold">{customerStats.returning}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sipariş Hazırlama Süreleri</CardTitle>
                <CardDescription>
                  Ortalama hazırlama süreleriniz
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Ortalama Hazırlama</span>
                    <Badge>24 dk</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>En Hızlı</span>
                    <Badge variant="secondary">12 dk</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>En Yavaş</span>
                    <Badge variant="destructive">45 dk</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Müşteri Memnuniyeti</CardTitle>
                <CardDescription>
                  Müşteri yorumları ve puanları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Genel Puan</span>
                    <div className="flex items-center">
                      <span className="font-bold mr-1">4.6</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={`text-sm ${i < 4 ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Toplam Yorum</span>
                    <Badge>247</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>5 Yıldızlı</span>
                    <Badge variant="secondary">68%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}