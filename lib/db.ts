import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
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
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Updated Mongoose connection options - removed deprecated options
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      // Removed strictQuery as it's deprecated
      // Removed other deprecated options
    };

    // Set mongoose options before connecting
    mongoose.set('strictQuery', false); // This is the correct way to set it

    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
    console.log('✅ Connected to MongoDB');
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    console.error('❌ MongoDB connection error:', e);
    throw e;
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

// Initialize database event handlers when module is loaded
setupDatabaseEventHandlers();

export default connectToDatabase;