console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

const { PrismaClient } = require('@prisma/client');

try {
  console.log('Attempting to create Prisma client...');
  const prisma = new PrismaClient({
    log: ['error'],
  });
  console.log('Prisma client created successfully');
  console.log('Client instance:', typeof prisma);
  console.log('Available models:', Object.keys(prisma).filter(k => typeof prisma[k] === 'function'));
} catch (error) {
  console.error('Error creating Prisma client:', error.message);
  console.error('Full error:', error);
}
