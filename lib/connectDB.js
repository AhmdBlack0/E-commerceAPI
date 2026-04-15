const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

// Simple Prisma client setup for serverless environments
const prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected successfully');
  } catch (err) {
    console.error('PostgreSQL connection error:', err);
    process.exit(1);
  }
};

module.exports = { prisma, connectDB };
