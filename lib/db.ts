// lib/db.ts - Updated with better environment variable handling

import mongoose from 'mongoose';

// Try to get MONGODB_URI from multiple possible sources
const MONGODB_URI = 
  process.env.MONGODB_URI || 
  process.env.DATABASE_URL || 
  process.env.MONGO_URL ||
  'mongodb://localhost:27017/iprofit'; // fallback for development

if (!MONGODB_URI) {
  console.error('❌ No MongoDB URI found in environment variables');
  console.log('Please set one of: MONGODB_URI, DATABASE_URL, or MONGO_URL');
  console.log('Current NODE_ENV:', process.env.NODE_ENV);
  console.log('Available env vars:', Object.keys(process.env).filter(key => 
    key.includes('MONGO') || key.includes('DATABASE')
  ));
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  // If already connected, return the connection
  if (cached.conn) {
    return cached.conn;
  }

  // If no URI available, throw meaningful error
  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable. ' +
      'You can copy .env to .env.local or set MONGODB_URI directly.'
    );
  }

  if (!cached.promise) {
    // Mongoose connection options
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    };


    console.log('🔗 Connecting to MongoDB...');
    console.log('📍 URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials

    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
    console.log('✅ Connected to MongoDB successfully');
    
    // Setup event handlers after successful connection
    setupDatabaseEventHandlers();
    
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error('❌ MongoDB connection error:', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND')) {
        console.log('💡 Check your MongoDB URI - server not found');
      } else if (error.message.includes('authentication failed')) {
        console.log('💡 Check your MongoDB credentials');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.log('💡 MongoDB server is not running or unreachable');
      }
    }
    
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('✅ Disconnected from MongoDB');
  }
}

// Database health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const connection = await connectToDatabase();
    return connection.connection.readyState === 1;
  } catch {
    return false;
  }
}

// Connection event handlers
export function setupDatabaseEventHandlers() {
  // Only setup event handlers on server side and when mongoose is available
  if (!isServerEnvironment() || !mongoose || !mongoose.connection) {
    return;
  }

  try {
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ Mongoose connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ Mongoose disconnected from MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 Mongoose reconnected to MongoDB');
    });

    // Graceful shutdown - only in server environment
    if (typeof process !== 'undefined' && process.on) {
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

      process.on('SIGTERM', async () => {
        try {
          await mongoose.connection.close();
          console.log('📴 MongoDB connection closed through SIGTERM');
          process.exit(0);
        } catch (error) {
          console.error('Error during MongoDB disconnection:', error);
          process.exit(1);
        }
      });
    }
  } catch (error) {
    console.error('Error setting up database event handlers:', error);
  }
}

// Initialize database event handlers when module is loaded (only on server)
if (isServerEnvironment()) {
  setupDatabaseEventHandlers();
}

export default connectToDatabase;

// Helper function to check if we're in a server environment
export function isServerEnvironment(): boolean {
  return typeof window === 'undefined';
}

// Helper function to safely get environment variables
export function getEnvVar(name: string, defaultValue?: string): string | undefined {
  const value = process.env[name];
  if (!value && defaultValue !== undefined) {
    return defaultValue;
  }
  return value;
}

// Environment debugging helper
export function debugEnvironment() {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Environment Debug Info:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('MONGO_URL exists:', !!process.env.MONGO_URL);
    
    // List all environment variables containing 'mongo', 'database', or 'db'
    const dbRelatedVars = Object.keys(process.env).filter(key => 
      key.toLowerCase().includes('mongo') || 
      key.toLowerCase().includes('database') || 
      key.toLowerCase().includes('db')
    );
    
    if (dbRelatedVars.length > 0) {
      console.log('Database-related env vars:', dbRelatedVars);
    }
  }
}