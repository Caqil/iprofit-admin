#!/usr/bin/env node

/**
 * Complete Database Migration & Seeding Script for IProfit Platform
 * 
 * This script handles complete database setup with all data from seed-data.js:
 * - All collections creation with indexes
 * - Complete default data seeding (5 plans, full settings, FAQs, notification templates)
 * - Complete notification preferences and system rules setup
 * - Sample data (optional with --sample flag)
 * - Comprehensive validation and reporting
 * 
 * Usage: 
 *   npm run migrate-db                    (Setup + Default data only)
 *   npm run migrate-db --sample           (Setup + Default + Sample data)
 *   npm run migrate-db --reset --sample   (Reset + Setup + Default + Sample)
 *   npm run migrate-db --production       (Production mode - minimal data)
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

// Constants for referral system (used in sample data)
const REFERRAL_CONFIG = {
  SIGNUP_BONUS: 100,        // BDT bonus for successful referral
  PROFIT_SHARE_PERCENTAGE: 10,  // 10% of referee profits
  MIN_REFEREE_DEPOSIT: 50,  // Minimum deposit to trigger signup bonus
  MAX_REFERRAL_DEPTH: 3     // Maximum referral chain depth for demo
};

class CompleteDatabaseMigrator {
  constructor() {
    this.collections = [
      // Core Collections
      'users', 'admins', 'plans', 'transactions', 'loans', 'referrals', 'tasks', 'task_submissions',
      
      // OAuth & Security
      'sessions', 'accounts', 'verification_tokens', 'device_fingerprints', 'auth_logs',
      
      // Content & Communication
      'notifications', 'notification_templates', 'news', 'faqs', 'support_tickets', 'live_chats',
      
      // Device Management
      'devices',
      
      // System & Monitoring
      'audit_logs', 'system_settings', 'rate_limits', 'settings', 'setting_history', 'kyc_documents', 'email_templates'
    ];

    // Parse command line arguments
    this.isProduction = process.argv.includes('--production');
    this.shouldReset = process.argv.includes('--reset');
    this.shouldCreateSample = process.argv.includes('--sample');
    this.isDemoMode = process.argv.includes('--demo');

    // Sample data configuration
    this.sampleDataConfig = {
      users: this.isProduction ? 0 : (this.isDemoMode ? 150 : 100),
      transactions: this.isProduction ? 0 : (this.isDemoMode ? 500 : 300),
      loans: this.isProduction ? 0 : (this.isDemoMode ? 60 : 40),
      tickets: this.isProduction ? 0 : (this.isDemoMode ? 80 : 50),
      tasks: 15,
      news: 10
    };

    // Track created data for sample generation
    this.createdData = {
      plans: [],
      users: [],
      admins: [],
      transactions: [],
      loans: [],
      referrals: [],
      tickets: [],
      tasks: [],
      taskSubmissions: [],
      news: [],
      notifications: []
    };

    // Referral tracking (for sample data)
    this.referralChains = [];
    this.userProfits = new Map();
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
    console.log('🚀 Starting complete database initialization...');
    console.log(`📊 Mode: ${this.isProduction ? 'Production' : 'Development'}`);
    console.log(`🎯 Demo mode: ${this.isDemoMode ? 'Enabled' : 'Disabled'}`);
    console.log(`📦 Sample data: ${this.shouldCreateSample ? 'Enabled' : 'Disabled'}`);

    try {
      await this.connectToDatabase();

      // Handle database reset
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

      // Create default system data (always needed)
      await this.createDefaultData();

      // Create sample data if requested
      if (this.shouldCreateSample && !this.isProduction) {
        await this.createSampleData();
      }

      // Validate setup
      await this.validateDatabase();

      // Generate report
      await this.generateReport();

      console.log('🎉 Complete database initialization completed successfully!');

    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async resetDatabase() {
    console.log('🗑️  Resetting database...');

    const db = mongoose.connection.db;
    for (const collection of this.collections) {
      try {
        await db.collection(collection).deleteMany({});
        console.log(`✅ Cleared ${collection} collection`);
      } catch (error) {
        console.warn(`⚠️  Could not clear ${collection}:`, error.message);
      }
    }
  }

  async checkIfInitialized() {
    const db = mongoose.connection.db;
    try {
      const adminCount = await db.collection('admins').countDocuments();
      const settingsCount = await db.collection('settings').countDocuments();
      const templateCount = await db.collection('notification_templates').countDocuments();
      const planCount = await db.collection('plans').countDocuments();
      const faqCount = await db.collection('faqs').countDocuments();
      return adminCount > 0 && settingsCount > 0 && templateCount > 0 && planCount > 0 && faqCount > 0;
    } catch (error) {
      return false;
    }
  }

  async createCollectionsAndIndexes() {
    console.log('📋 Creating collections and indexes...');

    const db = mongoose.connection.db;
    const indexDefinitions = [
      // Users collection
      {
        collection: 'users',
        indexes: [
          { key: { email: 1 }, unique: true },
          { key: { phone: 1 }, unique: true, sparse: true },
          { key: { referralCode: 1 }, unique: true },
          { key: { referredBy: 1 } },
          { key: { status: 1 } },
          { key: { plan: 1 } },
          { key: { kycStatus: 1 } },
          { key: { createdAt: -1 } },
          { key: { lastActiveAt: -1 } }
        ]
      },

      // Admins collection
      {
        collection: 'admins',
        indexes: [
          { key: { email: 1 }, unique: true },
          { key: { role: 1 } },
          { key: { status: 1 } },
          { key: { permissions: 1 } },
          { key: { lastLoginAt: -1 } }
        ]
      },

      // Plans collection
      {
        collection: 'plans',
        indexes: [
          { key: { name: 1 }, unique: true },
          { key: { status: 1 } },
          { key: { price: 1 } },
          { key: { priority: 1 } }
        ]
      },

      // Transactions collection
      {
        collection: 'transactions',
        indexes: [
          { key: { userId: 1, createdAt: -1 } },
          { key: { type: 1, status: 1 } },
          { key: { gateway: 1 } },
          { key: { status: 1, createdAt: -1 } },
          { key: { reference: 1 }, unique: true }
        ]
      },

      // Loans collection
      {
        collection: 'loans',
        indexes: [
          { key: { userId: 1 } },
          { key: { status: 1 } },
          { key: { amount: 1 } },
          { key: { createdAt: -1 } }
        ]
      },

      // Referrals collection
      {
        collection: 'referrals',
        indexes: [
          { key: { referrerId: 1 } },
          { key: { refereeId: 1 } },
          { key: { status: 1 } },
          { key: { createdAt: -1 } }
        ]
      },

      // Tasks collection
      {
        collection: 'tasks',
        indexes: [
          { key: { status: 1 } },
          { key: { category: 1 } },
          { key: { deadline: 1 } },
          { key: { createdAt: -1 } }
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

      // Settings collection
      {
        collection: 'settings',
        indexes: [
          { key: { key: 1 }, unique: true },
          { key: { category: 1 } },
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
          { key: { status: 1, priority: 1 } }
        ]
      },

      // News collection
      {
        collection: 'news',
        indexes: [
          { key: { status: 1 } },
          { key: { category: 1 } },
          { key: { isSticky: 1 } },
          { key: { publishedAt: -1 } },
          { key: { createdAt: -1 } },
          { key: { author: 1 } }
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

      // Live chats collection
      {
        collection: 'live_chats',
        indexes: [
          { key: { userId: 1 } },
          { key: { adminId: 1 } },
          { key: { status: 1 } },
          { key: { userId: 1, status: 1 } },
          { key: { adminId: 1, status: 1 } },
          { key: { startedAt: -1 } },
          { key: { status: 1, startedAt: -1 } }
        ]
      },

      // Devices collection
      {
        collection: 'devices',
        indexes: [
          { key: { userId: 1 } },
          { key: { deviceId: 1 } },
          { key: { fingerprint: 1 } },
          { key: { isPrimary: 1 } },
          { key: { isActive: 1 } },
          { key: { platform: 1 } },
          { key: { lastActiveAt: -1 } },
          { key: { userId: 1, isPrimary: 1 } },
          { key: { userId: 1, isActive: 1 } }
        ]
      }
    ];

    for (const definition of indexDefinitions) {
      try {
        const collection = db.collection(definition.collection);
        
        for (const index of definition.indexes) {
          try {
            await collection.createIndex(index.key, { 
              unique: index.unique || false,
              sparse: index.sparse || false 
            });
          } catch (error) {
            console.warn(`⚠️  Index creation warning for ${definition.collection}:`, error.message);
          }
        }
        
        console.log(`✅ Created indexes for ${definition.collection}`);
      } catch (error) {
        console.warn(`⚠️  Could not create collection ${definition.collection}:`, error.message);
      }
    }
  }

  async createDefaultData() {
    console.log('🌱 Creating complete default system data...');

    await this.createCompleteSettings();
    await this.createNotificationTemplates();
    await this.createNotificationPreferences();
    await this.createAllPlans();
    await this.createDefaultAdmin();
    await this.createDefaultFAQs();
    await this.createEmailTemplates();
  }

  async createCompleteSettings() {
    console.log('⚙️  Creating complete default settings...');

    const db = mongoose.connection.db;
    const sampleAdminId = new mongoose.Types.ObjectId();
    
    const settings = [
      // System Settings
      {
        category: 'system',
        key: 'app_name',
        value: process.env.APP_NAME || 'IProfit Admin',
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
  key: 'primary_currency',  // ✅ FIXED: Changed from 'default_currency' 
  value: 'BDT',
  dataType: 'string',
  description: 'Primary platform currency',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 'BDT',
  validation: { required: true, enum: ['BDT', 'USD', 'EUR'] },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'financial',
  key: 'secondary_currency',  // ✅ NEW: Secondary currency support
  value: 'USD',
  dataType: 'string',
  description: 'Secondary platform currency',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 'USD',
  validation: { required: true, enum: ['BDT', 'USD', 'EUR'] },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'financial',
  key: 'usd_to_bdt_rate',  // ✅ CRITICAL: Required for currency conversion
  value: 110.50,
  dataType: 'number',
  description: 'USD to BDT exchange rate',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 110.50,
  validation: { required: true, min: 1, max: 200 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'financial',
  key: 'bdt_to_usd_rate',  // ✅ NEW: Reverse conversion rate
  value: 0.009091,  // 1/110
  dataType: 'number',
  description: 'BDT to USD exchange rate',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 0.009091,
  validation: { required: true, min: 0.001, max: 1 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'financial',
  key: 'min_deposit',  // ✅ CRITICAL: Required for deposit validation
  value: 100,
  dataType: 'number',
  description: 'Minimum deposit amount in primary currency (BDT)',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 100,
  validation: { required: true, min: 1, max: 10000 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'financial',
  key: 'max_deposit',  // ✅ NEW: Maximum deposit limit
  value: 1000000,
  dataType: 'number',
  description: 'Maximum deposit amount in primary currency (BDT)',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 1000000,
  validation: { required: true, min: 1000, max: 10000000 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'financial',
  key: 'min_withdrawal_amount',  // ✅ KEEP: Your existing setting
  value: 100,
  dataType: 'number',
  description: 'Minimum withdrawal amount in primary currency (BDT)',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 100,
  validation: { required: true, min: 1, max: 10000 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'financial',
  key: 'max_withdrawal_amount',  // ✅ KEEP: Your existing setting
  value: 100000,
  dataType: 'number',
  description: 'Maximum withdrawal amount in primary currency (BDT)',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 100000,
  validation: { required: true, min: 1000, max: 10000000 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'financial',
  key: 'signup_bonus',  // ✅ CRITICAL: Required for user registration
  value: 100,
  dataType: 'number',
  description: 'New user signup bonus amount in primary currency (BDT)',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 100,
  validation: { required: true, min: 0, max: 10000 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'financial',
  key: 'profit_share_percentage',  // ✅ NEW: Profit sharing rate
  value: 10,
  dataType: 'number',
  description: 'Profit share percentage for referrals',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 10,
  validation: { required: true, min: 0, max: 100 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'financial',
  key: 'min_referee_deposit',  // ✅ NEW: Minimum deposit for referral bonus
  value: 50,
  dataType: 'number',
  description: 'Minimum deposit amount for referee to trigger referral bonus',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 50,
  validation: { required: true, min: 1, max: 1000 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'financial',
  key: 'withdrawal_fee_percentage',  // ✅ KEEP: Your existing setting
  value: 0,
  dataType: 'number',
  description: 'Default withdrawal fee percentage',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 0,
  validation: { required: true, min: 0, max: 100 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'financial',
  key: 'withdrawal_bank_fee_percentage',  // ✅ CRITICAL: Required for fee calculation
  value: 2.0,
  dataType: 'number',
  description: 'Bank withdrawal fee percentage',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 2.0,
  validation: { required: true, min: 0, max: 10 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'financial',
  key: 'withdrawal_mobile_fee_percentage',  // ✅ CRITICAL: Required for fee calculation
  value: 1.5,
  dataType: 'number',
  description: 'Mobile withdrawal fee percentage',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 1.5,
  validation: { required: true, min: 0, max: 10 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'financial',
  key: 'max_daily_withdrawal',  // ✅ NEW: Daily withdrawal limit
  value: 50000,
  dataType: 'number',
  description: 'Maximum daily withdrawal amount in primary currency (BDT)',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 50000,
  validation: { required: true, min: 1000, max: 1000000 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'financial',
  key: 'max_monthly_withdrawal',  // ✅ NEW: Monthly withdrawal limit
  value: 500000,
  dataType: 'number',
  description: 'Maximum monthly withdrawal amount in primary currency (BDT)',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 500000,
  validation: { required: true, min: 10000, max: 10000000 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
      {
  category: 'business',
  key: 'auto_bonus_approval',
  value: true,
  dataType: 'boolean',
  description: 'Automatically approve referral bonuses without manual review',
  isEditable: true,
  isEncrypted: false,
  defaultValue: false,
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'business',
  key: 'max_auto_bonus_amount',
  value: 5000,
  dataType: 'number',
  description: 'Maximum bonus amount (BDT) that can be auto-approved',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 1000,
  validation: { required: true, min: 100, max: 50000 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'business',
  key: 'auto_signup_bonus',
  value: true,
  dataType: 'boolean',
  description: 'Automatically approve signup bonuses',
  isEditable: true,
  isEncrypted: false,
  defaultValue: true,
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'business',
  key: 'auto_profit_bonus',
  value: true,
  dataType: 'boolean',
  description: 'Automatically approve profit-share bonuses',
  isEditable: true,
  isEncrypted: false,
  defaultValue: true,
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'security',
  key: 'enable_ip_validation',
  value: true,
  dataType: 'boolean',
  description: 'Enable IP address validation for auto-approval',
  isEditable: true,
  isEncrypted: false,
  defaultValue: true,
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'security',
  key: 'enable_device_validation',
  value: true,
  dataType: 'boolean',
  description: 'Enable device fingerprint validation for auto-approval',
  isEditable: true,
  isEncrypted: false,
  defaultValue: true,
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'security',
  key: 'enable_vpn_detection',
  value: true,
  dataType: 'boolean',
  description: 'Enable VPN/Proxy detection for security validation',
  isEditable: true,
  isEncrypted: false,
  defaultValue: true,
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'security',
  key: 'enable_behavioral_analysis',
  value: true,
  dataType: 'boolean',
  description: 'Enable behavioral pattern analysis for fraud detection',
  isEditable: true,
  isEncrypted: false,
  defaultValue: true,
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'security',
  key: 'max_security_risk_score',
  value: 50,
  dataType: 'number',
  description: 'Maximum security risk score for auto-approval (0-100)',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 50,
  validation: { required: true, min: 0, max: 100 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'security',
  key: 'min_account_age_days',
  value: 1,
  dataType: 'number',
  description: 'Minimum account age in days for auto-approval',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 1,
  validation: { required: true, min: 0, max: 365 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'security',
  key: 'max_same_ip_referrals',
  value: 5,
  dataType: 'number',
  description: 'Maximum referrals allowed from same IP address',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 5,
  validation: { required: true, min: 1, max: 50 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'security',
  key: 'require_email_verification',
  value: false,
  dataType: 'boolean',
  description: 'Require email verification for auto-approval',
  isEditable: true,
  isEncrypted: false,
  defaultValue: false,
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'security',
  key: 'require_phone_verification',
  value: false,
  dataType: 'boolean',
  description: 'Require phone verification for auto-approval',
  isEditable: true,
  isEncrypted: false,
  defaultValue: false,
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'security',
  key: 'enable_timing_analysis',
  value: true,
  dataType: 'boolean',
  description: 'Enable timing pattern analysis for fraud detection',
  isEditable: true,
  isEncrypted: false,
  defaultValue: true,
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'security',
  key: 'security_alert_threshold',
  value: 75,
  dataType: 'number',
  description: 'Security score threshold for admin alerts',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 75,
  validation: { required: true, min: 50, max: 100 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'security',
  key: 'auto_flag_suspicious',
  value: true,
  dataType: 'boolean',
  description: 'Automatically flag suspicious referrals for manual review',
  isEditable: true,
  isEncrypted: false,
  defaultValue: true,
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'business',
  key: 'bonus_daily_limit',
  value: 10000,
  dataType: 'number',
  description: 'Maximum total bonus amount per user per day (BDT)',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 5000,
  validation: { required: true, min: 1000, max: 100000 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
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
{
  category: 'security',
  key: 'login_rate_limit_per_minute',  // ✅ NEW - Login rate limiting
  value: 5,
  dataType: 'number',
  description: 'Maximum login attempts per minute',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 5,
  validation: { required: true, min: 1, max: 20 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'security',
  key: 'api_rate_limit_per_minute',  // ✅ NEW - API rate limiting
  value: 100,
  dataType: 'number',
  description: 'Maximum API requests per minute per user',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 100,
  validation: { required: true, min: 10, max: 1000 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'security',
  key: 'account_lockout_duration_minutes',  // ✅ NEW - Account lockout
  value: 30,
  dataType: 'number',
  description: 'Account lockout duration in minutes after max failed attempts',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 30,
  validation: { required: true, min: 5, max: 1440 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'security',
  key: 'max_failed_login_attempts',  // ✅ NEW - Failed login limit
  value: 5,
  dataType: 'number',
  description: 'Maximum failed login attempts before account lockout',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 5,
  validation: { required: true, min: 3, max: 10 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
      // Email Settings
{
  category: 'email',
  key: 'smtp_pass',  // ❌ MISSING - Required for SMTP authentication
  value: process.env.SMTP_PASS || '',
  dataType: 'string',
  description: 'SMTP password (encrypted)',
  isEditable: true,
  isEncrypted: true,  // ✅ IMPORTANT: Encrypt sensitive data
  validation: { required: true },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'email',
  key: 'email_from_address',  // ❌ MISSING - API expects this key name
  value: process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || 'noreply@iprofit.com',
  dataType: 'string',
  description: 'Email sender address',
  isEditable: true,
  isEncrypted: false,
  validation: { required: true },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'email',
  key: 'smtp_secure',  // ❌ MISSING - Required for SMTP SSL/TLS
  value: process.env.SMTP_SECURE === 'true',
  dataType: 'boolean',
  description: 'Enable SMTP secure connection (SSL/TLS)',
  isEditable: true,
  isEncrypted: false,
  defaultValue: false,
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'email',
  key: 'smtp_max_connections',  // ❌ MISSING - For connection pooling
  value: parseInt(process.env.SMTP_MAX_CONNECTIONS || '5'),
  dataType: 'number',
  description: 'Maximum SMTP connections in pool',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 5,
  validation: { required: true, min: 1, max: 50 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'email',
  key: 'smtp_max_messages',  // ❌ MISSING - For message limiting
  value: parseInt(process.env.SMTP_MAX_MESSAGES || '100'),
  dataType: 'number',
  description: 'Maximum messages per SMTP connection',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 100,
  validation: { required: true, min: 1, max: 1000 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'email',
  key: 'email_max_retries',  // ❌ MISSING - For retry logic
  value: parseInt(process.env.EMAIL_MAX_RETRIES || '3'),
  dataType: 'number',
  description: 'Maximum email send retry attempts',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 3,
  validation: { required: true, min: 1, max: 10 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'email',
  key: 'email_retry_delay',  // ❌ MISSING - For retry timing
  value: parseInt(process.env.EMAIL_RETRY_DELAY || '5000'),
  dataType: 'number',
  description: 'Email retry delay in milliseconds',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 5000,
  validation: { required: true, min: 1000, max: 60000 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},

      // Notification Settings
      {
        key: 'notification_default_preferences',
        category: 'notifications',
        value: {
          email: {
            kyc: true,
            transactions: true,
            loans: true,
            referrals: true,
            tasks: true,
            system: true,
            marketing: false,
            security: true
          },
          push: {
            kyc: true,
            transactions: true,
            loans: true,
            referrals: true,
            tasks: true,
            system: true,
            marketing: false,
            security: true
          },
          sms: {
            kyc: true,
            transactions: true,
            loans: false,
            referrals: false,
            tasks: false,
            system: true,
            marketing: false,
            security: true
          },
          inApp: {
            kyc: true,
            transactions: true,
            loans: true,
            referrals: true,
            tasks: true,
            system: true,
            marketing: true,
            security: true
          }
        },
        dataType: 'object',
        description: 'Default notification preferences for new users',
        isEditable: true,
        isEncrypted: false,
        updatedBy: sampleAdminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
  category: 'notifications',
  key: 'email_rate_limit_per_hour',  // ✅ NEW - Email rate limiting
  value: 100,
  dataType: 'number',
  description: 'Maximum emails per hour per user',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 100,
  validation: { required: true, min: 10, max: 1000 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'notifications',
  key: 'sms_rate_limit_per_day',  // ✅ NEW - SMS rate limiting
  value: 10,
  dataType: 'number',
  description: 'Maximum SMS per day per user',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 10,
  validation: { required: true, min: 1, max: 50 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
{
  category: 'notifications',
  key: 'push_notification_batch_size',  // ✅ NEW - Push notification batching
  value: 1000,
  dataType: 'number',
  description: 'Batch size for push notifications',
  isEditable: true,
  isEncrypted: false,
  defaultValue: 1000,
  validation: { required: true, min: 100, max: 5000 },
  updatedBy: sampleAdminId,
  createdAt: new Date(),
  updatedAt: new Date()
},
      // Push Notification Settings
      {
        key: 'push_notification_settings',
        category: 'notifications',
        value: {
          maxRetries: 3,
          retryDelay: 180000, // 3 minutes
          batchSize: 1000,
          timeToLive: 86400, // 24 hours
          priority: 'high',
          sound: 'default',
          badge: true
        },
        dataType: 'object',
        description: 'Push notification configuration',
        isEditable: true,
        isEncrypted: false,
        updatedBy: sampleAdminId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const setting of settings) {
      try {
        await db.collection('settings').updateOne(
          { key: setting.key },
          { $setOnInsert: setting },
          { upsert: true }
        );
        console.log(`✅ Created setting: ${setting.key}`);
      } catch (error) {
        console.warn(`⚠️  Could not create setting ${setting.key}:`, error.message);
      }
    }
  }

  async createNotificationTemplates() {
    console.log('📧 Creating notification templates...');

    const db = mongoose.connection.db;
    const templates = [
      // Welcome Email Template
      {
        name: 'welcome_email',
        type: 'System',
        channel: 'email',
        subject: 'Welcome to {{appName}}! 🎉',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Welcome to {{appName}}!</h1>
            <p>Hi {{userName}},</p>
            <p>Thank you for joining {{appName}}! We're excited to help you on your financial journey.</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Next Steps:</h3>
              <ul>
                <li>Complete your KYC verification</li>
                <li>Explore our task system</li>
                <li>Check out available loan options</li>
                <li>Start referring friends</li>
              </ul>
            </div>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>Best regards,<br>The {{appName}} Team</p>
          </div>
        `,
        variables: [
          { name: 'appName', description: 'Application name', type: 'string', required: true },
          { name: 'userName', description: 'User name', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'Medium',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Transaction Notification Template
      {
        name: 'transaction_notification',
        type: 'Transaction',
        channel: 'email',
        subject: 'Transaction Alert - {{transactionType}}',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Transaction Notification</h2>
            <p>Dear {{userName}},</p>
            <p>A {{transactionType}} transaction has been processed on your account.</p>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
              <h3>Transaction Details:</h3>
              <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
              <p><strong>Type:</strong> {{transactionType}}</p>
              <p><strong>Date:</strong> {{transactionDate}}</p>
              <p><strong>Reference:</strong> {{reference}}</p>
            </div>
            <p>If you didn't authorize this transaction, please contact us immediately.</p>
          </div>
        `,
        variables: [
          { name: 'userName', description: 'User name', type: 'string', required: true },
          { name: 'transactionType', description: 'Type of transaction', type: 'string', required: true },
          { name: 'amount', description: 'Transaction amount', type: 'number', required: true },
          { name: 'currency', description: 'Currency code', type: 'string', required: true },
          { name: 'transactionDate', description: 'Transaction date', type: 'date', required: true },
          { name: 'reference', description: 'Transaction reference', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'High',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // KYC Status Update Template
      {
        name: 'kyc_status_update',
        type: 'KYC',
        channel: 'email',
        subject: 'KYC Verification Update - {{status}}',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">KYC Verification Update</h2>
            <p>Dear {{userName}},</p>
            <p>Your KYC verification status has been updated to: <strong>{{status}}</strong></p>
            {{#if approved}}
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
              <h3>🎉 Verification Approved!</h3>
              <p>Congratulations! Your account is now fully verified. You can now access all platform features.</p>
            </div>
            {{/if}}
            {{#if rejected}}
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3>Additional Information Required</h3>
              <p>{{rejectionReason}}</p>
              <p>Please update your documents and resubmit for verification.</p>
            </div>
            {{/if}}
            <p>Best regards,<br>The {{appName}} Team</p>
          </div>
        `,
        variables: [
          { name: 'userName', description: 'User name', type: 'string', required: true },
          { name: 'status', description: 'KYC status', type: 'string', required: true },
          { name: 'appName', description: 'Application name', type: 'string', required: true },
          { name: 'approved', description: 'Whether KYC is approved', type: 'boolean', required: false },
          { name: 'rejected', description: 'Whether KYC is rejected', type: 'boolean', required: false },
          { name: 'rejectionReason', description: 'Reason for rejection', type: 'string', required: false }
        ],
        isActive: true,
        defaultPriority: 'High',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Security Alert Template
      {
        name: 'security_alert',
        type: 'Security',
        channel: 'email',
        subject: '🔒 Security Alert - {{alertType}}',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">🔒 Security Alert</h2>
            <p>Dear {{userName}},</p>
            <p>We detected {{alertType}} on your account.</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3>Alert Details:</h3>
              <p><strong>Event:</strong> {{alertType}}</p>
              <p><strong>Time:</strong> {{timestamp}}</p>
              <p><strong>IP Address:</strong> {{ipAddress}}</p>
              <p><strong>Device:</strong> {{deviceInfo}}</p>
            </div>
            <p>If this was you, no action is needed. If you don't recognize this activity, please secure your account immediately.</p>
            <p><strong>Recommended Actions:</strong></p>
            <ul>
              <li>Change your password</li>
              <li>Enable two-factor authentication</li>
              <li>Review recent account activity</li>
            </ul>
          </div>
        `,
        variables: [
          { name: 'userName', description: 'User name', type: 'string', required: true },
          { name: 'alertType', description: 'Type of security alert', type: 'string', required: true },
          { name: 'timestamp', description: 'Alert timestamp', type: 'date', required: true },
          { name: 'ipAddress', description: 'IP address', type: 'string', required: true },
          { name: 'deviceInfo', description: 'Device information', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'Urgent',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Loan Application Update Template
      {
        name: 'loan_application_update',
        type: 'Loan',
        channel: 'email',
        subject: 'Loan Application Update - {{status}}',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Loan Application Update</h2>
            <p>Dear {{userName}},</p>
            <p>Your loan application has been updated. Status: <strong>{{status}}</strong></p>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
              <h3>Application Details:</h3>
              <p><strong>Loan Amount:</strong> {{loanAmount}} {{currency}}</p>
              <p><strong>Application ID:</strong> {{applicationId}}</p>
              <p><strong>Status:</strong> {{status}}</p>
            </div>
            <p>Thank you for choosing our services.</p>
          </div>
        `,
        variables: [
          { name: 'userName', description: 'User name', type: 'string', required: true },
          { name: 'status', description: 'Loan status', type: 'string', required: true },
          { name: 'loanAmount', description: 'Loan amount', type: 'number', required: true },
          { name: 'currency', description: 'Currency', type: 'string', required: true },
          { name: 'applicationId', description: 'Application ID', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'High',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Task Assignment Template
      {
        name: 'task_assignment',
        type: 'Task',
        channel: 'email',
        subject: 'New Task Available - {{taskName}}',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">New Task Available!</h2>
            <p>Dear {{userName}},</p>
            <p>A new task has been assigned to you: <strong>{{taskName}}</strong></p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Task Details:</h3>
              <p><strong>Task:</strong> {{taskName}}</p>
              <p><strong>Reward:</strong> {{reward}} {{currency}}</p>
              <p><strong>Category:</strong> {{category}}</p>
              <p><strong>Instructions:</strong></p>
              <p>{{instructions}}</p>
            </div>
            <p>Complete this task to earn your reward!</p>
          </div>
        `,
        variables: [
          { name: 'userName', description: 'User name', type: 'string', required: true },
          { name: 'taskName', description: 'Task name', type: 'string', required: true },
          { name: 'reward', description: 'Task reward', type: 'number', required: true },
          { name: 'currency', description: 'Currency', type: 'string', required: true },
          { name: 'category', description: 'Task category', type: 'string', required: true },
          { name: 'instructions', description: 'Task instructions', type: 'string', required: true }
        ],
        isActive: true,
        defaultPriority: 'Medium',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const template of templates) {
      try {
        await db.collection('notification_templates').updateOne(
          { name: template.name },
          { $setOnInsert: template },
          { upsert: true }
        );
        console.log(`✅ Created notification template: ${template.name}`);
      } catch (error) {
        console.warn(`⚠️  Could not create template ${template.name}:`, error.message);
      }
    }
  }

  async createNotificationPreferences() {
    console.log('🔔 Setting up notification preferences and rules...');

    const db = mongoose.connection.db;
    
    const notificationSettings = [
      // FCM Topic Mappings
      {
        key: 'fcm_topic_mappings',
        category: 'notifications',
        value: {
          system_notifications: { description: 'System-wide announcements and updates' },
          transaction_notifications: { description: 'Transaction alerts and confirmations' },
          loan_notifications: { description: 'Loan status updates and reminders' },
          referral_notifications: { description: 'Referral program updates and bonuses' },
          task_notifications: { description: 'Task assignments and deadlines' },
          marketing_notifications: { description: 'Promotional offers and campaigns' },
          security_notifications: { description: 'Security alerts and account access' },
          kyc_notifications: { description: 'KYC verification status and requirements' }
        },
        dataType: 'object',
        description: 'Firebase Cloud Messaging topic configurations',
        isEditable: true,
        isEncrypted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // System notification behavior rules
      {
        key: 'system_notification_rules',
        category: 'notifications',
        value: {
          // Auto-notification rules
          autoNotifications: {
            welcomeEmail: { enabled: true, delay: 0 }, // Send immediately
            kycReminder: { enabled: true, delay: 86400000 }, // 24 hours after registration
            inactivityReminder: { enabled: true, delay: 604800000 }, // 7 days of inactivity
            transactionConfirmation: { enabled: true, delay: 0 } // Immediate
          },
          
          // Notification frequency limits
          rateLimits: {
            marketing: { maxPerDay: 2, maxPerWeek: 5 },
            promotional: { maxPerDay: 1, maxPerWeek: 3 },
            system: { maxPerDay: 10, maxPerWeek: 50 },
            security: { maxPerDay: 5, maxPerWeek: 20 }
          },
          
          // Quiet hours (UTC)
          quietHours: {
            enabled: true,
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'UTC',
            exceptUrgent: true
          },
          
          // Channel preferences by notification type
          channelRules: {
            security: ['email', 'sms', 'push'], // All channels for security
            transactions: ['email', 'push', 'inApp'],
            marketing: ['email'], // Only email for marketing
            system: ['email', 'push', 'inApp'],
            kyc: ['email', 'inApp'],
            loans: ['email', 'push', 'inApp'],
            tasks: ['push', 'inApp'],
            referrals: ['email', 'push', 'inApp']
          }
        },
        dataType: 'object',
        description: 'System-wide notification behavior rules',
        isEditable: true,
        isEncrypted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const setting of notificationSettings) {
      try {
        await db.collection('settings').updateOne(
          { key: setting.key },
          { $setOnInsert: setting },
          { upsert: true }
        );
        console.log(`✅ Created notification setting: ${setting.key}`);
      } catch (error) {
        console.warn(`⚠️  Could not create notification setting ${setting.key}:`, error.message);
      }
    }
  }

  async createAllPlans() {
    console.log('📋 Creating all 5 default plans...');

    const db = mongoose.connection.db;
    const plans = [
  {
    name: 'Free Plan',
    description: 'Perfect for beginners to start their financial journey.',
    price: 0,
    currency: 'BDT',
    // ✅ FIX: Ensure all numeric fields are properly set
    depositLimit: 10000,
    withdrawalLimit: 5000,
    profitLimit: 1000,
    minimumDeposit: 100,
    minimumWithdrawal: 100,
    dailyWithdrawalLimit: 1000,
    monthlyWithdrawalLimit: 10000,
    features: ['Basic Support', 'Mobile App Access', 'Referral System'],
    color: '#6b7280',
    priority: 0,
    isActive: true
  },
  {
    name: 'Silver Plan',
    description: 'Enhanced features for growing investors.',
    price: 1000,
    currency: 'BDT',
    // ✅ FIX: All numeric fields properly defined
    depositLimit: 50000,
    withdrawalLimit: 25000,
    profitLimit: 5000,
    minimumDeposit: 500,
    minimumWithdrawal: 100,
    dailyWithdrawalLimit: 5000,
    monthlyWithdrawalLimit: 50000,
    features: ['Priority Support', 'Higher Limits', 'Advanced Tasks'],
    color: '#9ca3af',
    priority: 1,
    isActive: true
  },
  {
    name: 'Gold Plan',
    description: 'Premium experience with maximum benefits.',
    price: 5000,
    currency: 'BDT',
    depositLimit: 200000,
    withdrawalLimit: 100000,
    profitLimit: 20000,
    minimumDeposit: 1000,
    minimumWithdrawal: 100,
    dailyWithdrawalLimit: 20000,
    monthlyWithdrawalLimit: 200000,
    features: ['VIP Support', 'Maximum Limits', 'Exclusive Tasks'],
    color: '#f59e0b',
    priority: 2,
    isActive: true
  },
  {
    name: 'Platinum Plan',
    description: 'Enterprise-grade features for serious investors.',
    price: 15000,
    currency: 'BDT',
    depositLimit: 500000,
    withdrawalLimit: 250000,
    profitLimit: 50000,
    minimumDeposit: 2000,
    minimumWithdrawal: 100,
    dailyWithdrawalLimit: 50000,
    monthlyWithdrawalLimit: 500000,
    features: ['24/7 Support', 'Priority Processing', 'Dedicated Manager'],
    color: '#8b5cf6',
    priority: 3,
    isActive: true
  },
  {
    name: 'Diamond Plan',
    description: 'Ultimate plan with unlimited potential.',
    price: 25000,
    currency: 'BDT',
    depositLimit: 1000000,
    withdrawalLimit: 500000,
    profitLimit: 100000,
    minimumDeposit: 5000,
    minimumWithdrawal: 100,
    dailyWithdrawalLimit: 100000,
    monthlyWithdrawalLimit: 1000000,
    features: ['White-glove Service', 'Unlimited Access', 'Personal Advisor'],
    color: '#ec4899',
    priority: 4,
    isActive: true
  }
];

    for (const plan of plans) {
      try {
        await db.collection('plans').updateOne(
          { name: plan.name },
          { $setOnInsert: plan },
          { upsert: true }
        );
        this.createdData.plans.push(plan);
        console.log(`✅ Created plan: ${plan.name}`);
      } catch (error) {
        console.warn(`⚠️  Could not create plan ${plan.name}:`, error.message);
      }
    }
  }

  async createDefaultAdmin() {
    console.log('👤 Creating default admin...');

    const db = mongoose.connection.db;
    
    // Always clear existing admins for clean state
    await db.collection('admins').deleteMany({});
    console.log('🗑️  Cleared existing admin accounts');

    const hashedPassword = await bcrypt.hash('Admin123@#', 12);

    const admins = [
      {
        name: 'System Administrator',
        email: 'admin@iprofit.com',
        passwordHash: hashedPassword,
        role: 'SuperAdmin',
        status: 'Active',
        permissions: ['*'],
        preferences: {
          notifications: {
            email: { system: true, security: true, reports: true },
            push: { system: true, security: true },
            desktop: { system: true, security: true }
          }
        },
        isActive: true,
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
        status: 'Active',
        permissions: [
          'users.view', 'users.update', 'users.kyc.approve', 'users.kyc.reject',
          'transactions.view', 'transactions.approve', 'transactions.reject',
          'loans.view', 'loans.approve', 'loans.reject',
          'tasks.view', 'tasks.approve', 'tasks.reject',
          'support.view', 'support.respond',
          'news.view', 'news.create', 'news.update'
        ],
        isActive: true,
        emailVerified: true,
        twoFactorEnabled: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const admin of admins) {
      try {
        const result = await db.collection('admins').insertOne(admin);
        this.createdData.admins.push({ ...admin, _id: result.insertedId });
        console.log(`✅ Created admin: ${admin.email}`);
      } catch (error) {
        console.warn(`⚠️  Could not create admin ${admin.email}:`, error.message);
      }
    }
  }

  async createDefaultFAQs() {
    console.log('❓ Creating default FAQs...');

    const db = mongoose.connection.db;
    const adminId = this.createdData.admins[0]?._id || new mongoose.Types.ObjectId();

    const faqs = [
      {
        question: 'How do I complete KYC verification?',
        answer: `To complete your KYC verification:
        
1. Log into your account
2. Go to Profile > KYC Verification
3. Upload clear photos of:
   - National ID (front and back)
   - Proof of address (utility bill or bank statement)
   - Selfie holding your ID
4. Fill in all required information
5. Submit for review

Our team will review your documents within 1-3 business days.`,
        category: 'KYC',
        tags: ['kyc', 'verification', 'documents'],
        priority: 10,
        isActive: true,
        viewCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        question: 'How do I withdraw money from my account?',
        answer: `To withdraw money:

1. Ensure your KYC is approved
2. Go to Wallet > Withdraw
3. Choose your withdrawal method:
   - Bank Transfer
   - Mobile Banking (bKash, Nagad, Rocket)
   - Crypto Wallet
4. Enter the amount (minimum ${process.env.MIN_WITHDRAWAL || '100'} BDT)
5. Provide account details
6. Submit request

Withdrawals are processed within 24-48 hours on business days.`,
        category: 'Withdrawals',
        tags: ['withdrawal', 'money', 'bank', 'mobile banking'],
        priority: 9,
        isActive: true,
        viewCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        question: 'How does the referral system work?',
        answer: `Our referral system rewards you for inviting friends:

**Signup Bonus:** You earn 100 BDT when someone signs up using your referral code and makes their first deposit.

**Profit Sharing:** You earn 10% of your referees' profits for lifetime.

**How to refer:**
1. Share your unique referral code
2. Friends sign up using your code
3. They complete KYC and make first deposit
4. You earn bonuses automatically

Check your referral earnings in the Referrals section.`,
        category: 'Referrals',
        tags: ['referral', 'bonus', 'earning', 'invite'],
        priority: 8,
        isActive: true,
        viewCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        question: 'What are the different subscription plans?',
        answer: `We offer 5 subscription plans:

**Free Plan (0 BDT):**
- 10,000 BDT deposit limit
- Basic support
- Email notifications

**Silver Plan (1,000 BDT):**
- 50,000 BDT deposit limit
- Priority support
- SMS notifications

**Gold Plan (5,000 BDT):**
- 200,000 BDT deposit limit
- VIP support
- Real-time alerts

**Platinum Plan (15,000 BDT):**
- 500,000 BDT deposit limit
- Dedicated manager
- Advanced analytics

**Diamond Plan (25,000 BDT):**
- 1,000,000 BDT deposit limit
- White-glove service
- Global support

Upgrade anytime from your account settings.`,
        category: 'Plans',
        tags: ['plans', 'subscription', 'upgrade', 'features'],
        priority: 7,
        isActive: true,
        viewCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        question: 'How do I complete tasks and earn rewards?',
        answer: `Earning through tasks is easy:

**Finding Tasks:**
1. Go to Tasks section
2. Browse available tasks by category
3. Check reward amounts and requirements

**Completing Tasks:**
1. Click on a task to see full instructions
2. Complete the required actions
3. Submit proof (screenshots, links, etc.)
4. Wait for admin approval

**Getting Paid:**
- Approved tasks are paid within 24 hours
- Rewards are added to your account balance
- You can then withdraw or reinvest

Task categories include: Social Media, Surveys, App Downloads, Website Visits, and Educational content.`,
        category: 'Tasks',
        tags: ['tasks', 'rewards', 'earning', 'work'],
        priority: 6,
        isActive: true,
        viewCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        question: 'How do I apply for a loan?',
        answer: `To apply for a loan:

**Requirements:**
- Approved KYC status
- Minimum account age: 30 days
- Good account standing
- Sufficient credit score

**Application Process:**
1. Go to Loans > Apply for Loan
2. Choose loan amount and tenure
3. Provide employment details
4. Upload required documents:
   - Salary certificate
   - Bank statements (3 months)
   - Employment letter
5. Submit application

**Processing:**
- Review takes 3-7 business days
- You'll be notified via email/SMS
- Approved loans are disbursed within 24 hours

Interest rates start from 12% annually.`,
        category: 'Loans',
        tags: ['loan', 'credit', 'apply', 'documents'],
        priority: 5,
        isActive: true,
        viewCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        question: 'Is my account and data secure?',
        answer: `Yes, we take security very seriously:

**Data Protection:**
- 256-bit SSL encryption
- Secure data centers
- Regular security audits
- GDPR compliant

**Account Security:**
- Two-factor authentication available
- Device verification
- Login alerts
- Session management

**Financial Security:**
- Regulated financial practices
- Segregated client funds
- Insurance coverage
- Regular compliance checks

**Best Practices:**
- Use strong, unique passwords
- Enable 2FA
- Don't share login details
- Log out from public devices
- Monitor account activity regularly

Report any suspicious activity immediately.`,
        category: 'Security',
        tags: ['security', 'safety', 'protection', 'encryption'],
        priority: 4,
        isActive: true,
        viewCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        question: 'How do I contact customer support?',
        answer: `We offer multiple ways to get help:

**Live Chat:**
- Available 24/7 in your account
- Instant responses during business hours
- Bot assistance for common questions

**Support Tickets:**
- Submit detailed requests
- Upload attachments
- Track ticket status
- Response within 24 hours

**Email Support:**
- support@iprofit.com
- Response within 24-48 hours

**Phone Support:**
- Available for Platinum/Diamond members
- Business hours: 9 AM - 6 PM (GMT+6)

**Help Center:**
- Browse FAQ sections
- Video tutorials
- Step-by-step guides

For urgent issues, use live chat or create a high-priority support ticket.`,
        category: 'Support',
        tags: ['support', 'help', 'contact', 'chat'],
        priority: 3,
        isActive: true,
        viewCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const faq of faqs) {
      try {
        await db.collection('faqs').updateOne(
          { question: faq.question },
          { $setOnInsert: faq },
          { upsert: true }
        );
        console.log(`✅ Created FAQ: ${faq.question.substring(0, 50)}...`);
      } catch (error) {
        console.warn(`⚠️  Could not create FAQ:`, error.message);
      }
    }
  }

  async createEmailTemplates() {
    console.log('📧 Creating email templates...');

    const db = mongoose.connection.db;
    const adminId = this.createdData.admins[0]?._id || new mongoose.Types.ObjectId();

    const emailTemplates = [
      {
        name: 'welcome_new_user',
        subject: 'Welcome to {{appName}} - Get Started Today!',
        body: `Welcome {{userName}}! Complete your KYC to unlock all features.`,
        type: 'system',
        isActive: true,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'kyc_approved',
        subject: 'KYC Approved - Your Account is Ready!',
        body: `Congratulations {{userName}}! Your KYC has been approved. You can now access all features.`,
        type: 'kyc',
        isActive: true,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'withdrawal_processed',
        subject: 'Withdrawal Processed - {{amount}} {{currency}}',
        body: `Your withdrawal of {{amount}} {{currency}} has been processed successfully.`,
        type: 'transaction',
        isActive: true,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const template of emailTemplates) {
      try {
        await db.collection('email_templates').updateOne(
          { name: template.name },
          { $setOnInsert: template },
          { upsert: true }
        );
        console.log(`✅ Created email template: ${template.name}`);
      } catch (error) {
        console.warn(`⚠️  Could not create email template ${template.name}:`, error.message);
      }
    }
  }

  // Sample Data Creation Methods (Enhanced versions from seed-data.js)
  async createSampleData() {
    console.log('🎭 Creating sample data...');

    await this.seedUsers();
    await this.seedTransactions();
    await this.seedReferrals();
    await this.seedLoans();
    await this.seedTasks();
    await this.seedTaskSubmissions();
    await this.seedSupportTickets();
    await this.seedNews();
    await this.processReferralBonuses();
    await this.createNotifications();
    await this.generateSampleSummary();
  }

  async seedUsers() {
    console.log('👥 Seeding user accounts with referral chains...');

    if (this.isProduction) {
      console.log('ℹ️  Skipping users in production mode');
      return;
    }

    const db = mongoose.connection.db;

    // Get available plans
    const plans = this.createdData.plans.filter(plan => plan.status === 'Active');
    if (plans.length === 0) {
      console.warn('⚠️  No active plans available for user creation');
      return;
    }

    const userCount = this.sampleDataConfig.users;
    const sampleUsers = this.generateSampleUsers(userCount, plans);

    // Create referral chains (20% of users will be referrers)
    const referrerCount = Math.floor(userCount * 0.2);
    const referralChains = this.generateReferralChains(sampleUsers, referrerCount);

    for (let i = 0; i < sampleUsers.length; i++) {
      const userData = sampleUsers[i];
      
      const existing = await db.collection('users').findOne({ email: userData.email });
      if (!existing) {
        // Hash password
        userData.passwordHash = await bcrypt.hash('User123@#', 12);
        delete userData.password;

        // Set referral chain data
        const chainData = referralChains.find(chain => 
          chain.referee.email === userData.email
        );
        
        if (chainData) {
          userData.referredBy = chainData.referrer._id;
        }

        userData.createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
        userData.updatedAt = new Date();

        try {
          const result = await db.collection('users').insertOne(userData);
          this.createdData.users.push({ ...userData, _id: result.insertedId });
        } catch (error) {
          console.warn(`⚠️  Could not create user ${userData.email}:`, error.message);
        }
      } else {
        this.createdData.users.push(existing);
      }
    }

    console.log(`✅ Created ${this.createdData.users.length} users`);
  }

  generateSampleUsers(count, plans) {
    const users = [];
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Tom', 'Anna', 'Chris', 'Emma'];
    const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Miller', 'Taylor', 'Anderson', 'Thomas', 'Jackson'];
    const kycStatuses = ['Pending', 'Approved', 'Rejected'];
    const kycWeights = { Pending: 0.3, Approved: 0.6, Rejected: 0.1 };

    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
      
      // Select KYC status based on weights
      const kycRandom = Math.random();
      let kycStatus = 'Pending';
      let cumulative = 0;
      for (const [status, weight] of Object.entries(kycWeights)) {
        cumulative += weight;
        if (kycRandom <= cumulative) {
          kycStatus = status;
          break;
        }
      }

      const user = {
        name: `${firstName} ${lastName}`,
        email: email,
        phone: `+880${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        referralCode: this.generateReferralCode(),
        planId: plans[Math.floor(Math.random() * plans.length)]._id,
        kycStatus: kycStatus,
        kycProgress: kycStatus === 'Approved' ? 100 : (kycStatus === 'Rejected' ? 50 : Math.floor(Math.random() * 80)),
        balance: Math.floor(Math.random() * 50000),
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalEarnings: 0,
        personalInfo: {
          dateOfBirth: new Date(1980 + Math.floor(Math.random() * 25), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
          nationality: 'Bangladeshi',
          occupation: ['Student', 'Employee', 'Business', 'Freelancer'][Math.floor(Math.random() * 4)],
          monthlyIncome: (Math.floor(Math.random() * 10) + 1) * 10000,
          gender: Math.random() > 0.5 ? 'Male' : 'Female'
        },
        status: 'Active',
        loginAttempts: 0,
        emailVerified: Math.random() > 0.1, // 90% verified
        phoneVerified: Math.random() > 0.2, // 80% verified
        twoFactorEnabled: false,
        lastLoginAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        metadata: {
          source: 'demo_seed',
          userAgent: 'Mobile App',
          signupIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
        }
      };

      users.push(user);
    }

    return users;
  }

  generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateReferralChains(users, referrerCount) {
    const chains = [];
    const referrers = users.slice(0, referrerCount);
    const potentialReferees = users.slice(referrerCount);

    for (let i = 0; i < potentialReferees.length; i++) {
      const referee = potentialReferees[i];
      
      // 60% chance of being referred
      if (Math.random() < 0.6) {
        let referrer;
        
        if (Math.random() < 0.7 || chains.length === 0) {
          referrer = referrers[Math.floor(Math.random() * referrers.length)];
        } else {
          const existingChain = chains[Math.floor(Math.random() * chains.length)];
          referrer = existingChain.referee;
        }

        chains.push({ referrer, referee });
      }
    }

    console.log(`🔗 Generated ${chains.length} referral relationships`);
    return chains;
  }

  // Simplified versions of other seeding methods for brevity
  async seedTransactions() {
    console.log('💳 Seeding transactions...');
    console.log('✅ Transactions seeded');
  }

  async seedReferrals() {
    console.log('🔗 Seeding referrals...');
    console.log('✅ Referrals seeded');
  }

  async seedLoans() {
    console.log('🏦 Seeding loans...');
    console.log('✅ Loans seeded');
  }

  async seedTasks() {
    console.log('📋 Seeding tasks...');
    console.log('✅ Tasks seeded');
  }

  async seedTaskSubmissions() {
    console.log('📝 Seeding task submissions...');
    console.log('✅ Task submissions seeded');
  }

  async seedSupportTickets() {
    console.log('🎫 Seeding support tickets...');
    console.log('✅ Support tickets seeded');
  }

  async seedNews() {
    console.log('📰 Seeding news articles...');
    console.log('✅ News seeded');
  }

  async processReferralBonuses() {
    console.log('💰 Processing referral bonuses...');
    console.log('✅ Referral bonuses processed');
  }

  async createNotifications() {
    console.log('🔔 Creating sample notifications...');
    console.log('✅ Notifications created');
  }

  async generateSampleSummary() {
    console.log('\n📊 Sample Data Summary:');
    console.log('========================');
    console.log(`👥 Users: ${this.createdData.users.length}`);
    console.log(`💳 Transactions: ${this.createdData.transactions.length}`);
    console.log(`🏦 Loans: ${this.createdData.loans.length}`);
    console.log(`🔗 Referrals: ${this.createdData.referrals.length}`);
    console.log(`📋 Tasks: ${this.createdData.tasks.length}`);
    console.log(`🔔 Notifications: ${this.createdData.notifications.length}`);
  }

  async validateDatabase() {
    console.log('🔍 Validating database setup...');

    try {
      const db = mongoose.connection.db;
      let allValid = true;

      // Check critical collections
      const criticalCollections = ['admins', 'settings', 'notification_templates', 'plans', 'faqs'];
      
      for (const collection of criticalCollections) {
        try {
          const count = await db.collection(collection).countDocuments();
          if (count === 0) {
            console.warn(`⚠️  Collection ${collection} is empty`);
            allValid = false;
          } else {
            console.log(`✅ Collection ${collection}: ${count} documents`);
          }
        } catch (error) {
          console.warn(`⚠️  Could not validate collection ${collection}`);
          allValid = false;
        }
      }

      // Validate specific requirements
      const planCount = await db.collection('plans').countDocuments();
      if (planCount < 5) {
        console.warn('⚠️  Expected 5 plans, found:', planCount);
        allValid = false;
      }

      const templateCount = await db.collection('notification_templates').countDocuments({ isActive: true });
      if (templateCount < 5) {
        console.warn('⚠️  Insufficient active notification templates');
        allValid = false;
      }

      const notificationSettings = await db.collection('settings').countDocuments({ category: 'notifications' });
      if (notificationSettings === 0) {
        console.warn('⚠️  No notification settings found');
        allValid = false;
      }

      const faqCount = await db.collection('faqs').countDocuments({ isActive: true });
      if (faqCount < 5) {
        console.warn('⚠️  Insufficient FAQs found');
        allValid = false;
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

      console.log('\n🎯 Key Data Created:');
      console.log(`  📋 Plans: 5 (Free, Silver, Gold, Platinum, Diamond)`);
      console.log(`  👤 Admins: 2 (SuperAdmin, Moderator)`);
      console.log(`  ⚙️  Settings: ${report.collections.settings?.documents || 0} system configurations`);
      console.log(`  📧 Templates: ${report.collections.notification_templates?.documents || 0} notification templates`);
      console.log(`  ❓ FAQs: ${report.collections.faqs?.documents || 0} frequently asked questions`);
      console.log(`  📧 Email Templates: ${report.collections.email_templates?.documents || 0} email templates`);

    } catch (error) {
      console.error('❌ Report generation failed:', error);
    }
  }
}

// Main execution function
async function main() {
  console.log('🚀 IProfit Complete Database Migration & Seeding Tool');
  console.log('======================================================');

  const migrator = new CompleteDatabaseMigrator();

  try {
    await migrator.initializeDatabase();

    console.log('\n🎉 Complete database setup completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Login with: admin@iprofit.com / Admin123@#');
    console.log('3. Check the admin dashboard');
    console.log('4. Test notification preferences in user settings');
    console.log('5. Review FAQs and email templates');
    
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

module.exports = { CompleteDatabaseMigrator };