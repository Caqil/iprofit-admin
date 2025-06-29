import { BaseEntity } from './index';
export type AdminRole = 
  | 'SuperAdmin' 
  | 'Admin' 
  | 'Manager' 
  | 'Moderator' 
  | 'Support' 
  | 'Viewer';

export interface AdminUser extends BaseEntity {
  email: string;
  name: string;
  role: AdminRole;
  avatar?: string;
  lastLogin?: Date;
  twoFactorEnabled: boolean;
  isActive: boolean;
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorToken?: string;
  rememberMe?: boolean;
}

export interface Session {
  user: AdminUser;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface PasswordReset {
  email: string;
  token?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface DeviceInfo {
  deviceId: string;
  fingerprint: string;
  userAgent: string;
  ipAddress: string;
  location?: {
    country: string;
    city: string;
  };
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: AdminRole;
  permissions: string[];
  iat: number;
  exp: number;
}