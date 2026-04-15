import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

// Create Prisma client with environment-specific configuration
let prisma;

try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  console.log('Prisma client created successfully');
} catch (error) {
  console.error('Error creating Prisma client:', error.message);
  throw error;
}

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected successfully');
  } catch (err) {
    console.error('PostgreSQL connection error:', err);
    process.exit(1);
  }
};

export { prisma, connectDB };
