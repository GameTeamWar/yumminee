"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Star,
  MessageSquare,
  Flag,
  Reply,
  Filter,
  Search,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRestaurantByOwnerId, Shop } from '@/lib/firebase/db';

// Mock reviews data
const reviews = [
  {
    id: '1',
    customerName: 'Ahmet Yılmaz',
    customerAvatar: '',
    rating: 5,
    comment: 'Harika bir deneyim! Pizza çok lezzetliydi ve servis çok hızlıydı. Kesinlikle tekrar geleceğim.',
    date: '2025-10-07',
    orderId: 'ORD-001',
    productName: 'Margherita Pizza',
    status: 'published',
    helpful: 12,
    notHelpful: 1,
    response: null
  },
  {
    id: '2',
    customerName: 'Ayşe Kaya',
    customerAvatar: '',
    rating: 4,
    comment: 'Yemekler güzel ama teslimat biraz gecikti. Genel olarak memnun kaldım.',
    date: '2025-10-06',
    orderId: 'ORD-002',
    productName: 'Köfte Burger',
    status: 'published',
    helpful: 8,
    notHelpful: 2,
    response: 'Teslimat gecikmesi için özür dileriz. Servis kalitemizi iyileştirmek için çalışıyoruz.'
  },
  {
    id: '3',
    customerName: 'Mehmet Demir',
    customerAvatar: '',
    rating: 2,
    comment: 'Pizza soğuk geldi ve soslar eksik. Çok hayal kırıklığı yaşadım.',
    date: '2025-10-05',
    orderId: 'ORD-003',
    productName: 'Pepperoni Pizza',
    status: 'pending',
    helpful: 3,
    notHelpful: 5,
    response: null
  },
  {
    id: '4',
    customerName: 'Fatma Çelik',
    customerAvatar: '',
    rating: 5,
    comment: 'Mükemmel hizmet! Her şey tam zamanında ve çok lezzetliydi.',
    date: '2025-10-04',
    orderId: 'ORD-004',
    productName: 'Çiğ Köfte',
    status: 'published',
    helpful: 15,
    notHelpful: 0,
    response: 'Teşekkür ederiz! Mutluluk verici yorumunuz için çok teşekkür ederiz.'
  },
  {
    id: '5',
    customerName: 'Ali Öztürk',
    customerAvatar: '',
    rating: 3,
    comment: 'Ortalama bir deneyim. Yemekler iyiydi ama fiyatlar biraz yüksek.',
    date: '2025-10-03',
    orderId: 'ORD-005',
    productName: 'Lahmacun',
    status: 'published',
    helpful: 6,
    notHelpful: 3,
    response: null
  }
];

export default function ReviewsPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const panelId = searchParams.get('panel');
  const [selectedReview, setSelectedReview] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReviews = reviews.filter(review => {
    const matchesFilter = filter === 'all' || review.status === filter;
    const matchesSearch = review.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.productName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleRespond = (reviewId: string) => {
    // In a real app, this would send the response to the backend
    console.log('Responding to review:', reviewId, responseText);
    setResponseText('');
    setSelectedReview(null);
  };

  const handleStatusChange = (reviewId: string, newStatus: string) => {
    // In a real app, this would update the review status in the backend
    console.log('Changing status for review:', reviewId, 'to:', newStatus);
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Yayınlandı</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Bekliyor</Badge>;
      case 'hidden':
        return <Badge className="bg-red-100 text-red-800">Gizlendi</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yorumlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="ml-6">
          <h1 className="text-2xl font-bold text-gray-900">Yorumlar</h1>
          <p className="text-gray-600">Müşteri yorumlarını yönetin ve yanıtlayın</p>
        </div>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Yorumlarda ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="published">Yayınlandı</SelectItem>
              <SelectItem value="pending">Bekliyor</SelectItem>
              <SelectItem value="hidden">Gizlendi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">{reviews.length}</p>
                <p className="text-sm text-gray-600">Toplam Yorum</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">4.2</p>
                <p className="text-sm text-gray-600">Ortalama Puan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ThumbsUp className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">44</p>
                <p className="text-sm text-gray-600">Yararlı Bulundu</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Flag className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-sm text-gray-600">Şikayet</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <Avatar>
                    <AvatarImage src={review.customerAvatar} />
                    <AvatarFallback>
                      {review.customerName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium">{review.customerName}</h4>
                      <div className="flex items-center">
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(review.date).toLocaleDateString('tr-TR')}
                      </span>
                      {getStatusBadge(review.status)}
                    </div>

                    <p className="text-gray-700 mb-2">{review.comment}</p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <span>Sipariş: {review.orderId}</span>
                      <span>Ürün: {review.productName}</span>
                    </div>

                    {review.response && (
                      <div className="bg-blue-50 p-3 rounded-lg mb-3">
                        <p className="text-sm font-medium text-blue-900 mb-1">Yanıtınız:</p>
                        <p className="text-sm text-blue-800">{review.response}</p>
                      </div>
                    )}

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          {review.helpful}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          {review.notHelpful}
                        </Button>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Reply className="h-4 w-4 mr-1" />
                            Yanıtla
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Yorumu Yanıtla</DialogTitle>
                            <DialogDescription>
                              {review.customerName} adlı müşterinin yorumuna yanıt verin.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="font-medium">{review.customerName}</span>
                                <div className="flex">{renderStars(review.rating)}</div>
                              </div>
                              <p className="text-sm text-gray-700">{review.comment}</p>
                            </div>

                            <Textarea
                              placeholder="Yanıtınızı yazın..."
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              rows={4}
                            />

                            <div className="flex justify-end space-x-2">
                              <Button variant="outline">İptal</Button>
                              <Button onClick={() => handleRespond(review.id)}>
                                Yanıtla
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Select
                        value={review.status}
                        onValueChange={(value) => handleStatusChange(review.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="published">Yayınla</SelectItem>
                          <SelectItem value="hidden">Gizle</SelectItem>
                          <SelectItem value="pending">Beklet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReviews.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Yorum bulunamadı</h3>
          <p className="text-gray-500">Seçilen filtrelere uygun yorum bulunmuyor.</p>
        </div>
      )}
    </div>
  );
}