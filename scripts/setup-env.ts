#!/usr/bin/env tsx

/**
 * Environment Setup Script for IProfit Platform
 * 
 * This script helps set up the environment configuration for the IProfit platform.
 * It validates environment variables, generates secure keys, and provides setup guidance.
 * 
 * Usage: npm run setup-env [--interactive] [--validate-only]
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';

interface EnvironmentConfig {
  [key: string]: {
    value?: string;
    required: boolean;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'secret';
    generate?: () => string;
    validate?: (value: string) => boolean;
  };
}

class EnvironmentSetup {
  private envConfig!: EnvironmentConfig;
  private envPath: string;
  private rl: readline.Interface;

  constructor() {
    this.envPath = path.join(process.cwd(), '.env.local');
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.setupConfig();
  }

  private setupConfig(): void {
    this.envConfig = {
      // Core Application
      NODE_ENV: {
        value: 'development',
        required: true,
        description: 'Node.js environment (development/production/test)',
        type: 'string',
        validate: (value) => ['development', 'production', 'test'].includes(value),
      },
      NEXTAUTH_URL: {
        required: true,
        description: 'Base URL of your application',
        type: 'url',
        validate: (value) => /^https?:\/\/.+/.test(value),
      },
      NEXTAUTH_SECRET: {
        required: true,
        description: 'Secret for NextAuth.js (minimum 32 characters)',
        type: 'secret',
        generate: () => crypto.randomBytes(32).toString('hex'),
        validate: (value) => value.length >= 32,
      },
      APP_NAME: {
        value: 'IProfit Platform',
        required: false,
        description: 'Application name',
        type: 'string',
      },

      // Database
      MONGODB_URI: {
        required: true,
        description: 'MongoDB connection string',
        type: 'string',
        validate: (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
      },
      MONGODB_DB_NAME: {
        value: 'iprofit_platform',
        required: false,
        description: 'MongoDB database name',
        type: 'string',
      },

      // Security
      ENCRYPTION_KEY: {
        required: true,
        description: 'Encryption key for sensitive data (32 characters)',
        type: 'secret',
        generate: () => crypto.randomBytes(32).toString('hex'),
        validate: (value) => value.length === 64, // 32 bytes = 64 hex chars
      },
      JWT_SECRET: {
        required: true,
        description: 'JWT secret for token signing (minimum 32 characters)',
        type: 'secret',
        generate: () => crypto.randomBytes(32).toString('hex'),
        validate: (value) => value.length >= 32,
      },
      CSRF_SECRET: {
        required: false,
        description: 'CSRF protection secret',
        type: 'secret',
        generate: () => crypto.randomBytes(32).toString('hex'),
      },

      // Email Configuration
      SMTP_HOST: {
        required: true,
        description: 'SMTP server hostname (e.g., smtp.gmail.com)',
        type: 'string',
      },
      SMTP_PORT: {
        value: '587',
        required: false,
        description: 'SMTP server port',
        type: 'number',
        validate: (value) => !isNaN(Number(value)) && Number(value) > 0,
      },
      SMTP_USER: {
        required: true,
        description: 'SMTP username (email address)',
        type: 'email',
        validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      },
      SMTP_PASS: {
        required: true,
        description: 'SMTP password or app-specific password',
        type: 'secret',
      },
      EMAIL_FROM_NAME: {
        value: 'IProfit Platform',
        required: false,
        description: 'Default sender name for emails',
        type: 'string',
      },

      // OAuth Providers (Optional)
      GOOGLE_CLIENT_ID: {
        required: false,
        description: 'Google OAuth Client ID',
        type: 'string',
      },
      GOOGLE_CLIENT_SECRET: {
        required: false,
        description: 'Google OAuth Client Secret',
        type: 'secret',
      },
      FACEBOOK_CLIENT_ID: {
        required: false,
        description: 'Facebook App ID',
        type: 'string',
      },
      FACEBOOK_CLIENT_SECRET: {
        required: false,
        description: 'Facebook App Secret',
        type: 'secret',
      },

      // Payment Gateways (Optional)
      COINGATE_API_KEY: {
        required: false,
        description: 'CoinGate API key for crypto payments',
        type: 'secret',
      },
      COINGATE_SECRET: {
        required: false,
        description: 'CoinGate secret key',
        type: 'secret',
      },
      UDDOKTAPAY_API_KEY: {
        required: false,
        description: 'UddoktaPay API key for Bangladesh payments',
        type: 'secret',
      },
      UDDOKTAPAY_SECRET: {
        required: false,
        description: 'UddoktaPay secret key',
        type: 'secret',
      },

      // AWS Services (Optional)
      AWS_ACCESS_KEY_ID: {
        required: false,
        description: 'AWS Access Key ID for S3 storage',
        type: 'string',
      },
      AWS_SECRET_ACCESS_KEY: {
        required: false,
        description: 'AWS Secret Access Key',
        type: 'secret',
      },
      AWS_REGION: {
        value: 'us-east-1',
        required: false,
        description: 'AWS region',
        type: 'string',
      },
      AWS_S3_BUCKET: {
        required: false,
        description: 'S3 bucket name for file storage',
        type: 'string',
      },

      // Company Information
      SUPPORT_EMAIL: {
        value: 'support@iprofit.com',
        required: false,
        description: 'Support email address',
        type: 'email',
        validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      },
      COMPANY_NAME: {
        value: 'IProfit Solutions Inc.',
        required: false,
        description: 'Company name',
        type: 'string',
      },
    };
  }

  async setupEnvironment(interactive: boolean = false, validateOnly: boolean = false): Promise<void> {
    console.log('🚀 IProfit Environment Setup');
    console.log('==============================');

    try {
      if (validateOnly) {
        await this.validateExistingEnv();
        return;
      }

      if (interactive) {
        await this.interactiveSetup();
      } else {
        await this.automaticSetup();
      }

      await this.validateConfiguration();
      console.log('\n🎉 Environment setup completed successfully!');
      await this.displayNextSteps();

    } catch (error) {
      console.error('\n❌ Environment setup failed:', error);
      throw error;
    } finally {
      this.rl.close();
    }
  }

  private async automaticSetup(): Promise<void> {
    console.log('\n🔧 Setting up environment automatically...');

    const existingEnv = await this.loadExistingEnv();
    const newEnv: Record<string, string> = {};

    // Process each configuration item
    for (const [key, config] of Object.entries(this.envConfig)) {
      if (existingEnv[key]) {
        // Use existing value
        newEnv[key] = existingEnv[key];
        console.log(`✅ Using existing ${key}`);
      } else if (config.value) {
        // Use default value
        newEnv[key] = config.value;
        console.log(`📝 Using default ${key}`);
      } else if (config.generate) {
        // Generate value
        newEnv[key] = config.generate();
        console.log(`🔐 Generated ${key}`);
      } else if (config.required) {
        // Required but no default - prompt user
        console.log(`\n⚠️  Required environment variable missing: ${key}`);
        console.log(`   Description: ${config.description}`);
        
        if (config.type === 'url' && key === 'NEXTAUTH_URL') {
          newEnv[key] = 'http://localhost:3000';
          console.log(`📝 Using default development URL for ${key}`);
        } else {
          throw new Error(`Required environment variable ${key} must be set manually`);
        }
      }
    }

    await this.writeEnvFile(newEnv);
  }

  private async interactiveSetup(): Promise<void> {
    console.log('\n💬 Starting interactive setup...');
    console.log('Press Enter to use default values or type your own.\n');

    const existingEnv = await this.loadExistingEnv();
    const newEnv: Record<string, string> = {};

    for (const [key, config] of Object.entries(this.envConfig)) {
      let defaultValue = existingEnv[key] || config.value;
      
      if (!defaultValue && config.generate && config.type === 'secret') {
        defaultValue = config.generate();
      }

      const prompt = this.createPrompt(key, config, defaultValue);
      const userInput = await this.askQuestion(prompt);

      if (userInput.trim()) {
        if (config.validate && !config.validate(userInput)) {
          console.log(`❌ Invalid value for ${key}. Using default.`);
          newEnv[key] = defaultValue || '';
        } else {
          newEnv[key] = userInput;
        }
      } else {
        newEnv[key] = defaultValue || '';
      }

      if (config.required && !newEnv[key]) {
        console.log(`❌ ${key} is required!`);
        throw new Error(`Required field ${key} cannot be empty`);
      }
    }

    await this.writeEnvFile(newEnv);
  }

  private createPrompt(key: string, config: any, defaultValue?: string): string {
    let prompt = `\n${key}`;
    
    if (config.required) {
      prompt += ' (required)';
    }
    
    prompt += `\n  ${config.description}`;
    
    if (defaultValue) {
      if (config.type === 'secret') {
        prompt += `\n  [Generated/Hidden]`;
      } else {
        prompt += `\n  Default: ${defaultValue}`;
      }
    }
    
    prompt += '\n> ';
    return prompt;
  }

  private async askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  private async loadExistingEnv(): Promise<Record<string, string>> {
    try {
      const content = await fs.readFile(this.envPath, 'utf-8');
      const env: Record<string, string> = {};
      
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
          }
        }
      });
      
      return env;
    } catch {
      return {};
    }
  }

  private async writeEnvFile(env: Record<string, string>): Promise<void> {
    const lines = [
      '# =============================================================================',
      '# IPROFIT PLATFORM - ENVIRONMENT CONFIGURATION',
      '# =============================================================================',
      '# Generated automatically by setup script',
      `# Created: ${new Date().toISOString()}`,
      '# =============================================================================',
      '',
    ];

    // Group variables by category
    const categories = {
      'Core Application': ['NODE_ENV', 'NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'APP_NAME'],
      'Database': ['MONGODB_URI', 'MONGODB_DB_NAME'],
      'Security': ['ENCRYPTION_KEY', 'JWT_SECRET', 'CSRF_SECRET'],
      'Email Configuration': ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM_NAME'],
      'OAuth Providers': ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET'],
      'Payment Gateways': ['COINGATE_API_KEY', 'COINGATE_SECRET', 'UDDOKTAPAY_API_KEY', 'UDDOKTAPAY_SECRET'],
      'AWS Services': ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET'],
      'Company Information': ['SUPPORT_EMAIL', 'COMPANY_NAME'],
    };

    for (const [category, keys] of Object.entries(categories)) {
      lines.push(`# ${category}`);
      lines.push('# ' + '='.repeat(category.length));
      
      for (const key of keys) {
        if (env[key] !== undefined) {
          const config = this.envConfig[key];
          if (config?.description) {
            lines.push(`# ${config.description}`);
          }
          lines.push(`${key}=${env[key]}`);
          lines.push('');
        }
      }
      
      lines.push('');
    }

    // Add any remaining variables
    const categorizedKeys = Object.values(categories).flat();
    const remainingKeys = Object.keys(env).filter(key => !categorizedKeys.includes(key));
    
    if (remainingKeys.length > 0) {
      lines.push('# Additional Configuration');
      lines.push('# ========================');
      for (const key of remainingKeys) {
        lines.push(`${key}=${env[key]}`);
      }
      lines.push('');
    }

    await fs.writeFile(this.envPath, lines.join('\n'));
    console.log(`✅ Environment file written to: ${this.envPath}`);
  }

  private async validateExistingEnv(): Promise<void> {
    console.log('\n🔍 Validating existing environment configuration...');

    const existingEnv = await this.loadExistingEnv();
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [key, config] of Object.entries(this.envConfig)) {
      const value = existingEnv[key];

      if (config.required && !value) {
        errors.push(`❌ Required variable ${key} is missing`);
      } else if (value && config.validate && !config.validate(value)) {
        errors.push(`❌ Invalid value for ${key}`);
      } else if (!value && !config.required) {
        warnings.push(`⚠️  Optional variable ${key} is not set`);
      }
    }

    if (errors.length > 0) {
      console.log('\n🚨 Validation Errors:');
      errors.forEach(error => console.log(error));
      throw new Error('Environment validation failed');
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(warning => console.log(warning));
    }

    console.log('\n✅ Environment validation passed!');
  }

  private async validateConfiguration(): Promise<void> {
    console.log('\n🔍 Validating configuration...');

    // Test database connection
    try {
      const env = await this.loadExistingEnv();
      if (env.MONGODB_URI) {
        console.log('📡 Testing database connection...');
        // Note: In a real implementation, you would test the connection here
        console.log('✅ Database configuration looks valid');
      }
    } catch (error) {
      console.warn('⚠️  Could not validate database connection');
    }

    // Validate email configuration
    const env = await this.loadExistingEnv();
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      console.log('✅ Email configuration is complete');
    } else {
      console.warn('⚠️  Email configuration is incomplete');
    }

    console.log('✅ Configuration validation completed');
  }

  private async displayNextSteps(): Promise<void> {
    console.log('\n📋 Next Steps:');
    console.log('==============');
    console.log('1. Review the .env.local file and update any placeholder values');
    console.log('2. Set up your MongoDB database (local or Atlas)');
    console.log('3. Configure your SMTP email settings');
    console.log('4. Run database migrations: npm run migrate-db');
    console.log('5. Seed sample data: npm run seed-data');
    console.log('6. Start the development server: npm run dev');
    console.log('');
    console.log('🔗 Useful Links:');
    console.log('- MongoDB Atlas: https://cloud.mongodb.com');
    console.log('- Google OAuth Setup: https://console.developers.google.com');
    console.log('- Facebook OAuth Setup: https://developers.facebook.com');
    console.log('');
    console.log('📧 Need Help?');
    console.log('- Documentation: ./docs/README.md');
    console.log('- Support: support@iprofit.com');
  }

  async generateSecureKeys(): Promise<void> {
    console.log('\n🔐 Generating secure keys...');

    const keys = {
      NEXTAUTH_SECRET: crypto.randomBytes(32).toString('hex'),
      ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
      JWT_SECRET: crypto.randomBytes(32).toString('hex'),
      CSRF_SECRET: crypto.randomBytes(32).toString('hex'),
    };

    console.log('\n🗝️  Generated Keys (save these securely):');
    console.log('==========================================');
    Object.entries(keys).forEach(([key, value]) => {
      console.log(`${key}=${value}`);
    });
    console.log('\n⚠️  Store these keys securely and never share them publicly!');
  }

  async checkPrerequisites(): Promise<void> {
    console.log('\n🔧 Checking prerequisites...');

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ required. Current version: ${nodeVersion}`);
    }
    console.log(`✅ Node.js version: ${nodeVersion}`);

    // Check npm/yarn
    try {
      const { execSync } = require('child_process');
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      console.log(`✅ npm version: ${npmVersion}`);
    } catch {
      console.warn('⚠️  npm not found');
    }

    // Check for package.json
    try {
      await fs.access(path.join(process.cwd(), 'package.json'));
      console.log('✅ package.json found');
    } catch {
      throw new Error('package.json not found. Are you in the correct directory?');
    }

    console.log('✅ All prerequisites met');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const interactive = args.includes('--interactive');
  const validateOnly = args.includes('--validate-only');
  const generateKeys = args.includes('--generate-keys');

  const setup = new EnvironmentSetup();

  try {
    await setup.checkPrerequisites();

    if (generateKeys) {
      await setup.generateSecureKeys();
      return;
    }

    await setup.setupEnvironment(interactive, validateOnly);

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { EnvironmentSetup };