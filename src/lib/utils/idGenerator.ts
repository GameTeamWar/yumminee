// Utility functions for generating unique IDs

/**
 * Generates a unique 11-digit numeric ID
 * Uses timestamp and random components to ensure uniqueness
 */
export function generateEntityId(): string {
  const timestamp = Date.now().toString().slice(-8) // Last 8 digits of timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0') // 3-digit random number
  const id = timestamp + random // 11 digits total

  return id
}

/**
 * Validates if a string is an 11-digit numeric ID
 */
export function isValidEntityId(id: string): boolean {
  return /^\d{11}$/.test(id)
}

/**
 * Generates a unique ID for a specific entity type within a restaurant
 * Ensures uniqueness by checking against existing entities
 */
export async function generateUniqueEntityId(
  collectionName: string,
  restaurantId: string,
  db: any
): Promise<string> {
  const { collection, query, where, getDocs } = await import('firebase/firestore')

  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const id = generateEntityId()

    // Check if ID already exists for this restaurant and collection
    const q = query(
      collection(db, collectionName),
      where('restaurantId', '==', restaurantId),
      where('id', '==', id)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return id
    }

    attempts++
  }

  // If we can't generate a unique ID after max attempts, use timestamp-based approach
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return timestamp.toString().slice(-5) + random.slice(-6)
}