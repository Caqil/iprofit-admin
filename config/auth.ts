
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { MongoClient } from "mongodb";
import { Admin } from "@/models/Admin";
import { User } from "@/models/User";
import { Plan } from "@/models/Plan";
import { AuditLog } from "@/models/AuditLog";
import { connectToDatabase } from "@/lib/db";
import { verifyPassword } from "@/lib/encryption";
import { checkDeviceLimit } from "@/lib/device-detection";
import { generateReferralCode } from "@/utils/helpers";
import { AdminRole } from "@/types";
import speakeasy from "speakeasy";

import type { NextAuthOptions } from "next-auth";
// Extend NextAuth types
declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
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
      name: string;
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
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: process.env.MONGODB_DB_NAME || "iprofit",
    collections: {
      Users: "auth_users",
      Accounts: "auth_accounts", 
      Sessions: "auth_sessions",
      VerificationTokens: "auth_verification_tokens"
    }
  }),
  
  providers: [
    CredentialsProvider({
      id: "admin-credentials",
      name: "Admin Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorToken: { label: "2FA Token", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        await connectToDatabase();

        try {
          const admin = await Admin.findOne({ 
            email: credentials.email.toLowerCase(),
            isActive: true 
          });

          if (!admin) {
            await logAuthAttempt(
              credentials.email, 
              'admin', 
              false, 
              'Admin not found',
              getClientIP(req),
              getUserAgent(req)
            );
            throw new Error("Invalid credentials");
          }

          const isValidPassword = await verifyPassword(credentials.password, admin.passwordHash);
          if (!isValidPassword) {
            await logAuthAttempt(
              credentials.email, 
              'admin', 
              false, 
              'Invalid password',
              getClientIP(req),
              getUserAgent(req)
            );
            throw new Error("Invalid credentials");
          }

          // Check 2FA if enabled
          if (admin.twoFactorEnabled) {
            if (!credentials.twoFactorToken) {
              throw new Error("2FA token required");
            }

            const isValid2FA = speakeasy.totp.verify({
              secret: admin.twoFactorSecret!,
              encoding: 'base32',
              token: credentials.twoFactorToken,
              window: 2
            });

            if (!isValid2FA) {
              await logAuthAttempt(
                credentials.email, 
                'admin', 
                false, 
                'Invalid 2FA token',
                getClientIP(req),
                getUserAgent(req)
              );
              throw new Error("Invalid 2FA token");
            }
          }

          // Update last login
          await Admin.findByIdAndUpdate(admin._id, { lastLogin: new Date() });
          
          await logAuthAttempt(
            credentials.email, 
            'admin', 
            true, 
            'Successful login',
            getClientIP(req),
            getUserAgent(req)
          );

          return {
            id: admin._id.toString(),
            email: admin.email,
            name: admin.name,
            userType: 'admin' as const,
            role: admin.role,
            avatar: admin.avatar,
            permissions: admin.permissions
          };
        } catch (error) {
          console.error('Admin auth error:', error);
          throw error;
        }
      }
    }),

    CredentialsProvider({
      id: "user-credentials", 
      name: "User Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        deviceId: { label: "Device ID", type: "text" },
        fingerprint: { label: "Fingerprint", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.deviceId || !credentials?.fingerprint) {
          throw new Error("Email, device ID, and fingerprint are required");
        }

        await connectToDatabase();

        try {
          // Check device limit first
          const deviceCheck = await checkDeviceLimit(credentials.deviceId, credentials.fingerprint);
          if (!deviceCheck.isAllowed) {
            throw new Error("Multiple accounts detected. Contact support.");
          }

          const user = await User.findOne({ 
            email: credentials.email.toLowerCase(),
            status: 'Active'
          }).populate('planId');

          if (!user) {
            throw new Error("Invalid credentials");
          }

          // Update device info if needed
          if (user.deviceId !== credentials.deviceId) {
            await User.findByIdAndUpdate(user._id, { 
              deviceId: credentials.deviceId,
              lastLogin: new Date() 
            });
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            userType: 'user' as const,
            phone: user.phone,
            planId: user.planId?._id?.toString() || user.planId,
            kycStatus: user.kycStatus
          };
        } catch (error) {
          console.error('User auth error:', error);
          throw error;
        }
      }
    }),

    // OAuth providers for user authentication
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          userType: 'user' as const
        };
      }
    }),

    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          image: profile.picture?.data?.url,
          userType: 'user' as const
        };
      }
    })
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutes for admin sessions
    updateAge: 5 * 60, // Update session every 5 minutes
  },

  jwt: {
    maxAge: 30 * 60, // 30 minutes
  },

  callbacks: {
    async signIn({ user, account, profile, credentials }) {
      // Additional sign-in validation
      if (account?.provider === "google" || account?.provider === "facebook") {
        try {
          await connectToDatabase();
          
          const existingUser = await User.findOne({ email: user.email });
          if (!existingUser) {
            // Get free plan
            const freePlan = await Plan.findOne({ name: "Free" });
            
            // Create new user with OAuth
            const newUser = await User.create({
              name: user.name,
              email: user.email,
              phone: '', // Will be updated later
              planId: freePlan?._id,
              deviceId: `oauth_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              referralCode: generateReferralCode(),
              emailVerified: true, // OAuth emails are pre-verified
              status: 'Active',
              kycStatus: 'Pending'
            });

            // Update user object with database info
            user.id = newUser._id.toString();
            user.planId = freePlan?._id?.toString();
            user.kycStatus = 'Pending';
          } else {
            // Update user object with existing user info
            user.id = existingUser._id.toString();
            user.planId = existingUser.planId?.toString();
            user.kycStatus = existingUser.kycStatus;
            user.phone = existingUser.phone;
          }
        } catch (error) {
          console.error('OAuth user creation/update error:', error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.userType = user.userType;
        token.role = user.role;
        token.permissions = user.permissions;
        token.phone = user.phone;
        token.planId = user.planId;
        token.kycStatus = user.kycStatus;
      }

      // Update token if it's an OAuth user and we have fresh data
      if (account?.provider === "google" || account?.provider === "facebook") {
        try {
          await connectToDatabase();
          const dbUser = await User.findOne({ email: token.email });
          if (dbUser) {
            token.planId = dbUser.planId?.toString();
            token.kycStatus = dbUser.kycStatus;
            token.phone = dbUser.phone;
          }
        } catch (error) {
          console.error('Token update error:', error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.userType = (token.userType as 'admin' | 'user') || 'user';
        session.user.role = token.role as AdminRole;
        session.user.permissions = token.permissions as string[];
        session.user.phone = token.phone as string;
        session.user.planId = token.planId as string;
        session.user.kycStatus = token.kycStatus as string;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Handle different redirect scenarios
      const urlObj = new URL(url.startsWith('/') ? `${baseUrl}${url}` : url);
      
      // Check for userType parameter
      const userType = urlObj.searchParams.get('userType');
      
      // Redirect based on user type
      if (userType === 'admin') {
        return `${baseUrl}/dashboard`;
      } else if (userType === 'user') {
        return `${baseUrl}/user/dashboard`;
      }
      
      // Default redirect based on URL
      if (url.includes('/admin') || url.includes('/dashboard')) {
        return `${baseUrl}/dashboard`;
      }
      
      // Default user redirect
      return `${baseUrl}/user/dashboard`;
    }
  },

  pages: {
    signIn: "/login",
    signOut: "/login", 
    error: "/login",
    verifyRequest: "/verify-request",
    newUser: "/welcome"
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      try {
        if (isNewUser && user.userType === 'user') {
          console.log(`New user registered: ${user.email}`);
          
          // Log the registration
          await logAuthAttempt(
            user.email,
            'user',
            true,
            'New user registration via OAuth',
            '127.0.0.1',
            'OAuth Provider'
          );
          
          // You can add welcome email sending here
          // await sendWelcomeEmail(user.email, user.name);
        }
      } catch (error) {
        console.error('SignIn event error:', error);
      }
    },
    
    async signOut({ token }) {
      try {
        if (token?.email) {
          console.log(`User signed out: ${token.email}`);
          
          // Log the signout
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
    },

    async session({ session, token }) {
      // Update last activity for active sessions
      if (session.user?.id && session.user.userType === 'user') {
        try {
          await connectToDatabase();
          await User.findByIdAndUpdate(session.user.id, {
            lastLogin: new Date()
          });
        } catch (error) {
          console.error('Session update error:', error);
        }
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
  ipAddress: string,
  userAgent: string
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

// Session helpers
export async function getServerSession() {
  const { getServerSession } = await import('next-auth');
  return getServerSession(authConfig);
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
}

export async function requireAdminAuth() {
  const session = await getServerSession();
  if (!session || session.user.userType !== 'admin') {
    throw new Error('Admin authentication required');
  }
  return session;
}

export async function requireUserAuth() {
  const session = await getServerSession();
  if (!session || session.user.userType !== 'user') {
    throw new Error('User authentication required');
  }
  return session;
}

// Export auth configuration
export default authConfig;

// Additional configuration for NextAuth.js
export const authOptions = authConfig;