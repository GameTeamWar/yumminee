import { collection, query, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export const migrateProductsToIsActive = async () => {
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

// Run migration if this script is executed directly
if (require.main === module) {
  migrateProductsToIsActive()
    .then((count) => {
      console.log(`Successfully migrated ${count} products`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}