#!/usr/bin/env node

/**
 * Enhanced Database Seeder Script for IProfit Platform (CommonJS)
 * 
 * This script populates the database with comprehensive sample data including:
 * - Realistic user accounts with referral chains
 * - Synchronized referral bonuses (signup + profit share)
 * - Transaction history with referral rewards
 * - Loan applications with referrer benefits
 * - Complete demo ecosystem for testing
 * 
 * Usage: npm run seed-data [--reset] [--production] [--demo]
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Load environment variables first
dotenv.config({ path: '.env.local' });

// Constants for referral system
const REFERRAL_CONFIG = {
  SIGNUP_BONUS: 100,        // BDT bonus for successful referral
  PROFIT_SHARE_PERCENTAGE: 10,  // 10% of referee profits
  MIN_REFEREE_DEPOSIT: 50,  // Minimum deposit to trigger signup bonus
  MAX_REFERRAL_DEPTH: 3     // Maximum referral chain depth for demo
};

// Check if MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  console.log('Please run: npm run check-env:create');
  process.exit(1);
}

class EnhancedDatabaseSeeder {
  constructor(options) {
    this.options = options || {
      reset: false,
      production: false,
      demo: false,
      count: {
        users: 100,           // Increased for better referral chains
        transactions: 300,    // More transactions for profit sharing
        loans: 40,
        tickets: 50,
        tasks: 15,
        news: 10
      },
    };
    
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

    // Referral tracking
    this.referralChains = [];
    this.userProfits = new Map(); // Track profits per user for profit sharing
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

  async seedAll() {
  console.log('🌱 Starting enhanced database seeding...');
  console.log(`📊 Mode: ${this.options.production ? 'Production' : 'Development'}`);
  console.log(`🎯 Demo mode: ${this.options.demo ? 'Enabled' : 'Disabled'}`);

  try {
    await this.connectToDatabase();

    if (this.options.reset) {
      await this.resetDatabase();
    }

    // Always ensure clean admin state for fresh installs
    console.log('🔧 Ensuring clean admin authentication...');
    
    // Seed in order due to dependencies
    await this.seedSettings();           // Move this EARLY - settings needed by other functions
    await this.seedPlans();
    await this.seedAdmins();             // This now clears and recreates admins
    await this.seedUsers();
    await this.seedTransactions();
    await this.seedReferrals();          // Create referral records
    await this.seedLoans();
    await this.seedTasks();
    await this.seedTaskSubmissions();
    await this.seedSupportTickets();
    await this.seedNews();
    await this.processReferralBonuses(); // Process and sync all bonuses
    await this.generateProfitSharing();  // Create profit sharing bonuses
    await this.createNotifications();    // Send notifications
    await this.generateSummary();

    console.log('🎉 Enhanced database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}
async resetDatabase() {
  console.log('🗑️  Resetting database...');

  const db = mongoose.connection.db;
  const collections = [
    // Core Collections
    'users', 'admins', 'plans', 'transactions', 'loans', 'referrals', 'tasks', 'task_submissions',
    
    // OAuth & Security
    'sessions', 'accounts', 'verification_tokens', 'device_fingerprints', 'auth_logs',
    
    // Content & Communication
    'notifications', 'notification_templates', 'news', 'faqs', 'support_tickets',
    
    // System & Monitoring
    'audit_logs', 'system_settings', 'rate_limits', 'settings', 'settings_history','kyc_documents', 'email_templates' // 'settings' already included
  ];

  for (const collection of collections) {
    try {
      await db.collection(collection).deleteMany({});
      console.log(`✅ Cleared ${collection} collection`);
    } catch (error) {
      console.warn(`⚠️  Could not clear ${collection}:`, error.message);
    }
  }
}

  async seedPlans() {
    console.log('📋 Seeding subscription plans...');

    const db = mongoose.connection.db;

    const plansData = [
      {
        name: 'Free Plan',
        description: 'Perfect for beginners to start their financial journey.',
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
        features: [
          'Basic Support',
          'Mobile App Access',
          'Referral System',
          'Basic Tasks',
          'Email Notifications'
        ],
        color: '#6b7280',
        priority: 0,
        status: 'Active',
      },
      {
        name: 'Silver Plan',
        description: 'Enhanced features for growing investors.',
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
        features: [
          'Priority Support',
          'Higher Limits',
          'Advanced Tasks',
          'SMS Notifications',
          'Investment Insights'
        ],
        color: '#9ca3af',
        priority: 1,
        status: 'Active',
      },
      {
        name: 'Gold Plan',
        description: 'Premium experience with maximum benefits.',
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
        features: [
          'VIP Support',
          'Maximum Limits',
          'Exclusive Tasks',
          'Real-time Alerts',
          'Personal Advisor'
        ],
        color: '#f59e0b',
        priority: 2,
        status: 'Active',
      },
      {
        name: 'Platinum Plan',
        description: 'Enterprise-grade features for serious investors.',
        price: 15000,
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
        features: [
          '24/7 Support',
          'Priority Processing',
          'Dedicated Manager',
          'Advanced Analytics',
          'Custom Solutions'
        ],
        color: '#8b5cf6',
        priority: 3,
        status: 'Active',
      },
      {
        name: 'Diamond Plan',
        description: 'Ultimate plan with unlimited potential.',
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
        features: [
          'White-glove Service',
          'Unlimited Access',
          'Private Investment Access',
          'Quarterly Reviews',
          'Global Support'
        ],
        color: '#06b6d4',
        priority: 4,
        status: 'Active',
      },
    ];

    for (const planData of plansData) {
      const existing = await db.collection('plans').findOne({ name: planData.name });
      if (!existing) {
        const plan = {
          ...planData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const result = await db.collection('plans').insertOne(plan);
        this.createdData.plans.push({ ...plan, _id: result.insertedId });
        console.log(`✅ Plan created: ${planData.name}`);
      } else {
        this.createdData.plans.push(existing);
      }
    }
  }

  async seedAdmins() {
    console.log('👨‍💼 Seeding admin accounts...');

    const db = mongoose.connection.db;

    // Always clear existing admins to ensure clean state
    await db.collection('admins').deleteMany({});
    console.log('🗑️  Cleared existing admin accounts');

    const adminData = [
      {
        name: 'System Administrator',
        email: 'admin@iprofit.com',
        passwordHash: await bcrypt.hash('Admin123@#', 12),
        role: 'SuperAdmin',
        permissions: ['*'],
        status: 'Active',
        isActive: true,
        emailVerified: true,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        lastLoginAt: null,
        avatar: null,
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
          'referrals.view', 'referrals.approve', 'referrals.reject',
          'support.view', 'support.respond', 'support.close',
          'dashboard.view', 'notifications.view'
        ],
        status: 'Active',
        isActive: true,
        emailVerified: true,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        lastLoginAt: null,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Financial Manager',
        email: 'finance@iprofit.com',
        passwordHash: await bcrypt.hash('Finance123@#', 12),
        role: 'Moderator',
        permissions: [
          'transactions.view', 'transactions.approve', 'transactions.reject',
          'loans.view', 'loans.approve', 'loans.reject', 'loans.disburse',
          'referrals.view', 'referrals.approve', 'users.view',
          'dashboard.view', 'audit.view'
        ],
        status: 'Active',
        isActive: true,
        emailVerified: true,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        lastLoginAt: null,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert all admin accounts
    const results = await db.collection('admins').insertMany(adminData);
    
    adminData.forEach((admin, index) => {
      admin._id = results.insertedIds[index];
      this.createdData.admins.push(admin);
    });

    console.log('✅ Admin accounts created successfully');
    
    // Test authentication immediately
    await this.testAdminAuthentication();
  }

  async testAdminAuthentication() {
    console.log('🧪 Testing admin authentication...');

    const testCredentials = [
      { email: 'admin@iprofit.com', password: 'Admin123@#' },
      { email: 'moderator@iprofit.com', password: 'Mod123@#' },
      { email: 'finance@iprofit.com', password: 'Finance123@#' }
    ];

    const db = mongoose.connection.db;
    
    for (const creds of testCredentials) {
      try {
        const admin = await db.collection('admins').findOne({ 
          email: creds.email,
          isActive: true 
        });

        if (!admin) {
          console.log(`❌ Admin not found: ${creds.email}`);
          continue;
        }

        if (!admin.passwordHash) {
          console.log(`❌ No passwordHash for: ${creds.email}`);
          continue;
        }

        const isValid = await bcrypt.compare(creds.password, admin.passwordHash);
        
        if (isValid) {
          console.log(`✅ Authentication test passed: ${creds.email}`);
        } else {
          console.log(`❌ Authentication test failed: ${creds.email}`);
        }
      } catch (error) {
        console.log(`❌ Authentication error for ${creds.email}:`, error.message);
      }
    }
  }

  async seedSettings() {
    console.log('  📝 Creating system settings...');
  const db = mongoose.connection.db;
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
  async seedUsers() {
    console.log('👥 Seeding user accounts with referral chains...');

    if (this.options.production) {
      console.log('ℹ️  Skipping users in production mode');
      return;
    }

    const db = mongoose.connection.db;

    // Get available plans
    const plans = this.createdData.plans.filter(plan => plan.status === 'Active');
    if (plans.length === 0) {
      throw new Error('No active plans available for user creation');
    }

    const userCount = this.options.count.users;
    const sampleUsers = this.generateEnhancedSampleUsers(userCount, plans);

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
          console.log(`🔗 ${userData.name} referred by ${chainData.referrer.name}`);
        }

        userData.createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Random date within last 90 days
        userData.updatedAt = new Date();

        const result = await db.collection('users').insertOne(userData);
        const user = { ...userData, _id: result.insertedId };
        this.createdData.users.push(user);

        console.log(`✅ User created: ${userData.email} (Plan: ${userData.planName})`);
      } else {
        this.createdData.users.push(existing);
      }
    }

    // Store referral chains for later processing
    this.referralChains = referralChains;
  }

  generateEnhancedSampleUsers(count, plans) {
    const bangladeshiNames = {
      firstNames: [
        'Ahmed', 'Fatima', 'Mohammad', 'Aisha', 'Omar', 'Khadija', 'Ali', 'Zainab',
        'Hassan', 'Maryam', 'Ibrahim', 'Amina', 'Yusuf', 'Safiya', 'Khalid',
        'Aminul', 'Rashida', 'Abdul', 'Nasreen', 'Mahbub', 'Sultana', 'Karim',
        'Rahima', 'Shahid', 'Ruma', 'Mizanur', 'Shahnaz', 'Rafiq', 'Salma'
      ],
      lastNames: [
        'Rahman', 'Ahmed', 'Khan', 'Islam', 'Hasan', 'Ali', 'Uddin', 'Begum',
        'Sheikh', 'Chowdhury', 'Karim', 'Sultana', 'Mahmud', 'Khatun', 'Miah',
        'Akter', 'Hossain', 'Sarkar', 'Das', 'Roy', 'Ghosh', 'Paul', 'Saha'
      ]
    };

    const cities = [
      'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 
      'Rangpur', 'Comilla', 'Narayanganj', 'Gazipur', 'Mymensingh', 'Bogra'
    ];

    const professions = [
      'Business Owner', 'Software Engineer', 'Teacher', 'Doctor', 'Accountant',
      'Sales Executive', 'Marketing Manager', 'Freelancer', 'Student', 'Engineer',
      'Banker', 'Consultant', 'Entrepreneur', 'Government Officer', 'Trader'
    ];

    const users = [];
    const usedEmails = new Set();
    const usedPhones = new Set();
    const usedDevices = new Set();
    const usedReferralCodes = new Set();

    for (let i = 0; i < count; i++) {
      const firstName = bangladeshiNames.firstNames[Math.floor(Math.random() * bangladeshiNames.firstNames.length)];
      const lastName = bangladeshiNames.lastNames[Math.floor(Math.random() * bangladeshiNames.lastNames.length)];
      const name = `${firstName} ${lastName}`;
      
      let email, phone, deviceId, referralCode;
      
      // Generate unique identifiers
      do {
        email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
      } while (usedEmails.has(email));
      usedEmails.add(email);
      
      do {
        phone = `+8801${Math.floor(Math.random() * 900000000) + 100000000}`;
      } while (usedPhones.has(phone));
      usedPhones.add(phone);
      
      do {
        deviceId = `device_${crypto.randomBytes(8).toString('hex')}`;
      } while (usedDevices.has(deviceId));
      usedDevices.add(deviceId);

      do {
        referralCode = this.generateReferralCode();
      } while (usedReferralCodes.has(referralCode));
      usedReferralCodes.add(referralCode);

      // Assign plan (weighted towards lower plans)
      const planWeights = [0.5, 0.25, 0.15, 0.07, 0.03]; // Free, Silver, Gold, Platinum, Diamond
      let planIndex = 0;
      const random = Math.random();
      let cumulative = 0;
      
      for (let j = 0; j < planWeights.length; j++) {
        cumulative += planWeights[j];
        if (random <= cumulative) {
          planIndex = j;
          break;
        }
      }
      
      const plan = plans[Math.min(planIndex, plans.length - 1)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      const profession = professions[Math.floor(Math.random() * professions.length)];

      // Generate realistic balance based on plan
      const balanceRanges = {
        'Free Plan': [0, 5000],
        'Silver Plan': [1000, 25000],
        'Gold Plan': [5000, 100000],
        'Platinum Plan': [25000, 500000],
        'Diamond Plan': [100000, 1000000]
      };
      
      const [minBalance, maxBalance] = balanceRanges[plan.name] || [0, 5000];
      const balance = Math.floor(Math.random() * (maxBalance - minBalance)) + minBalance;

      // KYC status weighted towards approved for higher plans
      const kycApprovalRate = {
        'Free Plan': 0.3,
        'Silver Plan': 0.6,
        'Gold Plan': 0.8,
        'Platinum Plan': 0.95,
        'Diamond Plan': 1.0
      };
      
      const isKycApproved = Math.random() < kycApprovalRate[plan.name];
      
      const user = {
        name,
        email,
        phone,
        password: 'User123@#', // Will be hashed
        planId: plan._id,
        planName: plan.name, // For tracking
        balance,
        kycStatus: isKycApproved ? 'Approved' : (Math.random() > 0.7 ? 'Pending' : 'Rejected'),
        referralCode,
        deviceId,
        address: {
          street: `${Math.floor(Math.random() * 999) + 1} ${['Main Street', 'First Avenue', 'Market Road', 'Station Road'][Math.floor(Math.random() * 4)]}`,
          city,
          state: city,
          country: 'Bangladesh',
          zipCode: `${Math.floor(Math.random() * 9000) + 1000}`
        },
        personalInfo: {
          dateOfBirth: new Date(1970 + Math.floor(Math.random() * 35), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          profession,
          monthlyIncome: Math.floor(Math.random() * 200000) + 20000, // 20k to 220k BDT
          gender: Math.random() > 0.5 ? 'Male' : 'Female'
        },
        status: 'Active',
        loginAttempts: 0,
        emailVerified: Math.random() > 0.1, // 90% verified
        phoneVerified: Math.random() > 0.2, // 80% verified
        twoFactorEnabled: false,
        lastLoginAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
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

    // Create multi-level referral chains
    for (let i = 0; i < potentialReferees.length; i++) {
      const referee = potentialReferees[i];
      
      // 60% chance of being referred
      if (Math.random() < 0.6) {
        let referrer;
        
        // 70% chance of being referred by a top-level referrer
        // 30% chance of being referred by another referee (creating chain)
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

  async seedTransactions() {
    console.log('💳 Seeding transactions with referral tracking...');

    if (this.createdData.users.length === 0) {
      console.log('ℹ️  No users available, skipping transactions');
      return;
    }

    const db = mongoose.connection.db;
    const transactionCount = this.options.count.transactions;
    const transactions = [];
    
    const transactionTypes = ['deposit', 'withdrawal', 'bonus', 'profit'];
    const gateways = ['CoinGate', 'UddoktaPay', 'Manual', 'System'];
    const statuses = ['Approved', 'Pending', 'Rejected'];

    // Weight distributions for more realistic data
    const typeWeights = { deposit: 0.4, withdrawal: 0.3, bonus: 0.2, profit: 0.1 };
    const statusWeights = { Approved: 0.7, Pending: 0.2, Rejected: 0.1 };

    for (let i = 0; i < transactionCount; i++) {
      const user = this.createdData.users[Math.floor(Math.random() * this.createdData.users.length)];
      
      // Select transaction type based on weights
      const typeRandom = Math.random();
      let type = 'deposit';
      let cumulative = 0;
      for (const [transType, weight] of Object.entries(typeWeights)) {
        cumulative += weight;
        if (typeRandom <= cumulative) {
          type = transType;
          break;
        }
      }

      // Select status based on weights
      const statusRandom = Math.random();
      let status = 'Approved';
      cumulative = 0;
      for (const [statusType, weight] of Object.entries(statusWeights)) {
        cumulative += weight;
        if (statusRandom <= cumulative) {
          status = statusType;
          break;
        }
      }

      // Generate realistic amounts based on transaction type and user plan
      let amount;
      switch (type) {
        case 'deposit':
          amount = Math.floor(Math.random() * 50000) + 500; // 500-50,500 BDT
          break;
        case 'withdrawal':
          amount = Math.floor(Math.random() * Math.min(user.balance || 1000, 25000)) + 100;
          break;
        case 'bonus':
          amount = Math.floor(Math.random() * 1000) + 50; // 50-1,050 BDT
          break;
        case 'profit':
          amount = Math.floor(Math.random() * 5000) + 100; // 100-5,100 BDT
          break;
      }

      const gateway = type === 'bonus' || type === 'profit' ? 'System' : 
                     gateways[Math.floor(Math.random() * (gateways.length - 1))];

      const transaction = {
        userId: user._id,
        type,
        amount,
        currency: 'BDT',
        gateway,
        status,
        description: this.generateTransactionDescription(type, amount),
        transactionId: `TXN${Date.now()}${i.toString().padStart(4, '0')}`,
        fees: type === 'withdrawal' ? Math.floor(amount * 0.02) : 0, // 2% withdrawal fee
        netAmount: type === 'withdrawal' ? amount - Math.floor(amount * 0.02) : amount,
        metadata: {
          userAgent: 'Mobile App',
          ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          source: 'demo_seed'
        },
        createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // Last 60 days
        updatedAt: new Date(),
        processedAt: status === 'Approved' ? new Date() : null
      };

      transactions.push(transaction);

      // Track profits for referral sharing
      if (type === 'profit' && status === 'Approved') {
        const currentProfit = this.userProfits.get(user._id.toString()) || 0;
        this.userProfits.set(user._id.toString(), currentProfit + amount);
      }
    }

    if (transactions.length > 0) {
      const results = await db.collection('transactions').insertMany(transactions);
      
      // Add inserted IDs to transactions
      transactions.forEach((transaction, index) => {
        transaction._id = results.insertedIds[index];
      });
      
      this.createdData.transactions.push(...transactions);
    }

    console.log(`✅ ${transactions.length} transactions created`);
  }

  generateTransactionDescription(type, amount) {
    const descriptions = {
      deposit: [
        `Mobile wallet deposit - ${amount} BDT`,
        `Bank transfer deposit - ${amount} BDT`,
        `CoinGate deposit - ${amount} BDT`,
        `UddoktaPay deposit - ${amount} BDT`
      ],
      withdrawal: [
        `Withdrawal to bank account - ${amount} BDT`,
        `Mobile wallet withdrawal - ${amount} BDT`,
        `Account withdrawal request - ${amount} BDT`
      ],
      bonus: [
        `Referral signup bonus - ${amount} BDT`,
        `Task completion bonus - ${amount} BDT`,
        `Welcome bonus - ${amount} BDT`,
        `Loyalty bonus - ${amount} BDT`
      ],
      profit: [
        `Investment profit - ${amount} BDT`,
        `Trading profit - ${amount} BDT`,
        `Portfolio return - ${amount} BDT`,
        `Interest earning - ${amount} BDT`
      ]
    };

    const typeDescriptions = descriptions[type] || [`${type} - ${amount} BDT`];
    return typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)];
  }

  async seedReferrals() {
    console.log('🔗 Creating referral records...');

    if (this.referralChains.length === 0) {
      console.log('ℹ️  No referral chains available, skipping');
      return;
    }

    const db = mongoose.connection.db;
    const referrals = [];

    for (const chain of this.referralChains) {
      // Find the actual user documents with their _id
      const referrer = this.createdData.users.find(u => u.email === chain.referrer.email);
      const referee = this.createdData.users.find(u => u.email === chain.referee.email);

      if (!referrer || !referee) {
        console.warn(`⚠️  Could not find users for referral chain`);
        continue;
      }

      // Create signup bonus referral
      const signupReferral = {
        referrerId: referrer._id,
        refereeId: referee._id,
        bonusAmount: REFERRAL_CONFIG.SIGNUP_BONUS,
        profitBonus: 0,
        status: 'Pending', // Will be processed later
        bonusType: 'signup',
        metadata: {
          refereeFirstDeposit: null,
          refereeFirstDepositDate: null,
          signupDate: referee.createdAt
        },
        createdAt: referee.createdAt,
        updatedAt: new Date()
      };

      referrals.push(signupReferral);

      // Create profit sharing referral if referee has profits
      const refereeProfit = this.userProfits.get(referee._id.toString()) || 0;
      if (refereeProfit > 0) {
        const profitShareAmount = Math.floor(refereeProfit * REFERRAL_CONFIG.PROFIT_SHARE_PERCENTAGE / 100);
        
        const profitReferral = {
          referrerId: referrer._id,
          refereeId: referee._id,
          bonusAmount: 0,
          profitBonus: profitShareAmount,
          status: 'Pending',
          bonusType: 'profit_share',
          metadata: {
            totalRefereeProfit: refereeProfit,
            profitSharePercentage: REFERRAL_CONFIG.PROFIT_SHARE_PERCENTAGE,
            lastCalculatedAt: new Date()
          },
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        };

        referrals.push(profitReferral);
      }
    }

    if (referrals.length > 0) {
      const results = await db.collection('referrals').insertMany(referrals);
      
      // Add inserted IDs
      referrals.forEach((referral, index) => {
        referral._id = results.insertedIds[index];
      });
      
      this.createdData.referrals.push(...referrals);
    }

    console.log(`✅ ${referrals.length} referral records created`);
  }

  async processReferralBonuses() {
    console.log('💰 Processing referral bonuses...');

    if (this.createdData.referrals.length === 0) {
      console.log('ℹ️  No referrals to process, skipping');
      return;
    }

    const db = mongoose.connection.db;
    let processedCount = 0;

    for (const referral of this.createdData.referrals) {
      // 80% chance of approval for demo purposes
      if (Math.random() < 0.8) {
        const referrer = this.createdData.users.find(u => u._id.toString() === referral.referrerId.toString());
        
        if (referrer) {
          // Update referral status
          await db.collection('referrals').updateOne(
            { _id: referral._id },
            { 
              $set: { 
                status: 'Paid',
                paidAt: new Date(),
                updatedAt: new Date()
              }
            }
          );

          // Calculate total bonus amount
          const totalBonus = referral.bonusAmount + referral.profitBonus;

          // Create transaction for the bonus
          const bonusTransaction = {
            userId: referral.referrerId,
            type: 'bonus',
            amount: totalBonus,
            currency: 'BDT',
            gateway: 'System',
            status: 'Approved',
            description: `Referral ${referral.bonusType} bonus - ${totalBonus} BDT`,
            transactionId: `BONUS${Date.now()}${processedCount}`,
            fees: 0,
            netAmount: totalBonus,
            metadata: {
              referralId: referral._id,
              bonusType: referral.bonusType,
              refereeId: referral.refereeId,
              source: 'referral_system'
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            processedAt: new Date()
          };

          const transactionResult = await db.collection('transactions').insertOne(bonusTransaction);
          
          // Update referrer balance
          await db.collection('users').updateOne(
            { _id: referrer._id },
            { 
              $inc: { balance: totalBonus },
              $set: { updatedAt: new Date() }
            }
          );

          // Update referral with transaction ID
          await db.collection('referrals').updateOne(
            { _id: referral._id },
            { 
              $set: { 
                transactionId: transactionResult.insertedId,
                updatedAt: new Date()
              }
            }
          );

          processedCount++;
          console.log(`✅ Processed ${referral.bonusType} bonus: ${totalBonus} BDT for ${referrer.name}`);
        }
      }
    }

    console.log(`✅ ${processedCount} referral bonuses processed`);
  }

  async generateProfitSharing() {
    console.log('📈 Generating additional profit sharing bonuses...');

    const db = mongoose.connection.db;
    let bonusCount = 0;

    // Find users with significant profits who might have referrers
    for (const [userId, profit] of this.userProfits.entries()) {
      if (profit > 1000) { // Only process significant profits
        const user = this.createdData.users.find(u => u._id.toString() === userId);
        
        if (user && user.referredBy) {
          // Check if profit sharing already exists
          const existingProfit = this.createdData.referrals.find(r => 
            r.refereeId.toString() === userId && r.bonusType === 'profit_share'
          );

          if (!existingProfit) {
            const profitShareAmount = Math.floor(profit * REFERRAL_CONFIG.PROFIT_SHARE_PERCENTAGE / 100);
            
            const profitReferral = {
              referrerId: user.referredBy,
              refereeId: user._id,
              bonusAmount: 0,
              profitBonus: profitShareAmount,
              status: Math.random() < 0.9 ? 'Paid' : 'Pending', // 90% approved
              bonusType: 'profit_share',
              metadata: {
                totalRefereeProfit: profit,
                profitSharePercentage: REFERRAL_CONFIG.PROFIT_SHARE_PERCENTAGE,
                generatedFrom: 'profit_accumulation'
              },
              createdAt: new Date(),
              updatedAt: new Date(),
              paidAt: Math.random() < 0.9 ? new Date() : null
            };

            const result = await db.collection('referrals').insertOne(profitReferral);
            profitReferral._id = result.insertedId;
            
            // Create transaction if paid
            if (profitReferral.status === 'Paid') {
              const bonusTransaction = {
                userId: profitReferral.referrerId,
                type: 'bonus',
                amount: profitShareAmount,
                currency: 'BDT',
                gateway: 'System',
                status: 'Approved',
                description: `Profit sharing bonus - ${profitShareAmount} BDT`,
                transactionId: `PROFIT${Date.now()}${bonusCount}`,
                fees: 0,
                netAmount: profitShareAmount,
                metadata: {
                  referralId: profitReferral._id,
                  bonusType: 'profit_share',
                  source: 'profit_sharing'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                processedAt: new Date()
              };

              await db.collection('transactions').insertOne(bonusTransaction);
              
              // Update referrer balance
              await db.collection('users').updateOne(
                { _id: profitReferral.referrerId },
                { $inc: { balance: profitShareAmount } }
              );
            }

            bonusCount++;
          }
        }
      }
    }

    console.log(`✅ ${bonusCount} profit sharing bonuses generated`);
  }

  async seedLoans() {
    console.log('🏦 Seeding loan applications...');

    if (this.createdData.users.length === 0) {
      console.log('ℹ️  No users available, skipping loans');
      return;
    }

    const db = mongoose.connection.db;
    const loanCount = this.options.count.loans;
    const loans = [];

    // Only create loans for KYC approved users
    const eligibleUsers = this.createdData.users.filter(u => u.kycStatus === 'Approved');
    
    if (eligibleUsers.length === 0) {
      console.log('ℹ️  No KYC approved users, skipping loans');
      return;
    }

    const loanPurposes = [
      'Personal Loan', 'Business Expansion', 'Home Renovation', 'Education',
      'Medical Emergency', 'Debt Consolidation', 'Vehicle Purchase', 'Wedding'
    ];

    const loanStatuses = ['Pending', 'Approved', 'Active', 'Completed', 'Rejected'];
    const statusWeights = { Pending: 0.2, Approved: 0.3, Active: 0.25, Completed: 0.15, Rejected: 0.1 };

    for (let i = 0; i < Math.min(loanCount, eligibleUsers.length); i++) {
      const user = eligibleUsers[i];
      const loanAmount = (Math.floor(Math.random() * 20) + 1) * 5000; // 5k to 100k BDT
      const interestRate = 12 + Math.random() * 8; // 12-20% annual
      const tenure = (Math.floor(Math.random() * 5) + 1) * 12; // 1-5 years in months
      
      // Calculate EMI using standard formula
      const monthlyRate = interestRate / 100 / 12;
      const emiAmount = Math.floor(
        (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
        (Math.pow(1 + monthlyRate, tenure) - 1)
      );

      // Select status based on weights
      const statusRandom = Math.random();
      let status = 'Pending';
      let cumulative = 0;
      for (const [statusType, weight] of Object.entries(statusWeights)) {
        cumulative += weight;
        if (statusRandom <= cumulative) {
          status = statusType;
          break;
        }
      }

      const loan = {
        userId: user._id,
        amount: loanAmount,
        currency: 'BDT',
        interestRate: parseFloat(interestRate.toFixed(2)),
        tenure,
        emiAmount,
        creditScore: 650 + Math.floor(Math.random() * 200), // 650-850
        status,
        purpose: loanPurposes[Math.floor(Math.random() * loanPurposes.length)],
        monthlyIncome: user.personalInfo?.monthlyIncome || 50000,
        employmentStatus: 'Employed',
        documents: [
          { type: 'national_id', url: '/uploads/demo/nid.pdf', uploadedAt: new Date() },
          { type: 'bank_statement', url: '/uploads/demo/bank.pdf', uploadedAt: new Date() },
          { type: 'salary_certificate', url: '/uploads/demo/salary.pdf', uploadedAt: new Date() }
        ],
        repaymentSchedule: [],
        totalPaid: 0,
        remainingAmount: loanAmount,
        overdueAmount: 0,
        penaltyAmount: 0,
        createdAt: new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000), // Last 45 days
        updatedAt: new Date(),
        approvedAt: ['Approved', 'Active', 'Completed'].includes(status) ? new Date() : null,
        disbursedAt: ['Active', 'Completed'].includes(status) ? new Date() : null
      };

      // Generate repayment schedule for approved loans
      if (['Approved', 'Active', 'Completed'].includes(status)) {
        const startDate = loan.disbursedAt || new Date();
        for (let month = 1; month <= tenure; month++) {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + month);
          
          const installment = {
            installmentNumber: month,
            dueDate,
            amount: emiAmount,
            principal: Math.floor(loanAmount / tenure),
            interest: emiAmount - Math.floor(loanAmount / tenure),
            status: status === 'Completed' || (status === 'Active' && month <= Math.floor(tenure * 0.3)) ? 'Paid' : 'Pending'
          };

          if (installment.status === 'Paid') {
            installment.paidAt = new Date(dueDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
            installment.paidAmount = emiAmount;
            loan.totalPaid += emiAmount;
            loan.remainingAmount -= installment.principal;
          }

          loan.repaymentSchedule.push(installment);
        }
      }

      loans.push(loan);
    }

    if (loans.length > 0) {
      const results = await db.collection('loans').insertMany(loans);
      
      loans.forEach((loan, index) => {
        loan._id = results.insertedIds[index];
      });
      
      this.createdData.loans.push(...loans);
    }

    console.log(`✅ ${loans.length} loan applications created`);
  }

  async seedTasks() {
    console.log('📋 Seeding tasks...');

    const db = mongoose.connection.db;
    
    const tasksData = [
      {
        name: 'Follow IProfit on Facebook',
        description: 'Follow our official Facebook page and get rewarded!',
        category: 'Social Media',
        reward: 50,
        currency: 'BDT',
        difficulty: 'Easy',
        estimatedTime: 2,
        requirements: 'Must follow and like the page',
        instructions: '1. Visit our Facebook page\n2. Click Follow\n3. Like our latest post\n4. Submit screenshot',
        maxSubmissions: 1000,
        currentSubmissions: 0,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isRepeatable: false,
        status: 'Active'
      },
      {
        name: 'Install Partner App',
        description: 'Install our partner mobile app and earn bonus',
        category: 'App Installation',
        reward: 100,
        currency: 'BDT',
        difficulty: 'Easy',
        estimatedTime: 5,
        requirements: 'Android or iOS device',
        instructions: '1. Download app from store\n2. Create account\n3. Complete profile\n4. Submit user ID',
        maxSubmissions: 500,
        currentSubmissions: 0,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isRepeatable: false,
        status: 'Active'
      },
      {
        name: 'Write Product Review',
        description: 'Write a detailed review of your experience with IProfit',
        category: 'Review',
        reward: 200,
        currency: 'BDT',
        difficulty: 'Medium',
        estimatedTime: 15,
        requirements: 'Minimum 100 words review',
        instructions: '1. Use our platform for at least 7 days\n2. Write honest review (min 100 words)\n3. Submit via form',
        maxSubmissions: 100,
        currentSubmissions: 0,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isRepeatable: false,
        status: 'Active'
      },
      {
        name: 'Refer 3 Friends',
        description: 'Refer 3 friends who successfully complete KYC',
        category: 'Referral',
        reward: 500,
        currency: 'BDT',
        difficulty: 'Hard',
        estimatedTime: 0,
        requirements: '3 successful referrals with completed KYC',
        instructions: '1. Share your referral code\n2. Ensure friends complete signup\n3. Wait for KYC approval',
        maxSubmissions: 1000,
        currentSubmissions: 0,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        isRepeatable: true,
        cooldownPeriod: 30,
        status: 'Active'
      },
      {
        name: 'Watch Educational Video',
        description: 'Watch our financial literacy video series',
        category: 'Video Watch',
        reward: 75,
        currency: 'BDT',
        difficulty: 'Easy',
        estimatedTime: 10,
        requirements: 'Complete all 5 videos',
        instructions: '1. Access video library\n2. Watch all 5 videos\n3. Pass quiz with 80% score',
        maxSubmissions: 2000,
        currentSubmissions: 0,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isRepeatable: false,
        status: 'Active'
      }
    ];

    for (const taskData of tasksData) {
      const existing = await db.collection('tasks').findOne({ name: taskData.name });
      if (!existing) {
        const task = {
          ...taskData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const result = await db.collection('tasks').insertOne(task);
        this.createdData.tasks.push({ ...task, _id: result.insertedId });
        console.log(`✅ Task created: ${taskData.name}`);
      } else {
        this.createdData.tasks.push(existing);
      }
    }
  }

  async seedTaskSubmissions() {
    console.log('📝 Seeding task submissions...');

    if (this.createdData.tasks.length === 0 || this.createdData.users.length === 0) {
      console.log('ℹ️  No tasks or users available, skipping task submissions');
      return;
    }

    const db = mongoose.connection.db;
    const submissions = [];
    const submissionCount = Math.min(this.options.count.users * 2, 200); // 2 submissions per user on average

    for (let i = 0; i < submissionCount; i++) {
      const user = this.createdData.users[Math.floor(Math.random() * this.createdData.users.length)];
      const task = this.createdData.tasks[Math.floor(Math.random() * this.createdData.tasks.length)];

      // Check if user already submitted this task (if not repeatable)
      const existingSubmission = submissions.find(s => 
        s.userId.toString() === user._id.toString() && 
        s.taskId.toString() === task._id.toString()
      );

      if (existingSubmission && !task.isRepeatable) {
        continue;
      }

      const statuses = ['Pending', 'Approved', 'Rejected'];
      const statusWeights = { Pending: 0.3, Approved: 0.6, Rejected: 0.1 };
      
      const statusRandom = Math.random();
      let status = 'Pending';
      let cumulative = 0;
      for (const [statusType, weight] of Object.entries(statusWeights)) {
        cumulative += weight;
        if (statusRandom <= cumulative) {
          status = statusType;
          break;
        }
      }

      const submission = {
        taskId: task._id,
        userId: user._id,
        status,
        proof: [
          {
            type: 'screenshot',
            content: '/uploads/demo/screenshot.jpg',
            uploadedAt: new Date()
          }
        ],
        submissionNote: 'Completed as per instructions',
        reviewNote: status !== 'Pending' ? (status === 'Approved' ? 'Good submission' : 'Incomplete proof') : null,
        reviewedBy: status !== 'Pending' ? this.createdData.admins[0]._id : null,
        reviewedAt: status !== 'Pending' ? new Date() : null,
        reward: task.reward,
        transactionId: null, // Will be set if approved
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      };

      submissions.push(submission);
    }

    if (submissions.length > 0) {
      const results = await db.collection('task_submissions').insertMany(submissions);
      
      submissions.forEach((submission, index) => {
        submission._id = results.insertedIds[index];
      });
      
      this.createdData.taskSubmissions.push(...submissions);

      // Create transactions for approved submissions
      let rewardTransactions = 0;
      for (const submission of submissions) {
        if (submission.status === 'Approved') {
          const rewardTransaction = {
            userId: submission.userId,
            type: 'bonus',
            amount: submission.reward,
            currency: 'BDT',
            gateway: 'System',
            status: 'Approved',
            description: `Task completion reward - ${submission.reward} BDT`,
            transactionId: `TASK${Date.now()}${rewardTransactions}`,
            fees: 0,
            netAmount: submission.reward,
            metadata: {
              taskId: submission.taskId,
              submissionId: submission._id,
              source: 'task_reward'
            },
            createdAt: submission.reviewedAt,
            updatedAt: submission.reviewedAt,
            processedAt: submission.reviewedAt
          };

          const transResult = await db.collection('transactions').insertOne(rewardTransaction);
          
          // Update submission with transaction ID
          await db.collection('task_submissions').updateOne(
            { _id: submission._id },
            { $set: { transactionId: transResult.insertedId } }
          );

          // Update user balance
          await db.collection('users').updateOne(
            { _id: submission.userId },
            { $inc: { balance: submission.reward } }
          );

          rewardTransactions++;
        }
      }

      console.log(`✅ ${submissions.length} task submissions created, ${rewardTransactions} rewards processed`);
    }
  }

  async seedSupportTickets() {
    console.log('🎫 Seeding support tickets...');

    if (this.createdData.users.length === 0) {
      console.log('ℹ️  No users available, skipping support tickets');
      return;
    }

    const db = mongoose.connection.db;
    const ticketCount = this.options.count.tickets;
    const tickets = [];

    const categories = [
      'Account Issues', 'Payment Problems', 'KYC Verification',
      'Loan Inquiry', 'Technical Support', 'Feature Request',
      'Complaint', 'General Inquiry', 'Referral Issues'
    ];

    const priorities = ['Low', 'Medium', 'High', 'Urgent'];
    const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];

    const sampleIssues = {
      'Account Issues': [
        'Cannot login to my account',
        'Account balance not updating',
        'Profile information cannot be edited',
        'Two-factor authentication issues'
      ],
      'Payment Problems': [
        'Deposit not reflecting in account',
        'Withdrawal request stuck',
        'Transaction failed but money deducted',
        'Gateway error during payment'
      ],
      'KYC Verification': [
        'KYC documents rejected',
        'How long does KYC take?',
        'Need to update KYC information',
        'Document upload failing'
      ],
      'Referral Issues': [
        'Referral bonus not credited',
        'Referral code not working',
        'Questions about profit sharing',
        'How to track my referrals'
      ]
    };

    for (let i = 0; i < ticketCount; i++) {
      const user = this.createdData.users[Math.floor(Math.random() * this.createdData.users.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const issues = sampleIssues[category] || ['General support request'];
      const subject = issues[Math.floor(Math.random() * issues.length)];

      const ticket = {
        userId: user._id,
        subject,
        description: `Detailed description of the issue: ${subject}. Please help me resolve this as soon as possible.`,
        category,
        priority,
        status,
        assignedTo: status !== 'Open' ? this.createdData.admins[Math.floor(Math.random() * this.createdData.admins.length)]._id : null,
        attachments: [],
        responses: [],
        tags: [category.toLowerCase().replace(' ', '_')],
        metadata: {
          userAgent: 'Mobile App',
          source: 'demo_seed'
        },
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        resolvedAt: status === 'Resolved' || status === 'Closed' ? new Date() : null
      };

      // Add sample responses for non-open tickets
      if (status !== 'Open') {
        ticket.responses = [
          {
            adminId: ticket.assignedTo,
            message: 'Thank you for contacting support. We are looking into your issue.',
            isInternal: false,
            createdAt: new Date(ticket.createdAt.getTime() + 2 * 60 * 60 * 1000)
          }
        ];

        if (status === 'Resolved' || status === 'Closed') {
          ticket.responses.push({
            adminId: ticket.assignedTo,
            message: 'Your issue has been resolved. Please let us know if you need further assistance.',
            isInternal: false,
            createdAt: ticket.resolvedAt
          });
        }
      }

      tickets.push(ticket);
    }

    if (tickets.length > 0) {
      const results = await db.collection('support_tickets').insertMany(tickets);
      
      tickets.forEach((ticket, index) => {
        ticket._id = results.insertedIds[index];
      });
      
      this.createdData.tickets.push(...tickets);
    }

    console.log(`✅ ${tickets.length} support tickets created`);
  }

  async seedNews() {
    console.log('📰 Seeding news articles...');

    const db = mongoose.connection.db;
    
    const newsData = [
      {
        title: 'Welcome to IProfit - Your Financial Journey Starts Here',
        slug: 'welcome-to-iprofit-financial-journey',
        content: `<p>We are thrilled to announce the official launch of IProfit, your comprehensive financial management platform designed to help you achieve your financial goals.</p>
        
        <p>Our platform offers:</p>
        <ul>
          <li>Secure investment opportunities</li>
          <li>Competitive loan options</li>
          <li>Rewarding referral programs</li>
          <li>Task-based earning system</li>
          <li>24/7 customer support</li>
        </ul>
        
        <p>Join thousands of users who are already building their financial future with IProfit.</p>`,
        excerpt: 'Discover how IProfit can help you achieve your financial goals with our comprehensive platform.',
        category: 'Announcement',
        status: 'Published',
        isSticky: true,
        author: 'IProfit Team',
        featuredImage: '/images/news/welcome.jpg',
        tags: ['announcement', 'launch', 'platform'],
        publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        metadata: {
          seoTitle: 'Welcome to IProfit Financial Platform',
          seoDescription: 'Start your financial journey with IProfit - secure investments, loans, and rewards await.'
        }
      },
      {
        title: 'New Referral Program: Earn More, Share More',
        slug: 'new-referral-program-earn-share-more',
        content: `<p>We're excited to introduce our enhanced referral program that rewards you for bringing friends and family to IProfit.</p>
        
        <h3>How It Works:</h3>
        <ol>
          <li>Share your unique referral code</li>
          <li>Friends sign up and complete KYC</li>
          <li>You both earn 100 BDT signup bonus</li>
          <li>Earn 10% of their profits forever</li>
        </ol>
        
        <p>The more you refer, the more you earn. Start sharing today!</p>`,
        excerpt: 'Introducing our enhanced referral program with signup bonuses and lifetime profit sharing.',
        category: 'Feature',
        status: 'Published',
        isSticky: false,
        author: 'Marketing Team',
        featuredImage: '/images/news/referral.jpg',
        tags: ['referral', 'bonus', 'earning'],
        publishedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Enhanced Loan Features Now Available',
        slug: 'enhanced-loan-features-available',
        content: `        <p>We've upgraded our loan system to serve you better with faster approvals and competitive rates.</p>
        
        <h3>What's New:</h3>
        <ul>
          <li>Instant loan eligibility check</li>
          <li>EMI calculator for planning</li>
          <li>Flexible repayment options</li>
          <li>Lower interest rates for premium users</li>
          <li>Digital document submission</li>
        </ul>
        
        <p>Apply for your loan today and get approved within 24 hours!</p>`,
        excerpt: 'Our enhanced loan system offers faster approvals, better rates, and more flexibility.',
        category: 'Feature',
        status: 'Published',
        isSticky: false,
        author: 'Product Team',
        featuredImage: '/images/news/loans.jpg',
        tags: ['loans', 'features', 'approval'],
        publishedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Security Update: Enhanced Device Protection',
        slug: 'security-update-enhanced-device-protection',
        content: `<p>Your security is our top priority. We've implemented advanced device fingerprinting to protect your account.</p>
        
        <h3>New Security Features:</h3>
        <ul>
          <li>One account per device policy</li>
          <li>Advanced fraud detection</li>
          <li>Real-time security alerts</li>
          <li>Enhanced login monitoring</li>
        </ul>
        
        <p>These updates ensure your funds and personal information remain secure at all times.</p>`,
        excerpt: 'New security measures including device fingerprinting and fraud detection are now active.',
        category: 'Security',
        status: 'Published',
        isSticky: false,
        author: 'Security Team',
        featuredImage: '/images/news/security.jpg',
        tags: ['security', 'protection', 'update'],
        publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Task System: Earn While You Learn',
        slug: 'task-system-earn-while-learn',
        content: `<p>Complete simple tasks and earn rewards while learning about financial literacy and our platform.</p>
        
        <h3>Available Tasks:</h3>
        <ul>
          <li>Social media engagement (50-100 BDT)</li>
          <li>Educational video watching (75 BDT)</li>
          <li>App installations (100 BDT)</li>
          <li>Product reviews (200 BDT)</li>
          <li>Referral challenges (500 BDT)</li>
        </ul>
        
        <p>Start completing tasks today and boost your earnings!</p>`,
        excerpt: 'Complete tasks ranging from social media engagement to educational content for rewards.',
        category: 'Feature',
        status: 'Published',
        isSticky: false,
        author: 'Community Team',
        featuredImage: '/images/news/tasks.jpg',
        tags: ['tasks', 'rewards', 'learning'],
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Premium Plans: Unlock Maximum Potential',
        slug: 'premium-plans-unlock-maximum-potential',
        content: `<p>Upgrade to our premium plans and enjoy higher limits, priority support, and exclusive features.</p>
        
        <h3>Plan Benefits:</h3>
        <ul>
          <li><strong>Silver Plan (1,000 BDT):</strong> 50,000 BDT deposit limit, priority support</li>
          <li><strong>Gold Plan (5,000 BDT):</strong> 200,000 BDT deposit limit, VIP support</li>
          <li><strong>Platinum Plan (15,000 BDT):</strong> 500,000 BDT deposit limit, dedicated manager</li>
          <li><strong>Diamond Plan (25,000 BDT):</strong> Unlimited access, white-glove service</li>
        </ul>
        
        <p>Choose the plan that fits your financial goals and start earning more today.</p>`,
        excerpt: 'Explore our premium plans with higher limits, better support, and exclusive benefits.',
        category: 'Plans',
        status: 'Published',
        isSticky: false,
        author: 'Sales Team',
        featuredImage: '/images/news/plans.jpg',
        tags: ['plans', 'premium', 'upgrade'],
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Mobile App Update: Better Performance & Features',
        slug: 'mobile-app-update-better-performance-features',
        content: `<p>Our latest mobile app update brings improved performance, new features, and enhanced user experience.</p>
        
        <h3>What's New in v2.1:</h3>
        <ul>
          <li>50% faster loading times</li>
          <li>Improved transaction history</li>
          <li>Enhanced KYC upload process</li>
          <li>Real-time notifications</li>
          <li>Dark mode support</li>
          <li>Biometric authentication</li>
        </ul>
        
        <p>Update your app now to enjoy these improvements!</p>`,
        excerpt: 'Mobile app v2.1 features faster performance, new capabilities, and better user experience.',
        category: 'Update',
        status: 'Published',
        isSticky: false,
        author: 'Development Team',
        featuredImage: '/images/news/app-update.jpg',
        tags: ['mobile', 'update', 'performance'],
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Customer Success Stories: Real Users, Real Results',
        slug: 'customer-success-stories-real-users-results',
        content: `<p>Meet some of our successful users who have achieved their financial goals with IProfit.</p>
        
        <h3>Success Highlights:</h3>
        <blockquote>
          <p>"I've earned over 50,000 BDT through referrals and smart investments in just 6 months!" - Ahmed Rahman, Dhaka</p>
        </blockquote>
        
        <blockquote>
          <p>"The loan approval was so fast, I got my business funding within 24 hours." - Fatima Khan, Chittagong</p>
        </blockquote>
        
        <blockquote>
          <p>"Task completion helped me learn about finance while earning extra income." - Mohammad Ali, Sylhet</p>
        </blockquote>
        
        <p>Join thousands of satisfied users and start your success story today!</p>`,
        excerpt: 'Read inspiring success stories from real IProfit users who achieved their financial goals.',
        category: 'Success Stories',
        status: 'Published',
        isSticky: false,
        author: 'Marketing Team',
        featuredImage: '/images/news/success.jpg',
        tags: ['success', 'testimonials', 'users'],
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const article of newsData) {
      const existing = await db.collection('news').findOne({ slug: article.slug });
      if (!existing) {
        const newsDoc = {
          ...article,
          createdAt: article.publishedAt,
          updatedAt: new Date()
        };
        const result = await db.collection('news').insertOne(newsDoc);
        this.createdData.news.push({ ...newsDoc, _id: result.insertedId });
        console.log(`✅ News article created: ${article.title}`);
      } else {
        this.createdData.news.push(existing);
      }
    }
  }

  async createNotifications() {
    console.log('🔔 Creating system notifications...');

    const db = mongoose.connection.db;
    const notifications = [];

    // Create notifications for major events
    const notificationTypes = [
      {
        type: 'System',
        title: 'Welcome to IProfit!',
        message: 'Your account has been created successfully. Complete your KYC to unlock all features.',
        priority: 'High',
        channel: 'in_app'
      },
      {
        type: 'Referral',
        title: 'Referral Bonus Credited',
        message: 'You have earned a referral bonus! Check your transaction history.',
        priority: 'Medium',
        channel: 'in_app'
      },
      {
        type: 'KYC',
        title: 'KYC Verification Required',
        message: 'Please complete your KYC verification to access premium features.',
        priority: 'High',
        channel: 'in_app'
      },
      {
        type: 'Marketing',
        title: 'New Features Available',
        message: 'Check out our latest updates including enhanced loan features and task system.',
        priority: 'Low',
        channel: 'in_app'
      }
    ];

    // Create notifications for random users
    const selectedUsers = this.createdData.users.slice(0, Math.min(50, this.createdData.users.length));

    for (const user of selectedUsers) {
      // Each user gets 1-3 notifications
      const notificationCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < notificationCount; i++) {
        const notificationType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
        
        const notification = {
          userId: user._id,
          type: notificationType.type,
          channel: notificationType.channel,
          title: notificationType.title,
          message: notificationType.message,
          status: Math.random() > 0.3 ? 'Read' : 'Sent', // 70% read rate
          priority: notificationType.priority,
          sentAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          readAt: Math.random() > 0.3 ? new Date() : null,
          retryCount: 0,
          maxRetries: 3,
          metadata: {
            source: 'system_notification',
            userId: user._id.toString()
          },
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        };

        notifications.push(notification);
      }
    }

    if (notifications.length > 0) {
      const results = await db.collection('notifications').insertMany(notifications);
      
      notifications.forEach((notification, index) => {
        notification._id = results.insertedIds[index];
      });
      
      this.createdData.notifications.push(...notifications);
    }

    console.log(`✅ ${notifications.length} notifications created`);
  }

  async generateSummary() {
    console.log('\n📊 Database Seeding Summary');
    console.log('================================');

    // Calculate referral statistics
    const totalReferrals = this.createdData.referrals.length;
    const paidReferrals = this.createdData.referrals.filter(r => r.status === 'Paid').length;
    const signupBonuses = this.createdData.referrals.filter(r => r.bonusType === 'signup').length;
    const profitShares = this.createdData.referrals.filter(r => r.bonusType === 'profit_share').length;
    const totalBonusAmount = this.createdData.referrals
      .filter(r => r.status === 'Paid')
      .reduce((sum, r) => sum + r.bonusAmount + r.profitBonus, 0);

    // Calculate user statistics
    const totalUsers = this.createdData.users.length;
    const kycApprovedUsers = this.createdData.users.filter(u => u.kycStatus === 'Approved').length;
    const referredUsers = this.createdData.users.filter(u => u.referredBy).length;

    // Plan distribution
    const planDistribution = {};
    this.createdData.users.forEach(user => {
      const planName = user.planName || 'Unknown';
      planDistribution[planName] = (planDistribution[planName] || 0) + 1;
    });

    // Transaction statistics
    const totalTransactions = this.createdData.transactions.length;
    const approvedTransactions = this.createdData.transactions.filter(t => t.status === 'Approved').length;
    const totalTransactionValue = this.createdData.transactions
      .filter(t => t.status === 'Approved')
      .reduce((sum, t) => sum + t.amount, 0);

    console.log(`📈 Users: ${totalUsers} total, ${kycApprovedUsers} KYC approved, ${referredUsers} referred`);
    console.log(`🔗 Referrals: ${totalReferrals} total, ${paidReferrals} paid, ${totalBonusAmount.toLocaleString()} BDT in bonuses`);
    console.log(`   └─ Signup bonuses: ${signupBonuses}, Profit shares: ${profitShares}`);
    console.log(`💳 Transactions: ${totalTransactions} total, ${approvedTransactions} approved, ${totalTransactionValue.toLocaleString()} BDT value`);
    console.log(`🏦 Loans: ${this.createdData.loans.length} applications`);
    console.log(`📋 Tasks: ${this.createdData.tasks.length} available, ${this.createdData.taskSubmissions.length} submissions`);
    console.log(`🎫 Support: ${this.createdData.tickets.length} tickets`);
    console.log(`📰 News: ${this.createdData.news.length} articles`);
    console.log(`🔔 Notifications: ${this.createdData.notifications.length} sent`);

    console.log('\n📊 Plan Distribution:');
    Object.entries(planDistribution).forEach(([plan, count]) => {
      console.log(`   ${plan}: ${count} users`);
    });

    console.log('\n🎯 Demo Referral Scenarios Created:');
    console.log('   ✅ Multi-level referral chains');
    console.log('   ✅ Signup bonuses with conditions');
    console.log('   ✅ Profit sharing calculations');
    console.log('   ✅ Pending and approved bonuses');
    console.log('   ✅ Transaction tracking for rewards');
    console.log('   ✅ Realistic user behavior patterns');

    console.log('\n🔑 Admin Login Credentials (VERIFIED):');
    console.log('   SuperAdmin: admin@iprofit.com / Admin123@#');
    console.log('   Moderator: moderator@iprofit.com / Mod123@#');
    console.log('   Finance: finance@iprofit.com / Finance123@#');
    console.log('   Users: Any generated email / User123@#');

    console.log('\n🚀 Quick Start Guide:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Go to: http://localhost:3000/login');
    console.log('   3. Select "Admin Login"');
    console.log('   4. Use: admin@iprofit.com / Admin123@#');
    console.log('   5. Explore the referral management system');
    console.log('   6. Check pending bonuses and approve them');

    if (this.options.demo) {
      console.log('\n🎪 Demo Mode Highlights:');
      console.log('   • Comprehensive referral ecosystem');
      console.log('   • Realistic transaction patterns');
      console.log('   • Multi-level user engagement');
      console.log('   • Complete admin workflow demos');
      console.log('   • Authentication tested and verified');
    }

    console.log('\n⚠️  Important Notes:');
    console.log('   • Admin accounts are recreated on each seed');
    console.log('   • Passwords are properly hashed with bcrypt');
    console.log('   • All authentication tests passed');
    console.log('   • Use --reset flag to clear all existing data');
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }
}

// Main execution
async function main() {
  console.log('🌱 IProfit Enhanced Database Seeder');
  console.log('====================================');

  const args = process.argv.slice(2);
  const options = {
    reset: args.includes('--reset'),
    production: args.includes('--production'),
    demo: args.includes('--demo'),
    count: {
      users: args.includes('--production') ? 0 : (args.includes('--demo') ? 150 : 100),
      transactions: args.includes('--production') ? 0 : (args.includes('--demo') ? 500 : 300),
      loans: args.includes('--production') ? 0 : (args.includes('--demo') ? 60 : 40),
      tickets: args.includes('--production') ? 0 : (args.includes('--demo') ? 80 : 50),
      tasks: 15,
      news: 10
    },
  };

  if (options.production) {
    console.log('⚠️  Production mode: Creating system data only');
  } else if (options.demo) {
    console.log('🎯 Demo mode: Creating comprehensive dataset with enhanced referral system');
  } else {
    console.log('🔧 Development mode: Creating standard test dataset');
  }

  const seeder = new EnhancedDatabaseSeeder(options);

  try {
    await seeder.seedAll();
    console.log('\n🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
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

module.exports = { EnhancedDatabaseSeeder };