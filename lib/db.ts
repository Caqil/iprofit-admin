import mongoose from 'mongoose';
import { env } from '@/config/env';

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: CachedConnection | undefined;
}

const cached: CachedConnection = global.mongoose || {
  conn: null,
  promise: null,
};

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const options = {
      bufferCommands: false,
      maxPoolSize: env.DB_MAX_POOL_SIZE,
      serverSelectionTimeoutMS: env.DB_SERVER_TIMEOUT,
      socketTimeoutMS: env.DB_SOCKET_TIMEOUT,
      authSource: env.DB_AUTH_SOURCE,
      retryWrites: true,
      w: 'majority' as const,
      // Suppress deprecation warnings
      strictQuery: false,
    };

    cached.promise = mongoose.connect(env.MONGODB_URI, options);
  }

  try {
    cached.conn = await cached.promise;
    
    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      cached.conn = null;
      cached.promise = null;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      cached.conn = null;
      cached.promise = null;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      process.exit(0);
    });

    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}

// Optional: Health check function for the database
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  readyState: number;
  host?: string;
  name?: string;
}> {
  try {
    await connectToDatabase();
    
    return {
      connected: isConnected(),
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  } catch (error) {
    return {
      connected: false,
      readyState: mongoose.connection.readyState
    };
  }
}