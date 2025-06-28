"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission, canAccessRoute, Permission } from "@/lib/permissions";
import { AdminRole, AdminUser } from "@/types";
import {
  LoadingSpinner,
  PageLoader,
} from "@/components/shared/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Home, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: AdminRole;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  allowedUserTypes?: ("admin" | "user")[];
  fallback?: React.ReactNode;
  redirectTo?: string;
  showLoading?: boolean;
  onUnauthorized?: () => void;
}

interface UnauthorizedFallbackProps {
  reason: string;
  requiredRole?: AdminRole;
  requiredPermission?: Permission;
  onRetry: () => void;
  onGoHome: () => void;
}

function UnauthorizedFallback({
  reason,
  requiredRole,
  requiredPermission,
  onRetry,
  onGoHome,
}: UnauthorizedFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-destructive/10 rounded-full">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">{reason}</p>
        </div>

        {(requiredRole || requiredPermission) && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              {requiredRole && `Required role: ${requiredRole}`}
              {requiredRole && requiredPermission && " • "}
              {requiredPermission &&
                `Required permission: ${requiredPermission}`}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
          <Button onClick={onGoHome}>
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requiredRole,
  requiredPermission,
  requiredPermissions = [],
  allowedUserTypes = ["admin"],
  fallback,
  redirectTo,
  showLoading = true,
  onUnauthorized,
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [hasCheckedAuth, setHasCheckedAuth] = React.useState(false);

  // Combine single and multiple permissions
  const allRequiredPermissions = requiredPermission
    ? [requiredPermission, ...requiredPermissions]
    : requiredPermissions;

  const user = session?.user as unknown as AdminUser & { userType?: string };

  // Handle authentication check
  React.useEffect(() => {
    if (status === "loading") return;

    setHasCheckedAuth(true);

    // Check if authentication is required
    if (requireAuth && !session) {
      const loginUrl = redirectTo || "/login";
      const returnUrl = `${loginUrl}?callbackUrl=${encodeURIComponent(
        pathname
      )}`;
      router.push(returnUrl);
      return;
    }

    // Check user type
    if (session && allowedUserTypes.length > 0) {
      const userType = session.user?.userType;
      if (!allowedUserTypes.includes(userType as any)) {
        onUnauthorized?.();
        toast.error("You do not have access to this section");

        // Redirect to appropriate dashboard
        const defaultRedirect =
          userType === "admin" ? "/dashboard" : "/user/dashboard";
        router.push(redirectTo || defaultRedirect);
        return;
      }
    }

    // Check role requirement (for admin users)
    if (session && requiredRole && user?.userType === "admin") {
      if (user.role !== requiredRole && user.role !== "SuperAdmin") {
        onUnauthorized?.();
        toast.error(`This section requires ${requiredRole} role`);
        router.push(redirectTo || "/dashboard");
        return;
      }
    }

    // Check permission requirements
    if (
      session &&
      allRequiredPermissions.length > 0 &&
      user?.userType === "admin"
    ) {
      const hasAllPermissions = allRequiredPermissions.every((permission) =>
        hasPermission(user.role, permission)
      );

      if (!hasAllPermissions) {
        onUnauthorized?.();
        toast.error("You do not have permission to access this feature");
        router.push(redirectTo || "/dashboard");
        return;
      }
    }

    // Check route access (for admin users)
    if (session && user?.userType === "admin") {
      if (!canAccessRoute(user.role, pathname)) {
        onUnauthorized?.();
        toast.error("You do not have permission to access this page");
        router.push(redirectTo || "/dashboard");
        return;
      }
    }
  }, [
    session,
    status,
    requireAuth,
    requiredRole,
    allRequiredPermissions,
    allowedUserTypes,
    pathname,
    router,
    redirectTo,
    onUnauthorized,
    user,
  ]);

  // Show loading state
  if (status === "loading" || !hasCheckedAuth) {
    if (showLoading) {
      return <PageLoader text="Checking authentication..." />;
    }
    return null;
  }

  // Show unauthorized state for specific cases
  if (requireAuth && !session) {
    return (
      fallback || (
        <UnauthorizedFallback
          reason="You must be logged in to access this page"
          onRetry={() => window.location.reload()}
          onGoHome={() => router.push("/")}
        />
      )
    );
  }

  if (session && allowedUserTypes.length > 0) {
    const userType = session.user?.userType;
    if (!allowedUserTypes.includes(userType as any)) {
      return (
        fallback || (
          <UnauthorizedFallback
            reason={`This section is only available for ${allowedUserTypes.join(
              " and "
            )} accounts`}
            onRetry={() => window.location.reload()}
            onGoHome={() =>
              router.push(
                userType === "admin" ? "/dashboard" : "/user/dashboard"
              )
            }
          />
        )
      );
    }
  }

  if (session && requiredRole && user?.userType === "admin") {
    if (user.role !== requiredRole && user.role !== "SuperAdmin") {
      return (
        fallback || (
          <UnauthorizedFallback
            reason="You do not have the required role to access this page"
            requiredRole={requiredRole}
            onRetry={() => window.location.reload()}
            onGoHome={() => router.push("/dashboard")}
          />
        )
      );
    }
  }

  if (
    session &&
    allRequiredPermissions.length > 0 &&
    user?.userType === "admin"
  ) {
    const hasAllPermissions = allRequiredPermissions.every((permission) =>
      hasPermission(user.role, permission)
    );

    if (!hasAllPermissions) {
      return (
        fallback || (
          <UnauthorizedFallback
            reason="You do not have the required permissions to access this page"
            requiredPermission={allRequiredPermissions[0]}
            onRetry={() => window.location.reload()}
            onGoHome={() => router.push("/dashboard")}
          />
        )
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}

// HOC version for easier use
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, "children"> = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Hook for checking authentication status
export function useProtectedRoute(
  options: Omit<ProtectedRouteProps, "children"> = {}
) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const user = session?.user as unknown as AdminUser & { userType?: string };

  const isAuthenticated = !!session;
  const isLoading = status === "loading";

  const hasRequiredRole = React.useMemo(() => {
    if (!options.requiredRole || !user || user.userType !== "admin")
      return true;
    return user.role === options.requiredRole || user.role === "SuperAdmin";
  }, [user, options.requiredRole]);

  const hasRequiredPermissions = React.useMemo(() => {
    if (!user || user.userType !== "admin") return true;

    const allPermissions = [
      ...(options.requiredPermission ? [options.requiredPermission] : []),
      ...(options.requiredPermissions || []),
    ];

    if (allPermissions.length === 0) return true;

    return allPermissions.every((permission) =>
      hasPermission(user.role, permission)
    );
  }, [user, options.requiredPermission, options.requiredPermissions]);

  const hasRouteAccess = React.useMemo(() => {
    if (!user || user.userType !== "admin") return true;
    return canAccessRoute(user.role, pathname);
  }, [user, pathname]);

  const isAuthorized =
    hasRequiredRole && hasRequiredPermissions && hasRouteAccess;

  return {
    isAuthenticated,
    isLoading,
    isAuthorized,
    hasRequiredRole,
    hasRequiredPermissions,
    hasRouteAccess,
    user,
  };
}
