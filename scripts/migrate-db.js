#!/usr/bin/env node

/**
 * Complete Database Migration Script for IProfit Platform (CommonJS)
 * 
 * This script handles database migrations, index creation, and schema updates
 * for the complete IProfit admin panel with OAuth 2.0 device-limited login.
 * 
 * Features:
 * - All collections setup (Users, Admins, Transactions, Loans, etc.)
 * - Comprehensive indexes for performance
 * - Device fingerprinting support
 * - OAuth 2.0 session management
 * - Sample data seeding
 * - Audit logging setup
 * 
 * Usage: npm run migrate-db [--sample] [--reset] [--production]
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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
        description: 'Initial database setup with core collections',
        up: this.migration_1_0_0.bind(this),
      },
      {
        version: '1.1.0',
        description: 'Add device fingerprinting and OAuth collections',
        up: this.migration_1_1_0.bind(this),
      },
      {
        version: '1.2.0',
        description: 'Add compound indexes for performance optimization',
        up: this.migration_1_2_0.bind(this),
      },
      {
        version: '1.3.0',
        description: 'Add loan management and KYC collections',
        up: this.migration_1_3_0.bind(this),
      },
      {
        version: '1.4.0',
        description: 'Add notification and audit systems',
        up: this.migration_1_4_0.bind(this),
      },
      {
        version: '1.5.0',
        description: 'Add content management and support systems',
        up: this.migration_1_5_0.bind(this),
      },
      {
        version: '1.6.0',
        description: 'Add advanced indexes and partitioning',
        up: this.migration_1_6_0.bind(this),
      },
      {
  version: '1.7.0',
  description: 'Create proper settings collection with comprehensive data',
  up: this.migration_1_7_0.bind(this),
}
    ];

    this.collections = [
      // Core Collections
      'users',
      'admins', 
      'plans',
      'transactions',
      'loans',
      'referrals',
      'tasks',
      'task_submissions',
      
      // OAuth & Security
      'sessions',
      'accounts',
      'verification_tokens',
      'device_fingerprints',
      'auth_logs',
      
      // Content & Communication
      'notifications',
      'notification_templates',
      'news',
      'faqs',
      'support_tickets',
      
      // System & Monitoring
      'audit_logs',
      'system_settings',
      'rate_limits',
      'settings',
      // Migration tracking
      'migrations'
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

  // Migration 1.0.0: Initial core collections setup
  async migration_1_0_0() {
    console.log('  📝 Creating core collections and basic indexes...');

    const db = mongoose.connection.db;

    // Create core collections
    const coreCollections = [
      'users', 'admins', 'plans', 'transactions', 
      'loans', 'referrals', 'tasks', 'task_submissions'
    ];
    
    for (const collName of coreCollections) {
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

    // Create basic indexes for core collections
    try {
      // Users collection indexes
      await db.collection('users').createIndexes([
        { key: { email: 1 }, unique: true },
        { key: { phone: 1 }, unique: true, sparse: true },
        { key: { referralCode: 1 }, unique: true },
        { key: { status: 1 } },
        { key: { kycStatus: 1 } },
        { key: { planId: 1 } },
        { key: { createdAt: -1 } },
        { key: { lastLoginAt: -1 } }
      ]);

      // Admins collection indexes
      await db.collection('admins').createIndexes([
        { key: { email: 1 }, unique: true },
        { key: { role: 1 } },
        { key: { status: 1 } },
        { key: { lastLoginAt: -1 } }
      ]);

      // Transactions collection indexes
      await db.collection('transactions').createIndexes([
        { key: { userId: 1 } },
        { key: { type: 1 } },
        { key: { status: 1 } },
        { key: { gateway: 1 } },
        { key: { transactionId: 1 }, unique: true, sparse: true },
        { key: { createdAt: -1 } }
      ]);

      // Plans collection indexes
      await db.collection('plans').createIndexes([
        { key: { name: 1 }, unique: true },
        { key: { status: 1 } },
        { key: { priority: 1 } }
      ]);

      // Loans collection indexes
      await db.collection('loans').createIndexes([
        { key: { userId: 1 } },
        { key: { status: 1 } },
        { key: { creditScore: 1 } },
        { key: { amount: 1 } },
        { key: { createdAt: -1 } }
      ]);

      console.log('  ✅ Core collection indexes created');
    } catch (error) {
      console.error('  ❌ Error creating core indexes:', error.message);
    }
  }

  // Migration 1.1.0: OAuth 2.0 and device fingerprinting
  async migration_1_1_0() {
    console.log('  📝 Setting up OAuth 2.0 and device fingerprinting...');

    const db = mongoose.connection.db;

    // Create OAuth and security collections
    const oauthCollections = [
      'sessions', 'accounts', 'verification_tokens', 
      'device_fingerprints', 'auth_logs'
    ];
    
    for (const collName of oauthCollections) {
      try {
        await db.createCollection(collName);
        console.log(`  ✅ Collection ${collName} created`);
      } catch (error) {
        if (error.codeName === 'NamespaceExists') {
          console.log(`  ℹ️  Collection ${collName} already exists`);
        }
      }
    }

    try {
      // Device fingerprints collection (for device-limited login)
      await db.collection('device_fingerprints').createIndexes([
        { key: { deviceId: 1 }, unique: true },
        { key: { userId: 1 } },
        { key: { fingerprint: 1 } },
        { key: { isActive: 1 } },
        { key: { lastSeenAt: -1 } },
        { key: { createdAt: -1 } }
      ]);

      // Add device limitation to users collection
      await db.collection('users').createIndexes([
        { key: { deviceId: 1 }, unique: true, sparse: true }
      ]);

      // Sessions collection (NextAuth.js v5)
      await db.collection('sessions').createIndexes([
        { key: { sessionToken: 1 }, unique: true },
        { key: { userId: 1 } },
        { key: { expires: 1 } }
      ]);

      // Accounts collection (NextAuth.js v5)
      await db.collection('accounts').createIndexes([
        { key: { userId: 1 } },
        { key: { provider: 1, providerAccountId: 1 }, unique: true }
      ]);

      // Verification tokens collection
      await db.collection('verification_tokens').createIndexes([
        { key: { identifier: 1, token: 1 }, unique: true },
        { key: { expires: 1 } }
      ]);

      // Auth logs collection
      await db.collection('auth_logs').createIndexes([
        { key: { userId: 1, createdAt: -1 } },
        { key: { action: 1 } },
        { key: { ipAddress: 1 } },
        { key: { deviceId: 1 } },
        { key: { success: 1 } },
        { key: { createdAt: -1 } }
      ]);

      console.log('  ✅ OAuth and device fingerprinting setup completed');
    } catch (error) {
      console.error('  ❌ Error setting up OAuth collections:', error.message);
    }
  }

  // Migration 1.2.0: Performance optimization indexes
  async migration_1_2_0() {
    console.log('  📝 Creating compound indexes for performance...');

    const db = mongoose.connection.db;

    try {
      // User compound indexes for better query performance
      await db.collection('users').createIndexes([
        { key: { status: 1, kycStatus: 1 } },
        { key: { planId: 1, status: 1 } },
        { key: { referredBy: 1, status: 1 } },
        { key: { createdAt: -1, status: 1 } }
      ]);

      // Transaction compound indexes
      await db.collection('transactions').createIndexes([
        { key: { userId: 1, type: 1 } },
        { key: { userId: 1, status: 1 } },
        { key: { status: 1, createdAt: -1 } },
        { key: { gateway: 1, status: 1 } },
        { key: { type: 1, status: 1, createdAt: -1 } }
      ]);

      // Loan compound indexes
      await db.collection('loans').createIndexes([
        { key: { userId: 1, status: 1 } },
        { key: { status: 1, createdAt: -1 } },
        { key: { creditScore: 1, status: 1 } },
        { key: { 'repaymentSchedule.dueDate': 1, 'repaymentSchedule.status': 1 } }
      ]);

      // Referral system indexes
      await db.collection('referrals').createIndexes([
        { key: { referrerId: 1 } },
        { key: { refereeId: 1 } },
        { key: { status: 1 } },
        { key: { createdAt: -1 } },
        { key: { referrerId: 1, status: 1 } }
      ]);

      console.log('  ✅ Performance optimization indexes created');
    } catch (error) {
      console.error('  ❌ Error creating performance indexes:', error.message);
    }
  }

  // Migration 1.3.0: Loan management and KYC
  async migration_1_3_0() {
    console.log('  📝 Setting up loan management and KYC collections...');

    const db = mongoose.connection.db;

    try {
      // Create KYC documents collection for better organization
      await db.createCollection('kyc_documents');
      
      await db.collection('kyc_documents').createIndexes([
        { key: { userId: 1 } },
        { key: { documentType: 1 } },
        { key: { status: 1 } },
        { key: { uploadedAt: -1 } }
      ]);

      // Loan repayment tracking
      await db.collection('loans').createIndexes([
        { key: { 'repaymentSchedule.installmentNumber': 1 } },
        { key: { 'repaymentSchedule.status': 1 } },
        { key: { totalPaid: 1 } },
        { key: { remainingAmount: 1 } },
        { key: { overdueAmount: 1 } }
      ]);

      // Task management indexes
      await db.collection('tasks').createIndexes([
        { key: { status: 1 } },
        { key: { category: 1 } },
        { key: { priority: 1 } },
        { key: { isActive: 1 } }
      ]);

      await db.collection('task_submissions').createIndexes([
        { key: { userId: 1 } },
        { key: { taskId: 1 } },
        { key: { status: 1 } },
        { key: { submittedAt: -1 } },
        { key: { userId: 1, taskId: 1 }, unique: true }
      ]);

      console.log('  ✅ Loan management and KYC setup completed');
    } catch (error) {
      console.error('  ❌ Error setting up loan/KYC collections:', error.message);
    }
  }

  // Migration 1.4.0: Notification and audit systems
  async migration_1_4_0() {
    console.log('  📝 Setting up notification and audit systems...');

    const db = mongoose.connection.db;

    // Create notification and audit collections
    const systemCollections = ['notifications', 'audit_logs', 'email_templates'];
    
    for (const collName of systemCollections) {
      try {
        await db.createCollection(collName);
        console.log(`  ✅ Collection ${collName} created`);
      } catch (error) {
        if (error.codeName === 'NamespaceExists') {
          console.log(`  ℹ️  Collection ${collName} already exists`);
        }
      }
    }

    try {
      // Notifications collection indexes
      await db.collection('notifications').createIndexes([
        { key: { userId: 1, status: 1 } },
        { key: { type: 1, status: 1 } },
        { key: { channel: 1 } },
        { key: { priority: 1, createdAt: -1 } },
        { key: { scheduledAt: 1, status: 1 } },
        { key: { status: 1, createdAt: -1 } }
      ]);

      // Audit logs collection indexes
      await db.collection('audit_logs').createIndexes([
        { key: { adminId: 1, createdAt: -1 } },
        { key: { action: 1, entity: 1 } },
        { key: { entity: 1, entityId: 1 } },
        { key: { severity: 1, createdAt: -1 } },
        { key: { createdAt: -1 } },
        { key: { ipAddress: 1 } }
      ]);

      // Email templates collection indexes
      await db.collection('email_templates').createIndexes([
        { key: { templateId: 1 }, unique: true },
        { key: { category: 1 } },
        { key: { isActive: 1 } }
      ]);

      console.log('  ✅ Notification and audit systems setup completed');
    } catch (error) {
      console.error('  ❌ Error setting up notification/audit systems:', error.message);
    }
  }

  // Migration 1.5.0: Content management and support
  async migration_1_5_0() {
    console.log('  📝 Setting up content management and support systems...');

    const db = mongoose.connection.db;

    // Create content and support collections
    const contentCollections = ['news', 'faqs', 'support_tickets', 'system_settings'];
    
    for (const collName of contentCollections) {
      try {
        await db.createCollection(collName);
        console.log(`  ✅ Collection ${collName} created`);
      } catch (error) {
        if (error.codeName === 'NamespaceExists') {
          console.log(`  ℹ️  Collection ${collName} already exists`);
        }
      }
    }

    try {
      // News collection indexes
      await db.collection('news').createIndexes([
        { key: { slug: 1 }, unique: true },
        { key: { status: 1 } },
        { key: { category: 1 } },
        { key: { isSticky: 1 } },
        { key: { publishedAt: -1 } },
        { key: { createdAt: -1 } },
        { key: { author: 1 } }
      ]);

      // FAQs collection indexes
      await db.collection('faqs').createIndexes([
        { key: { category: 1 } },
        { key: { isActive: 1 } },
        { key: { priority: 1 } },
        { key: { createdAt: -1 } }
      ]);

      // Support tickets collection indexes
      await db.collection('support_tickets').createIndexes([
        { key: { userId: 1 } },
        { key: { status: 1 } },
        { key: { priority: 1 } },
        { key: { assignedTo: 1 } },
        { key: { category: 1 } },
        { key: { createdAt: -1 } },
        { key: { status: 1, priority: 1 } }
      ]);

      // System settings collection indexes
      await db.collection('system_settings').createIndexes([
        { key: { key: 1 }, unique: true },
        { key: { category: 1 } },
        { key: { isActive: 1 } }
      ]);

      console.log('  ✅ Content management and support systems setup completed');
    } catch (error) {
      console.error('  ❌ Error setting up content/support systems:', error.message);
    }
  }

  // Migration 1.6.0: Advanced indexes and optimization
  async migration_1_6_0() {
    console.log('  📝 Creating advanced indexes and optimizations...');

    const db = mongoose.connection.db;

    try {
      // Create rate limiting collection for API protection
      await db.createCollection('rate_limits');
      await db.collection('rate_limits').createIndexes([
        { key: { identifier: 1, windowStart: 1 }, unique: true },
        { key: { windowStart: 1 }, expireAfterSeconds: 3600 } // TTL index
      ]);

      // Add TTL indexes for temporary data
      await db.collection('verification_tokens').createIndex(
        { expires: 1 }, 
        { expireAfterSeconds: 0 }
      );

      await db.collection('sessions').createIndex(
        { expires: 1 }, 
        { expireAfterSeconds: 0 }
      );

      // Text search indexes for better search functionality
      await db.collection('users').createIndex({
        name: 'text',
        email: 'text',
        phone: 'text'
      });

      await db.collection('news').createIndex({
        title: 'text',
        content: 'text',
        excerpt: 'text'
      });

      await db.collection('support_tickets').createIndex({
        subject: 'text',
        description: 'text'
      });

      // Geospatial indexes if location data is needed
      await db.collection('auth_logs').createIndex({
        location: '2dsphere'
      });

      console.log('  ✅ Advanced indexes and optimizations completed');
    } catch (error) {
      console.error('  ❌ Error creating advanced indexes:', error.message);
    }
  }
async migration_1_7_0() {
  console.log('  📝 Creating proper settings collection...');

  const db = mongoose.connection.db;

  try {
    // Create settings collection
    await db.createCollection('settings');
    console.log('  ✅ Settings collection created');

    // Get a sample admin ID for updatedBy field
    const sampleAdmin = await db.collection('admins').findOne();
    const adminId = sampleAdmin?._id || new mongoose.Types.ObjectId();

    // Create comprehensive settings data
    const settingsData = [
      // System Settings
      {
        category: 'system',
        key: 'app_name',
        value: 'IProfit Admin',
        dataType: 'string',
        description: 'Application name displayed in the interface',
        isEditable: true,
        isEncrypted: false,
        defaultValue: 'IProfit Admin',
        validation: { required: true, min: 1, max: 100 },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      {
        category: 'system',
        key: 'company_name',
        value: 'IProfit Technologies',
        dataType: 'string',
        description: 'Company name for branding',
        isEditable: true,
        isEncrypted: false,
        validation: { required: true },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'system',
        key: 'maintenance_mode',
        value: false,
        dataType: 'boolean',
        description: 'Enable maintenance mode',
        isEditable: true,
        isEncrypted: false,
        defaultValue: false,
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Financial Settings
      {
        category: 'financial',
        key: 'primary_currency',
        value: 'BDT',
        dataType: 'string',
        description: 'Primary currency for the platform',
        isEditable: true,
        isEncrypted: false,
        validation: { required: true, enum: ['BDT', 'USD', 'EUR'] },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'financial',
        key: 'usd_to_bdt_rate',
        value: 110.50,
        dataType: 'number',
        description: 'Current USD to BDT exchange rate',
        isEditable: true,
        isEncrypted: false,
        validation: { required: true, min: 1 },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'financial',
        key: 'min_deposit',
        value: 100,
        dataType: 'number',
        description: 'Minimum deposit amount in BDT',
        isEditable: true,
        isEncrypted: false,
        validation: { required: true, min: 1 },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'financial',
        key: 'signup_bonus',
        value: 100,
        dataType: 'number',
        description: 'Signup bonus amount in BDT',
        isEditable: true,
        isEncrypted: false,
        validation: { min: 0 },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
  key: 'withdrawal_bank_fee_percentage',
  value: 0.02,
  category: 'financial',
  description: 'Bank transfer withdrawal fee percentage'
},
{
  key: 'withdrawal_bank_min_fee',
  value: 5,
  category: 'financial',
  description: 'Minimum bank transfer withdrawal fee'
},
{
  key: 'withdrawal_mobile_fee_percentage',
  value: 0.015,
  category: 'financial',
  description: 'Mobile banking withdrawal fee percentage'
},
{
  key: 'withdrawal_crypto_fee_percentage',
  value: 0.01,
  category: 'financial',
  description: 'Crypto wallet withdrawal fee percentage'
},
{
  key: 'withdrawal_check_flat_fee',
  value: 10,
  category: 'financial',
  description: 'Check withdrawal flat fee'
},
{
  key: 'withdrawal_urgent_fee_percentage',
  value: 0.005,
  category: 'financial',
  description: 'Urgent processing additional fee percentage'
},
      // Security Settings
      {
        category: 'security',
        key: 'device_limit_per_user',
        value: 1,
        dataType: 'number',
        description: 'Maximum devices allowed per user',
        isEditable: true,
        isEncrypted: false,
        validation: { required: true, min: 1, max: 10 },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
  key: 'enable_device_limiting',
  value: true,
  category: 'security',
  description: 'Enable device limiting for signup'
},
      {
  key: 'block_emulators',
  value: true,
  category: 'security',
  description: 'Block access from emulated devices'
},
{
  key: 'block_virtual_devices', 
  value: true,
  category: 'security',
  description: 'Block access from virtual machines'
},
{
  key: 'max_device_risk_score',
  value: 0.8,
  category: 'security', 
  description: 'Maximum allowed device risk score'
},
{
  key: 'moderate_risk_threshold',
  value: 0.6,
  category: 'security',
  description: 'Threshold for moderate risk warnings'
},
{
  key: 'enable_device_blocking',
  value: true,
  category: 'security',
  description: 'Enable device security blocking'
},
{
  key: 'email_verification_required',
  value: true,
  category: 'security',
  description: 'Require email verification on signup'
},
{
  key: 'phone_verification_required',
  value: false,
  category: 'security', 
  description: 'Require phone verification on signup'
},
      {
        category: 'security',
        key: 'session_timeout_minutes',
        value: 30,
        dataType: 'number',
        description: 'Admin session timeout in minutes',
        isEditable: true,
        isEncrypted: false,
        validation: { required: true, min: 5, max: 1440 },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'security',
        key: 'max_failed_login_attempts',
        value: 5,
        dataType: 'number',
        description: 'Maximum failed login attempts',
        isEditable: true,
        isEncrypted: false,
        validation: { required: true, min: 1, max: 20 },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Email Settings
      {
        category: 'email',
        key: 'smtp_host',
        value: 'smtp.gmail.com',
        dataType: 'string',
        description: 'SMTP server hostname',
        isEditable: true,
        isEncrypted: false,
        validation: { required: true },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'email',
        key: 'smtp_port',
        value: 587,
        dataType: 'number',
        description: 'SMTP server port',
        isEditable: true,
        isEncrypted: false,
        validation: { required: true, min: 1, max: 65535 },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'email',
        key: 'smtp_user',
        value: '',
        dataType: 'string',
        description: 'SMTP username',
        isEditable: true,
        isEncrypted: false,
        validation: { required: true },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Upload Settings
      {
        category: 'upload',
        key: 'max_file_size_mb',
        value: 10,
        dataType: 'number',
        description: 'Maximum file size in MB',
        isEditable: true,
        isEncrypted: false,
        validation: { required: true, min: 1, max: 100 },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'upload',
        key: 'allowed_file_types',
        value: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
        dataType: 'array',
        description: 'Allowed file extensions',
        isEditable: true,
        isEncrypted: false,
        validation: { required: true },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Business Settings
      {
        category: 'business',
        key: 'auto_kyc_approval',
        value: false,
        dataType: 'boolean',
        description: 'Auto approve KYC submissions',
        isEditable: true,
        isEncrypted: false,
        defaultValue: false,
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
  key: 'withdrawal_processing_time_bank',
  value: '1-3 business days',
  category: 'business',
  description: 'Bank transfer processing time'
},
{
  key: 'withdrawal_processing_time_mobile',
  value: '2-4 hours',
  category: 'business',
  description: 'Mobile banking processing time'
},
{
  key: 'withdrawal_processing_time_crypto',
  value: '4-6 hours',
  category: 'business',
  description: 'Crypto wallet processing time'
},
{
  key: 'withdrawal_processing_time_check',
  value: '5-7 business days',
  category: 'business',
  description: 'Check processing time'
},
{
  key: 'withdrawal_processing_time_urgent',
  value: '1-2 hours',
  category: 'business',
  description: 'Urgent processing time'
},
      {
  key: 'enable_referral_system', 
  value: true,
  category: 'business',
  description: 'Enable referral bonus system'
},
{
  key: 'default_plan_name',
  value: 'Free',
  category: 'business', 
  description: 'Default plan for new users'
},
{
  key: 'auto_kyc_approval',
  value: false,
  category: 'business',
  description: 'Automatically approve KYC for new users'
},
{
  key: 'max_referral_code_attempts',
  value: 5,
  category: 'business',
  description: 'Max attempts to generate unique referral code'
},
      {
        category: 'business',
        key: 'max_tasks_per_user',
        value: 10,
        dataType: 'number',
        description: 'Max tasks per user',
        isEditable: true,
        isEncrypted: false,
        validation: { min: 1, max: 100 },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // API Settings
      {
        category: 'api',
        key: 'api_timeout_seconds',
        value: 30,
        dataType: 'number',
        description: 'API timeout in seconds',
        isEditable: true,
        isEncrypted: false,
        validation: { required: true, min: 1, max: 300 },
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Maintenance Settings
      {
        category: 'maintenance',
        key: 'auto_backup_enabled',
        value: true,
        dataType: 'boolean',
        description: 'Enable auto backups',
        isEditable: true,
        isEncrypted: false,
        defaultValue: true,
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert settings into the database
    await db.collection('settings').insertMany(settingsData);
    console.log(`  ✅ Created ${settingsData.length} settings records`);

    // Create indexes for the settings collection
    await db.collection('settings').createIndexes([
      { key: { key: 1 }, unique: true },
      { key: { category: 1 } },
      { key: { isEditable: 1 } },
      { key: { updatedAt: -1 } },
      { key: { category: 1, isEditable: 1 } }
    ]);
    console.log('  ✅ Created settings collection indexes');

    console.log('  ✅ Proper settings collection setup completed');
  } catch (error) {
    console.error('  ❌ Error setting up settings collection:', error.message);
  }
}
  async createSampleData() {
    console.log('📊 Creating sample data...');

    const db = mongoose.connection.db;
    const args = process.argv.slice(2);
    const isProduction = args.includes('--production');

    try {
      // Check if data already exists
      const userCount = await db.collection('users').countDocuments();
      if (userCount > 0 && !args.includes('--reset')) {
        console.log('ℹ️  Sample data already exists, skipping...');
        return;
      }

      // Create default system settings
      await this.createSystemSettings(db);

      // Create default plans
      await this.createDefaultPlans(db);

      // Create default admin accounts
      await this.createDefaultAdmins(db);

      // Create email templates
      await this.createEmailTemplates(db);

      // Create sample data (only in development)
      if (!isProduction) {
        await this.createSampleUsers(db);
        await this.createSampleTransactions(db);
        await this.createSampleLoans(db);
        await this.createSampleContent(db);
      }

      console.log('🎉 Sample data creation completed');

    } catch (error) {
      console.error('❌ Sample data creation failed:', error);
      throw error;
    }
  }

  async createSystemSettings(db) {
    console.log('  📝 Creating system settings...');

    const settings = [
      {
        key: 'app_name',
        value: 'IProfit Admin',
        category: 'general',
        description: 'Application name',
        isActive: true,
        createdAt: new Date()
      },
      {
        key: 'device_limit_per_user',
        value: 1,
        category: 'security',
        description: 'Maximum devices allowed per user',
        isActive: true,
        createdAt: new Date()
      },
      {
        key: 'session_timeout_minutes',
        value: 30,
        category: 'security',
        description: 'Admin session timeout in minutes',
        isActive: true,
        createdAt: new Date()
      },
      {
        key: 'max_failed_login_attempts',
        value: 5,
        category: 'security',
        description: 'Maximum failed login attempts before lockout',
        isActive: true,
        createdAt: new Date()
      },
      {
        key: 'referral_bonus_amount',
        value: 100,
        category: 'finance',
        description: 'Referral bonus amount in BDT',
        isActive: true,
        createdAt: new Date()
      },
      {
        key: 'referral_profit_percentage',
        value: 10,
        category: 'finance',
        description: 'Referral profit sharing percentage',
        isActive: true,
        createdAt: new Date()
      }
    ];

    await db.collection('system_settings').insertMany(settings);
    console.log('  ✅ System settings created');
  }

  async createDefaultPlans(db) {
    console.log('  📝 Creating default plans...');

    const plansExist = await db.collection('plans').findOne();
    if (plansExist) {
      console.log('  ℹ️  Plans already exist, skipping...');
      return;
    }

    const plans = [
      {
        name: 'Free Plan',
        description: 'Basic plan for beginners',
        price: 0,
        currency: 'BDT',
        limits: {
          depositLimit: 10000,
          withdrawalLimit: 5000,
          profitLimit: 1000,
          minimumDeposit: 100,
          minimumWithdrawal: 100,
          dailyWithdrawalLimit: 1000,
          monthlyWithdrawalLimit: 10000
        },
        features: ['Basic Support', 'Mobile App Access'],
        color: '#6b7280',
        priority: 0,
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Silver Plan',
        description: 'Intermediate plan with better limits',
        price: 1000,
        currency: 'BDT',
        limits: {
          depositLimit: 50000,
          withdrawalLimit: 25000,
          profitLimit: 5000,
          minimumDeposit: 500,
          minimumWithdrawal: 100,
          dailyWithdrawalLimit: 5000,
          monthlyWithdrawalLimit: 50000
        },
        features: ['Priority Support', 'Higher Limits', 'Mobile App Access'],
        color: '#9ca3af',
        priority: 1,
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Gold Plan',
        description: 'Premium plan with maximum benefits',
        price: 5000,
        currency: 'BDT',
        limits: {
          depositLimit: 200000,
          withdrawalLimit: 100000,
          profitLimit: 20000,
          minimumDeposit: 1000,
          minimumWithdrawal: 100,
          dailyWithdrawalLimit: 20000,
          monthlyWithdrawalLimit: 200000
        },
        features: ['VIP Support', 'Maximum Limits', 'Exclusive Features'],
        color: '#f59e0b',
        priority: 2,
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Platinum Plan',
        description: 'Enterprise level plan',
        price: 10000,
        currency: 'BDT',
        limits: {
          depositLimit: 500000,
          withdrawalLimit: 250000,
          profitLimit: 50000,
          minimumDeposit: 2000,
          minimumWithdrawal: 100,
          dailyWithdrawalLimit: 50000,
          monthlyWithdrawalLimit: 500000
        },
        features: ['24/7 Support', 'Priority Processing', 'Dedicated Manager'],
        color: '#8b5cf6',
        priority: 3,
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Diamond Plan',
        description: 'Ultimate plan with unlimited benefits',
        price: 25000,
        currency: 'BDT',
        limits: {
          depositLimit: 1000000,
          withdrawalLimit: 500000,
          profitLimit: 100000,
          minimumDeposit: 5000,
          minimumWithdrawal: 100,
          dailyWithdrawalLimit: 100000,
          monthlyWithdrawalLimit: 1000000
        },
        features: ['Unlimited Access', 'White Glove Service', 'Custom Solutions'],
        color: '#06b6d4',
        priority: 4,
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.collection('plans').insertMany(plans);
    console.log('  ✅ Default plans created');
  }

  async createDefaultAdmins(db) {
    console.log('  📝 Creating default admin accounts...');

    const adminExists = await db.collection('admins').findOne();
    if (adminExists) {
      console.log('  ℹ️  Admin accounts already exist, skipping...');
      return;
    }

    const admins = [
      {
        name: 'System Administrator',
        email: 'admin@iprofit.com',
        password: await bcrypt.hash('Admin123@#', 12),
        role: 'SuperAdmin',
        permissions: ['*'],
        status: 'Active',
        emailVerified: true,
        twoFactorEnabled: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Content Moderator',
        email: 'moderator@iprofit.com',
        password: await bcrypt.hash('Mod123@#', 12),
        role: 'Moderator',
        permissions: [
          'users.view', 'users.update', 'users.kyc.approve', 'users.kyc.reject',
          'transactions.view', 'transactions.approve', 'transactions.reject',
          'loans.view', 'loans.approve', 'loans.reject',
          'support.view', 'support.respond', 'support.close',
          'content.view', 'content.create', 'content.update'
        ],
        status: 'Active',
        emailVerified: true,
        twoFactorEnabled: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.collection('admins').insertMany(admins);
    console.log('  ✅ Default admin accounts created');
  }

  async createEmailTemplates(db) {
    console.log('  📝 Creating notification templates...');

    const templatesExist = await db.collection('notification_templates').findOne();
    if (templatesExist) {
      console.log('  ℹ️  Notification templates already exist, skipping...');
      return;
    }

    const templates = [
      // Welcome Email Template
      {
        name: 'Welcome Email',
        type: 'System',
        channel: 'email',
        subject: 'Welcome to IProfit!',
        content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Welcome to IProfit</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; text-align: center;">Welcome to IProfit!</h1>
        <p>Hi {{userName}},</p>
        <p>Thank you for joining IProfit. Your account has been created successfully and you're ready to start your financial journey with us.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Your Account Details:</h3>
            <p><strong>Email:</strong> {{userEmail}}</p>
            <p><strong>Referral Code:</strong> {{referralCode}}</p>
        </div>
        <p>Start exploring our features and take control of your finances today!</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Access Dashboard</a>
        </div>
        <p style="color: #666; font-size: 14px;">If you have any questions, contact us at {{supportEmail}}</p>
    </div>
</body>
</html>`,
        variables: [
          { name: 'userName', description: 'User full name', type: 'string', required: true },
          { name: 'userEmail', description: 'User email address', type: 'string', required: true },
          { name: 'referralCode', description: 'User referral code', type: 'string', required: true },
          { name: 'dashboardUrl', description: 'Dashboard URL', type: 'string', required: true },
          { name: 'supportEmail', description: 'Support email', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'Medium',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // KYC Approved Template
      {
        name: 'KYC Approved',
        type: 'KYC',
        channel: 'email',
        subject: 'KYC Verification Approved - Welcome to Full Access!',
        content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>KYC Approved</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669;">✅ KYC Verification Approved!</h1>
        </div>
        <p>Hi {{userName}},</p>
        <p>Great news! Your KYC verification has been successfully approved on {{approvalDate}}.</p>
        <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 20px; margin: 20px 0;">
            <h3 style="color: #059669; margin-top: 0;">You now have access to:</h3>
            <ul>
                <li>Higher transaction limits</li>
                <li>Loan applications</li>
                <li>Priority customer support</li>
                <li>All premium features</li>
            </ul>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Explore Features</a>
        </div>
        <p style="color: #666; font-size: 14px;">For any questions, reach out to us at {{supportEmail}}</p>
    </div>
</body>
</html>`,
        variables: [
          { name: 'userName', description: 'User full name', type: 'string', required: true },
          { name: 'approvalDate', description: 'KYC approval date', type: 'date', required: true },
          { name: 'dashboardUrl', description: 'Dashboard URL', type: 'string', required: true },
          { name: 'supportEmail', description: 'Support email', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'High',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // KYC Rejected Template
      {
        name: 'KYC Rejected',
        type: 'KYC',
        channel: 'email',
        subject: 'KYC Verification - Additional Information Required',
        content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>KYC Rejected</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626;">KYC Verification Update</h1>
        <p>Hi {{userName}},</p>
        <p>We've reviewed your KYC submission and need additional information to complete the verification process.</p>
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">Reason for Review:</h3>
            <p>{{rejectionReason}}</p>
        </div>
        <p>Please resubmit your documents with the required information. Our support team is here to help if you need assistance.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{kycUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Resubmit KYC</a>
        </div>
        <p style="color: #666; font-size: 14px;">Contact support at {{supportEmail}} for assistance</p>
    </div>
</body>
</html>`,
        variables: [
          { name: 'userName', description: 'User full name', type: 'string', required: true },
          { name: 'rejectionReason', description: 'Reason for rejection', type: 'string', required: true },
          { name: 'kycUrl', description: 'KYC submission URL', type: 'string', required: true },
          { name: 'supportEmail', description: 'Support email', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'High',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Withdrawal Approved Template
      {
        name: 'Withdrawal Approved',
        type: 'Withdrawal',
        channel: 'email',
        subject: 'Withdrawal Request Approved - {{amount}}',
        content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Withdrawal Approved</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">✅ Withdrawal Approved</h1>
        <p>Hi {{userName}},</p>
        <p>Your withdrawal request has been approved and processed successfully.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Transaction Details:</h3>
            <p><strong>Amount:</strong> {{amount}}</p>
            <p><strong>Transaction ID:</strong> {{transactionId}}</p>
            <p><strong>Processed Date:</strong> {{processedDate}}</p>
            <p><strong>Method:</strong> {{withdrawalMethod}}</p>
        </div>
        <p>The funds will be transferred to your account within 1-3 business days.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{transactionUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Transaction</a>
        </div>
        <p style="color: #666; font-size: 14px;">Questions? Contact us at {{supportEmail}}</p>
    </div>
</body>
</html>`,
        variables: [
          { name: 'userName', description: 'User full name', type: 'string', required: true },
          { name: 'amount', description: 'Withdrawal amount with currency', type: 'string', required: true },
          { name: 'transactionId', description: 'Transaction ID', type: 'string', required: true },
          { name: 'processedDate', description: 'Processing date', type: 'date', required: true },
          { name: 'withdrawalMethod', description: 'Withdrawal method', type: 'string', required: true },
          { name: 'transactionUrl', description: 'Transaction details URL', type: 'string', required: true },
          { name: 'supportEmail', description: 'Support email', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'High',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Loan Approved Template
      {
        name: 'Loan Approved',
        type: 'Loan',
        channel: 'email',
        subject: 'Loan Application Approved - {{loanAmount}}',
        content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Loan Approved</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">🎉 Loan Application Approved!</h1>
        <p>Hi {{userName}},</p>
        <p>Congratulations! Your loan application has been approved. Here are the details:</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Loan Details:</h3>
            <p><strong>Loan Amount:</strong> {{loanAmount}}</p>
            <p><strong>Interest Rate:</strong> {{interestRate}}% per annum</p>
            <p><strong>Tenure:</strong> {{tenure}} months</p>
            <p><strong>EMI Amount:</strong> {{emiAmount}}</p>
            <p><strong>First EMI Due:</strong> {{firstEmiDate}}</p>
        </div>
        <p>The loan amount will be disbursed to your account within 24 hours.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{loanDetailsUrl}}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Loan Details</a>
        </div>
        <p style="color: #666; font-size: 14px;">For support, contact us at {{supportEmail}}</p>
    </div>
</body>
</html>`,
        variables: [
          { name: 'userName', description: 'User full name', type: 'string', required: true },
          { name: 'loanAmount', description: 'Approved loan amount', type: 'string', required: true },
          { name: 'interestRate', description: 'Interest rate', type: 'number', required: true },
          { name: 'tenure', description: 'Loan tenure in months', type: 'number', required: true },
          { name: 'emiAmount', description: 'EMI amount', type: 'string', required: true },
          { name: 'firstEmiDate', description: 'First EMI due date', type: 'date', required: true },
          { name: 'loanDetailsUrl', description: 'Loan details URL', type: 'string', required: true },
          { name: 'supportEmail', description: 'Support email', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'High',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Referral Bonus Template
      {
        name: 'Referral Bonus Credited',
        type: 'Referral',
        channel: 'email',
        subject: 'Referral Bonus Credited - {{bonusAmount}}',
        content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Referral Bonus</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #7c3aed;">🎉 Referral Bonus Credited!</h1>
        <p>Hi {{userName}},</p>
        <p>Great news! You've earned a referral bonus for successfully referring {{referredUserName}} to IProfit.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Bonus Details:</h3>
            <p><strong>Bonus Amount:</strong> {{bonusAmount}}</p>
            <p><strong>Referred User:</strong> {{referredUserName}}</p>
            <p><strong>Credited Date:</strong> {{creditedDate}}</p>
            <p><strong>New Balance:</strong> {{newBalance}}</p>
        </div>
        <p>Keep referring friends and family to earn more bonuses!</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{referralUrl}}" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Share Referral Link</a>
        </div>
        <p style="color: #666; font-size: 14px;">Questions? Contact us at {{supportEmail}}</p>
    </div>
</body>
</html>`,
        variables: [
          { name: 'userName', description: 'User full name', type: 'string', required: true },
          { name: 'bonusAmount', description: 'Bonus amount credited', type: 'string', required: true },
          { name: 'referredUserName', description: 'Referred user name', type: 'string', required: true },
          { name: 'creditedDate', description: 'Bonus credited date', type: 'date', required: true },
          { name: 'newBalance', description: 'Updated account balance', type: 'string', required: true },
          { name: 'referralUrl', description: 'Referral sharing URL', type: 'string', required: true },
          { name: 'supportEmail', description: 'Support email', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'Medium',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Task Completion Template
      {
        name: 'Task Completed',
        type: 'Task',
        channel: 'email',
        subject: 'Task Completed - Reward Earned!',
        content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Task Completed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">✅ Task Completed Successfully!</h1>
        <p>Hi {{userName}},</p>
        <p>Congratulations! You have successfully completed the task "{{taskName}}" and earned a reward.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Task Details:</h3>
            <p><strong>Task:</strong> {{taskName}}</p>
            <p><strong>Reward:</strong> {{rewardAmount}}</p>
            <p><strong>Completed Date:</strong> {{completedDate}}</p>
            <p><strong>New Balance:</strong> {{newBalance}}</p>
        </div>
        <p>Keep completing tasks to earn more rewards and bonuses!</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{tasksUrl}}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View More Tasks</a>
        </div>
        <p style="color: #666; font-size: 14px;">Questions? Contact us at {{supportEmail}}</p>
    </div>
</body>
</html>`,
        variables: [
          { name: 'userName', description: 'User full name', type: 'string', required: true },
          { name: 'taskName', description: 'Completed task name', type: 'string', required: true },
          { name: 'rewardAmount', description: 'Reward amount earned', type: 'string', required: true },
          { name: 'completedDate', description: 'Task completion date', type: 'date', required: true },
          { name: 'newBalance', description: 'Updated account balance', type: 'string', required: true },
          { name: 'tasksUrl', description: 'Tasks page URL', type: 'string', required: true },
          { name: 'supportEmail', description: 'Support email', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'Medium',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Account Security Alert
      {
        name: 'Security Alert',
        type: 'System',
        channel: 'email',
        subject: 'Security Alert - New Device Login',
        content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Security Alert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626;">🔒 Security Alert</h1>
        <p>Hi {{userName}},</p>
        <p>We detected a new device login to your IProfit account. If this was you, you can ignore this email.</p>
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
            <h3>Login Details:</h3>
            <p><strong>Device:</strong> {{deviceInfo}}</p>
            <p><strong>Location:</strong> {{location}}</p>
            <p><strong>Time:</strong> {{loginTime}}</p>
            <p><strong>IP Address:</strong> {{ipAddress}}</p>
        </div>
        <p><strong>If this wasn't you:</strong> Please change your password immediately and contact our support team.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{securityUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Review Security Settings</a>
        </div>
        <p style="color: #666; font-size: 14px;">For immediate assistance, contact {{supportEmail}}</p>
    </div>
</body>
</html>`,
        variables: [
          { name: 'userName', description: 'User full name', type: 'string', required: true },
          { name: 'deviceInfo', description: 'Device information', type: 'string', required: true },
          { name: 'location', description: 'Login location', type: 'string', required: true },
          { name: 'loginTime', description: 'Login timestamp', type: 'date', required: true },
          { name: 'ipAddress', description: 'IP address', type: 'string', required: true },
          { name: 'securityUrl', description: 'Security settings URL', type: 'string', required: true },
          { name: 'supportEmail', description: 'Support email', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'Urgent',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.collection('notification_templates').insertMany(templates);
    console.log('  ✅ Notification templates created');
  }

  async createSampleUsers(db) {
    console.log('  📝 Creating sample users...');

    // Get the free plan
    const freePlan = await db.collection('plans').findOne({ name: 'Free Plan' });
    if (!freePlan) {
      console.log('  ⚠️  Free plan not found, skipping user creation');
      return;
    }

    const sampleUsers = [];
    for (let i = 1; i <= 10; i++) {
      sampleUsers.push({
        name: `User ${i}`,
        email: `user${i}@example.com`,
        phone: `+8801${String(i).padStart(9, '0')}`,
        password: await bcrypt.hash('User123@#', 12),
        planId: freePlan._id,
        referralCode: `REF${String(i).padStart(6, '0')}`,
        balance: Math.floor(Math.random() * 10000),
        status: 'Active',
        kycStatus: i <= 5 ? 'Approved' : 'Pending',
        emailVerified: true,
        phoneVerified: i <= 7,
        deviceId: `device_${crypto.randomBytes(16).toString('hex')}`,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      });
    }

    await db.collection('users').insertMany(sampleUsers);
    console.log('  ✅ Sample users created');
  }

  async createSampleTransactions(db) {
    console.log('  📝 Creating sample transactions...');

    const users = await db.collection('users').find({}).toArray();
    if (users.length === 0) return;

    const sampleTransactions = [];
    const types = ['deposit', 'withdrawal', 'bonus'];
    const gateways = ['CoinGate', 'UddoktaPay', 'Manual'];
    const statuses = ['Approved', 'Pending', 'Rejected'];

    for (let i = 0; i < 50; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      
      sampleTransactions.push({
        userId: user._id,
        type,
        amount: Math.floor(Math.random() * 10000) + 100,
        currency: 'BDT',
        gateway: gateways[Math.floor(Math.random() * gateways.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        transactionId: `TXN${Date.now()}${i}`,
        fees: 0,
        netAmount: Math.floor(Math.random() * 10000) + 100,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      });
    }

    await db.collection('transactions').insertMany(sampleTransactions);
    console.log('  ✅ Sample transactions created');
  }

  async createSampleLoans(db) {
    console.log('  📝 Creating sample loans...');

    const users = await db.collection('users').find({ kycStatus: 'Approved' }).toArray();
    if (users.length === 0) return;

    const sampleLoans = [];
    const statuses = ['Pending', 'Approved', 'Active', 'Completed'];

    for (let i = 0; i < Math.min(20, users.length); i++) {
      const user = users[i];
      const amount = (Math.floor(Math.random() * 10) + 1) * 10000; // 10k to 100k
      const interestRate = 12 + Math.random() * 8; // 12-20%
      const tenure = (Math.floor(Math.random() * 5) + 1) * 12; // 1-5 years
      
      sampleLoans.push({
        userId: user._id,
        amount,
        currency: 'BDT',
        interestRate,
        tenure,
        emiAmount: Math.floor((amount * (interestRate / 100) / 12) * (1 + interestRate / 100) ** tenure / ((1 + interestRate / 100) ** tenure - 1)),
        creditScore: 650 + Math.floor(Math.random() * 200),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        purpose: 'Personal Loan',
        monthlyIncome: 30000 + Math.floor(Math.random() * 70000),
        employmentStatus: 'Employed',
        totalPaid: 0,
        remainingAmount: amount,
        overdueAmount: 0,
        penaltyAmount: 0,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      });
    }

    await db.collection('loans').insertMany(sampleLoans);
    console.log('  ✅ Sample loans created');
  }

  async createSampleContent(db) {
    console.log('  📝 Creating sample content...');

    // Sample news articles
    const sampleNews = [
      {
        title: 'Welcome to IProfit Platform',
        slug: 'welcome-to-iprofit-platform',
        content: 'We are excited to announce the launch of our new financial platform...',
        excerpt: 'Introducing IProfit - your new financial companion',
        category: 'Announcement',
        status: 'Published',
        isSticky: true,
        author: 'Admin',
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'New Loan Features Available',
        slug: 'new-loan-features-available',
        content: 'We have added new loan features to help you manage your finances better...',
        excerpt: 'Enhanced loan management features now available',
        category: 'Feature',
        status: 'Published',
        isSticky: false,
        author: 'Admin',
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Sample FAQs
    const sampleFAQs = [
      {
        question: 'How do I apply for a loan?',
        answer: 'You can apply for a loan through the mobile app by filling out the loan application form...',
        category: 'Loans',
        priority: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        question: 'What documents are required for KYC?',
        answer: 'You need to provide a valid government ID, proof of address, and a recent photograph...',
        category: 'KYC',
        priority: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.collection('news').insertMany(sampleNews);
    await db.collection('faqs').insertMany(sampleFAQs);
    console.log('  ✅ Sample content created');
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

      // Validate indexes
      console.log('🔍 Validating critical indexes...');
      
      const criticalIndexes = [
        { collection: 'users', index: 'email_1' },
        { collection: 'users', index: 'deviceId_1' },
        { collection: 'admins', index: 'email_1' },
        { collection: 'transactions', index: 'userId_1' },
        { collection: 'device_fingerprints', index: 'deviceId_1' },
        { collection: 'sessions', index: 'sessionToken_1' }
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

// Main execution
async function main() {
  console.log('🚀 IProfit Complete Database Migration Tool');
  console.log('=============================================');

  const args = process.argv.slice(2);
  const migrator = new DatabaseMigrator();

  try {
    // Run migrations
    await migrator.runMigrations();

    // Validate database
    await migrator.validateDatabase();

    // Create sample data if requested
    if (args.includes('--sample')) {
      await migrator.createSampleData();
    }

    // Generate report
    await migrator.generateReport();

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