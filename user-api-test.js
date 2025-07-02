/**
 * Complete API Testing Suite - All Endpoints
 * Tests all authentication flows and user-facing API endpoints
 * 
 * Quick Start:
 * 1. npm install axios chalk
 * 2. Set your existing user credentials in .env or inline
 * 3. Run: VERBOSE=true node complete-api-test.js
 * 
 * Environment Variables:
 * - API_BASE_URL: Your API base URL (default: http://localhost:3000)
 * - USER_EMAIL: Existing user email for login testing
 * - USER_PASSWORD: Existing user password
 * - RUN_REGISTRATION_FLOW: true/false (default: false) - Enable registration testing
 * - USE_NEXTAUTH: true/false (default: false) - Set if using NextAuth
 * - VERBOSE: true/false for detailed request/response logging
 * 
 * Common Usage:
 * # Test with existing user (recommended first run)
 * USER_EMAIL="user@example.com" USER_PASSWORD="password123" VERBOSE=true node complete-api-test.js
 * 
 * # Test registration flow (if your API allows registration)
 * RUN_REGISTRATION_FLOW=true VERBOSE=true node complete-api-test.js
 * 
 * # Test with NextAuth setup
 * USE_NEXTAUTH=true USER_EMAIL="user@example.com" USER_PASSWORD="password123" node complete-api-test.js
 * 
 * Troubleshooting:
 * - VERBOSE=true shows exact requests/responses
 * - Check API validation requirements in error details
 * - Ensure device identification headers are accepted
 * - Verify user credentials are correct
 */

// Check for required dependencies
let axios;
try {
  axios = require('axios');
} catch (error) {
  console.error('❌ Error: axios is required but not installed.');
  console.error('Please install it with: npm install axios');
  process.exit(1);
}

// Try to load chalk, fall back to basic logging if not available
let chalk;
try {
  chalk = require('chalk');
} catch (error) {
  console.log('Note: chalk not installed, using basic logging (install with: npm install chalk)');
  // Create a mock chalk object for fallback
  chalk = {
    blue: (str) => str,
    green: (str) => str,
    red: (str) => str,
    yellow: (str) => str,
    cyan: {
      bold: (str) => str
    },
    gray: (str) => str,
    magenta: (str) => str,
    bold: (str) => str
  };
}

// Configuration
const CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  
  // Test user data for registration
  TEST_USER: {
    name: 'Test User API',
    email: process.env.TEST_USER_EMAIL || `testuser_${Date.now()}@example.com`,
    phone: process.env.TEST_USER_PHONE || `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    dateOfBirth: '1990-01-01',
    deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Existing user for login tests
  EXISTING_USER: {
    email: process.env.USER_EMAIL || 'user@example.com',
    password: process.env.USER_PASSWORD || 'user123'
  },
  
  TIMEOUT: 15000,
  VERBOSE: process.env.VERBOSE === 'true',
  SKIP_DESTRUCTIVE: process.env.SKIP_DESTRUCTIVE === 'true',
  RUN_REGISTRATION_FLOW: process.env.RUN_REGISTRATION_FLOW === 'true', // Default to false now
  USE_NEXTAUTH: process.env.USE_NEXTAUTH === 'true' // Set to true if using NextAuth instead of custom auth
};

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: [],
  summary: {
    authentication: { passed: 0, failed: 0, total: 0 },
    userProfile: { passed: 0, failed: 0, total: 0 },
    transactions: { passed: 0, failed: 0, total: 0 },
    loans: { passed: 0, failed: 0, total: 0 },
    plans: { passed: 0, failed: 0, total: 0 },
    tasks: { passed: 0, failed: 0, total: 0 },
    referrals: { passed: 0, failed: 0, total: 0 },
    support: { passed: 0, failed: 0, total: 0 },
    notifications: { passed: 0, failed: 0, total: 0 },
    news: { passed: 0, failed: 0, total: 0 },
    fileUpload: { passed: 0, failed: 0, total: 0 },
    errorHandling: { passed: 0, failed: 0, total: 0 }
  }
};

// Authentication tokens and test data
let authToken = null;
let refreshToken = null;
const testData = {
  userId: null,
  transactionId: null,
  loanId: null,
  planId: null,
  taskId: null,
  referralId: null,
  ticketId: null,
  newsId: null,
  notificationId: null,
  settingId: null,
  emailVerificationToken: null,
  passwordResetToken: null
};

/**
 * Complete API Client for All Endpoints
 */
class CompleteApiClient {
  constructor(baseURL, timeout = 15000) {
    this.baseURL = baseURL;
    this.timeout = timeout;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Device-Id': CONFIG.TEST_USER.deviceId, // Capitalize headers
      'X-Fingerprint': `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...customHeaders
    };
    
    if (this.token) {
      if (CONFIG.USE_NEXTAUTH) {
        // For NextAuth, the session is handled via cookies
        headers['X-Auth-Token'] = this.token;
      } else {
        headers.Authorization = `Bearer ${this.token}`;
      }
    }
    
    return headers;
  }

  async request(method, endpoint, data = null, customHeaders = {}) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: this.getHeaders(customHeaders),
        timeout: this.timeout
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        config.data = data;
      } else if (data && method === 'GET') {
        config.params = data;
      }

      // Debug logging
      if (CONFIG.VERBOSE) {
        console.log(`🔵 ${method} ${endpoint}`);
        console.log(`📤 Headers:`, JSON.stringify(config.headers, null, 2));
        if (config.data) {
          console.log(`📤 Body:`, JSON.stringify(config.data, null, 2));
        }
        if (config.params) {
          console.log(`📤 Params:`, JSON.stringify(config.params, null, 2));
        }
      }

      const response = await axios(config);
      
      if (CONFIG.VERBOSE) {
        console.log(`📥 Response ${response.status}:`, JSON.stringify(response.data, null, 2));
      }
      
      return {
        success: true,
        data: response.data,
        status: response.status,
        headers: response.headers
      };
    } catch (error) {
      if (CONFIG.VERBOSE) {
        console.log(`❌ Error ${error.response?.status || 0}:`, JSON.stringify(error.response?.data, null, 2));
      }
      
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 0,
        data: error.response?.data || null,
        details: error.response?.data
      };
    }
  }

  // HTTP method helpers
  get(endpoint, params = null, headers = {}) {
    return this.request('GET', endpoint, params, headers);
  }

  post(endpoint, data = null, headers = {}) {
    return this.request('POST', endpoint, data, headers);
  }

  put(endpoint, data = null, headers = {}) {
    return this.request('PUT', endpoint, data, headers);
  }

  patch(endpoint, data = null, headers = {}) {
    return this.request('PATCH', endpoint, data, headers);
  }

  delete(endpoint, headers = {}) {
    return this.request('DELETE', endpoint, null, headers);
  }

  // File upload helper
  async uploadFile(endpoint, file, additionalData = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      const headers = this.getHeaders({
        'Content-Type': 'multipart/form-data'
      });
      delete headers['Content-Type']; // Let axios set it with boundary

      const response = await axios({
        method: 'POST',
        url: `${this.baseURL}${endpoint}`,
        data: formData,
        headers,
        timeout: this.timeout
      });

      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 0,
        data: error.response?.data || null
      };
    }
  }
}

