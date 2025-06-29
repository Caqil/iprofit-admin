#!/usr/bin/env node

/**
 * Database Seeder Script for IProfit Platform (CommonJS)
 * 
 * This script populates the database with sample data for development and testing.
 * Includes users, transactions, loans, and other necessary data.
 * 
 * Usage: npm run seed-data [--reset] [--production]
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Load environment variables first
dotenv.config({ path: '.env.local' });

// Check if MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  console.log('Please run: npm run check-env:create');
  process.exit(1);
}

class DatabaseSeeder {
  constructor(options) {
    this.options = options || {
      reset: false,
      production: false,
      count: {
        users: 50,
        transactions: 200,
        loans: 25,
        tickets: 30,
      },
    };
    
    this.createdData = {
      plans: [],
      users: [],
      admins: [],
      transactions: [],
      loans: [],
      referrals: [],
      tickets: []
    };
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
    console.log('🌱 Starting database seeding...');
    console.log(`📊 Mode: ${this.options.production ? 'Production' : 'Development'}`);

    try {
      await this.connectToDatabase();

      if (this.options.reset) {
        await this.resetDatabase();
      }

      // Seed in order due to dependencies
      await this.seedAdmins();
      await this.seedPlans();
      await this.seedUsers();
      await this.seedTransactions();
      await this.seedLoans();
      await this.seedReferrals();
      await this.seedSupportTickets();
      await this.seedTasks();

      await this.generateSummary();

      console.log('🎉 Database seeding completed successfully!');

    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  }

  async resetDatabase() {
    console.log('🗑️  Resetting database...');

    const db = mongoose.connection.db;
    const collections = [
      'admins', 'users', 'plans', 'transactions', 
      'loans', 'referrals', 'support_tickets', 'faqs',
      'tasks', 'task_submissions', 'audit_logs'
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

  async seedAdmins() {
    console.log('👨‍💼 Seeding admin accounts...');

    const db = mongoose.connection.db;

    const adminData = [
      {
        email: 'admin@iprofit.com',
        password: 'Admin123@#',
        name: 'System Administrator',
        role: 'SuperAdmin',
        permissions: ['*'],
      },
      {
        email: 'moderator@iprofit.com',
        password: 'Mod123!@#',
        name: 'Support Moderator',
        role: 'Moderator',
        permissions: [
          'users.view', 'users.update', 'users.kyc',
          'transactions.view', 'transactions.approve',
          'support.view', 'support.respond',
          'dashboard.view', 'loans.view', 'loans.approve'
        ],
      },
    ];

    if (this.options.production) {
      // In production, only create admin if it doesn't exist
      const existingAdmin = await db.collection('admins').findOne({ email: 'admin@iprofit.com' });
      if (!existingAdmin) {
        const hashedPassword = await this.hashPassword(adminData[0].password);
        const admin = {
          email: adminData[0].email,
          passwordHash: hashedPassword,
          name: adminData[0].name,
          role: adminData[0].role,
          permissions: adminData[0].permissions,
          isActive: true,
          loginAttempts: 0,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const result = await db.collection('admins').insertOne(admin);
        this.createdData.admins.push({ ...admin, _id: result.insertedId });
        console.log('✅ Production admin created');
      } else {
        console.log('ℹ️  Production admin already exists');
      }
      return;
    }

    // Development mode - create all admins
    for (const data of adminData) {
      const existing = await db.collection('admins').findOne({ email: data.email });
      if (!existing) {
        const hashedPassword = await this.hashPassword(data.password);
        const admin = {
          email: data.email,
          passwordHash: hashedPassword,
          name: data.name,
          role: data.role,
          permissions: data.permissions,
          isActive: true,
          loginAttempts: 0,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const result = await db.collection('admins').insertOne(admin);
        this.createdData.admins.push({ ...admin, _id: result.insertedId });
        console.log(`✅ Admin created: ${data.email}`);
      }
    }
  }

  async hashPassword(password) {
    const SALT_ROUNDS = 12;
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  async seedPlans() {
    console.log('📋 Seeding subscription plans...');

    const db = mongoose.connection.db;

    const plansData = [
      {
        name: 'Free',
        description: 'Basic plan for beginners. Perfect for getting started with small investments.',
        price: 0,
        currency: 'BDT',
        depositLimit: 10000,
        withdrawalLimit: 5000,
        profitLimit: 1000,
        minimumDeposit: 100,
        minimumWithdrawal: 50,
        dailyWithdrawalLimit: 1000,
        monthlyWithdrawalLimit: 10000,
        features: [
          'Basic investment tracking',
          'Standard customer support',
          'Mobile app access',
          'Basic analytics',
          'Email notifications'
        ],
        color: '#6b7280',
        priority: 0,
        isActive: true,
      },
      {
        name: 'Standard',
        description: 'Enhanced features for regular investors. Great for building your portfolio.',
        price: 2000,
        currency: 'BDT',
        depositLimit: 50000,
        withdrawalLimit: 25000,
        profitLimit: 5000,
        minimumDeposit: 500,
        minimumWithdrawal: 100,
        dailyWithdrawalLimit: 5000,
        monthlyWithdrawalLimit: 50000,
        features: [
          'Advanced analytics',
          'Priority support',
          'Higher limits',
          'Investment insights',
          'SMS notifications',
          'Referral bonuses'
        ],
        color: '#3b82f6',
        priority: 1,
        isActive: true,
      },
      {
        name: 'Premium',
        description: 'Premium features for serious investors. Maximum returns and flexibility.',
        price: 5000,
        currency: 'BDT',
        depositLimit: 200000,
        withdrawalLimit: 100000,
        profitLimit: 20000,
        minimumDeposit: 1000,
        minimumWithdrawal: 200,
        dailyWithdrawalLimit: 20000,
        monthlyWithdrawalLimit: 200000,
        features: [
          'Premium analytics dashboard',
          'Dedicated account manager',
          'Maximum profit limits',
          'Priority withdrawals',
          'Advanced notifications',
          'Exclusive investment opportunities',
          'Custom reports'
        ],
        color: '#10b981',
        priority: 2,
        isActive: true,
      },
      {
        name: 'VIP',
        description: 'Ultimate experience for high-value investors. Unlimited potential.',
        price: 10000,
        currency: 'BDT',
        depositLimit: 500000,
        withdrawalLimit: 250000,
        profitLimit: 50000,
        minimumDeposit: 5000,
        minimumWithdrawal: 500,
        dailyWithdrawalLimit: 50000,
        monthlyWithdrawalLimit: 500000,
        features: [
          'White-glove service',
          'Custom investment strategies',
          'No transaction limits',
          'Instant support',
          'Maximum referral rewards',
          'Private investment access',
          'Quarterly strategy reviews'
        ],
        color: '#8b5cf6',
        priority: 3,
        isActive: true,
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
      }
    }
  }

  async seedUsers() {
    console.log('👥 Seeding user accounts...');

    if (this.options.production) {
      console.log('ℹ️  Skipping users in production mode');
      return;
    }

    const db = mongoose.connection.db;

    // Get available plans
    const plans = await db.collection('plans').find({ isActive: true }).toArray();
    if (plans.length === 0) {
      throw new Error('No plans available for user creation');
    }

    const userCount = this.options.count.users;
    const sampleUsers = this.generateSampleUsers(userCount, plans);

    let referrerUser = null;

    for (let i = 0; i < sampleUsers.length; i++) {
      const userData = sampleUsers[i];
      
      const existing = await db.collection('users').findOne({ email: userData.email });
      if (!existing) {
        // Hash user password
        userData.passwordHash = await this.hashPassword(userData.password);
        delete userData.password;

        // Assign referrer for some users (simulate referral chain)
        if (referrerUser && Math.random() > 0.7) {
          userData.referredBy = referrerUser._id;
        }

        userData.createdAt = new Date();
        userData.updatedAt = new Date();

        const result = await db.collection('users').insertOne(userData);
        const user = { ...userData, _id: result.insertedId };
        this.createdData.users.push(user);
        
        // Use some users as referrers
        if (i % 3 === 0) {
          referrerUser = user;
        }

        console.log(`✅ User created: ${userData.email}`);
      }
    }
  }

  generateSampleUsers(count, plans) {
    const firstNames = [
      'Ahmed', 'Fatima', 'Mohammad', 'Aisha', 'Omar', 'Khadija', 'Ali', 'Zainab',
      'Hassan', 'Maryam', 'Ibrahim', 'Amina', 'Yusuf', 'Safiya', 'Khalid'
    ];
    
    const lastNames = [
      'Rahman', 'Ahmed', 'Khan', 'Islam', 'Hasan', 'Ali', 'Uddin', 'Begum',
      'Sheikh', 'Chowdhury', 'Karim', 'Sultana', 'Mahmud', 'Khatun', 'Miah'
    ];

    const cities = [
      'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 
      'Rangpur', 'Comilla', 'Narayanganj', 'Gazipur'
    ];

    const users = [];
    const usedEmails = new Set();
    const usedPhones = new Set();
    const usedDevices = new Set();

    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${firstName} ${lastName}`;
      
      let email, phone, deviceId;
      
      // Generate unique email
      do {
        email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
      } while (usedEmails.has(email));
      usedEmails.add(email);
      
      // Generate unique phone
      do {
        phone = `+8801${Math.floor(Math.random() * 900000000) + 100000000}`;
      } while (usedPhones.has(phone));
      usedPhones.add(phone);
      
      // Generate unique device ID
      do {
        deviceId = `device_${crypto.randomBytes(8).toString('hex')}`;
      } while (usedDevices.has(deviceId));
      usedDevices.add(deviceId);

      const plan = plans[Math.floor(Math.random() * plans.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];

      const user = {
        name,
        email,
        phone,
        password: 'User123@#', // This will be hashed
        planId: plan._id,
        balance: Math.floor(Math.random() * 10000),
        kycStatus: ['Pending', 'Approved', 'Approved', 'Approved'][Math.floor(Math.random() * 4)],
        referralCode: this.generateReferralCode(),
        deviceId,
        address: {
          street: `${Math.floor(Math.random() * 999) + 1} Main Street`,
          city,
          state: city,
          country: 'Bangladesh',
          zipCode: `${Math.floor(Math.random() * 9000) + 1000}`
        },
        status: 'Active',
        loginAttempts: 0,
        emailVerified: Math.random() > 0.2,
        phoneVerified: Math.random() > 0.3,
        twoFactorEnabled: false
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

  async seedTransactions() {
    console.log('💳 Seeding transactions...');

    if (this.createdData.users.length === 0) {
      console.log('ℹ️  No users available, skipping transactions');
      return;
    }

    const db = mongoose.connection.db;
    const transactionCount = this.options.production ? 0 : this.options.count.transactions;
    const transactionTypes = ['deposit', 'withdrawal', 'bonus', 'profit', 'referral_bonus'];
    const currencies = ['BDT', 'USD'];
    const gateways = ['CoinGate', 'UddoktaPay', 'Manual', 'System', 'Bank Transfer'];
    const statuses = ['Approved', 'Approved', 'Approved', 'Pending', 'Rejected'];

    const transactions = [];

    for (let i = 0; i < transactionCount; i++) {
      const user = this.createdData.users[Math.floor(Math.random() * this.createdData.users.length)];
      const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
      const currency = currencies[Math.floor(Math.random() * currencies.length)];
      
      let amount;
      if (currency === 'BDT') {
        amount = Math.floor(Math.random() * 5000 + 100);
      } else {
        amount = Math.floor(Math.random() * 50 + 1);
      }

      const transaction = {
        userId: user._id,
        type,
        amount,
        currency,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        gateway: gateways[Math.floor(Math.random() * gateways.length)],
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} transaction`,
        gatewayTransactionId: `txn_${Date.now()}_${i}`,
        processedAt: Math.random() > 0.3 ? new Date() : null,
        metadata: {
          source: 'seeder',
          randomId: Math.random().toString(36).substr(2, 9),
        },
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        updatedAt: new Date(),
      };

      transactions.push(transaction);

      if (transactions.length >= 100) {
        await db.collection('transactions').insertMany(transactions);
        this.createdData.transactions.push(...transactions);
        transactions.length = 0;
        console.log(`✅ Created ${i + 1} transactions`);
      }
    }

    if (transactions.length > 0) {
      await db.collection('transactions').insertMany(transactions);
      this.createdData.transactions.push(...transactions);
    }

    console.log(`✅ ${transactionCount} transactions created`);
  }

  async seedLoans() {
    console.log('🏦 Seeding loan applications...');

    if (this.createdData.users.length === 0) {
      console.log('ℹ️  No users available, skipping loans');
      return;
    }

    const db = mongoose.connection.db;
    const loanCount = this.options.production ? 0 : this.options.count.loans;
    const loanTypes = ['Personal', 'Business', 'Emergency', 'Investment'];
    const statuses = ['Pending', 'Approved', 'Rejected', 'Active', 'Completed'];
    const purposes = [
      'Business expansion', 'Medical emergency', 'Education', 'Home renovation',
      'Investment opportunity', 'Debt consolidation', 'Equipment purchase'
    ];

    const loans = [];

    for (let i = 0; i < loanCount; i++) {
      const user = this.createdData.users[Math.floor(Math.random() * this.createdData.users.length)];
      const admin = this.createdData.admins[Math.floor(Math.random() * this.createdData.admins.length)];
      
      const amount = Math.floor(Math.random() * 95000 + 5000); // 5k to 100k
      const interestRate = Math.floor(Math.random() * 18 + 8); // 8% to 25%
      const termMonths = [6, 12, 18, 24, 36][Math.floor(Math.random() * 5)];
      
      const loan = {
        userId: user._id,
        amount,
        interestRate,
        termMonths,
        purpose: purposes[Math.floor(Math.random() * purposes.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        loanType: loanTypes[Math.floor(Math.random() * loanTypes.length)],
        approvedBy: Math.random() > 0.5 ? admin._id : null,
        approvedAt: Math.random() > 0.5 ? new Date() : null,
        monthlyPayment: Math.floor((amount * (1 + interestRate / 100)) / termMonths),
        totalRepayment: Math.floor(amount * (1 + interestRate / 100)),
        remainingBalance: Math.floor(Math.random() * amount),
        nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        collateral: Math.random() > 0.7 ? 'Property documents' : null,
        guarantor: Math.random() > 0.8 ? 'Family member' : null,
        creditScore: Math.floor(Math.random() * 300 + 500), // 500-800
        riskLevel: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
        createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      };

      loans.push(loan);
    }

    if (loans.length > 0) {
      await db.collection('loans').insertMany(loans);
      this.createdData.loans.push(...loans);
    }

    console.log(`✅ ${loanCount} loans created`);
  }

  async seedReferrals() {
    console.log('🔗 Seeding referral records...');

    if (this.createdData.users.length < 2) {
      console.log('ℹ️  Not enough users for referrals, skipping');
      return;
    }

    const db = mongoose.connection.db;
    const referrals = [];
    const referralCount = Math.min(this.createdData.users.length / 2, 20);

    for (let i = 0; i < referralCount; i++) {
      const referrer = this.createdData.users[i];
      const referred = this.createdData.users[i + referralCount];

      if (referrer && referred) {
        const referral = {
          referrerId: referrer._id,
          referredUserId: referred._id,
          status: 'Completed',
          rewardAmount: Math.floor(Math.random() * 500 + 100),
          rewardCurrency: 'BDT',
          level: 1,
          commissionRate: 10,
          isActive: true,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        };

        referrals.push(referral);
      }
    }

    if (referrals.length > 0) {
      await db.collection('referrals').insertMany(referrals);
      this.createdData.referrals.push(...referrals);
    }

    console.log(`✅ ${referrals.length} referrals created`);
  }

  async seedSupportTickets() {
    console.log('🎫 Seeding support tickets...');

    if (this.createdData.users.length === 0) {
      console.log('ℹ️  No users available, skipping support tickets');
      return;
    }

    const db = mongoose.connection.db;
    const ticketCount = this.options.production ? 0 : this.options.count.tickets;
    
    const categories = ['Account', 'Payment', 'Technical', 'General', 'Loan', 'KYC'];
    const priorities = ['Low', 'Medium', 'High', 'Urgent'];
    const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
    
    const subjects = [
      'Cannot withdraw funds',
      'Account verification issue',
      'Login problems',
      'Transaction not reflecting',
      'App crashing frequently',
      'Loan application status',
      'KYC document rejection',
      'Referral bonus not credited',
      'Password reset not working',
      'Balance discrepancy'
    ];

    const tickets = [];

    for (let i = 0; i < ticketCount; i++) {
      const user = this.createdData.users[Math.floor(Math.random() * this.createdData.users.length)];
      const admin = Math.random() > 0.5 ? this.createdData.admins[Math.floor(Math.random() * this.createdData.admins.length)] : null;

      const ticket = {
        userId: user._id,
        subject: subjects[Math.floor(Math.random() * subjects.length)],
        description: `I am experiencing issues with my account. Please help me resolve this issue.`,
        category: categories[Math.floor(Math.random() * categories.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        assignedTo: admin?._id || null,
        attachments: [],
        responses: [],
        tags: [],
        lastResponseAt: new Date(),
        metadata: {
          source: 'web',
          ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
          userAgent: 'Mozilla/5.0 (compatible; Seeder/1.0)'
        },
        createdAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      };

      tickets.push(ticket);
    }

    if (tickets.length > 0) {
      await db.collection('support_tickets').insertMany(tickets);
      this.createdData.tickets.push(...tickets);
    }

    console.log(`✅ ${ticketCount} support tickets created`);
  }

  async seedTasks() {
    console.log('📋 Seeding tasks...');

    const db = mongoose.connection.db;
    
    const tasks = [
      {
        title: 'Complete Profile Setup',
        description: 'Fill out your complete profile information including personal details and preferences.',
        category: 'Account',
        difficulty: 'Easy',
        reward: 100,
        currency: 'BDT',
        status: 'Active',
        validFrom: new Date(),
        validUntil: null,
        isRepeatable: false,
        metadata: {
          tags: ['profile', 'setup', 'onboarding']
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Verify Phone Number',
        description: 'Verify your phone number to secure your account and receive important notifications.',
        category: 'Security',
        difficulty: 'Easy',
        reward: 50,
        currency: 'BDT',
        status: 'Active',
        validFrom: new Date(),
        validUntil: null,
        isRepeatable: false,
        metadata: {
          tags: ['verification', 'security', 'phone']
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'First Investment',
        description: 'Make your first investment to start earning profits.',
        category: 'Investment',
        difficulty: 'Medium',
        reward: 500,
        currency: 'BDT',
        status: 'Active',
        validFrom: new Date(),
        validUntil: null,
        isRepeatable: false,
        metadata: {
          tags: ['investment', 'first-time', 'milestone']
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const task of tasks) {
      const existing = await db.collection('tasks').findOne({ title: task.title });
      if (!existing) {
        await db.collection('tasks').insertOne(task);
        console.log(`✅ Task created: ${task.title}`);
      }
    }
  }

  async generateSummary() {
    console.log('\n📊 Seeding Summary');
    console.log('==================');

    const db = mongoose.connection.db;

    const counts = {
      admins: await db.collection('admins').countDocuments(),
      users: await db.collection('users').countDocuments(),
      plans: await db.collection('plans').countDocuments(),
      transactions: await db.collection('transactions').countDocuments(),
      loans: await db.collection('loans').countDocuments(),
      referrals: await db.collection('referrals').countDocuments(),
      tickets: await db.collection('support_tickets').countDocuments(),
      tasks: await db.collection('tasks').countDocuments()
    };

    Object.entries(counts).forEach(([key, count]) => {
      console.log(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${count}`);
    });

    if (!this.options.production) {
      console.log('\n🔐 Default Credentials (Development):');
      console.log('=====================================');
      console.log('Super Admin:');
      console.log('  Email: admin@iprofit.com');
      console.log('  Password: Admin123@#');
      console.log('');
      console.log('Moderator:');
      console.log('  Email: moderator@iprofit.com');
      console.log('  Password: Mod123!@#');
      console.log('');
      console.log('Sample User:');
      console.log('  Any user email from the generated users');
      console.log('  Password: User123@#');
    }

    console.log('\n🚀 Ready to start! Run: npm run dev');
  }
}

// Main execution
async function main() {
  console.log('🌱 IProfit Database Seeder');
  console.log('===========================');

  const args = process.argv.slice(2);
  const options = {
    reset: args.includes('--reset'),
    production: args.includes('--production'),
    count: {
      users: 50,
      transactions: 200,
      loans: 25,
      tickets: 30,
    },
  };

  if (options.production) {
    console.log('⚠️  Production mode: Limited seeding');
    options.count = { users: 0, transactions: 0, loans: 0, tickets: 0 };
  }

  const seeder = new DatabaseSeeder(options);

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

module.exports = { DatabaseSeeder };