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
      'audit_logs', 'system_settings', 'rate_limits', 'settings', 'kyc_documents', 'email_templates'
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

      // Seed essential data
      await this.seedEssentialData();

      // Create sample data if requested
      if (this.shouldCreateSample && !this.isProduction) {
        await this.createSampleData();
      }

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

  async seedEssentialData() {
    console.log('🌱 Seeding essential data...');

    const db = mongoose.connection.db;

    // Seed in order: settings -> plans -> admins -> templates
    await this.createSettings(db);
    await this.createDefaultPlans(db);
    await this.createDefaultAdmins(db);
    await this.createNotificationTemplates(db);
    await this.createSampleContent(db);

    console.log('✅ Essential data seeded successfully');
  }

  async createSettings(db) {
    console.log('  📝 Creating system settings...');

    const settingsExist = await db.collection('settings').findOne();
    if (settingsExist) {
      console.log('  ℹ️  Settings already exist, skipping...');
      return;
    }

    const sampleAdminId = new mongoose.Types.ObjectId();
    const settings = [
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
        updatedBy: sampleAdminId,
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
        updatedBy: sampleAdminId,
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
        updatedBy: sampleAdminId,
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
        updatedBy: sampleAdminId,
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
        updatedBy: sampleAdminId,
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
        updatedBy: sampleAdminId,
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
        updatedBy: sampleAdminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Withdrawal Fees
      {
        category: 'financial',
        key: 'withdrawal_bank_fee_percentage',
        value: 0.02,
        dataType: 'number',
        description: 'Bank transfer withdrawal fee percentage',
        isEditable: true,
        isEncrypted: false,
        validation: { min: 0, max: 1 },
        updatedBy: sampleAdminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'financial',
        key: 'withdrawal_mobile_fee_percentage',
        value: 0.015,
        dataType: 'number',
        description: 'Mobile banking withdrawal fee percentage',
        isEditable: true,
        isEncrypted: false,
        validation: { min: 0, max: 1 },
        updatedBy: sampleAdminId,
        createdAt: new Date(),
        updatedAt: new Date()
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
        updatedBy: sampleAdminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'security',
        key: 'enable_device_limiting',
        value: true,
        dataType: 'boolean',
        description: 'Enable device limiting for signup',
        isEditable: true,
        isEncrypted: false,
        defaultValue: true,
        updatedBy: sampleAdminId,
        createdAt: new Date(),
        updatedAt: new Date()
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
        updatedBy: sampleAdminId,
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
        updatedBy: sampleAdminId,
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
        updatedBy: sampleAdminId,
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
        updatedBy: sampleAdminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'business',
        key: 'enable_referral_system',
        value: true,
        dataType: 'boolean',
        description: 'Enable referral bonus system',
        isEditable: true,
        isEncrypted: false,
        defaultValue: true,
        updatedBy: sampleAdminId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.collection('settings').insertMany(settings);
    console.log(`  ✅ Created ${settings.length} system settings`);
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
        duration: 30,
        limits: {
          depositLimit: 10000,
          withdrawalLimit: 5000,
          profitLimit: 1000,
          minimumDeposit: 100,
          minimumWithdrawal: 100,
          dailyWithdrawalLimit: 1000,
          monthlyWithdrawalLimit: 10000
        },
        features: ['Basic Support', 'Mobile App Access', 'Standard Features'],
        color: '#6b7280',
        priority: 0,
        status: 'Active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Silver Plan',
        description: 'Intermediate plan with better limits',
        price: 1000,
        currency: 'BDT',
        duration: 30,
        limits: {
          depositLimit: 50000,
          withdrawalLimit: 25000,
          profitLimit: 5000,
          minimumDeposit: 500,
          minimumWithdrawal: 100,
          dailyWithdrawalLimit: 5000,
          monthlyWithdrawalLimit: 50000
        },
        features: ['Priority Support', 'Higher Limits', 'Mobile App Access', 'Advanced Analytics'],
        color: '#9ca3af',
        priority: 1,
        status: 'Active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Gold Plan',
        description: 'Premium plan with maximum benefits',
        price: 5000,
        currency: 'BDT',
        duration: 30,
        limits: {
          depositLimit: 200000,
          withdrawalLimit: 100000,
          profitLimit: 20000,
          minimumDeposit: 1000,
          minimumWithdrawal: 100,
          dailyWithdrawalLimit: 20000,
          monthlyWithdrawalLimit: 200000
        },
        features: ['VIP Support', 'Maximum Limits', 'Exclusive Features', 'Personal Manager'],
        color: '#f59e0b',
        priority: 2,
        status: 'Active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.collection('plans').insertMany(plans);
    console.log(`  ✅ Created ${plans.length} default plans`);
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
        passwordHash: await bcrypt.hash('Admin123@#', 12),
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
        passwordHash: await bcrypt.hash('Mod123@#', 12),
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
    console.log(`  ✅ Created ${admins.length} default admin accounts`);
  }

  async createNotificationTemplates(db) {
    console.log('  📝 Creating notification templates...');

    const templatesExist = await db.collection('notification_templates').findOne();
    if (templatesExist) {
      console.log('  ℹ️  Notification templates already exist, skipping...');
      return;
    }

    const templates = [
      {
        name: 'Welcome Email',
        type: 'System',
        channel: 'email',
        subject: 'Welcome to IProfit!',
        content: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Welcome to IProfit</title></head>
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
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Access Dashboard</a>
        </div>
    </div>
</body>
</html>`,
        variables: [
          { name: 'userName', description: 'User full name', type: 'string', required: true },
          { name: 'userEmail', description: 'User email address', type: 'string', required: true },
          { name: 'referralCode', description: 'User referral code', type: 'string', required: true },
          { name: 'dashboardUrl', description: 'Dashboard URL', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'Medium',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'KYC Approved',
        type: 'KYC',
        channel: 'email',
        subject: 'KYC Verification Approved - Welcome to Full Access!',
        content: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>KYC Approved</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">✅ KYC Verification Approved!</h1>
        <p>Hi {{userName}},</p>
        <p>Great news! Your KYC verification has been successfully approved.</p>
        <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 20px; margin: 20px 0;">
            <h3 style="color: #059669;">You now have access to:</h3>
            <ul>
                <li>Higher transaction limits</li>
                <li>Loan applications</li>
                <li>Priority customer support</li>
                <li>All premium features</li>
            </ul>
        </div>
    </div>
</body>
</html>`,
        variables: [
          { name: 'userName', description: 'User full name', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'High',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Withdrawal Approved',
        type: 'Withdrawal',
        channel: 'email',
        subject: 'Withdrawal Request Approved - {{amount}}',
        content: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Withdrawal Approved</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">✅ Withdrawal Approved</h1>
        <p>Hi {{userName}},</p>
        <p>Your withdrawal request has been approved and processed successfully.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Transaction Details:</h3>
            <p><strong>Amount:</strong> {{amount}}</p>
            <p><strong>Transaction ID:</strong> {{transactionId}}</p>
            <p><strong>Method:</strong> {{withdrawalMethod}}</p>
        </div>
        <p>The funds will be transferred to your account within 1-3 business days.</p>
    </div>
</body>
</html>`,
        variables: [
          { name: 'userName', description: 'User full name', type: 'string', required: true },
          { name: 'amount', description: 'Withdrawal amount', type: 'string', required: true },
          { name: 'transactionId', description: 'Transaction ID', type: 'string', required: true },
          { name: 'withdrawalMethod', description: 'Withdrawal method', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'High',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await db.collection('notification_templates').insertMany(templates);
    console.log(`  ✅ Created ${templates.length} notification templates`);
  }

  async createSampleContent(db) {
    console.log('  📝 Creating sample content...');

    // Sample news articles
    const newsExists = await db.collection('news').findOne();
    if (!newsExists) {
      const sampleNews = [
        {
          title: 'Welcome to IProfit Platform',
          slug: 'welcome-to-iprofit-platform',
          content: '<p>We are excited to announce the launch of our new financial platform designed to help you achieve your financial goals.</p>',
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
          title: 'Enhanced Security Features',
          slug: 'enhanced-security-features',
          content: '<p>We have implemented advanced security measures including device fingerprinting and enhanced authentication.</p>',
          excerpt: 'New security features to protect your account',
          category: 'Security',
          status: 'Published',
          isSticky: false,
          author: 'Security Team',
          publishedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await db.collection('news').insertMany(sampleNews);
      console.log(`  ✅ Created ${sampleNews.length} sample news articles`);
    }

    // Sample FAQs
    const faqExists = await db.collection('faqs').findOne();
    if (!faqExists) {
      const sampleFAQs = [
        {
          question: 'How do I apply for a loan?',
          answer: 'You can apply for a loan through the mobile app by filling out the loan application form. Make sure your KYC is approved for faster processing.',
          category: 'Loans',
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          question: 'What documents are required for KYC?',
          answer: 'You need to provide a valid government ID, proof of address, and a recent photograph for KYC verification.',
          category: 'KYC',
          priority: 2,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          question: 'How long does withdrawal take?',
          answer: 'Withdrawal processing time varies by method: Bank transfer (1-3 days), Mobile banking (2-4 hours), Crypto (4-6 hours).',
          category: 'Withdrawals',
          priority: 3,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await db.collection('faqs').insertMany(sampleFAQs);
      console.log(`  ✅ Created ${sampleFAQs.length} sample FAQs`);
    }
  }

  async createSampleData() {
    console.log('📊 Creating sample data...');

    if (this.isProduction) {
      console.log('ℹ️  Production mode detected, skipping sample data creation');
      return;
    }

    const db = mongoose.connection.db;

    try {
      // Check if sample data already exists
      const userCount = await db.collection('users').countDocuments();
      if (userCount > 0) {
        console.log('ℹ️  Sample users already exist, skipping sample data creation');
        return;
      }

      // Get the free plan for sample users
      const freePlan = await db.collection('plans').findOne({ name: 'Free Plan' });
      if (!freePlan) {
        console.log('⚠️  Free plan not found, skipping sample user creation');
        return;
      }

      // Create sample users
      const sampleUsers = [];
      for (let i = 1; i <= 10; i++) {
        sampleUsers.push({
          name: `Sample User ${i}`,
          email: `user${i}@example.com`,
          phone: `+8801${String(i).padStart(9, '0')}`,
          passwordHash: await bcrypt.hash('User123@#', 12),
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
      console.log(`  ✅ Created ${sampleUsers.length} sample users`);

      // Create sample transactions
      const sampleTransactions = [];
      const types = ['deposit', 'withdrawal', 'bonus'];
      const gateways = ['CoinGate', 'UddoktaPay', 'Manual'];
      const statuses = ['Approved', 'Pending', 'Rejected'];

      for (let i = 0; i < 30; i++) {
        const user = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        
        sampleTransactions.push({
          userId: user._id,
          type,
          amount: Math.floor(Math.random() * 5000) + 100,
          currency: 'BDT',
          gateway: gateways[Math.floor(Math.random() * gateways.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          transactionId: `TXN${Date.now()}${i}`,
          fees: 0,
          netAmount: Math.floor(Math.random() * 5000) + 100,
          createdAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        });
      }

      await db.collection('transactions').insertMany(sampleTransactions);
      console.log(`  ✅ Created ${sampleTransactions.length} sample transactions`);

    } catch (error) {
      console.error('❌ Sample data creation failed:', error);
    }
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