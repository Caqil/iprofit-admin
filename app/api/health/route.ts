import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import mongoose from 'mongoose';

interface ServiceStatus {
  status: 'operational' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: string;
  details?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    api: ServiceStatus;
    database: ServiceStatus;
    payments: ServiceStatus;
    email: ServiceStatus;
  };
  version: string;
  environment: string;
}

async function checkDatabaseHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    await connectToDatabase();
    
    // Test database connection with a simple operation
    const adminState = mongoose.connection.readyState;
    const responseTime = Date.now() - startTime;
    
    if (adminState === 1) { // Connected
      // Test a simple query
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
      } else {
        throw new Error('Database connection is undefined');
      }
      
      return {
        status: responseTime > 1000 ? 'degraded' : 'operational',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: `Connected to ${mongoose.connection.db ? mongoose.connection.db.databaseName : 'unknown'}`
      };
    } else {
      return {
        status: 'down',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: 'Database connection not established'
      };
    }
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

async function checkPaymentGatewayHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    // Check if payment gateway credentials are configured
    const coinGateConfigured = !!(process.env.COINGATE_API_KEY && process.env.COINGATE_SECRET);
    const uddoktaPayConfigured = !!(process.env.UDDOKTAPAY_API_KEY && process.env.UDDOKTAPAY_SECRET);
    
    const responseTime = Date.now() - startTime;
    
    if (coinGateConfigured || uddoktaPayConfigured) {
      // In a real implementation, you would ping the gateway APIs
      // For now, we'll just check configuration
      const configuredGateways: string[] = [];
      if (coinGateConfigured) configuredGateways.push('CoinGate');
      if (uddoktaPayConfigured) configuredGateways.push('UddoktaPay');
      
      return {
        status: 'operational',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: `Configured: ${configuredGateways.join(', ')}`
      };
    } else {
      return {
        status: 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: 'No payment gateways configured'
      };
    }
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Payment gateway check failed'
    };
  }
}

async function checkEmailServiceHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    // Check SMTP configuration
    const smtpConfigured = !!(
      process.env.SMTP_HOST && 
      process.env.SMTP_USER && 
      process.env.SMTP_PASS
    );
    
    // Check backup email services
    const sendGridConfigured = !!process.env.SENDGRID_API_KEY;
    const sesConfigured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
    
    const responseTime = Date.now() - startTime;
    
    if (smtpConfigured || sendGridConfigured || sesConfigured) {
      const configuredServices: string[] = [];
      if (smtpConfigured) configuredServices.push('SMTP');
      if (sendGridConfigured) configuredServices.push('SendGrid');
      if (sesConfigured) configuredServices.push('AWS SES');
      
      return {
        status: 'operational',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: `Available: ${configuredServices.join(', ')}`
      };
    } else {
      return {
        status: 'down',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: 'No email services configured'
      };
    }
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Email service check failed'
    };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Check all services in parallel
    const [database, payments, email] = await Promise.all([
      checkDatabaseHealth(),
      checkPaymentGatewayHealth(),
      checkEmailServiceHealth()
    ]);

    const api: ServiceStatus = {
      status: 'operational',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      details: `Node.js ${process.version}`
    };

    // Determine overall health status
    const services = { api, database, payments, email };
    const statuses = Object.values(services).map(service => service.status);
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (statuses.every(status => status === 'operational')) {
      overallStatus = 'healthy';
    } else if (statuses.some(status => status === 'down')) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    // Set appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(response, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    const errorResponse: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        api: {
          status: 'down',
          responseTime: Date.now() - startTime,
          lastCheck: new Date().toISOString(),
          details: error instanceof Error ? error.message : 'Health check failed'
        },
        database: {
          status: 'down',
          lastCheck: new Date().toISOString(),
          details: 'Health check failed'
        },
        payments: {
          status: 'down',
          lastCheck: new Date().toISOString(),
          details: 'Health check failed'
        },
        email: {
          status: 'down',
          lastCheck: new Date().toISOString(),
          details: 'Health check failed'
        }
      },
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    return NextResponse.json(errorResponse, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

// HEAD method for simple health checks
export async function HEAD(): Promise<NextResponse> {
  try {
    await connectToDatabase();
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}