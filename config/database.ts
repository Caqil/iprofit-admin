
import mongoose from 'mongoose';

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
  retryAttempts: number;
  retryDelay: number;
}

export const databaseConfig: DatabaseConfig = {
  uri: process.env.MONGODB_URI!,
  options: {
    // Connection options
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10'),
    serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_TIMEOUT || '5000'),
    socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT || '45000'),
    family: 4,
    bufferCommands: false,
    
    // Compression
    compressors: ['zlib'],
    
    // Authentication
    authSource: process.env.DB_AUTH_SOURCE || 'admin',
    
    // SSL/TLS
    ssl: process.env.NODE_ENV === 'production',
    
    // Write concern
    writeConcern: {
      w: 'majority',
      j: true,
      wtimeout: 5000
    },
    
    // Read preference
    readPreference: 'primaryPreferred',
    
    // Application name for debugging
    appName: 'FinancialAdminPanel'
  },
  retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000')
};

// Database connection state management
export interface DatabaseState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: Error | null;
  lastConnectedAt: Date | null;
  reconnectAttempts: number;
}

let dbState: DatabaseState = {
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  lastConnectedAt: null,
  reconnectAttempts: 0
};

// Connection event handlers
export function setupDatabaseEventHandlers() {
  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected successfully');
    dbState.isConnected = true;
    dbState.isConnecting = false;
    dbState.connectionError = null;
    dbState.lastConnectedAt = new Date();
    dbState.reconnectAttempts = 0;
  });

  mongoose.connection.on('error', (error) => {
    console.error('❌ MongoDB connection error:', error);
    dbState.isConnected = false;
    dbState.connectionError = error;
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
    dbState.isConnected = false;
    dbState.lastConnectedAt = null;
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB reconnected');
    dbState.isConnected = true;
    dbState.connectionError = null;
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      console.log('📴 MongoDB connection closed through app termination');
      process.exit(0);
    } catch (error) {
      console.error('Error during MongoDB disconnection:', error);
      process.exit(1);
    }
  });
}

// Get current database state
export function getDatabaseState(): DatabaseState {
  return { ...dbState };
}

// Database health check
export async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean;
  latency: number;
  error?: string;
}> {
  try {
    const start = Date.now();
    if (!mongoose.connection.db) {
      throw new Error('Database connection is not established');
    }
    await mongoose.connection.db.admin().ping();
    const latency = Date.now() - start;
    
    return {
      isHealthy: true,
      latency
    };
  } catch (error) {
    return {
      isHealthy: false,
      latency: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Database indexes setup
export async function setupDatabaseIndexes() {
  try {
    // Create compound indexes for better query performance
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection is not established');
    }
    
    // Users collection indexes
    await db.collection('users').createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { phone: 1 }, unique: true },
      { key: { referralCode: 1 }, unique: true },
      { key: { deviceId: 1 }, unique: true },
      { key: { status: 1, kycStatus: 1 } },
      { key: { planId: 1, status: 1 } },
      { key: { createdAt: -1 } }
    ]);

    // Transactions collection indexes
    await db.collection('transactions').createIndexes([
      { key: { userId: 1, createdAt: -1 } },
      { key: { status: 1, type: 1 } },
      { key: { gateway: 1, status: 1 } },
      { key: { transactionId: 1 }, unique: true, sparse: true },
      { key: { createdAt: -1 } }
    ]);

    // Loans collection indexes
    await db.collection('loans').createIndexes([
      { key: { userId: 1, status: 1 } },
      { key: { status: 1, createdAt: -1 } },
      { key: { creditScore: 1, status: 1 } },
      { key: { 'repaymentSchedule.dueDate': 1, 'repaymentSchedule.status': 1 } }
    ]);

    // Notifications collection indexes
    await db.collection('notifications').createIndexes([
      { key: { userId: 1, status: 1 } },
      { key: { type: 1, status: 1 } },
      { key: { priority: 1, createdAt: -1 } },
      { key: { scheduledAt: 1, status: 1 } }
    ]);

    // Audit logs collection indexes
    await db.collection('audit_logs').createIndexes([
      { key: { adminId: 1, createdAt: -1 } },
      { key: { action: 1, entity: 1 } },
      { key: { severity: 1, createdAt: -1 } },
      { key: { createdAt: -1 } }
    ]);

    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Failed to create database indexes:', error);
  }
}

// Export database configuration
export default databaseConfig;