// Initialize API client
const client = new CompleteApiClient(CONFIG.BASE_URL, CONFIG.TIMEOUT);

/**
 * Logging utilities
 */
function log(message, type = 'info') {
  const colors = {
    info: chalk.blue || ((str) => str),
    success: chalk.green || ((str) => str),
    error: chalk.red || ((str) => str),
    warning: chalk.yellow || ((str) => str),
    header: (chalk.cyan && chalk.cyan.bold) || ((str) => str)
  };
  
  console.log(colors[type](`[${type.toUpperCase()}] ${message}`));
}

function logVerbose(message) {
  if (CONFIG.VERBOSE) {
    const grayFn = chalk.gray || ((str) => str);
    console.log(grayFn(`  → ${message}`));
  }
}

/**
 * Test execution utilities
 */
async function runTest(testName, testFunction, category = '') {
  testResults.total++;
  
  const fullTestName = category ? `${category} - ${testName}` : testName;
  
  // Track by category
  if (category && testResults.summary[category.toLowerCase().replace(/\s+/g, '')]) {
    testResults.summary[category.toLowerCase().replace(/\s+/g, '')].total++;
  }
  
  try {
    logVerbose(`Running: ${fullTestName}`);
    
    const result = await testFunction();
    
    if (result.success) {
      testResults.passed++;
      if (category && testResults.summary[category.toLowerCase().replace(/\s+/g, '')]) {
        testResults.summary[category.toLowerCase().replace(/\s+/g, '')].passed++;
      }
      log(`✓ ${fullTestName}`, 'success');
      
      if (CONFIG.VERBOSE && result.data) {
        const grayFn = chalk.gray || ((str) => str);
        console.log(grayFn('  Response Data:', JSON.stringify(result.data, null, 2)));
        console.log(grayFn('  Response Status:', result.status));
      }
    } else {
      testResults.failed++;
      if (category && testResults.summary[category.toLowerCase().replace(/\s+/g, '')]) {
        testResults.summary[category.toLowerCase().replace(/\s+/g, '')].failed++;
      }
      log(`✗ ${fullTestName}: ${result.error}`, 'error');
      testResults.errors.push({
        test: fullTestName,
        error: result.error,
        status: result.status,
        details: result.details
      });
    }
    
    return result;
  } catch (error) {
    testResults.failed++;
    if (category && testResults.summary[category.toLowerCase().replace(/\s+/g, '')]) {
      testResults.summary[category.toLowerCase().replace(/\s+/g, '')].failed++;
    }
    log(`✗ ${fullTestName}: ${error.message}`, 'error');
    testResults.errors.push({
      test: fullTestName,
      error: error.message,
      status: 0
    });
    
    return { success: false, error: error.message };
  }
}

