import 'dotenv/config';
import { createServer, setupServer, startServer, stopServer } from './core/server.js';
import { initDatabase, closeDatabase } from './core/database.js';
import { env } from './config/env.js';

// Global error handling
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

/**
 * Main application startup
 */
async function start(): Promise<void> {
  try {
    console.log(`Starting server in ${env.NODE_ENV} mode...`);

    // Initialize database
    await initDatabase();

    // Create and setup server
    const server = createServer();
    await setupServer(server);

    // Start server
    await startServer(server);

    // Setup graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down...');
      await stopServer(server);
      await closeDatabase();
      process.exit(0);
    };

    // Handle shutdown signals
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
start().catch(console.error);
