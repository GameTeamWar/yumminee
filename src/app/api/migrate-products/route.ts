import { NextRequest, NextResponse } from 'next/server';
import { collection, query, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const migrateProductsToIsActive = async () => {
  try {
    console.log('Starting product migration...');

    const productsQuery = query(collection(db, 'products'));
    const snapshot = await getDocs(productsQuery);

    let migratedCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const productData = docSnapshot.data();

      // If product has isAvailable but not isActive, migrate it
      if (productData.isAvailable !== undefined && productData.isActive === undefined) {
        await updateDoc(doc(db, 'products', docSnapshot.id), {
          isActive: productData.isAvailable,
          // Remove the old field
          isAvailable: undefined
        });
        migratedCount++;
        console.log(`Migrated product: ${productData.name}`);
      }
    }

    console.log(`Migration completed. ${migratedCount} products migrated.`);
    return migratedCount;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

export async function POST(request: NextRequest) {
  try {
    const count = await migrateProductsToIsActive();
    return NextResponse.json({
      success: true,
      message: `${count} products migrated successfully`
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration failed'
    }, { status: 500 });
  }
}