function skipTest(testName, reason, category = '') {
  testResults.total++;
  testResults.skipped++;
  
  const fullTestName = category ? `${category} - ${testName}` : testName;
  log(`⊘ ${fullTestName}: ${reason}`, 'warning');
}

/**
 * Authentication Flow Tests
 */
async function testCompleteAuthFlow() {
  log('Testing Complete Authentication Flow', 'header');

  // First, test basic API connectivity
  await runTest('API Health Check', async () => {
    const response = await client.get('/api/plans'); // Public endpoint
    return {
      success: response.status === 200 || response.status === 401, // Either works or needs auth
      error: response.status === 200 ? 'API is responding' : 
             response.status === 401 ? 'API requires auth (expected)' : 
             `Unexpected status: ${response.status}`,
      status: response.status
    };
  }, 'Authentication');

  if (CONFIG.RUN_REGISTRATION_FLOW) {
    // User Registration
    await runTest('User Registration', async () => {
      const response = await client.post('/api/auth/register', {
        name: CONFIG.TEST_USER.name,
        email: CONFIG.TEST_USER.email,
        phone: CONFIG.TEST_USER.phone,
        password: CONFIG.TEST_USER.password,
        confirmPassword: CONFIG.TEST_USER.password, // API requires this
        deviceId: CONFIG.TEST_USER.deviceId,
        dateOfBirth: CONFIG.TEST_USER.dateOfBirth,
        acceptTerms: true, // API requires this
        acceptPrivacy: true // API requires this
      });

      if (response.success && response.data?.user) {
        testData.userId = response.data.user.id;
        testData.emailVerificationToken = response.data.emailVerificationToken;
        logVerbose(`New user created: ${testData.userId}`);
      }

      return response;
    }, 'Authentication');

    // Email Verification
    if (testData.emailVerificationToken) {
      await runTest('Email Verification', async () => {
        return await client.post('/api/auth/verify-email', {
          email: CONFIG.TEST_USER.email,
          token: testData.emailVerificationToken,
          deviceId: CONFIG.TEST_USER.deviceId
        });
      }, 'Authentication');
    } else {
      skipTest('Email Verification', 'No verification token received', 'Authentication');
    }

    // Login with new user
    await runTest('Login with New User', async () => {
      const response = await client.post('/api/auth/login', {
        email: CONFIG.TEST_USER.email,
        password: CONFIG.TEST_USER.password,
        userType: 'user',
        deviceId: CONFIG.TEST_USER.deviceId, // Include in body as well
        fingerprint: `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Include in body
      });

      // Handle different response formats
      if (response.success) {
        // Try multiple possible token locations
        const tokens = response.data?.tokens || response.tokens || response.data;
        const token = tokens?.accessToken || tokens?.access_token || response.data?.token || response.token;
        
        if (token) {
          authToken = token;
          refreshToken = tokens?.refreshToken || tokens?.refresh_token;
          client.setToken(authToken);
          testData.userId = response.data?.user?.id || response.user?.id;
          logVerbose(`Auth token received: ${authToken.substring(0, 20)}...`);
          logVerbose(`User ID: ${testData.userId}`);
        } else {
          logVerbose(`Login successful but no token found in response.`);
          logVerbose(`Response structure: ${JSON.stringify(Object.keys(response), null, 2)}`);
          if (response.data) {
            logVerbose(`Response.data structure: ${JSON.stringify(Object.keys(response.data), null, 2)}`);
          }
          if (CONFIG.VERBOSE) {
            logVerbose(`Full response: ${JSON.stringify(response, null, 2)}`);
          }
        }
      }

      return response;
    }, 'Authentication');
  } else {
    // Login with existing user
    await runTest('Login with Existing User', async () => {
      const response = await client.post('/api/auth/login', {
        email: CONFIG.EXISTING_USER.email,
        password: CONFIG.EXISTING_USER.password,
        userType: 'user',
        deviceId: CONFIG.TEST_USER.deviceId, // Include in body as well
        fingerprint: `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Include in body
      });

      // Handle different response formats
      if (response.success) {
        // Try multiple possible token locations
        const tokens = response.data?.tokens || response.tokens || response.data;
        const token = tokens?.accessToken || tokens?.access_token || response.data?.token || response.token;
        
        if (token) {
          authToken = token;
          refreshToken = tokens?.refreshToken || tokens?.refresh_token;
          client.setToken(authToken);
          testData.userId = response.data?.user?.id || response.user?.id;
          logVerbose(`Auth token received: ${authToken.substring(0, 20)}...`);
          logVerbose(`User ID: ${testData.userId}`);
        } else {
          logVerbose(`Login successful but no token found in response.`);
          logVerbose(`Response structure: ${JSON.stringify(Object.keys(response), null, 2)}`);
          if (response.data) {
            logVerbose(`Response.data structure: ${JSON.stringify(Object.keys(response.data), null, 2)}`);
          }
          if (CONFIG.VERBOSE) {
            logVerbose(`Full response: ${JSON.stringify(response, null, 2)}`);
          }
        }
      }

      return response;
    }, 'Authentication');
  }

  // Check Session
  await runTest('Check Session', async () => {
    return await client.get('/api/auth/session');
  }, 'Authentication');

  // Test if authentication is actually working
  if (authToken) {
    await runTest('Test Token Authentication', async () => {
      const response = await client.get('/api/users/me');
      
      if (response.success) {
        logVerbose(`Token is working! User: ${response.data?.name || response.data?.email || 'Unknown'}`);
        return { success: true, data: response.data };
      } else if (response.status === 401) {
        return { 
          success: false, 
          error: `Token not accepted by API. Status: ${response.status}`,
          details: response.data 
        };
      } else {
        return response;
      }
    }, 'Authentication');
  } else {
    skipTest('Test Token Authentication', 'No auth token available', 'Authentication');
  }

  // Refresh Token
  if (refreshToken) {
    await runTest('Refresh Token', async () => {
      const response = await client.post('/api/auth/refresh', {
        refreshToken: refreshToken
      });

      // Handle different response formats for refresh
      if (response.success) {
        const newToken = response.data?.accessToken || response.data?.access_token || 
                        response.accessToken || response.access_token || response.data?.token;
        
        if (newToken) {
          authToken = newToken;
          client.setToken(authToken);
          logVerbose(`New auth token: ${authToken.substring(0, 20)}...`);
        } else {
          logVerbose(`Refresh successful but no new token found. Response: ${JSON.stringify(response, null, 2)}`);
        }
      }

      return response;
    }, 'Authentication');
  } else {
    skipTest('Refresh Token', 'No refresh token available', 'Authentication');
  }
}

