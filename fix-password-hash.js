// fix-password-hash.js - Fix the object issue
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function fixPasswordHashIssue() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // First, let's see what we're dealing with
    const admin = await mongoose.connection.db.collection('admins').findOne({ 
      email: 'admin@iprofit.com' 
    });
    
    if (!admin) {
      console.log('❌ No admin found!');
      return;
    }

    console.log('Current passwordHash type:', typeof admin.passwordHash);
    console.log('Current passwordHash value:', admin.passwordHash);
    
    // Generate a proper bcrypt hash
    const plainPassword = 'Admin123@#';
    const properHash = await bcrypt.hash(plainPassword, 12);
    
    console.log('\nGenerating new proper hash...');
    console.log('New hash type:', typeof properHash);
    console.log('New hash length:', properHash.length);
    console.log('New hash starts with:', properHash.substring(0, 10));
    
    // Update the admin with the proper string hash
    const updateResult = await mongoose.connection.db.collection('admins').updateOne(
      { email: 'admin@iprofit.com' },
      { 
        $set: { 
          passwordHash: properHash,  // This will be a string
          updatedAt: new Date()
        }
      }
    );
    
    console.log('\nUpdate result:', updateResult.modifiedCount, 'documents modified');
    
    // Verify the fix
    const updatedAdmin = await mongoose.connection.db.collection('admins').findOne({ 
      email: 'admin@iprofit.com' 
    });
    
    console.log('\n✅ Verification:');
    console.log('PasswordHash type:', typeof updatedAdmin.passwordHash);
    console.log('PasswordHash is string:', typeof updatedAdmin.passwordHash === 'string');
    console.log('PasswordHash length:', updatedAdmin.passwordHash?.length);
    
    if (typeof updatedAdmin.passwordHash === 'string') {
      console.log('PasswordHash starts with:', updatedAdmin.passwordHash.substring(0, 10));
      console.log('✅ Hash is now a proper string!');
      
      // Test the hash
      const testResult = await bcrypt.compare(plainPassword, updatedAdmin.passwordHash);
      console.log('Password verification test:', testResult ? '✅ PASS' : '❌ FAIL');
    }
    
    console.log('\n🎉 You can now login with:');
    console.log('Email: admin@iprofit.com');
    console.log('Password:', plainPassword);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixPasswordHashIssue();