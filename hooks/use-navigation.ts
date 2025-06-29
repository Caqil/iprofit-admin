// hooks/use-navigation.ts
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";

interface NavigationState {
  currentPath: string;
  isLoading: boolean;
  activeRoutes: Set<string>;
  lastUpdate: number;
}

export function useNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentPath: pathname,
    isLoading: false,
    activeRoutes: new Set(),
    lastUpdate: Date.now(),
  });

  // Enhanced isActive function with better matching logic
  const isActive = useCallback((href: string): boolean => {
    if (!href || href === "#") return false;
    
    // Exact match for dashboard
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    
    // Handle nested routes properly
    const normalizedHref = href.endsWith("/") ? href.slice(0, -1) : href;
    const normalizedPathname = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
    
    // Exact match first
    if (normalizedPathname === normalizedHref) {
      return true;
    }
    
    // Start with match for nested routes
    if (normalizedPathname.startsWith(normalizedHref + "/")) {
      return true;
    }
    
    return false;
  }, [pathname]);

  // Check if any child route is active
  const isChildActive = useCallback((parentHref: string, childRoutes?: string[]): boolean => {
    if (!childRoutes) return false;
    return childRoutes.some(route => isActive(route));
  }, [isActive]);

  // Breadcrumb type for clarity
  interface Breadcrumb {
    label: string;
    href?: string;
    isActive: boolean;
  }

  // Get breadcrumb data based on current path
  const getBreadcrumbs = useCallback(() => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs: Breadcrumb[] = [];
    
    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      
      // Skip IDs in breadcrumbs
      const isId = /^[0-9a-f]{24}$|^\d+$/.test(segment);
      if (isId && !isLast) return;
      
      breadcrumbs.push({
        label: segment.charAt(0).toUpperCase() + segment.slice(1),
        href: isLast ? undefined : currentPath,
        isActive: isLast,
      });
    });
    
    return breadcrumbs;
  }, [pathname]);

  // Update navigation state when pathname changes
  useEffect(() => {
    setNavigationState(prev => ({
      ...prev,
      currentPath: pathname,
      lastUpdate: Date.now(),
    }));
  }, [pathname]);

  // Handle route transitions with loading state
  const navigateTo = useCallback((href: string) => {
    setNavigationState(prev => ({ ...prev, isLoading: true }));
    
    router.push(href);
    
    // Reset loading state after a brief delay
    setTimeout(() => {
      setNavigationState(prev => ({ ...prev, isLoading: false }));
    }, 100);
  }, [router]);

  // Memoized active routes for performance
  const activeRoutes = useMemo(() => {
    const routes = new Set<string>();
    
    // Add current path and all parent paths
    const segments = pathname.split("/").filter(Boolean);
    let currentPath = "";
    
    segments.forEach(segment => {
      currentPath += `/${segment}`;
      routes.add(currentPath);
    });
    
    return routes;
  }, [pathname]);

  // Check if route has access permissions
  const hasRouteAccess = useCallback((route: string): boolean => {
    if (!user) return false;
    // Add your permission checking logic here
    return true;
  }, [user]);

  return {
    // State
    currentPath: pathname,
    isLoading: navigationState.isLoading,
    activeRoutes,
    lastUpdate: navigationState.lastUpdate,
    
    // Functions
    isActive,
    isChildActive,
    getBreadcrumbs,
    navigateTo,
    hasRouteAccess,
    
    // Utilities
    pathname,
    user,
  };
}