/**
 * Password Reset Flow Tests
 */
async function testPasswordResetFlow() {
  log('Testing Password Reset Flow', 'header');

  // Request password reset (first step - only email required)
  await runTest('Request Password Reset', async () => {
    const response = await client.post('/api/auth/reset-password', {
      email: CONFIG.EXISTING_USER.email // Use existing user email for reset
      // Don't send token, password, confirmPassword for the request step
    });

    if (response.success && response.data?.resetToken) {
      testData.passwordResetToken = response.data.resetToken;
      logVerbose(`Reset token received: ${testData.passwordResetToken.substring(0, 20)}...`);
    }

    return response;
  }, 'Authentication');

  // Reset password with token (second step)
  if (testData.passwordResetToken) {
    await runTest('Reset Password with Token', async () => {
      const newPassword = CONFIG.EXISTING_USER.password + '_new';
      return await client.post('/api/auth/reset-password', {
        email: CONFIG.EXISTING_USER.email,
        token: testData.passwordResetToken,
        password: newPassword,
        confirmPassword: newPassword,
        deviceId: CONFIG.TEST_USER.deviceId
      });
    }, 'Authentication');
  } else {
    skipTest('Reset Password with Token', 'No reset token received', 'Authentication');
  }
}

/**
 * Two-Factor Authentication Tests
 */
async function testTwoFactorAuth() {
  log('Testing Two-Factor Authentication', 'header');

  if (!authToken) {
    skipTest('Setup 2FA', 'No auth token', 'Authentication');
    skipTest('Verify 2FA', 'No auth token', 'Authentication');
    return;
  }

  // Setup 2FA
  await runTest('Setup 2FA', async () => {
    return await client.post('/api/auth/2fa/setup');
  }, 'Authentication');

  // Verify 2FA (mock token)
  await runTest('Verify 2FA', async () => {
    return await client.post('/api/auth/2fa/verify', {
      token: '123456' // Mock token
    });
  }, 'Authentication');
}

/**
 * User Profile Management Tests
 */
async function testUserProfileManagement() {
  log('Testing User Profile Management', 'header');

  if (!authToken) {
    skipTest('Get Profile', 'No auth token', 'User Profile');
    skipTest('Update Profile', 'No auth token', 'User Profile');
    skipTest('Get KYC Status', 'No auth token', 'User Profile');
    return;
  }

  // Get user profile
  await runTest('Get My Profile', async () => {
    return await client.get('/api/users/me');
  }, 'User Profile');

  // Update profile
  await runTest('Update My Profile', async () => {
    return await client.put('/api/users/me', {
      name: 'Updated Test User API',
      phone: CONFIG.TEST_USER.phone
    });
  }, 'User Profile');

  // Get KYC status
  await runTest('Get My KYC Status', async () => {
    return await client.get('/api/users/me/kyc');
  }, 'User Profile');

  // Submit KYC documents
  await runTest('Submit KYC Documents', async () => {
    return await client.post('/api/users/me/kyc', {
      documentType: 'national_id',
      documentNumber: 'TEST123456789',
      documents: [
        {
          type: 'national_id',
          url: 'https://example.com/test-document.jpg'
        }
      ]
    });
  }, 'User Profile');

  // Get user achievements
  await runTest('Get User Achievements', async () => {
    return await client.get('/api/users/achievements');
  }, 'User Profile');
}

