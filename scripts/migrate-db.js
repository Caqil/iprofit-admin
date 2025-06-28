#!/usr/bin/env node

/**
 * Database Migration Script for IProfit Platform (CommonJS)
 * 
 * This script handles database migrations, index creation,
 * and schema updates for the IProfit platform.
 * 
 * Usage: npm run migrate-db
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables first
dotenv.config({ path: '.env.local' });

// Check if MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  console.log('Please run: npm run check-env:create');
  process.exit(1);
}

class DatabaseMigrator {
  constructor() {
    this.migrations = [
      {
        version: '1.0.0',
        description: 'Initial database setup with indexes',
        up: this.migration_1_0_0.bind(this),
      },
      {
        version: '1.1.0',
        description: 'Add compound indexes for performance',
        up: this.migration_1_1_0.bind(this),
      },
      {
        version: '1.2.0',
        description: 'Add referral system indexes',
        up: this.migration_1_2_0.bind(this),
      },
    ];
  }

  async connectToDatabase() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
        bufferCommands: false,
      });
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async runMigrations() {
    console.log('🚀 Starting database migrations...');

    try {
      await this.connectToDatabase();

      // Get current migration version
      const currentVersion = await this.getCurrentVersion();
      console.log(`📊 Current database version: ${currentVersion || 'none'}`);

      // Run pending migrations
      const pendingMigrations = this.getPendingMigrations(currentVersion);
      
      if (pendingMigrations.length === 0) {
        console.log('✅ Database is up to date');
        return;
      }

      console.log(`🔄 Running ${pendingMigrations.length} pending migrations...`);

      for (const migration of pendingMigrations) {
        console.log(`⚡ Running migration ${migration.version}: ${migration.description}`);
        await migration.up();
        await this.updateMigrationVersion(migration.version);
        console.log(`✅ Migration ${migration.version} completed`);
      }

      console.log('🎉 All migrations completed successfully!');

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async getCurrentVersion() {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('migrations');
      const result = await collection.findOne({}, { sort: { version: -1 } });
      return result?.version || null;
    } catch (error) {
      return null;
    }
  }

  async updateMigrationVersion(version) {
    const db = mongoose.connection.db;
    const collection = db.collection('migrations');
    await collection.insertOne({
      version,
      appliedAt: new Date(),
      appliedBy: 'system'
    });
  }

  getPendingMigrations(currentVersion) {
    if (!currentVersion) {
      return this.migrations;
    }

    const currentIndex = this.migrations.findIndex(m => m.version === currentVersion);
    return this.migrations.slice(currentIndex + 1);
  }

  // Migration 1.0.0: Initial setup
  async migration_1_0_0() {
    console.log('  📝 Creating basic collections and indexes...');

    const db = mongoose.connection.db;

    // Create collections if they don't exist
    const collections = ['users', 'admins', 'plans', 'transactions', 'loans', 'referrals', 'support_tickets'];
    
    for (const collName of collections) {
      try {
        await db.createCollection(collName);
        console.log(`  ✅ Collection ${collName} created`);
      } catch (error) {
        if (error.codeName === 'NamespaceExists') {
          console.log(`  ℹ️  Collection ${collName} already exists`);
        } else {
          console.error(`  ❌ Error creating collection ${collName}:`, error.message);
        }
      }
    }

    // Create basic indexes
    try {
      // Users collection indexes
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('users').createIndex({ phone: 1 });
      await db.collection('users').createIndex({ referralCode: 1 }, { unique: true });
      await db.collection('users').createIndex({ status: 1 });
      await db.collection('users').createIndex({ kycStatus: 1 });
      await db.collection('users').createIndex({ createdAt: -1 });

      // Admins collection indexes
      await db.collection('admins').createIndex({ email: 1 }, { unique: true });
      await db.collection('admins').createIndex({ role: 1 });
      await db.collection('admins').createIndex({ isActive: 1 });

      // Transactions collection indexes
      await db.collection('transactions').createIndex({ userId: 1 });
      await db.collection('transactions').createIndex({ type: 1 });
      await db.collection('transactions').createIndex({ status: 1 });
      await db.collection('transactions').createIndex({ createdAt: -1 });

      // Plans collection indexes
      await db.collection('plans').createIndex({ name: 1 }, { unique: true });
      await db.collection('plans').createIndex({ isActive: 1 });

      console.log('  ✅ Basic indexes created');
    } catch (error) {
      console.error('  ❌ Error creating indexes:', error.message);
    }
  }

  // Migration 1.1.0: Performance indexes
  async migration_1_1_0() {
    console.log('  📝 Creating compound indexes for performance...');

    const db = mongoose.connection.db;

    try {
      // User compound indexes
      await db.collection('users').createIndex({ status: 1, kycStatus: 1 });
      await db.collection('users').createIndex({ planId: 1, status: 1 });

      // Transaction compound indexes
      await db.collection('transactions').createIndex({ userId: 1, type: 1 });
      await db.collection('transactions').createIndex({ userId: 1, status: 1 });
      await db.collection('transactions').createIndex({ status: 1, createdAt: -1 });

      console.log('  ✅ Performance indexes created');
    } catch (error) {
      console.error('  ❌ Error creating performance indexes:', error.message);
    }
  }

  // Migration 1.2.0: Referral system
  async migration_1_2_0() {
    console.log('  📝 Setting up referral system indexes...');

    const db = mongoose.connection.db;

    try {
      // Referrals collection indexes
      await db.collection('referrals').createIndex({ referrerId: 1 });
      await db.collection('referrals').createIndex({ refereeId: 1 });
      await db.collection('referrals').createIndex({ status: 1 });
      await db.collection('referrals').createIndex({ createdAt: -1 });

      console.log('  ✅ Referral system indexes created');
    } catch (error) {
      console.error('  ❌ Error creating referral indexes:', error.message);
    }
  }

  async createSampleData() {
    console.log('📊 Creating sample data...');

    const db = mongoose.connection.db;

    try {
      // Check if data already exists
      const userCount = await db.collection('users').countDocuments();
      if (userCount > 0) {
        console.log('ℹ️  Sample data already exists, skipping...');
        return;
      }

      // Create default plans
      const plansExist = await db.collection('plans').findOne();
      if (!plansExist) {
        await db.collection('plans').insertMany([
          {
            name: 'Free',
            description: 'Basic plan for beginners',
            price: 0,
            currency: 'BDT',
            depositLimit: 10000,
            withdrawalLimit: 5000,
            profitLimit: 1000,
            minimumDeposit: 100,
            minimumWithdrawal: 100,
            dailyWithdrawalLimit: 1000,
            monthlyWithdrawalLimit: 10000,
            features: ['Basic Support', 'Mobile App Access'],
            color: '#6b7280',
            priority: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            name: 'Silver',
            description: 'Intermediate plan with better limits',
            price: 1000,
            currency: 'BDT',
            depositLimit: 50000,
            withdrawalLimit: 25000,
            profitLimit: 5000,
            minimumDeposit: 500,
            minimumWithdrawal: 100,
            dailyWithdrawalLimit: 5000,
            monthlyWithdrawalLimit: 50000,
            features: ['Priority Support', 'Higher Limits', 'Mobile App Access'],
            color: '#9ca3af',
            priority: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            name: 'Gold',
            description: 'Premium plan with maximum benefits',
            price: 5000,
            currency: 'BDT',
            depositLimit: 200000,
            withdrawalLimit: 100000,
            profitLimit: 20000,
            minimumDeposit: 1000,
            minimumWithdrawal: 100,
            dailyWithdrawalLimit: 20000,
            monthlyWithdrawalLimit: 200000,
            features: ['VIP Support', 'Maximum Limits', 'Exclusive Features'],
            color: '#f59e0b',
            priority: 2,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
        console.log('✅ Default plans created');
      }

      console.log('🎉 Sample data creation completed');

    } catch (error) {
      console.error('❌ Sample data creation failed:', error);
      throw error;
    }
  }

  async validateDatabase() {
    console.log('🔍 Validating database structure...');

    try {
      const db = mongoose.connection.db;
      
      // Check collections exist
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);

      const requiredCollections = [
        'users', 'admins', 'plans', 'transactions', 
        'loans', 'referrals', 'support_tickets'
      ];

      for (const collection of requiredCollections) {
        if (!collectionNames.includes(collection)) {
          console.warn(`⚠️  Collection ${collection} not found`);
        } else {
          console.log(`✅ Collection ${collection} exists`);
        }
      }

      console.log('✅ Database validation completed');

    } catch (error) {
      console.error('❌ Database validation failed:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 IProfit Database Migration Tool');
  console.log('=====================================');

  const migrator = new DatabaseMigrator();

  try {
    // Run migrations
    await migrator.runMigrations();

    // Validate database
    await migrator.validateDatabase();

    // Create sample data if needed
    const createSample = process.argv.includes('--sample');
    if (createSample) {
      await migrator.createSampleData();
    }

    console.log('🎉 Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DatabaseMigrator };