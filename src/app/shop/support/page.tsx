"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  HelpCircle,
  MessageSquare,
  Phone,
  Mail,
  FileText,
  Search,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Mock support tickets data
const supportTickets = [
  {
    id: 'TICK-001',
    subject: 'Sipariş teslimatında sorun yaşıyorum',
    status: 'open',
    priority: 'high',
    category: 'delivery',
    createdAt: '2025-10-07T10:30:00',
    lastUpdate: '2025-10-07T14:20:00',
    messages: [
      {
        id: '1',
        sender: 'customer',
        message: 'Sipariş #1234 hala teslim edilmedi. 45 dakika geçti.',
        timestamp: '2025-10-07T10:30:00'
      },
      {
        id: '2',
        sender: 'support',
        message: 'Merhaba, siparişinizi kontrol ediyorum. Kurye şu anda yolda. Tahmini varış süresi 10 dakika.',
        timestamp: '2025-10-07T14:20:00'
      }
    ]
  },
  {
    id: 'TICK-002',
    subject: 'Menü güncellemesi talebi',
    status: 'closed',
    priority: 'medium',
    category: 'menu',
    createdAt: '2025-10-05T09:15:00',
    lastUpdate: '2025-10-06T16:45:00',
    messages: [
      {
        id: '1',
        sender: 'customer',
        message: 'Yeni bir ürün eklemek istiyorum. Fiyat bilgilerini nasıl güncelleyebilirim?',
        timestamp: '2025-10-05T09:15:00'
      },
      {
        id: '2',
        sender: 'support',
        message: 'Merhaba! Menü yönetimi sayfasından yeni ürün ekleyebilir ve fiyatları düzenleyebilirsiniz. Detaylı bilgi için dokümantasyon sayfamızı inceleyin.',
        timestamp: '2025-10-06T16:45:00'
      }
    ]
  },
  {
    id: 'TICK-003',
    subject: 'Ödeme sorunu',
    status: 'in-progress',
    priority: 'high',
    category: 'payment',
    createdAt: '2025-10-06T11:20:00',
    lastUpdate: '2025-10-07T09:10:00',
    messages: [
      {
        id: '1',
        sender: 'customer',
        message: 'Kart ile ödeme alınmıyor. Sistem hatası veriyor.',
        timestamp: '2025-10-06T11:20:00'
      },
      {
        id: '2',
        sender: 'support',
        message: 'Ödeme sistemimizi kontrol ediyorum. Lütfen kart bilgilerinizi kontrol edin ve tekrar deneyin.',
        timestamp: '2025-10-07T09:10:00'
      }
    ]
  }
];

// FAQ data
const faqs = [
  {
    question: 'Yeni ürün nasıl eklerim?',
    answer: 'Menü > Ürünler sayfasından "Yeni Ürün Ekle" butonuna tıklayarak ürün ekleyebilirsiniz.'
  },
  {
    question: 'Sipariş durumunu nasıl güncellerim?',
    answer: 'Siparişler sayfasından ilgili siparişi seçip durumunu "Hazırlanıyor", "Yolda" veya "Teslim Edildi" olarak güncelleyebilirsiniz.'
  },
  {
    question: 'Müşteri yorumlarına nasıl yanıt veririm?',
    answer: 'Yorumlar sayfasından istediğiniz yoruma tıklayıp "Yanıtla" butonunu kullanarak yanıt verebilirsiniz.'
  },
  {
    question: 'Raporları nasıl dışa aktarırım?',
    answer: 'Raporlar sayfasında istediğiniz zaman aralığını seçip "Dışa Aktar" butonuna tıklayabilirsiniz.'
  }
];

