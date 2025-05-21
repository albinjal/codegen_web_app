import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

// Singleton pattern for PrismaClient
let prismaClient: PrismaClient | undefined;

/**
 * Returns the Prisma client instance
 */
export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  return prismaClient;
}

/**
 * Initializes the database connection
 */
export async function initDatabase(): Promise<void> {
  const prisma = getPrismaClient();

  // Try to establish a connection
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection established');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

/**
 * Closes the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    console.log('Database connection closed');
  }
}
