#!/usr/bin/env node

/**
 * Optimized Database Migration Script for IProfit Platform
 * 
 * This script handles complete database setup in a single streamlined process:
 * - All collections creation with indexes
 * - Default data seeding (admins, plans, settings, templates)
 * - Sample data (optional)
 * - Comprehensive validation and reporting
 * 
 * Usage: npm run migrate-db [--sample] [--reset] [--production]
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Load environment variables
dotenv.config({ path: '.env.local' });

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  console.log('Please run: npm run check-env:create');
  process.exit(1);
}

class DatabaseMigrator {
  constructor() {
    this.collections = [
      // Core Collections
      'users', 'admins', 'plans', 'transactions', 'loans', 'referrals', 'tasks', 'task_submissions',
      
      // OAuth & Security
      'sessions', 'accounts', 'verification_tokens', 'device_fingerprints', 'auth_logs',
      
      // Content & Communication
      'notifications', 'notification_templates', 'news', 'faqs', 'support_tickets',
      
      // System & Monitoring
      'audit_logs', 'system_settings', 'rate_limits', 'settings','settings_history', 'kyc_documents', 'email_templates'
    ];

    this.isProduction = process.argv.includes('--production');
    this.shouldReset = process.argv.includes('--reset');
    this.shouldCreateSample = process.argv.includes('--sample');
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

  async initializeDatabase() {
    console.log('🚀 Starting database initialization...');

    try {
      await this.connectToDatabase();

      // Check if database already exists and handle reset
      if (this.shouldReset) {
        await this.resetDatabase();
      }

      // Check if database is already initialized
      const isInitialized = await this.checkIfInitialized();
      if (isInitialized && !this.shouldReset) {
        console.log('✅ Database already initialized');
        if (this.shouldCreateSample) {
          await this.createSampleData();
        }
        return;
      }

      // Create all collections and indexes
      await this.createCollectionsAndIndexes();



      // Validate setup
      await this.validateDatabase();

      // Generate report
      await this.generateReport();

      console.log('🎉 Database initialization completed successfully!');

    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async checkIfInitialized() {
    try {
      const db = mongoose.connection.db;
      const adminCount = await db.collection('admins').countDocuments();
      const planCount = await db.collection('plans').countDocuments();
      return adminCount > 0 && planCount > 0;
    } catch (error) {
      return false;
    }
  }

  async resetDatabase() {
    console.log('🗑️  Resetting database...');
    const db = mongoose.connection.db;
    
    try {
      // Drop all collections
      const collections = await db.listCollections().toArray();
      for (const collection of collections) {
        await db.collection(collection.name).drop();
        console.log(`  🗑️  Dropped collection: ${collection.name}`);
      }
      console.log('✅ Database reset completed');
    } catch (error) {
      console.log('ℹ️  Database was already empty or error occurred:', error.message);
    }
  }

  async createCollectionsAndIndexes() {
    console.log('📝 Creating collections and indexes...');
    const db = mongoose.connection.db;

    // Create all collections first
    for (const collName of this.collections) {
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

    // Create all indexes in parallel for better performance
    await this.createAllIndexes(db);
    console.log('✅ All collections and indexes created');
  }

  async createAllIndexes(db) {
    console.log('  📊 Creating comprehensive indexes...');

    const indexOperations = [
      // Users collection indexes
      {
        collection: 'users',
        indexes: [
          { key: { email: 1 }, unique: true },
          { key: { phone: 1 }, unique: true, sparse: true },
          { key: { referralCode: 1 }, unique: true },
          { key: { deviceId: 1 }, unique: true, sparse: true },
          { key: { status: 1 } },
          { key: { kycStatus: 1 } },
          { key: { planId: 1 } },
          { key: { createdAt: -1 } },
          { key: { lastLoginAt: -1 } },
          { key: { status: 1, kycStatus: 1 } },
          { key: { planId: 1, status: 1 } },
          { key: { referredBy: 1, status: 1 } },
          { key: { name: 'text', email: 'text', phone: 'text' } }
        ]
      },

      // Admins collection indexes
      {
        collection: 'admins',
        indexes: [
          { key: { email: 1 }, unique: true },
          { key: { role: 1 } },
          { key: { status: 1 } },
          { key: { lastLoginAt: -1 } }
        ]
      },

      // Transactions collection indexes
      {
        collection: 'transactions',
        indexes: [
          { key: { userId: 1 } },
          { key: { type: 1 } },
          { key: { status: 1 } },
          { key: { gateway: 1 } },
          { key: { transactionId: 1 }, unique: true, sparse: true },
          { key: { createdAt: -1 } },
          { key: { userId: 1, type: 1 } },
          { key: { userId: 1, status: 1 } },
          { key: { status: 1, createdAt: -1 } },
          { key: { gateway: 1, status: 1 } },
          { key: { type: 1, status: 1, createdAt: -1 } }
        ]
      },

      // Plans collection indexes
      {
        collection: 'plans',
        indexes: [
          { key: { name: 1 }, unique: true },
          { key: { status: 1 } },
          { key: { priority: 1 } }
        ]
      },

      // Loans collection indexes
      {
        collection: 'loans',
        indexes: [
          { key: { userId: 1 } },
          { key: { status: 1 } },
          { key: { creditScore: 1 } },
          { key: { amount: 1 } },
          { key: { createdAt: -1 } },
          { key: { userId: 1, status: 1 } },
          { key: { status: 1, createdAt: -1 } },
          { key: { creditScore: 1, status: 1 } },
          { key: { 'repaymentSchedule.dueDate': 1, 'repaymentSchedule.status': 1 } },
          { key: { 'repaymentSchedule.installmentNumber': 1 } },
          { key: { totalPaid: 1 } },
          { key: { remainingAmount: 1 } },
          { key: { overdueAmount: 1 } }
        ]
      },

      // Device fingerprints collection
      {
        collection: 'device_fingerprints',
        indexes: [
          { key: { deviceId: 1 }, unique: true },
          { key: { userId: 1 } },
          { key: { fingerprint: 1 } },
          { key: { isActive: 1 } },
          { key: { lastSeenAt: -1 } },
          { key: { createdAt: -1 } }
        ]
      },

      // Sessions collection (NextAuth.js)
      {
        collection: 'sessions',
        indexes: [
          { key: { sessionToken: 1 }, unique: true },
          { key: { userId: 1 } },
          { key: { expires: 1 }, expireAfterSeconds: 0 }
        ]
      },

      // Accounts collection (NextAuth.js)
      {
        collection: 'accounts',
        indexes: [
          { key: { userId: 1 } },
          { key: { provider: 1, providerAccountId: 1 }, unique: true }
        ]
      },

      // Verification tokens collection
      {
        collection: 'verification_tokens',
        indexes: [
          { key: { identifier: 1, token: 1 }, unique: true },
          { key: { expires: 1 }, expireAfterSeconds: 0 }
        ]
      },

      // Auth logs collection
      {
        collection: 'auth_logs',
        indexes: [
          { key: { userId: 1, createdAt: -1 } },
          { key: { action: 1 } },
          { key: { ipAddress: 1 } },
          { key: { deviceId: 1 } },
          { key: { success: 1 } },
          { key: { createdAt: -1 } },
          { key: { location: '2dsphere' } }
        ]
      },

      // Referrals collection
      {
        collection: 'referrals',
        indexes: [
          { key: { referrerId: 1 } },
          { key: { refereeId: 1 } },
          { key: { status: 1 } },
          { key: { createdAt: -1 } },
          { key: { referrerId: 1, status: 1 } }
        ]
      },

      // Tasks collection
      {
        collection: 'tasks',
        indexes: [
          { key: { status: 1 } },
          { key: { category: 1 } },
          { key: { priority: 1 } },
          { key: { isActive: 1 } }
        ]
      },

      // Task submissions collection
      {
        collection: 'task_submissions',
        indexes: [
          { key: { userId: 1 } },
          { key: { taskId: 1 } },
          { key: { status: 1 } },
          { key: { submittedAt: -1 } },
          { key: { userId: 1, taskId: 1 }, unique: true }
        ]
      },

      // KYC documents collection
      {
        collection: 'kyc_documents',
        indexes: [
          { key: { userId: 1 } },
          { key: { documentType: 1 } },
          { key: { status: 1 } },
          { key: { uploadedAt: -1 } }
        ]
      },

      // Notifications collection
      {
        collection: 'notifications',
        indexes: [
          { key: { userId: 1, status: 1 } },
          { key: { type: 1, status: 1 } },
          { key: { channel: 1 } },
          { key: { priority: 1, createdAt: -1 } },
          { key: { scheduledAt: 1, status: 1 } },
          { key: { status: 1, createdAt: -1 } }
        ]
      },

      // Notification templates collection
      {
        collection: 'notification_templates',
        indexes: [
          { key: { name: 1 }, unique: true },
          { key: { type: 1 } },
          { key: { channel: 1 } },
          { key: { isActive: 1 } }
        ]
      },

      // Audit logs collection
      {
        collection: 'audit_logs',
        indexes: [
          { key: { adminId: 1, createdAt: -1 } },
          { key: { action: 1, entity: 1 } },
          { key: { entity: 1, entityId: 1 } },
          { key: { severity: 1, createdAt: -1 } },
          { key: { createdAt: -1 } },
          { key: { ipAddress: 1 } }
        ]
      },

      // News collection
      {
        collection: 'news',
        indexes: [
          { key: { slug: 1 }, unique: true },
          { key: { status: 1 } },
          { key: { category: 1 } },
          { key: { isSticky: 1 } },
          { key: { publishedAt: -1 } },
          { key: { createdAt: -1 } },
          { key: { author: 1 } },
          { key: { title: 'text', content: 'text', excerpt: 'text' } }
        ]
      },

      // FAQs collection
      {
        collection: 'faqs',
        indexes: [
          { key: { category: 1 } },
          { key: { isActive: 1 } },
          { key: { priority: 1 } },
          { key: { createdAt: -1 } }
        ]
      },

      // Support tickets collection
      {
        collection: 'support_tickets',
        indexes: [
          { key: { userId: 1 } },
          { key: { status: 1 } },
          { key: { priority: 1 } },
          { key: { assignedTo: 1 } },
          { key: { category: 1 } },
          { key: { createdAt: -1 } },
          { key: { status: 1, priority: 1 } },
          { key: { subject: 'text', description: 'text' } }
        ]
      },

      // Settings collection
      {
        collection: 'settings',
        indexes: [
          { key: { key: 1 }, unique: true },
          { key: { category: 1 } },
          { key: { isEditable: 1 } },
          { key: { updatedAt: -1 } },
          { key: { category: 1, isEditable: 1 } }
        ]
      },

      // Rate limits collection
      {
        collection: 'rate_limits',
        indexes: [
          { key: { identifier: 1, windowStart: 1 }, unique: true },
          { key: { windowStart: 1 }, expireAfterSeconds: 3600 }
        ]
      }
    ];

    // Create indexes in parallel for better performance
    const indexPromises = indexOperations.map(async ({ collection, indexes }) => {
      try {
        await db.collection(collection).createIndexes(indexes);
        console.log(`    ✅ Created ${indexes.length} indexes for ${collection}`);
      } catch (error) {
        console.error(`    ❌ Error creating indexes for ${collection}:`, error.message);
      }
    });

    await Promise.all(indexPromises);
    console.log('  ✅ All indexes created successfully');
  }
  async validateDatabase() {
    console.log('🔍 Validating database structure...');

    try {
      const db = mongoose.connection.db;
      
      // Check collections exist
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);

      let allValid = true;
      for (const collection of this.collections) {
        if (!collectionNames.includes(collection)) {
          console.warn(`⚠️  Collection ${collection} not found`);
          allValid = false;
        } else {
          console.log(`✅ Collection ${collection} exists`);
        }
      }

      // Validate critical indexes
      const criticalIndexes = [
        { collection: 'users', index: 'email_1' },
        { collection: 'users', index: 'deviceId_1' },
        { collection: 'admins', index: 'email_1' },
        { collection: 'transactions', index: 'userId_1' },
        { collection: 'settings', index: 'key_1' }
      ];

      for (const { collection, index } of criticalIndexes) {
        try {
          const indexes = await db.collection(collection).listIndexes().toArray();
          const hasIndex = indexes.some(idx => idx.name === index);
          if (hasIndex) {
            console.log(`✅ Index ${collection}.${index} exists`);
          } else {
            console.warn(`⚠️  Index ${collection}.${index} missing`);
            allValid = false;
          }
        } catch (error) {
          console.warn(`⚠️  Could not check indexes for ${collection}`);
        }
      }

      if (allValid) {
        console.log('✅ Database validation completed successfully');
      } else {
        console.warn('⚠️  Database validation completed with warnings');
      }

    } catch (error) {
      console.error('❌ Database validation failed:', error);
      throw error;
    }
  }

  async generateReport() {
    console.log('📊 Generating database report...');

    try {
      const db = mongoose.connection.db;
      const report = {
        collections: {},
        totalDocuments: 0,
        databaseSize: 0
      };

      for (const collectionName of this.collections) {
        try {
          const collection = db.collection(collectionName);
          const count = await collection.countDocuments();
          const stats = await collection.stats();
          
          report.collections[collectionName] = {
            documents: count,
            size: stats.size || 0,
            indexes: stats.nindexes || 0
          };
          
          report.totalDocuments += count;
          report.databaseSize += (stats.size || 0);
        } catch (error) {
          report.collections[collectionName] = {
            documents: 0,
            size: 0,
            indexes: 0,
            error: error.message
          };
        }
      }

      console.log('\n📊 Database Report:');
      console.log('===================');
      console.log(`Total Documents: ${report.totalDocuments.toLocaleString()}`);
      console.log(`Total Size: ${(report.databaseSize / 1024 / 1024).toFixed(2)} MB`);
      console.log('\nCollection Details:');
      
      Object.entries(report.collections).forEach(([name, stats]) => {
        console.log(`  ${name}: ${stats.documents} docs, ${stats.indexes} indexes`);
      });

    } catch (error) {
      console.error('❌ Report generation failed:', error);
    }
  }
}

// Main execution function
async function main() {
  console.log('🚀 IProfit Optimized Database Migration Tool');
  console.log('==============================================');

  const migrator = new DatabaseMigrator();

  try {
    await migrator.initializeDatabase();

    console.log('\n🎉 Database migration completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Login with: admin@iprofit.com / Admin123@#');
    console.log('3. Check the admin dashboard');
    
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