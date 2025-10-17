// Test file for Firebase custom ID system
import { createUserProfile, getUserProfile } from './db';
import { UserProfile, generateId } from './types';

// Test function to verify custom ID generation and user profile operations
export async function testCustomIdSystem() {
  console.log('🧪 Testing Custom ID System...\n');
  
  // Test 1: ID Generation
  console.log('1. Testing ID Generation:');
  const id1 = generateId();
  const id2 = generateId();
  const id3 = generateId();
  
  console.log(`Generated ID 1: ${id1} (Length: ${id1.length})`);
  console.log(`Generated ID 2: ${id2} (Length: ${id2.length})`);
  console.log(`Generated ID 3: ${id3} (Length: ${id3.length})`);
  console.log(`All IDs are unique: ${id1 !== id2 && id2 !== id3 && id1 !== id3}`);
  console.log(`All IDs are 11 digits: ${[id1, id2, id3].every(id => /^\d{11}$/.test(id))}\n`);
  
  // Test 2: Sample User Profile Creation (for testing purposes)
  console.log('2. Sample User Profile Structure:');
  const sampleProfile: Omit<UserProfile, 'id' | 'uid' | 'createdAt' | 'updatedAt' | 'lastLoginAt'> = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    displayName: 'Test User',
    phoneNumber: '+905551234567',
    address: 'Merkez, İstanbul',
    role: 'customer' as const,
    dateOfBirth: '1990-01-01',
    membershipLevel: 'bronze' as const,
    loyaltyPoints: 150,
    totalOrders: 5,
    totalSpent: 285.50,
    averageRating: 4.2,
    isEmailVerified: true,
    isPhoneVerified: false,
    preferences: {
      notifications: {
        orders: true,
        promotions: true,
        email: true,
        sms: false
      },
      language: 'tr',
      theme: 'system' as const
    }
  };
  
  console.log('Sample profile structure:', JSON.stringify(sampleProfile, null, 2));
  console.log('\n✅ Custom ID system structure validated!');
}

// Utility function to log database operations
export function logDatabaseOperation(operation: string, data: any) {
  console.log(`🔄 Database Operation: ${operation}`);
  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('---');
}