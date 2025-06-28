import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  AdminUser, 
  LoginCredentials, 
  TwoFactorSetup, 
  PasswordReset,
  AuthState,
} from '@/types';
import { hasPermission, Permission } from '@/lib/permissions';
import { toast } from 'sonner';

interface AuthHookReturn extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  setupTwoFactor: () => Promise<TwoFactorSetup>;
  verifyTwoFactor: (token: string) => Promise<boolean>;
  resetPassword: (data: PasswordReset) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  isLoading: boolean;
}

export function useAuth(): AuthHookReturn {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Update auth state when session changes
  useEffect(() => {
    setAuthState({
      user: session?.user ? (session.user as unknown as AdminUser) : null,
      isAuthenticated: !!session?.user,
      isLoading: status === 'loading',
      error: null
    });
  }, [session, status]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const result = await signIn('credentials', {
        ...credentials,
        userType: 'admin',
        redirect: false
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: () => {
      toast.success('Login successful');
      router.push('/dashboard');
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (error: Error) => {
      setAuthState(prev => ({ ...prev, error: error.message }));
      toast.error(error.message);
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut({ redirect: false });
    },
    onSuccess: () => {
      toast.success('Logged out successfully');
      router.push('/login');
      queryClient.clear();
    }
  });

  // Two-factor setup
  const setupTwoFactorMutation = useMutation({
    mutationFn: async (): Promise<TwoFactorSetup> => {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to setup 2FA');
      }

      return response.json();
    },
    onError: (error) => {
      toast.error(`2FA setup failed: ${error.message}`);
    }
  });

  // Two-factor verification
  const verifyTwoFactorMutation = useMutation({
    mutationFn: async (token: string): Promise<boolean> => {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        throw new Error('Invalid 2FA token');
      }

      const data = await response.json();
      return data.success;
    },
    onSuccess: (isValid) => {
      if (isValid) {
        toast.success('2FA enabled successfully');
        queryClient.invalidateQueries({ queryKey: ['auth'] });
      }
    },
    onError: (error) => {
      toast.error(`2FA verification failed: ${error.message}`);
    }
  });

  // Password reset
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: PasswordReset) => {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password reset failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Password reset successfully');
    },
    onError: (error) => {
      toast.error(`Password reset failed: ${error.message}`);
    }
  });

  return {
    ...authState,
    login: async (credentials: LoginCredentials) => {
      await loginMutation.mutateAsync(credentials);
    },
    logout: logoutMutation.mutateAsync,
    setupTwoFactor: setupTwoFactorMutation.mutateAsync,
    verifyTwoFactor: verifyTwoFactorMutation.mutateAsync,
    resetPassword: resetPasswordMutation.mutateAsync,
    hasPermission: (permission: Permission) => 
      authState.user ? hasPermission(authState.user.role, permission) : false,
    isLoading: authState.isLoading || loginMutation.isPending || logoutMutation.isPending
  };
}