export default function SupportPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tickets');
  const [selectedTicket, setSelectedTicket] = useState<typeof supportTickets[0] | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    message: ''
  });

  const filteredTickets = supportTickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTicket = () => {
    // In a real app, this would create a new ticket
    console.log('Creating new ticket:', newTicket);
    setNewTicket({ subject: '', category: '', priority: 'medium', message: '' });
  };

  const handleSendMessage = (ticketId: string) => {
    // In a real app, this would send the message
    console.log('Sending message to ticket:', ticketId, newMessage);
    setNewMessage('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-red-100 text-red-800">Açık</Badge>;
      case 'in-progress':
        return <Badge className="bg-yellow-100 text-yellow-800">İşleniyor</Badge>;
      case 'closed':
        return <Badge className="bg-green-100 text-green-800">Kapalı</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">Yüksek</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Orta</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Düşük</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'delivery':
        return 'Teslimat';
      case 'payment':
        return 'Ödeme';
      case 'menu':
        return 'Menü';
      case 'technical':
        return 'Teknik';
      case 'other':
        return 'Diğer';
      default:
        return category;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="ml-6">
          <h1 className="text-2xl font-bold text-gray-900">Destek</h1>
          <p className="text-gray-600">Yardım ve destek taleplerinizi yönetin</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Phone className="h-4 w-4 mr-2" />
            0850 123 45 67
          </Button>
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            destek@yummine.com
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-gray-600">Açık Talep</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">1</p>
                <p className="text-sm text-gray-600">İşleniyor</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-gray-600">Çözüldü</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold">2.4s</p>
                <p className="text-sm text-gray-600">Ort. Yanıt Süresi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Support Tickets */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Destek Talepleri</CardTitle>
                  <CardDescription>
                    Açık ve geçmiş destek taleplerinizi görüntüleyin
                  </CardDescription>
                </div>
                <Button onClick={() => setActiveTab('new-ticket')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Yeni Talep
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex space-x-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Talep ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="open">Açık</SelectItem>
                    <SelectItem value="in-progress">İşleniyor</SelectItem>
                    <SelectItem value="closed">Kapalı</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tickets List */}
              <div className="space-y-4">
                {filteredTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{ticket.subject}</h4>
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>Talep No: {ticket.id}</span>
                            <span>Kategori: {getCategoryLabel(ticket.category)}</span>
                            <span>Son Güncelleme: {new Date(ticket.lastUpdate).toLocaleDateString('tr-TR')}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {ticket.messages.length} mesaj
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredTickets.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Talep bulunamadı</h3>
                  <p className="text-gray-500">Arama kriterlerinize uygun talep bulunmuyor.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* New Ticket Form */}
          {activeTab === 'new-ticket' && (
            <Card>
              <CardHeader>
                <CardTitle>Yeni Destek Talebi</CardTitle>
                <CardDescription>
                  Sorununuzu detaylıca açıklayın, size yardımcı olalım
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Konu</Label>
                    <Input
                      id="subject"
                      placeholder="Sorununuzun kısa açıklaması"
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori</Label>
                    <Select value={newTicket.category} onValueChange={(value) => setNewTicket(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="delivery">Teslimat</SelectItem>
                        <SelectItem value="payment">Ödeme</SelectItem>
                        <SelectItem value="menu">Menü</SelectItem>
                        <SelectItem value="technical">Teknik</SelectItem>
                        <SelectItem value="other">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Öncelik</Label>
                  <Select value={newTicket.priority} onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Düşük</SelectItem>
                      <SelectItem value="medium">Orta</SelectItem>
                      <SelectItem value="high">Yüksek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Açıklama</Label>
                  <Textarea
                    id="message"
                    placeholder="Sorununuzu detaylıca açıklayın..."
                    rows={6}
                    value={newTicket.message}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, message: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setActiveTab('tickets')}>
                    İptal
                  </Button>
                  <Button onClick={handleCreateTicket}>
                    <Send className="h-4 w-4 mr-2" />
                    Gönder
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ticket Detail */}
          {selectedTicket && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedTicket.subject}</CardTitle>
                    <CardDescription>
                      Talep No: {selectedTicket.id} • {getCategoryLabel(selectedTicket.category)}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    {getStatusBadge(selectedTicket.status)}
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Messages */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {selectedTicket.messages.map((message) => (
                    <div key={message.id} className={`flex ${message.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-md p-3 rounded-lg ${
                        message.sender === 'customer'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="flex items-center space-x-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {message.sender === 'customer' ? 'S' : 'D'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">
                            {message.sender === 'customer' ? 'Siz' : 'Destek Ekibi'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleString('tr-TR')}
                          </span>
                        </div>
                        <p className="text-sm">{message.message}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                {selectedTicket.status !== 'closed' && (
                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="reply">Yanıtınız</Label>
                      <Textarea
                        id="reply"
                        placeholder="Yanıtınızı yazın..."
                        rows={3}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button onClick={() => handleSendMessage(selectedTicket.id)}>
                        <Send className="h-4 w-4 mr-2" />
                        Gönder
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HelpCircle className="h-5 w-5 mr-2" />
                Sık Sorulan Sorular
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div key={index} className="border-b pb-4 last:border-b-0">
                    <h4 className="font-medium mb-2">{faq.question}</h4>
                    <p className="text-sm text-gray-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>İletişim Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">0850 123 45 67</p>
                  <p className="text-sm text-gray-600">7/24 Destek Hattı</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">destek@yummine.com</p>
                  <p className="text-sm text-gray-600">E-posta Desteği</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Çalışma Saatleri</p>
                  <p className="text-sm text-gray-600">Pazartesi - Pazar: 09:00 - 18:00</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Hızlı İşlemler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Kullanım Kılavuzu
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <User className="h-4 w-4 mr-2" />
                Canlı Destek
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}