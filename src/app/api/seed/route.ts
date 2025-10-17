import { NextRequest, NextResponse } from 'next/server';
import { seedSampleData } from '@/lib/firebase/seed';

export async function POST(request: NextRequest) {
  try {
    // Sadece development ortamında çalıştır
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Bu endpoint sadece development ortamında kullanılabilir' },
        { status: 403 }
      );
    }

    await seedSampleData();

    return NextResponse.json({
      success: true,
      message: 'Örnek veriler başarıyla eklendi'
    });
  } catch (error) {
    console.error('Seed hatası:', error);
    return NextResponse.json(
      { error: 'Veriler eklenirken hata oluştu' },
      { status: 500 }
    );
  }
}