// providers/auth-provider.tsx - FIXED VERSION
"use client";

import { SessionProvider } from "next-auth/react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { AdminUser, AuthState } from "@/types";
import { hasPermission, canAccessRoute, Permission } from "@/lib/permissions";
import { toast } from "sonner";

interface AuthContextType extends AuthState {
  hasPermission: (permission: Permission) => boolean;
  canAccessRoute: (route: string) => boolean;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

function AuthProviderInner({ children }: AuthProviderProps) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Update auth state when session changes
  useEffect(() => {
    setAuthState({
      user: (session?.user as unknown as AdminUser) || null,
      isAuthenticated: !!session?.user,
      isLoading: status === "loading",
      error: null,
    });
  }, [session, status]);

  // Route protection logic - FIXED VERSION
  useEffect(() => {
    if (status === "loading") return;

    const isAuthPage = ["/login", "/signup", "/forgot-password"].includes(
      pathname
    );
    const isPublicPage = ["/", "/about", "/contact"].includes(pathname);

    // Redirect unauthenticated users to login
    if (!session && !isAuthPage && !isPublicPage) {
      toast.error("Please login to access this page");
      router.push("/login");
      return;
    }

    // Redirect authenticated users away from auth pages
    if (session && isAuthPage) {
      const userType = session.user?.userType;
      if (userType === "admin") {
        router.push("/dashboard");
      } else {
        router.push("/user/dashboard");
      }
      return;
    }

    // FIXED: Don't do route permission checking here
    // Let individual pages handle their own protection
    // This prevents redirect loops for user detail pages
  }, [session, status, pathname, router]);

  // Session timeout warning
  useEffect(() => {
    if (!session) return;

    const sessionTimeout = 30 * 60 * 1000; // 30 minutes
    const warningTime = 5 * 60 * 1000; // 5 minutes before expiry

    const checkSessionExpiry = () => {
      if (session?.expires) {
        const expiryTime = new Date(session.expires).getTime();
        const currentTime = Date.now();
        const timeLeft = expiryTime - currentTime;

        if (timeLeft <= warningTime && timeLeft > 0) {
          toast.warning(
            "Your session will expire soon. Please save your work.",
            {
              duration: 10000,
              action: {
                label: "Extend Session",
                onClick: () => update(),
              },
            }
          );
        }
      }
    };

    const interval = setInterval(checkSessionExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [session, update]);

  const contextValue: AuthContextType = {
    ...authState,
    hasPermission: (permission: Permission) =>
      authState.user ? hasPermission(authState.user.role, permission) : false,
    canAccessRoute: (route: string) =>
      authState.user ? canAccessRoute(authState.user.role, route) : false,
    refreshSession: () => update(),
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// HOC for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission?: Permission
) {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading, hasPermission } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        if (!user) {
          router.push("/login");
          return;
        }

        if (requiredPermission && !hasPermission(requiredPermission)) {
          toast.error("You do not have permission to access this feature");
          router.push("/dashboard");
          return;
        }
      }
    }, [user, isLoading, hasPermission, router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!user || (requiredPermission && !hasPermission(requiredPermission))) {
      return null;
    }

    return <Component {...props} />;
  };
}
