import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from './config'

export async function getRestaurantByOwnerId(ownerId: string) {
  try {
    const restaurantsRef = collection(db, 'restaurants')
    const q = query(restaurantsRef, where('ownerId', '==', ownerId))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data()
      }
    }

    return null
  } catch (error) {
    console.error('Error getting restaurant by owner ID:', error)
    throw error
  }
}

export async function deleteOptionAndUpdateProducts(restaurantId: string, optionId: string) {
  console.log('deleteOptionAndUpdateProducts called with:', { restaurantId, optionId })
  try {
    // Önce opsiyonu kullanan ürünleri bul
    const productsRef = collection(db, 'products')
    const q = query(productsRef, where('restaurantId', '==', restaurantId))
    const productsSnapshot = await getDocs(q)
    console.log('Found products:', productsSnapshot.docs.length)

    // Her ürünü güncelle - opsiyonu çıkar
    const updatePromises = productsSnapshot.docs.map(async (productDoc) => {
      const productData = productDoc.data()
      const options = productData.options || []
      console.log('Product options before:', options)

      // Opsiyonu ürünün options array'inden çıkar
      const updatedOptions = options.filter((opt: any) => opt.id !== optionId)
      console.log('Product options after:', updatedOptions)

      if (updatedOptions.length !== options.length) {
        // Opsiyon çıkarıldıysa ürünü güncelle
        console.log('Updating product:', productDoc.id)
        await updateDoc(productDoc.ref, {
          options: updatedOptions,
          updatedAt: new Date()
        })
      }
    })

    // Tüm ürünleri güncellemeyi bekle
    await Promise.all(updatePromises)
    console.log('All products updated')

    // Son olarak opsiyonu sil
    console.log('Deleting option from Firestore:', optionId)
    await deleteDoc(doc(db, 'options', optionId))
    console.log('Option deleted successfully')

  } catch (error) {
    console.error('Error deleting option and updating products:', error)
    throw error
  }
}