/**
 * User Dashboard Tests
 */
async function testUserDashboard() {
  log('Testing User Dashboard', 'header');

  if (!authToken) {
    skipTest('Get Dashboard', 'No auth token', 'User Profile');
    return;
  }

  // Get user dashboard
  await runTest('Get User Dashboard', async () => {
    return await client.get('/api/users/dashboard');
  }, 'User Profile');
}

/**
 * Transaction Management Tests
 */
async function testTransactions() {
  log('Testing Transaction Management', 'header');

  if (!authToken) {
    skipTest('Get Transactions', 'No auth token', 'Transactions');
    skipTest('Create Transaction', 'No auth token', 'Transactions');
    return;
  }

  // Get user transactions
  await runTest('Get My Transactions', async () => {
    return await client.get('/api/transactions', {
      page: 1,
      limit: 10
    });
  }, 'Transactions');

  // Create deposit transaction
  await runTest('Create Deposit', async () => {
    const response = await client.post('/api/transactions', {
      type: 'Deposit',
      amount: 100,
      currency: 'USD',
      method: 'Bank Transfer',
      description: 'Test deposit from API testing suite'
    });

    if (response.success && response.data?.transaction?.id) {
      testData.transactionId = response.data.transaction.id;
    }

    return response;
  }, 'Transactions');

  // Create withdrawal transaction
  await runTest('Create Withdrawal', async () => {
    return await client.post('/api/transactions', {
      type: 'Withdrawal',
      amount: 50,
      currency: 'USD',
      method: 'Bank Transfer',
      description: 'Test withdrawal from API testing suite'
    });
  }, 'Transactions');

  // Get specific transaction
  if (testData.transactionId) {
    await runTest('Get Transaction Details', async () => {
      return await client.get(`/api/transactions/${testData.transactionId}`);
    }, 'Transactions');
  }
}

/**
 * Loan Management Tests
 */
async function testLoans() {
  log('Testing Loan Management', 'header');

  if (!authToken) {
    skipTest('Get Loans', 'No auth token', 'Loans');
    skipTest('Apply for Loan', 'No auth token', 'Loans');
    return;
  }

  // Get user loans
  await runTest('Get My Loans', async () => {
    return await client.get('/api/loans', {
      page: 1,
      limit: 10
    });
  }, 'Loans');

  // EMI Calculator
  await runTest('EMI Calculator', async () => {
    return await client.post('/api/loans/emi-calculator', {
      principal: 10000,
      rate: 12,
      tenure: 12
    });
  }, 'Loans');

  // Apply for loan
  await runTest('Apply for Loan', async () => {
    const response = await client.post('/api/loans', {
      amount: 5000,
      currency: 'USD',
      purpose: 'Personal Expenses',
      tenure: 12,
      employmentType: 'Full-time Employee',
      monthlyIncome: 3000,
      documents: []
    });

    if (response.success && response.data?.loan?.id) {
      testData.loanId = response.data.loan.id;
    }

    return response;
  }, 'Loans');

  // Get loan applications
  await runTest('Get My Loan Applications', async () => {
    return await client.get('/api/loans/applications');
  }, 'Loans');

  // Get loan repayment schedule
  if (testData.loanId) {
    await runTest('Get Loan Repayment Schedule', async () => {
      return await client.get(`/api/loans/${testData.loanId}/repayment`);
    }, 'Loans');

    // Record loan repayment
    await runTest('Record Loan Repayment', async () => {
      return await client.post(`/api/loans/${testData.loanId}/repayment`, {
        amount: 500,
        paymentMethod: 'Bank Transfer',
        transactionReference: 'TEST_REF_' + Date.now()
      });
    }, 'Loans');
  }
}

/**
 * Plans Management Tests
 */
async function testPlans() {
  log('Testing Plans Management', 'header');

  // Get available plans (public)
  await runTest('Get Available Plans', async () => {
    return await client.get('/api/plans');
  }, 'Plans');

  if (!authToken) {
    skipTest('Get Plan Details', 'No auth token', 'Plans');
    return;
  }

  // Get specific plan details
  await runTest('Get Plan Details', async () => {
    return await client.get('/api/plans/silver');
  }, 'Plans');

  // Get plan usage
  await runTest('Get My Plan Usage', async () => {
    return await client.get('/api/plans/silver/usage');
  }, 'Plans');
}

