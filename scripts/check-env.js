#!/usr/bin/env node

/**
 * Environment Checker Script for IProfit Platform (CommonJS)
 * 
 * This script checks if environment variables are properly configured
 * 
 * Usage: npm run check-env
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

class EnvironmentChecker {
  constructor() {
    this.envPath = path.join(process.cwd(), '.env.local');
    this.requiredVars = [
      'MONGODB_URI',
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET',
      'ENCRYPTION_KEY',
      'JWT_SECRET',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASS'
    ];
  }

  async checkEnvironment() {
    console.log('🔍 IProfit Environment Checker');
    console.log('===============================');

    try {
      // Check if .env.local exists
      if (!fs.existsSync(this.envPath)) {
        throw new Error('.env.local file not found. Run: npm run check-env:create');
      }

      // Load environment variables
      const result = dotenv.config({ path: this.envPath });
      if (result.error) {
        throw new Error(`Failed to load .env.local: ${result.error.message}`);
      }

      console.log('✅ .env.local file found and loaded');

      // Check required variables
      this.checkRequiredVariables();

      // Validate variable formats
      this.validateVariableFormats();

      console.log('\n🎉 Environment configuration is valid!');
      console.log('\nYou can now run:');
      console.log('  npm run migrate-db');
      console.log('  npm run seed-data');
      console.log('  npm run dev');

    } catch (error) {
      console.error('\n❌ Environment check failed:', error.message);
      console.log('\n💡 To fix this issue:');
      console.log('  1. Run: npm run check-env:create');
      console.log('  2. Edit .env.local with your MongoDB URI and email settings');
      console.log('  3. Run: npm run check-env to validate');
      process.exit(1);
    }
  }

  checkRequiredVariables() {
    const missing = [];

    for (const varName of this.requiredVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    console.log(`✅ All ${this.requiredVars.length} required variables are set`);
  }

  validateVariableFormats() {
    const validations = [
      {
        name: 'MONGODB_URI',
        test: (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
        message: 'Must be a valid MongoDB connection string'
      },
      {
        name: 'NEXTAUTH_URL',
        test: (value) => /^https?:\/\/.+/.test(value),
        message: 'Must be a valid HTTP/HTTPS URL'
      },
      {
        name: 'NEXTAUTH_SECRET',
        test: (value) => value.length >= 32,
        message: 'Must be at least 32 characters long'
      },
      {
        name: 'ENCRYPTION_KEY',
        test: (value) => value.length >= 32,
        message: 'Must be at least 32 characters long'
      },
      {
        name: 'JWT_SECRET',
        test: (value) => value.length >= 32,
        message: 'Must be at least 32 characters long'
      },
      {
        name: 'SMTP_USER',
        test: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: 'Must be a valid email address'
      }
    ];

    const errors = [];

    for (const validation of validations) {
      const value = process.env[validation.name];
      if (value && !validation.test(value)) {
        errors.push(`${validation.name}: ${validation.message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Invalid environment variables:\n${errors.join('\n')}`);
    }

    console.log('✅ All environment variables have valid formats');
  }

  createSampleEnv() {
    console.log('📝 Creating sample .env.local file...');

    const sampleContent = `# =============================================================================
# IPROFIT PLATFORM - ENVIRONMENT CONFIGURATION
# =============================================================================
# Fill in the required values below

# Core Application (REQUIRED)
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change-this-to-a-secure-random-string-at-least-32-characters-long
APP_NAME="IProfit Platform"

# Database (REQUIRED - UPDATE THIS)
MONGODB_URI=mongodb://localhost:27017/iprofit
# For MongoDB Atlas use: mongodb+srv://username:password@cluster.mongodb.net/iprofit
MONGODB_DB_NAME=iprofit

# Security (REQUIRED - GENERATE SECURE KEYS)
ENCRYPTION_KEY=change-this-to-a-secure-random-32-byte-key-64-hex-chars
JWT_SECRET=change-this-to-a-secure-random-jwt-secret-key-32-chars

# Email (REQUIRED - UPDATE THESE)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM_NAME="IProfit Platform"

# Company Information
SUPPORT_EMAIL=support@iprofit.com
COMPANY_NAME="IProfit Solutions Inc."

# Feature Flags
ENABLE_2FA=true
ENABLE_DEVICE_LIMITING=true
ENABLE_EMAIL_VERIFICATION=true
ENABLE_LOAN_FEATURE=true
ENABLE_REFERRAL_SYSTEM=true
`;

    fs.writeFileSync(this.envPath, sampleContent);
    console.log(`✅ Sample .env.local created at: ${this.envPath}`);
    console.log('\n📝 Next steps:');
    console.log('1. Edit .env.local and update MONGODB_URI with your database connection');
    console.log('2. Update SMTP_USER and SMTP_PASS with your email credentials');
    console.log('3. Generate secure keys or replace the placeholder keys');
    console.log('4. Run: npm run check-env to validate your configuration');
    console.log('5. Run: npm run migrate-db to set up your database');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const createSample = args.includes('--create-sample') || args.includes('--create');

  const checker = new EnvironmentChecker();

  try {
    if (createSample) {
      checker.createSampleEnv();
    } else {
      await checker.checkEnvironment();
    }
  } catch (error) {
    // Error already logged in checkEnvironment
    if (!createSample) {
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EnvironmentChecker };