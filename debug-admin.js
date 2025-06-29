// detailed-debug-admin.js - Better debugging
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const util = require('util');

dotenv.config({ path: '.env.local' });

async function detailedDebugAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the admin
    const admin = await mongoose.connection.db.collection('admins').findOne({ 
      email: 'admin@iprofit.com' 
    });
    
    if (!admin) {
      console.log('❌ No admin found!');
      return;
    }

    console.log('\n📊 Detailed Admin Analysis:');
    console.log('============================');
    
    console.log('Full admin object:');
    console.log(util.inspect(admin, { depth: null, colors: true }));
    
    console.log('\n🔍 PasswordHash Analysis:');
    console.log('=========================');
    console.log('PasswordHash value:', admin.passwordHash);
    console.log('PasswordHash type:', typeof admin.passwordHash);
    console.log('PasswordHash constructor:', admin.passwordHash?.constructor?.name);
    console.log('Is Array:', Array.isArray(admin.passwordHash));
    console.log('Is Buffer:', Buffer.isBuffer(admin.passwordHash));
    
    // Check if it's a MongoDB Binary type
    if (admin.passwordHash && admin.passwordHash.constructor) {
      console.log('Constructor name:', admin.passwordHash.constructor.name);
    }
    
    // Try to convert to string if it's an object
    if (admin.passwordHash && typeof admin.passwordHash === 'object') {
      console.log('\n🔄 Conversion Attempts:');
      console.log('======================');
      
      try {
        console.log('toString():', admin.passwordHash.toString());
      } catch (e) {
        console.log('toString() failed:', e.message);
      }
      
      try {
        console.log('JSON.stringify():', JSON.stringify(admin.passwordHash));
      } catch (e) {
        console.log('JSON.stringify() failed:', e.message);
      }
      
      // If it's a Buffer
      if (Buffer.isBuffer(admin.passwordHash)) {
        console.log('Buffer to string (utf8):', admin.passwordHash.toString('utf8'));
        console.log('Buffer to string (hex):', admin.passwordHash.toString('hex'));
      }
      
      // If it has a buffer property (MongoDB Binary)
      if (admin.passwordHash.buffer) {
        console.log('Has buffer property:', admin.passwordHash.buffer);
        try {
          console.log('Buffer to string:', admin.passwordHash.buffer.toString('utf8'));
        } catch (e) {
          console.log('Buffer conversion failed:', e.message);
        }
      }
    }

    // Check what happens when we query with Mongoose model
    console.log('\n🔍 Mongoose Model Query:');
    console.log('========================');
    
    try {
      // Define a simple schema to test
      const AdminSchema = new mongoose.Schema({
        email: String,
        passwordHash: String,  // This should be a string
        name: String,
        role: String,
        isActive: Boolean
      });
      
      const AdminModel = mongoose.model('Admin', AdminSchema);
      const mongooseAdmin = await AdminModel.findOne({ email: 'admin@iprofit.com' });
      
      if (mongooseAdmin) {
        console.log('Mongoose query result:');
        console.log('PasswordHash:', mongooseAdmin.passwordHash);
        console.log('PasswordHash type:', typeof mongooseAdmin.passwordHash);
        
        if (mongooseAdmin.passwordHash && typeof mongooseAdmin.passwordHash === 'string') {
          console.log('✅ Mongoose returns string - this is good!');
          console.log('Length:', mongooseAdmin.passwordHash.length);
          console.log('Starts with:', mongooseAdmin.passwordHash.substring(0, 10));
        }
      }
    } catch (modelError) {
      console.log('Mongoose model test failed:', modelError.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

detailedDebugAdmin();