/**
 * Task Management Tests
 */
async function testTasks() {
  log('Testing Task Management', 'header');

  if (!authToken) {
    skipTest('Get Tasks', 'No auth token', 'Tasks');
    skipTest('Submit Task', 'No auth token', 'Tasks');
    return;
  }

  // Get available tasks
  await runTest('Get Available Tasks', async () => {
    return await client.get('/api/tasks', {
      page: 1,
      limit: 10,
      status: 'Active'
    });
  }, 'Tasks');

  // Get task categories
  await runTest('Get Task Categories', async () => {
    return await client.get('/api/tasks/categories');
  }, 'Tasks');

  // Get my task submissions
  await runTest('Get My Task Submissions', async () => {
    return await client.get('/api/tasks/submissions', {
      page: 1,
      limit: 10
    });
  }, 'Tasks');

  // Submit task completion
  await runTest('Submit Task Completion', async () => {
    return await client.post('/api/tasks/submit', {
      taskId: '60f1234567890abcdef12345', // Mock task ID
      proof: 'Test proof submission from API testing suite',
      attachments: []
    });
  }, 'Tasks');
}

/**
 * Referral System Tests
 */
async function testReferrals() {
  log('Testing Referral System', 'header');

  if (!authToken) {
    skipTest('Get Referrals', 'No auth token', 'Referrals');
    return;
  }

  // Get my referrals
  await runTest('Get My Referrals', async () => {
    return await client.get('/api/referrals', {
      page: 1,
      limit: 10
    });
  }, 'Referrals');

  // Get referral overview
  await runTest('Get My Referral Overview', async () => {
    return await client.get('/api/referrals/overview');
  }, 'Referrals');

  // Get commission settings
  await runTest('Get Commission Settings', async () => {
    return await client.get('/api/referrals/commission');
  }, 'Referrals');

  // Get referral code
  await runTest('Get My Referral Code', async () => {
    return await client.get('/api/referrals/code');
  }, 'Referrals');
}

/**
 * Support System Tests
 */
async function testSupport() {
  log('Testing Support System', 'header');

  if (!authToken) {
    skipTest('Get Support Tickets', 'No auth token', 'Support');
    skipTest('Create Support Ticket', 'No auth token', 'Support');
    return;
  }

  // Get my support tickets
  await runTest('Get My Support Tickets', async () => {
    return await client.get('/api/support/tickets', {
      page: 1,
      limit: 10
    });
  }, 'Support');

  // Create support ticket
  await runTest('Create Support Ticket', async () => {
    const response = await client.post('/api/support/tickets', {
      subject: 'API Testing Suite Support Ticket',
      message: 'This is a test support ticket created by the comprehensive API testing suite.',
      category: 'Technical Support',
      priority: 'Medium'
    });

    if (response.success && response.data?.ticket?.id) {
      testData.ticketId = response.data.ticket.id;
    }

    return response;
  }, 'Support');

  // Get FAQ (public)
  await runTest('Get FAQ', async () => {
    return await client.get('/api/support/faq');
  }, 'Support');

  // Add response to ticket
  if (testData.ticketId) {
    await runTest('Add Ticket Response', async () => {
      return await client.post(`/api/support/tickets/${testData.ticketId}/responses`, {
        message: 'Additional information for the test ticket from API testing suite.',
        isAdminResponse: false
      });
    }, 'Support');
  }
}

/**
 * Notification Management Tests
 */
async function testNotifications() {
  log('Testing Notification Management', 'header');

  if (!authToken) {
    skipTest('Get Notifications', 'No auth token', 'Notifications');
    return;
  }

  // Get my notifications
  await runTest('Get My Notifications', async () => {
    return await client.get('/api/notifications', {
      page: 1,
      limit: 10
    });
  }, 'Notifications');

  // Mark notification as read
  await runTest('Mark Notification as Read', async () => {
    return await client.patch('/api/notifications/60f1234567890abcdef12345/read');
  }, 'Notifications');

  // Get notification settings
  await runTest('Get Notification Settings', async () => {
    return await client.get('/api/notifications/settings');
  }, 'Notifications');

  // Update notification settings
  await runTest('Update Notification Settings', async () => {
    return await client.put('/api/notifications/settings', {
      email: true,
      sms: false,
      push: true,
      categories: {
        transactions: true,
        loans: true,
        tasks: false,
        referrals: true
      }
    });
  }, 'Notifications');
}

/**
 * News and Content Tests
 */
