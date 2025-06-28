"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  CreditCard,
  PiggyBank,
  CheckSquare,
  UserPlus,
  Bell,
  Newspaper,
  HeadphonesIcon,
  FileText,
  Settings,
  Home,
  Shield,
  TrendingUp,
  Wallet,
  Gift,
  MessageSquare,
  Calendar,
  Database,
} from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface NavigationProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  badge?: string | number;
  permission?: Permission;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    permission: "dashboard.view",
  },
  {
    title: "User Management",
    icon: Users,
    permission: "users.view",
    children: [
      {
        title: "All Users",
        href: "/users",
        icon: Users,
        permission: "users.view",
      },
      {
        title: "User Analytics",
        href: "/users/analytics",
        icon: TrendingUp,
        permission: "users.view",
      },
      {
        title: "User Plans",
        href: "/users/plans",
        icon: PiggyBank,
        permission: "plans.view",
      },
    ],
  },
  {
    title: "Financial",
    icon: Wallet,
    children: [
      {
        title: "Transactions",
        href: "/transactions",
        icon: CreditCard,
        permission: "transactions.view",
      },
      {
        title: "Loans",
        href: "/loans",
        icon: PiggyBank,
        permission: "loans.view",
      },
      {
        title: "Plans",
        href: "/plans",
        icon: Shield,
        permission: "plans.view",
      },
    ],
  },
  {
    title: "Engagement",
    icon: MessageSquare,
    children: [
      {
        title: "Tasks",
        href: "/tasks",
        icon: CheckSquare,
        permission: "tasks.view",
      },
      {
        title: "Referrals",
        href: "/referrals",
        icon: UserPlus,
        permission: "referrals.view",
      },
      {
        title: "News",
        href: "/news",
        icon: Newspaper,
        permission: "news.view",
      },
    ],
  },
  {
    title: "Communication",
    icon: Bell,
    children: [
      {
        title: "Notifications",
        href: "/notifications",
        icon: Bell,
        badge: "3",
        permission: "notifications.view",
      },
      {
        title: "Support",
        href: "/support",
        icon: HeadphonesIcon,
        permission: "support.view",
      },
    ],
  },
  {
    title: "System",
    icon: Settings,
    children: [
      {
        title: "Audit Logs",
        href: "/audit",
        icon: FileText,
        permission: "audit.view",
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        permission: "settings.view",
      },
      {
        title: "Database",
        href: "/database",
        icon: Database,
      },
    ],
  },
];

function filterNavItemsByPermissions(
  items: NavItem[],
  userRole: string
): NavItem[] {
  return items
    .filter(
      (item) =>
        !item.permission || hasPermission(userRole as any, item.permission)
    )
    .map((item) => ({
      ...item,
      children: item.children
        ? filterNavItemsByPermissions(item.children, userRole)
        : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0);
}

export function Navigation({
  className,
  orientation = "horizontal",
}: NavigationProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const filteredItems = filterNavItemsByPermissions(navigationItems, user.role);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  if (orientation === "vertical") {
    return (
      <nav className={cn("flex flex-col space-y-1", className)}>
        {filteredItems.map((item) => {
          const Icon = item.icon;

          if (item.children) {
            return (
              <div key={item.title} className="space-y-1">
                <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
                  <div className="flex items-center">
                    <Icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </div>
                </div>
                <div className="ml-4 space-y-1">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const active = child.href ? isActive(child.href) : false;

                    return (
                      <Button
                        key={child.title}
                        variant={active ? "secondary" : "ghost"}
                        size="sm"
                        className={cn(
                          "w-full justify-start h-8",
                          active && "bg-secondary"
                        )}
                        asChild
                      >
                        <Link href={child.href || "#"}>
                          <ChildIcon className="mr-2 h-4 w-4" />
                          {child.title}
                          {child.badge && (
                            <Badge variant="secondary" className="ml-auto">
                              {child.badge}
                            </Badge>
                          )}
                        </Link>
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          }

          const active = item.href ? isActive(item.href) : false;

          return (
            <Button
              key={item.title}
              variant={active ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "w-full justify-start h-9",
                active && "bg-secondary"
              )}
              asChild
            >
              <Link href={item.href || "#"}>
                <Icon className="mr-2 h-4 w-4" />
                {item.title}
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            </Button>
          );
        })}
      </nav>
    );
  }

  return (
    <NavigationMenu className={className}>
      <NavigationMenuList>
        {filteredItems.map((item) => {
          const Icon = item.icon;

          if (item.children) {
            return (
              <NavigationMenuItem key={item.title}>
                <NavigationMenuTrigger>
                  <Icon className="mr-2 h-4 w-4" />
                  {item.title}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <NavigationMenuLink key={child.title} asChild>
                          <Link
                            href={child.href || "#"}
                            className={cn(
                              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                              child.href && isActive(child.href) && "bg-accent"
                            )}
                          >
                            <div className="flex items-center space-x-2">
                              <ChildIcon className="h-4 w-4" />
                              <div className="text-sm font-medium leading-none">
                                {child.title}
                              </div>
                              {child.badge && (
                                <Badge variant="secondary" className="text-xs">
                                  {child.badge}
                                </Badge>
                              )}
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      );
                    })}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            );
          }

          return (
            <NavigationMenuItem key={item.title}>
              <NavigationMenuLink asChild>
                <Link
                  href={item.href || "#"}
                  className={cn(
                    navigationMenuTriggerStyle(),
                    item.href && isActive(item.href) && "bg-accent"
                  )}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.title}
                  {item.badge && (
                    <Badge variant="secondary" className="ml-2">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
