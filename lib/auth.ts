import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Admin } from "@/models/Admin";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import { verifyPassword, hashPassword } from "./encryption";
import { checkDeviceLimit } from "./device-detection";
import { AdminUser, AdminRole, JWTPayload } from "@/types";
import { JWT } from "next-auth/jwt";
import { MongoClient } from "mongodb";
import speakeasy from "speakeasy";
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import { connectToDatabase } from "./db";

const clientPromise = new MongoClient(process.env.MONGODB_URI!).connect();

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorToken: { label: "2FA Token", type: "text" },
        userType: { label: "User Type", type: "text" } // 'admin' or 'user'
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        await connectToDatabase();

        try {
          if (credentials.userType === 'admin') {
            // Admin authentication
            const admin = await Admin.findOne({ 
              email: credentials.email.toLowerCase(),
              isActive: true 
            });

            if (!admin) {
              await logAuthAttempt(credentials.email, 'admin', false, 'Admin not found');
              throw new Error("Invalid credentials");
            }

            const isValidPassword = await verifyPassword(credentials.password, admin.passwordHash);
            if (!isValidPassword) {
              await logAuthAttempt(credentials.email, 'admin', false, 'Invalid password');
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
                await logAuthAttempt(credentials.email, 'admin', false, 'Invalid 2FA token');
                throw new Error("Invalid 2FA token");
              }
            }

            // Update last login
            await Admin.findByIdAndUpdate(admin._id, { lastLogin: new Date() });
            await logAuthAttempt(credentials.email, 'admin', true, 'Successful login');

            return {
              id: admin._id.toString(),
              email: admin.email,
              name: admin.name,
              role: admin.role,
              userType: 'admin'
            };
          } else {
            // User authentication with device limiting
            const deviceId = req.headers?.['x-device-id'] as string;
            const fingerprint = req.headers?.['x-fingerprint'] as string;

            if (!deviceId || !fingerprint) {
              throw new Error("Device information required");
            }

            // Check device limit
            const deviceCheck = await checkDeviceLimit(deviceId, fingerprint);
            if (!deviceCheck.isAllowed) {
              throw new Error("Multiple accounts detected. Contact support.");
            }

            const user = await User.findOne({ 
              email: credentials.email.toLowerCase(),
              status: 'Active'
            });

            if (!user) {
              throw new Error("Invalid credentials");
            }

            // For OAuth flow, we don't verify password here
            // Password verification would be handled separately
            
            // Update device info if needed
            if (user.deviceId !== deviceId) {
              await User.findByIdAndUpdate(user._id, { 
                deviceId,
                lastLogin: new Date() 
              });
            }

            return {
              id: user._id.toString(),
              email: user.email,
              name: user.name,
              userType: 'user'
            };
          }
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.userType = token.userType as "admin" | "user";
        session.user.role = token.role as AdminRole;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login"
  }
};

async function logAuthAttempt(
  email: string, 
  userType: string, 
  success: boolean, 
  reason: string
) {
  try {
    await AuditLog.create({
      adminId: null,
      action: 'AUTH_ATTEMPT',
      entity: userType,
      entityId: email,
      status: success ? 'Success' : 'Failed',
      errorMessage: success ? null : reason,
      ipAddress: '0.0.0.0', // Would be populated from request
      userAgent: 'Unknown',
      severity: success ? 'Low' : 'Medium'
    });
  } catch (error) {
    console.error('Failed to log auth attempt:', error);
  }
}

export async function generateTwoFactorSecret(): Promise<{ secret: string; qrCode: string }> {
  const secret = speakeasy.generateSecret({
    name: process.env.NEXTAUTH_URL || 'Financial App',
    length: 20
  });

  return {
    secret: secret.base32!,
    qrCode: secret.otpauth_url!
  };
}

export async function verifyTwoFactorToken(secret: string, token: string): Promise<boolean> {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2
  });
}