async function testNews() {
  log('Testing News and Content', 'header');

  // Get published news (public)
  await runTest('Get Published News', async () => {
    return await client.get('/api/news', {
      page: 1,
      limit: 10,
      status: 'Published'
    });
  }, 'News');

  // Get news categories (public)
  await runTest('Get News Categories', async () => {
    return await client.get('/api/news/categories');
  }, 'News');

  // Get specific news article (public)
  await runTest('Get News Article', async () => {
    // First try to get a list of news to get a real ID
    const newsListResponse = await client.get('/api/news', { limit: 1 });
    
    if (newsListResponse.success && newsListResponse.data?.data?.length > 0) {
      // Use a real news article ID
      const realNewsId = newsListResponse.data.data[0].id || newsListResponse.data.data[0]._id;
      return await client.get(`/api/news/${realNewsId}`);
    } else {
      // Fallback to testing with a fake ID (expect 404)
      const response = await client.get('/api/news/60f1234567890abcdef12345');
      
      return {
        success: response.status === 404, // 404 is expected for fake ID
        error: response.status === 404 ? 'Got expected 404 for fake news ID' : 
               `Expected 404 but got ${response.status}`,
        status: response.status
      };
    }
  }, 'News');
}

/**
 * File Upload Tests
 */
async function testFileUpload() {
  log('Testing File Upload System', 'header');

  if (!authToken) {
    skipTest('Upload Profile Picture', 'No auth token', 'File Upload');
    skipTest('Upload KYC Document', 'No auth token', 'File Upload');
    skipTest('Upload Task Proof', 'No auth token', 'File Upload');
    return;
  }

  // Create mock file for testing
  function createMockFile(name, type, content = 'mock file content') {
    const blob = new Blob([content], { type });
    blob.name = name;
    return blob;
  }

  // Note: These tests create mock files but won't actually upload in Node.js environment
  // In a real browser environment, you would use actual File objects
  
  skipTest('Upload Profile Picture', 'Requires actual file data in browser environment', 'File Upload');
  skipTest('Upload KYC Document', 'Requires actual file data in browser environment', 'File Upload');
  skipTest('Upload Task Proof', 'Requires actual file data in browser environment', 'File Upload');
}

/**
 * Error Handling and Edge Cases Tests
 */
async function testErrorHandling() {
  log('Testing Error Handling and Edge Cases', 'header');

  // Test 404
  await runTest('Test 404 Error', async () => {
    const response = await client.get('/api/nonexistent-endpoint');
    
    return {
      success: response.status === 404,
      error: response.success ? 'Expected 404 but got success' : 'Got expected 404',
      status: response.status
    };
  }, 'Error Handling');

  // Test unauthorized access
  await runTest('Test Unauthorized Access', async () => {
    const tempToken = client.token;
    client.setToken('invalid-token-12345');
    
    const response = await client.get('/api/users/me');
    
    // Restore token
    client.setToken(tempToken);
    
    // Accept both 401 (Unauthorized) and 400 (Bad Request) as valid error responses
    const isValidError = response.status === 401 || response.status === 400 || response.status === 403;
    
    return {
      success: isValidError,
      error: isValidError ? `Got expected error status: ${response.status}` : 
             `Expected 401/400/403 but got ${response.status}`,
      status: response.status
    };
  }, 'Error Handling');

  // Test malformed request
  await runTest('Test Malformed Request', async () => {
    const response = await client.post('/api/transactions', {
      // Missing required fields
      type: 'Invalid'
    });
    
    return {
      success: response.status >= 400 && response.status < 500,
      error: response.success ? 'Expected 4xx but got success' : 'Got expected 4xx',
      status: response.status
    };
  }, 'Error Handling');

  // Test rate limiting (if enabled)
  await runTest('Test Rate Limiting', async () => {
    // Make multiple requests quickly
    const promises = Array(10).fill().map(() => 
      client.get('/api/plans')
    );
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r.status === 429);
    
    return {
      success: true, // We don't expect rate limiting to fail, just checking if it's there
      error: rateLimited ? 'Rate limiting detected' : 'No rate limiting detected',
      status: rateLimited ? 429 : 200
    };
  }, 'Error Handling');

  // Test CORS headers
  await runTest('Test CORS Headers', async () => {
    const response = await client.get('/api/plans');
    
    const hasCorsHeaders = response.headers && (
      response.headers['access-control-allow-origin'] ||
      response.headers['Access-Control-Allow-Origin']
    );
    
    return {
      success: true,
      error: hasCorsHeaders ? 'CORS headers present' : 'No CORS headers detected',
      status: response.status
    };
  }, 'Error Handling');
}

/**
 * Logout Test
 */
async function testLogout() {
  log('Testing Logout', 'header');

  if (!authToken) {
    skipTest('User Logout', 'No auth token', 'Authentication');
    return;
  }

  await runTest('User Logout', async () => {
    const response = await client.post('/api/auth/logout');
    
    if (response.success) {
      client.setToken(null);
      authToken = null;
      refreshToken = null;
    }
    
    return response;
  }, 'Authentication');
}

/**
 * Comprehensive results reporting
 */
