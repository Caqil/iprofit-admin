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
      'users', 'admins', 'plans', 'transactions', 
      'loans', 'referrals', 'support_tickets'
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
        password: 'Admin123',
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
          'dashboard.view'
        ],
      },
    ];

    if (this.options.production) {
      // In production, only create admin if it doesn't exist
      const existingAdmin = await db.collection('admins').findOne({ email: 'admin@iprofit.com' });
      if (!existingAdmin) {
        const hashedPassword = this.hashPasswordSync(adminData[0].password);
        const admin = {
          ...adminData[0],
          passwordHash: hashedPassword,
          isActive: true,
          loginAttempts: 0,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        delete admin.password;
        
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
        const hashedPassword = this.hashPasswordSync(data.password);
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

  // Simple password hashing (for development only)
  hashPasswordSync(password) {
    return crypto.createHash('sha256').update(password + 'salt').digest('hex');
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
        minimumWithdrawal: 100,
        dailyWithdrawalLimit: 1000,
        monthlyWithdrawalLimit: 10000,
        features: [
          'Basic customer support',
          'Mobile app access',
          'Transaction history',
          'Email notifications'
        ],
        color: '#6b7280',
        priority: 0,
        isActive: true,
      },
      {
        name: 'Silver',
        description: 'Intermediate plan with enhanced limits and features for growing portfolios.',
        price: 1000,
        currency: 'BDT',
        depositLimit: 50000,
        withdrawalLimit: 25000,
        profitLimit: 5000,
        minimumDeposit: 500,
        minimumWithdrawal: 100,
        dailyWithdrawalLimit: 5000,
        monthlyWithdrawalLimit: 50000,
        features: [
          'Priority customer support',
          'Advanced analytics',
          'Higher transaction limits',
          'SMS notifications',
          'Referral bonuses'
        ],
        color: '#9ca3af',
        priority: 1,
        isActive: true,
      },
      {
        name: 'Gold',
        description: 'Premium plan with maximum benefits and exclusive features for serious investors.',
        price: 5000,
        currency: 'BDT',
        depositLimit: 200000,
        withdrawalLimit: 100000,
        profitLimit: 20000,
        minimumDeposit: 1000,
        minimumWithdrawal: 100,
        dailyWithdrawalLimit: 20000,
        monthlyWithdrawalLimit: 200000,
        features: [
          'VIP customer support',
          'Dedicated account manager',
          'Maximum transaction limits',
          'Real-time notifications',
          'Premium referral bonuses',
          'Exclusive investment opportunities',
          'Advanced portfolio tools'
        ],
        color: '#f59e0b',
        priority: 2,
        isActive: true,
      },
      {
        name: 'Platinum',
        description: 'Ultra-premium plan for institutional and high-net-worth investors.',
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

    const db = mongoose.connection.db;

    // Get available plans
    const plans = await db.collection('plans').find({ isActive: true }).toArray();
    if (plans.length === 0) {
      throw new Error('No plans available for user creation');
    }

    const userCount = this.options.production ? 1 : this.options.count.users;
    const sampleUsers = this.generateSampleUsers(userCount, plans);

    let referrerUser = null;

    for (let i = 0; i < sampleUsers.length; i++) {
      const userData = sampleUsers[i];
      
      const existing = await db.collection('users').findOne({ email: userData.email });
      if (!existing) {
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
      'Rahman', 'Ahmed', 'Khan', 'Islam', 'Hasan', 'Ali', 'Begum', 'Khatun',
      'Sheikh', 'Chowdhury', 'Ullah', 'Uddin', 'Hussain', 'Karim', 'Malik'
    ];

    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const cities = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal'];
    const statuses = ['Active', 'Active', 'Active', 'Suspended']; // Mostly active
    const kycStatuses = ['Approved', 'Approved', 'Pending', 'Rejected'];

    const users = [];

    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domains[Math.floor(Math.random() * domains.length)]}`;
      const plan = plans[Math.floor(Math.random() * plans.length)];
      
      users.push({
        name: `${firstName} ${lastName}`,
        email,
        phone: `+8801${Math.floor(Math.random() * 900000000 + 100000000)}`,
        planId: plan._id,
        balance: Math.floor(Math.random() * 10000),
        kycStatus: kycStatuses[Math.floor(Math.random() * kycStatuses.length)],
        kycDocuments: [],
        referralCode: this.generateReferralCode(),
        deviceId: `device_${Date.now()}_${i}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        emailVerified: Math.random() > 0.2,
        phoneVerified: Math.random() > 0.3,
        loginAttempts: 0,
        twoFactorEnabled: false,
        address: {
          street: `House ${Math.floor(Math.random() * 100)}, Road ${Math.floor(Math.random() * 20)}`,
          city: cities[Math.floor(Math.random() * cities.length)],
          state: 'Bangladesh',
          country: 'BD',
          zipCode: String(Math.floor(Math.random() * 9000 + 1000)),
        },
        dateOfBirth: new Date(1980 + Math.floor(Math.random() * 25), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      });
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
    console.log('💰 Seeding transactions...');

    if (this.createdData.users.length === 0) {
      console.log('ℹ️  No users available, skipping transactions');
      return;
    }

    const db = mongoose.connection.db;
    const transactionCount = this.options.production ? 0 : this.options.count.transactions;
    const transactionTypes = ['deposit', 'withdrawal', 'bonus', 'profit'];
    const currencies = ['BDT', 'USD'];
    const gateways = ['CoinGate', 'UddoktaPay', 'Manual', 'System'];
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      transactions.push(transaction);

      if (transactions.length >= 100) {
        await db.collection('transactions').insertMany(transactions);
        transactions.length = 0; // Clear array
        console.log(`✅ Created ${i + 1} transactions`);
      }
    }

    if (transactions.length > 0) {
      await db.collection('transactions').insertMany(transactions);
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
    const loanStatuses = ['Pending', 'Approved', 'Active', 'Completed', 'Rejected'];
    const purposes = [
      'Business expansion',
      'Education loan',
      'Medical emergency',
      'Home renovation',
      'Investment capital',
      'Debt consolidation'
    ];

    const loans = [];

    for (let i = 0; i < loanCount; i++) {
      const user = this.createdData.users[Math.floor(Math.random() * this.createdData.users.length)];
      const amount = Math.floor(Math.random() * 50000 + 5000);
      const tenure = [6, 12, 18, 24, 36, 48][Math.floor(Math.random() * 6)];
      const interestRate = 8 + Math.random() * 7; // 8-15%
      const emiAmount = this.calculateEMI(amount, interestRate, tenure);
      
      const loan = {
        userId: user._id,
        amount,
        currency: 'BDT',
        interestRate: Number(interestRate.toFixed(2)),
        tenure,
        emiAmount: Number(emiAmount.toFixed(2)),
        creditScore: Math.floor(Math.random() * 200 + 600), // 600-800
        status: loanStatuses[Math.floor(Math.random() * loanStatuses.length)],
        purpose: purposes[Math.floor(Math.random() * purposes.length)],
        monthlyIncome: Math.floor(Math.random() * 50000 + 20000),
        employmentStatus: Math.random() > 0.5 ? 'Employed' : 'Self-employed',
        documents: [],
        repaymentSchedule: [],
        totalPaid: 0,
        remainingAmount: amount,
        overdueAmount: 0,
        penaltyAmount: 0,
        metadata: {
          applicationSource: 'web',
          riskAssessment: {
            score: Math.floor(Math.random() * 100),
            recommendation: Math.random() > 0.7 ? 'Approve' : 'Review',
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      loans.push(loan);

      if (loans.length >= 50) {
        await db.collection('loans').insertMany(loans);
        loans.length = 0;
        console.log(`✅ Created ${i + 1} loans`);
      }
    }

    if (loans.length > 0) {
      await db.collection('loans').insertMany(loans);
    }

    console.log(`✅ ${loanCount} loan applications created`);
  }

  calculateEMI(principal, rate, tenure) {
    const monthlyRate = rate / (12 * 100);
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / 
                (Math.pow(1 + monthlyRate, tenure) - 1);
    return emi;
  }

  async seedReferrals() {
    console.log('🔗 Seeding referral data...');

    const db = mongoose.connection.db;
    const usersWithReferrers = this.createdData.users.filter(user => user.referredBy);
    
    const referrals = [];

    for (const user of usersWithReferrers) {
      const bonusAmount = Math.floor(Math.random() * 500 + 100);
      
      const referral = {
        referrerId: user.referredBy,
        refereeId: user._id,
        bonusAmount,
        profitBonus: 0,
        status: Math.random() > 0.3 ? 'Paid' : 'Pending',
        bonusType: 'signup',
        metadata: {
          refereeFirstDeposit: Math.floor(Math.random() * 2000 + 500),
          refereeFirstDepositDate: new Date(),
        },
        paidAt: Math.random() > 0.3 ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      referrals.push(referral);
    }

    if (referrals.length > 0) {
      await db.collection('referrals').insertMany(referrals);
    }

    console.log(`✅ ${referrals.length} referral records created`);
  }

  async seedSupportTickets() {
    console.log('🎫 Seeding support tickets...');

    if (this.createdData.users.length === 0) {
      console.log('ℹ️  No users available, skipping support tickets');
      return;
    }

    const db = mongoose.connection.db;
    const ticketCount = this.options.production ? 0 : this.options.count.tickets;
    const categories = ['Technical', 'Account', 'Payment', 'General', 'Complaint'];
    const priorities = ['Low', 'Medium', 'High', 'Urgent'];
    const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
    
    const subjects = [
      'Unable to login to account',
      'Transaction not reflected',
      'KYC verification issue',
      'Withdrawal request stuck',
      'Password reset not working',
      'App crashing frequently',
      'Referral bonus missing',
      'Account balance discrepancy'
    ];

    const tickets = [];

    for (let i = 0; i < ticketCount; i++) {
      const user = this.createdData.users[Math.floor(Math.random() * this.createdData.users.length)];
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      
      const ticket = {
        userId: user._id,
        ticketNumber: `TKT-${Date.now()}-${i.toString().padStart(4, '0')}`,
        subject,
        message: `This is a sample support ticket message for: ${subject}. Please help me resolve this issue.`,
        category: categories[Math.floor(Math.random() * categories.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        attachments: [],
        responses: [],
        tags: [],
        lastResponseAt: new Date(),
        metadata: {
          source: 'web',
          ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      tickets.push(ticket);
    }

    if (tickets.length > 0) {
      await db.collection('support_tickets').insertMany(tickets);
    }

    console.log(`✅ ${ticketCount} support tickets created`);
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
    };

    Object.entries(counts).forEach(([key, count]) => {
      console.log(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${count}`);
    });

    if (!this.options.production) {
      console.log('\n🔐 Default Admin Credentials (Development):');
      console.log('Email: admin@iprofit.com');
      console.log('Password: Admin123!@#');
      console.log('\nModerator Credentials:');
      console.log('Email: moderator@iprofit.com');
      console.log('Password: Mod123!@#');
    }
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