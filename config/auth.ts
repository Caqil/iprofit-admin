import { NextAuthOptions } from "next-auth";
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

            if (!admin) {
              await logAuthAttempt(email, userType, false, 'Admin not found', clientIP, userAgent);
              throw new Error("Invalid credentials");
            }

            // Verify password
            const isValidPassword = await verifyPassword(password, admin.passwordHash);
            if (!isValidPassword) {
              await logAuthAttempt(email, userType, false, 'Invalid password', clientIP, userAgent);
              throw new Error("Invalid credentials");
            }

            // Check 2FA if enabled
            if (admin.twoFactorEnabled) {
              if (!twoFactorToken) {
                throw new Error("TwoFactorRequired");
              }

              const isValidToken = speakeasy.totp.verify({
                secret: admin.twoFactorSecret,
                token: twoFactorToken,
                window: 2
              });

              if (!isValidToken) {
                await logAuthAttempt(email, userType, false, 'Invalid 2FA token', clientIP, userAgent);
                throw new Error("Invalid two-factor authentication code");
              }
            }

            // Update last login
            await Admin.findByIdAndUpdate(admin._id, { 
              lastLogin: new Date() 
            });

            await logAuthAttempt(email, userType, true, 'Successful admin login', clientIP, userAgent);

            return {
              id: admin._id.toString(),
              email: admin.email,
              name: admin.name,
              userType: 'admin' as const,
              role: admin.role,
              avatar: admin.avatar,
              permissions: admin.permissions
            };
          } 
          
          else if (userType === 'user') {
            // User authentication
            if (!deviceId || !fingerprint) {
              throw new Error("Device identification required for user login");
            }

            // Check device limit
            const deviceCheck = await checkDeviceLimit(deviceId, fingerprint);
            if (!deviceCheck.isAllowed) {
              await logAuthAttempt(email, userType, false, deviceCheck.reason || 'Device limit exceeded', clientIP, userAgent);
              throw new Error("DeviceLimitExceeded");
            }

            const user = await User.findOne({ 
              email: email.toLowerCase(),
              status: 'Active'
            }).populate('planId');

            if (!user) {
              await logAuthAttempt(email, userType, false, 'User not found', clientIP, userAgent);
              throw new Error("Invalid credentials");
            }

            // For OAuth users, password might not be set
            if (password && user.passwordHash) {
              const isValidPassword = await verifyPassword(password, user.passwordHash);
              if (!isValidPassword) {
                await logAuthAttempt(email, userType, false, 'Invalid password', clientIP, userAgent);
                throw new Error("Invalid credentials");
              }
            }

            // Update device info and last login
            await User.findByIdAndUpdate(user._id, { 
              deviceId,
              lastLogin: new Date() 
            });

            await logAuthAttempt(email, userType, true, 'Successful user login', clientIP, userAgent);

            return {
              id: user._id.toString(),
              email: user.email,
              name: user.name,
              userType: 'user' as const,
              phone: user.phone,
              planId: user.planId?._id?.toString(),
              kycStatus: user.kycStatus
            };
          }

          throw new Error("Invalid user type");

        } catch (error) {
          console.error('Auth error:', error);
          if (error instanceof Error) {
            throw error;
          }
          throw new Error("Authentication failed");
        }
      }
    }),

    // OAuth providers for users
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile"
        }
      }
    }),

    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!
    })
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
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

      return token;
    },

    async session({ session, token }) {
      // Send properties to the client
      if (token && session.user) {
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
        const callbackUrlObj = new URL(callbackUrl);
        if (callbackUrlObj.origin === baseUrl) {
          return callbackUrl;
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
    },

    async signIn({ user, account, profile }) {
      try {
        // For OAuth providers, create user account if it doesn't exist
        if (account?.provider && account.provider !== 'credentials') {
          await connectToDatabase();
          
          const existingUser = await User.findOne({ 
            email: user.email?.toLowerCase() 
          });

          if (!existingUser) {
            // Get default plan for new users
            const defaultPlan = await Plan.findOne({ isDefault: true });
            
            const newUser = await User.create({
              name: user.name,
              email: user.email?.toLowerCase(),
              phone: '', // Will be updated in profile completion
              planId: defaultPlan?._id,
              balance: 0,
              kycStatus: 'Pending',
              kycDocuments: [],
              referralCode: generateReferralCode(),
              deviceId: '', // Will be updated on first app access
              status: 'Active',
              emailVerified: true, // OAuth users are pre-verified
              phoneVerified: false,
              twoFactorEnabled: false
            });

            // Log successful OAuth registration
            await logAuthAttempt(
              user.email!,
              'user',
              true,
              `New user registered via ${account.provider}`,
              '127.0.0.1',
              'OAuth Provider'
            );
          }
        }

        return true;
      } catch (error) {
        console.error('SignIn callback error:', error);
        return false;
      }
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

export default authConfig;