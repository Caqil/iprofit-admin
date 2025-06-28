"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  Permission,
} from "@/lib/permissions";
import { AdminRole } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;

  // Role-based access
  allowedRoles?: AdminRole[];
  deniedRoles?: AdminRole[];

  // Permission-based access
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  anyPermissions?: Permission[];

  // User type access
  allowedUserTypes?: ("admin" | "user")[];

  // Fallback content
  fallback?: React.ReactNode;
  showFallback?: boolean;

  // Behavior options
  hideWhenDenied?: boolean;
  showError?: boolean;
  errorMessage?: string;

  // Conditional rendering
  condition?: boolean;

  // Callbacks
  onAccessDenied?: () => void;
  onAccessGranted?: () => void;
}

interface AccessDeniedProps {
  message: string;
  showIcon?: boolean;
  variant?: "default" | "destructive";
}

function AccessDenied({
  message,
  showIcon = true,
  variant = "destructive",
}: AccessDeniedProps) {
  return (
    <Alert variant={variant}>
      {showIcon && <AlertTriangle className="h-4 w-4" />}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function RoleGuard({
  children,
  allowedRoles = [],
  deniedRoles = [],
  requiredPermission,
  requiredPermissions = [],
  anyPermissions = [],
  allowedUserTypes = ["admin", "user"],
  fallback,
  showFallback = true,
  hideWhenDenied = false,
  showError = true,
  errorMessage = "You do not have permission to access this content",
  condition = true,
  onAccessDenied,
  onAccessGranted,
}: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Memoize access check to avoid unnecessary recalculations
  const hasAccess = React.useMemo(() => {
    // If loading or condition is false, deny access
    if (isLoading || !condition) return false;

    // If authentication is required but user is not authenticated
    if (!isAuthenticated || !user) return false;

    // Check user type access
    if (
      allowedUserTypes.length > 0 &&
      !allowedUserTypes.includes((user as any).userType)
    ) {
      return false;
    }

    // For non-admin users, skip role and permission checks
    if ((user as any).userType !== "admin") {
      return allowedUserTypes.includes("user");
    }

    // Check denied roles first
    if (deniedRoles.length > 0 && deniedRoles.includes(user.role)) {
      return false;
    }

    // Check allowed roles
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // SuperAdmin bypasses role restrictions
      if (user.role !== "SuperAdmin") {
        return false;
      }
    }

    // Combine all permission requirements
    const allRequiredPermissions = [
      ...(requiredPermission ? [requiredPermission] : []),
      ...requiredPermissions,
    ];

    // Check required permissions (all must be satisfied)
    if (allRequiredPermissions.length > 0) {
      if (!hasAllPermissions(user.role, allRequiredPermissions)) {
        return false;
      }
    }

    // Check any permissions (at least one must be satisfied)
    if (anyPermissions.length > 0) {
      if (!hasAnyPermission(user.role, anyPermissions)) {
        return false;
      }
    }

    return true;
  }, [
    isLoading,
    condition,
    isAuthenticated,
    user,
    allowedUserTypes,
    deniedRoles,
    allowedRoles,
    requiredPermission,
    requiredPermissions,
    anyPermissions,
  ]);

  // Call callbacks when access status changes
  React.useEffect(() => {
    if (hasAccess) {
      onAccessGranted?.();
    } else {
      onAccessDenied?.();
    }
  }, [hasAccess, onAccessGranted, onAccessDenied]);

  // Show loading state
  if (isLoading) {
    return null; // Or a loading spinner if desired
  }

  // If access is denied
  if (!hasAccess) {
    // Hide completely
    if (hideWhenDenied) {
      return null;
    }

    // Show custom fallback
    if (fallback) {
      return <>{fallback}</>;
    }

    // Show error message
    if (showError && showFallback) {
      return <AccessDenied message={errorMessage} />;
    }

    // Don't render anything
    return null;
  }

  // Access granted, render children
  return <>{children}</>;
}

// Specific role guards for common use cases
export function SuperAdminGuard({
  children,
  ...props
}: Omit<RoleGuardProps, "allowedRoles">) {
  return (
    <RoleGuard allowedRoles={["SuperAdmin"]} {...props}>
      {children}
    </RoleGuard>
  );
}

export function ModeratorGuard({
  children,
  ...props
}: Omit<RoleGuardProps, "allowedRoles">) {
  return (
    <RoleGuard allowedRoles={["SuperAdmin", "Moderator"]} {...props}>
      {children}
    </RoleGuard>
  );
}

export function AdminOnlyGuard({
  children,
  ...props
}: Omit<RoleGuardProps, "allowedUserTypes">) {
  return (
    <RoleGuard allowedUserTypes={["admin"]} {...props}>
      {children}
    </RoleGuard>
  );
}

export function UserOnlyGuard({
  children,
  ...props
}: Omit<RoleGuardProps, "allowedUserTypes">) {
  return (
    <RoleGuard allowedUserTypes={["user"]} {...props}>
      {children}
    </RoleGuard>
  );
}

// Permission-specific guards
export function PermissionGuard({
  children,
  permission,
  ...props
}: Omit<RoleGuardProps, "requiredPermission"> & { permission: Permission }) {
  return (
    <RoleGuard requiredPermission={permission} {...props}>
      {children}
    </RoleGuard>
  );
}

// Hook for checking access in components
export function useRoleGuard(options: Omit<RoleGuardProps, "children">) {
  const { user, isAuthenticated, isLoading } = useAuth();

  return React.useMemo(() => {
    if (isLoading || !options.condition)
      return { hasAccess: false, isLoading: true };
    if (!isAuthenticated || !user)
      return { hasAccess: false, isLoading: false };

    // Check user type access
    if (
      options.allowedUserTypes?.length &&
      !options.allowedUserTypes.includes((user as any).userType)
    ) {
      return { hasAccess: false, isLoading: false };
    }

    // For non-admin users, skip role and permission checks
    if ((user as any).userType !== "admin") {
      return {
        hasAccess: options.allowedUserTypes?.includes("user") ?? true,
        isLoading: false,
      };
    }

    // Check denied roles
    if (options.deniedRoles?.includes(user.role)) {
      return { hasAccess: false, isLoading: false };
    }

    // Check allowed roles
    if (
      options.allowedRoles?.length &&
      !options.allowedRoles.includes(user.role) &&
      user.role !== "SuperAdmin"
    ) {
      return { hasAccess: false, isLoading: false };
    }

    // Check permissions
    const allRequiredPermissions = [
      ...(options.requiredPermission ? [options.requiredPermission] : []),
      ...(options.requiredPermissions || []),
    ];

    if (
      allRequiredPermissions.length &&
      !hasAllPermissions(user.role, allRequiredPermissions)
    ) {
      return { hasAccess: false, isLoading: false };
    }

    if (
      options.anyPermissions?.length &&
      !hasAnyPermission(user.role, options.anyPermissions)
    ) {
      return { hasAccess: false, isLoading: false };
    }

    return { hasAccess: true, isLoading: false };
  }, [user, isAuthenticated, isLoading, options]);
}
