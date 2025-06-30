// scripts/debug-and-create-admin.js
// Run this with: node scripts/debug-and-create-admin.js

import { connectToDatabase } from '../lib/db.ts';
import { Admin } from '../models/Admin.ts';
import { hashPassword } from '../lib/encryption.ts';
import mongoose from 'mongoose';

async function debugAndCreateAdmin() {
  try {
    console.log('🔍 Starting admin debug process...');
    
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to database');

    // Check if admins collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const adminCollection = collections.find(c => c.name === 'admins');
    
    if (!adminCollection) {
      console.log('❌ Admins collection does not exist');
    } else {
      console.log('✅ Admins collection exists');
    }

    // Count all documents in admins collection
    const adminCount = await Admin.countDocuments();
    console.log(`📊 Total admin documents: ${adminCount}`);

    // List all admins
    const allAdmins = await Admin.find({}).select('email name role isActive');
    console.log('📋 All admins in database:');
    if (allAdmins.length === 0) {
      console.log('   No admins found');
    } else {
      allAdmins.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.name}, ${admin.role}, active: ${admin.isActive})`);
      });
    }

    // Check for specific email patterns
    const testEmails = ['admin@test.com', 'admin@example.com', 'super@admin.com'];
    for (const email of testEmails) {
      const admin = await Admin.findOne({ email: email.toLowerCase() });
      console.log(`🔍 Check ${email}: ${admin ? 'Found' : 'Not found'}`);
    }

    // Create initial admin if none exists
    if (adminCount === 0) {
      console.log('\n🚀 Creating initial admin...');
      
      const adminEmail = 'admin@test.com';
      const adminPassword = 'Admin123!';
      const hashedPassword = await hashPassword(adminPassword);

      const adminData = {
        email: adminEmail,
        name: 'Super Admin',
        role: 'SuperAdmin',
        passwordHash: hashedPassword,
        isActive: true,
        twoFactorEnabled: false,
        permissions: [
          'users.create',
          'users.read', 
          'users.update',
          'users.delete',
          'admins.create',
          'admins.read',
          'admins.update', 
          'admins.delete',
          'plans.view',
          'plans.create',
          'plans.update',
          'plans.delete',
          'system.settings',
          'audit.read'
        ]
      };

      const admin = new Admin(adminData);
      await admin.save();

      console.log('✅ Admin created successfully!');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
      console.log('⚠️  IMPORTANT: Change this password after first login!');

      // Verify the admin was created
      const createdAdmin = await Admin.findOne({ email: adminEmail.toLowerCase() });
      if (createdAdmin) {
        console.log('✅ Admin creation verified');
        console.log(`   ID: ${createdAdmin._id}`);
        console.log(`   Email: ${createdAdmin.email}`);
        console.log(`   Role: ${createdAdmin.role}`);
        console.log(`   Active: ${createdAdmin.isActive}`);
      } else {
        console.log('❌ Admin creation failed - could not find created admin');
      }
    } else {
      console.log('\n✅ Admin users already exist, skipping creation');
    }

    // Test the query that's failing in auth
    console.log('\n🧪 Testing auth query...');
    const testEmail = 'admin@test.com';
    const authQueryResult = await Admin.findOne({ 
      email: testEmail.toLowerCase(),
      isActive: true 
    });
    
    if (authQueryResult) {
      console.log('✅ Auth query successful');
      console.log(`   Found admin: ${authQueryResult.email}`);
      console.log(`   Password hash exists: ${!!authQueryResult.passwordHash}`);
      console.log(`   Password hash type: ${typeof authQueryResult.passwordHash}`);
    } else {
      console.log('❌ Auth query failed - no admin found with these criteria');
    }

  } catch (error) {
    console.error('❌ Error in debug process:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Alternative version using different connection method
async function debugWithDirectConnection() {
  try {
    console.log('\n🔍 Starting direct MongoDB connection debug...');
    
    // Direct connection to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Direct connection established');

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📂 All collections:');
    collections.forEach(col => console.log(`   - ${col.name}`));

    // Check admins collection specifically
    const adminDocs = await mongoose.connection.db.collection('admins').find({}).toArray();
    console.log(`📊 Documents in admins collection: ${adminDocs.length}`);
    
    if (adminDocs.length > 0) {
      console.log('📋 Raw admin documents:');
      adminDocs.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${JSON.stringify(doc, null, 2)}`);
      });
    }

  } catch (error) {
    console.error('❌ Direct connection error:', error);
  }
}

// Run both debug methods
debugAndCreateAdmin().then(() => {
  console.log('\n' + '='.repeat(50));
  return debugWithDirectConnection();
});