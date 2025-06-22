require('dotenv').config();
const app = require('./server');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Get port from environment or default to 5000
const PORT = process.env.PORT || 5000;

// Connect to database and start server
async function startServer() {
  try {
    // Connect to database - can add test query here
    await prisma.$connect();
    console.log('Connected to database successfully');

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! 💥 Shutting down...');
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    // Graceful shutdown for SIGTERM
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM received. Shutting down gracefully');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('💤 Process terminated!');
      });
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();