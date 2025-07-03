// config/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import { connectToDatabase } from '@/lib/db';
import { Admin } from '@/models/Admin';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { checkDeviceLimit } from '@/lib/device-detection';
import speakeasy from 'speakeasy';
import { AdminRole } from '@/types';
import { verifyPassword } from '@/lib/encryption';


declare module "next-auth" {
  interface User {
    userType: 'admin' | 'user';
    role?: AdminRole;
    avatar?: string;
    permissions?: string[];
    phone?: string;
    planId?: string;
    kycStatus?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      userType: 'admin' | 'user';
      role?: AdminRole;
      avatar?: string;
      permissions?: string[];
      phone?: string;
      planId?: string;
      kycStatus?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userType?: 'admin' | 'user';
    role?: AdminRole;
    permissions?: string[];
    phone?: string;
    planId?: string;
    kycStatus?: string;
  }
}

// MongoDB client for NextAuth adapter
const client = new MongoClient(process.env.MONGODB_URI!);
const clientPromise = client.connect();

export const authConfig: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        userType: { label: "User Type", type: "text" },
        twoFactorToken: { label: "2FA Token", type: "text" },
        rememberMe: { label: "Remember Me", type: "checkbox" },
        deviceId: { label: "Device ID", type: "text" },
        fingerprint: { label: "Fingerprint", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password || !credentials?.userType) {
          throw new Error("Email, password, and user type are required");
        }

        try {
          await connectToDatabase();

          const { email, password, userType, twoFactorToken, deviceId, fingerprint } = credentials;
          const clientIP = getClientIP(req);
          const userAgent = getUserAgent(req);

          if (userType === 'admin') {
            // Admin authentication
            const admin = await Admin.findOne({ 
              email: email.toLowerCase(),
              isActive: true 
            });
console.log('Admin verification - Email:', email);
console.log('Admin found:', !!admin);
console.log('Admin active:', admin?.isActive);
console.log('Password hash exists:', !!admin?.passwordHash);
console.log('Password provided:', !!password);

if (!admin) {
  console.log('🔴 Admin not found for email:', email);
  await logAuthAttempt(email, userType, false, 'Admin not found', clientIP, userAgent);
  throw new Error("Invalid credentials");
}
            if (!admin) {
              await logAuthAttempt(email, userType, false, 'Admin not found', clientIP, userAgent);
              throw new Error("Invalid credentials");
            }

            // Handle passwordHash object/string conversion
            let passwordHashString = admin.passwordHash;
            if (typeof admin.passwordHash === 'object' && admin.passwordHash) {
              if (Buffer.isBuffer(admin.passwordHash)) {
                passwordHashString = admin.passwordHash.toString('utf8');
              } else if (admin.passwordHash.buffer) {
                passwordHashString = admin.passwordHash.buffer.toString('utf8');
              } else if (admin.passwordHash.toString) {
                passwordHashString = admin.passwordHash.toString();
              }
            }

            if (!passwordHashString || typeof passwordHashString !== 'string') {
              await logAuthAttempt(email, userType, false, 'Invalid password hash', clientIP, userAgent);
              throw new Error("Invalid credentials");
            }

            // Verify password
            const isValidPassword = await verifyPassword(password, passwordHashString);
            if (!isValidPassword) {
              await logAuthAttempt(email, userType, false, 'Invalid password', clientIP, userAgent);
              throw new Error("Invalid credentials");
            }

            // Check 2FA if enabled
            if (admin.twoFactorEnabled) {
              if (!twoFactorToken) {
                await logAuthAttempt(email, userType, false, '2FA token required', clientIP, userAgent);
                throw new Error("2FA token required");
              }

              const isValid2FA = speakeasy.totp.verify({
                secret: admin.twoFactorSecret!,
                encoding: 'base32',
                token: twoFactorToken,
                window: 2
              });

              if (!isValid2FA) {
                await logAuthAttempt(email, userType, false, 'Invalid 2FA token', clientIP, userAgent);
                throw new Error("Invalid 2FA token");
              }
            }

            // Update last login
            await Admin.findByIdAndUpdate(admin._id, { lastLogin: new Date() });
            await logAuthAttempt(email, userType, true, 'Successful login', clientIP, userAgent);

            return {
              id: admin._id.toString(),
              email: admin.email,
              name: admin.name,
              userType: 'admin',
              role: admin.role,
              permissions: admin.permissions
            };

          } else if (userType === 'user') {
            // User authentication with device limiting
            if (!deviceId || !fingerprint) {
              await logAuthAttempt(email, userType, false, 'Device information required', clientIP, userAgent);
              throw new Error("Device information required");
            }

            // Check device limit
            const deviceCheck = await checkDeviceLimit(deviceId, fingerprint);
            if (!deviceCheck.isAllowed) {
              await logAuthAttempt(email, userType, false, 'Multiple accounts detected', clientIP, userAgent);
              throw new Error("Multiple accounts detected. Contact support.");
            }

            const user = await User.findOne({ 
              email: email.toLowerCase(),
              status: 'Active'
            }).populate('planId');

            if (!user) {
              await logAuthAttempt(email, userType, false, 'User not found', clientIP, userAgent);
              throw new Error("Invalid credentials");
            }

            // Verify password if it exists (for credential-based users)
            if (user.passwordHash) {
              // Handle user passwordHash object/string conversion
              let userPasswordHashString = user.passwordHash;
              if (typeof user.passwordHash === 'object' && user.passwordHash) {
                if (Buffer.isBuffer(user.passwordHash)) {
                  userPasswordHashString = user.passwordHash.toString('utf8');
                } else if (user.passwordHash.buffer) {
                  userPasswordHashString = user.passwordHash.buffer.toString('utf8');
                } else if (user.passwordHash.toString) {
                  userPasswordHashString = user.passwordHash.toString();
                }
              }

              if (userPasswordHashString && typeof userPasswordHashString === 'string') {
                const isValidPassword = await verifyPassword(password, userPasswordHashString);
                if (!isValidPassword) {
                  await logAuthAttempt(email, userType, false, 'Invalid password', clientIP, userAgent);
                  throw new Error("Invalid credentials");
                }
              }
            }

            // Update device info and last login
            await User.findByIdAndUpdate(user._id, { 
              deviceId,
              lastLogin: new Date() 
            });

            await logAuthAttempt(email, userType, true, 'Successful login', clientIP, userAgent);

            return {
              id: user._id.toString(),
              email: user.email,
              name: user.name,
              userType: 'user',
              planId: user.planId?._id?.toString(),
              kycStatus: user.kycStatus,
              phone: user.phone
            };
          }

          throw new Error("Invalid user type");

        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      }
    })
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutes
  },

  jwt: {
    maxAge: 30 * 60, // 30 minutes
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userType = user.userType;
        token.role = user.role;
        token.permissions = user.permissions;
        token.phone = user.phone;
        token.planId = user.planId;
        token.kycStatus = user.kycStatus;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.userType = token.userType as 'admin' | 'user';
        session.user.role = token.role as AdminRole;
        session.user.permissions = token.permissions as string[];
        session.user.phone = token.phone as string;
        session.user.planId = token.planId as string;
        session.user.kycStatus = token.kycStatus as string;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Handle redirect logic properly
      
      // If URL is relative, make it absolute
      if (url.startsWith('/')) {
        url = `${baseUrl}${url}`;
      }

      // Parse the URL to check for parameters
      const urlObj = new URL(url);
      
      // Check for callbackUrl parameter
      const callbackUrl = urlObj.searchParams.get('callbackUrl');
      if (callbackUrl) {
        // If callback URL is relative, make it absolute
        if (callbackUrl.startsWith('/')) {
          return `${baseUrl}${callbackUrl}`;
        }
        // Only allow redirects to the same domain
        try {
          const callbackUrlObj = new URL(callbackUrl);
          if (callbackUrlObj.origin === baseUrl) {
            return callbackUrl;
          }
        } catch {
          // Invalid URL, fallback to default
        }
      }

      // Check for userType parameter to determine default redirect
      const userType = urlObj.searchParams.get('userType');
      if (userType === 'admin') {
        return `${baseUrl}/dashboard`;
      } else if (userType === 'user') {
        return `${baseUrl}/user/dashboard`;
      }

      // Default redirects based on the URL path
      if (url.includes('/dashboard')) {
        return `${baseUrl}/dashboard`;
      }

      // Default fallback
      return baseUrl;
    }
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      try {
        if (isNewUser && user.userType === 'user') {
          console.log(`New user registered: ${user.email}`);
        }
        
        if (user.userType === 'admin') {
          console.log(`Admin logged in: ${user.email}`);
        }
      } catch (error) {
        console.error('SignIn event error:', error);
      }
    },
    
    async signOut({ token }) {
      try {
        if (token?.email) {
          console.log(`User signed out: ${token.email}`);
          
          await logAuthAttempt(
            token.email,
            token.userType || 'user',
            true,
            'User signed out',
            '127.0.0.1',
            'Unknown'
          );
        }
      } catch (error) {
        console.error('SignOut event error:', error);
      }
    }
  },

  debug: process.env.NODE_ENV === "development",
  
  logger: {
    error(code, metadata) {
      console.error("NextAuth Error:", code, metadata);
    },
    warn(code) {
      console.warn("NextAuth Warning:", code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === "development") {
        console.log("NextAuth Debug:", code, metadata);
      }
    }
  }
};

// Helper functions
async function logAuthAttempt(
  email: string, 
  userType: string, 
  success: boolean, 
  reason: string,
  ipAddress: string = '127.0.0.1',
  userAgent: string = 'Unknown'
) {
  try {
    await connectToDatabase();
    await AuditLog.create({
      adminId: null,
      action: 'AUTH_ATTEMPT',
      entity: userType,
      entityId: email,
      status: success ? 'Success' : 'Failed',
      errorMessage: success ? null : reason,
      ipAddress,
      userAgent,
      severity: success ? 'Low' : 'Medium',
      metadata: {
        authProvider: userType === 'admin' ? 'credentials' : 'oauth',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to log auth attempt:', error);
  }
}

function getClientIP(req: any): string {
  return (
    req?.headers?.['x-forwarded-for']?.split(',')[0] ||
    req?.headers?.['x-real-ip'] ||
    req?.ip ||
    '127.0.0.1'
  );
}

function getUserAgent(req: any): string {
  return req?.headers?.['user-agent'] || 'Unknown';
}

export default authConfig;