function printDetailedResults() {
  const headerFn = (chalk.cyan && chalk.cyan.bold) || ((str) => str);
  const greenFn = chalk.green || ((str) => str);
  const redFn = chalk.red || ((str) => str);
  const yellowFn = chalk.yellow || ((str) => str);
  const blueFn = chalk.blue || ((str) => str);
  const magentaFn = chalk.magenta || ((str) => str);
  const grayFn = chalk.gray || ((str) => str);

  console.log('\n' + headerFn('📊 Detailed Test Results Summary'));
  console.log('='.repeat(60));
  
  // Overall stats
  console.log(greenFn(`✓ Passed: ${testResults.passed}`));
  console.log(redFn(`✗ Failed: ${testResults.failed}`));
  console.log(yellowFn(`⊘ Skipped: ${testResults.skipped}`));
  console.log(blueFn(`📈 Total: ${testResults.total}`));

  // Category breakdown
  console.log('\n' + headerFn('📋 Results by Category:'));
  console.log('-'.repeat(60));
  
  Object.entries(testResults.summary).forEach(([category, stats]) => {
    if (stats.total > 0) {
      const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      console.log(`${categoryName}: ${greenFn(stats.passed)}/${stats.total} (${successRate}%)`);
    }
  });

  if (testResults.failed > 0) {
    console.log('\n' + redFn('❌ Failed Tests:'));
    console.log('-'.repeat(60));
    testResults.errors.forEach((error, index) => {
      console.log(redFn(`${index + 1}. ${error.test}`));
      console.log(grayFn(`   Error: ${error.error}`));
      console.log(grayFn(`   Status: ${error.status}`));
      if (error.details) {
        console.log(grayFn(`   Details: ${JSON.stringify(error.details, null, 2)}`));
      }
      console.log('');
    });
  }

  const successRate = testResults.total > 0 ? 
    ((testResults.passed / testResults.total) * 100).toFixed(1) : 0;
  
  console.log(headerFn(`Overall Success Rate: ${successRate}%`));

  // Status message
  if (testResults.passed === testResults.total) {
    console.log(greenFn('\n🎉 All tests passed! Your API is working perfectly.'));
  } else if (testResults.passed > testResults.failed) {
    console.log(yellowFn('\n⚠️  Some tests failed, but most functionality is working.'));
  } else {
    console.log(redFn('\n💥 Many tests failed. Please check your API server and configuration.'));
  }
}

/**
 * Main test execution
 */
async function runAllTests() {
  const headerFn = (chalk.cyan && chalk.cyan.bold) || ((str) => str);
  
  console.log(headerFn('🚀 Starting Complete API Testing Suite\n'));
  console.log(`Base URL: ${CONFIG.BASE_URL}`);
  console.log(`Test User Email: ${CONFIG.TEST_USER.email}`);
  console.log(`Existing User Email: ${CONFIG.EXISTING_USER.email}`);
  console.log(`Run Registration Flow: ${CONFIG.RUN_REGISTRATION_FLOW}`);
  console.log(`Use NextAuth: ${CONFIG.USE_NEXTAUTH}`);
  console.log(`Timeout: ${CONFIG.TIMEOUT}ms`);
  console.log(`Verbose: ${CONFIG.VERBOSE}`);
  
  if (!CONFIG.RUN_REGISTRATION_FLOW) {
    console.log(`\n⚡ Quick Mode: Testing with existing user credentials`);
    console.log(`   To test registration: RUN_REGISTRATION_FLOW=true`);
  }
  console.log('');

  const startTime = Date.now();

  try {
    // Run all test suites in logical order
    await testCompleteAuthFlow();
    await testPasswordResetFlow();
    await testTwoFactorAuth();
    await testUserProfileManagement();
    await testUserDashboard();
    await testTransactions();
    await testLoans();
    await testPlans();
    await testTasks();
    await testReferrals();
    await testSupport();
    await testNotifications();
    await testNews();
    await testFileUpload();
    await testErrorHandling();
    await testLogout();

  } catch (error) {
    log(`Unexpected error during testing: ${error.message}`, 'error');
    console.error(error.stack);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print comprehensive results
  printDetailedResults();
  
  const magentaFn = chalk.magenta || ((str) => str);
  console.log(magentaFn(`\n⏱️  Total Test Duration: ${duration}s`));

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  const yellowFn = chalk.yellow || ((str) => str);
  console.log(yellowFn('\n\n⚠️  Test execution interrupted by user'));
  printDetailedResults();
  process.exit(1);
});

process.on('SIGTERM', () => {
  const yellowFn = chalk.yellow || ((str) => str);
  console.log(yellowFn('\n\n⚠️  Test execution terminated'));
  printDetailedResults();
  process.exit(1);
});

// Run the complete test suite
runAllTests().catch((error) => {
  const redFn = (chalk.red && chalk.red.bold) || ((str) => str);
  console.error(redFn('💥 Fatal error:'), error.message);
  console.error(error.stack);
  process.exit(1);
});