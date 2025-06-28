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
  LogOut,
  ChevronDown,
  Plus,
  Search,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface SidebarItem {
  title: string;
  url?: string;
  icon: React.ElementType;
  badge?: string | number;
  permission?: Permission;
  items?: SidebarItem[];
}

const sidebarData: SidebarItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    permission: "dashboard.view",
  },
  {
    title: "User Management",
    icon: Users,
    permission: "users.view",
    items: [
      {
        title: "All Users",
        url: "/users",
        icon: Users,
        permission: "users.view",
      },
      {
        title: "User Analytics",
        url: "/users/analytics",
        icon: TrendingUp,
        permission: "users.view",
      },
      {
        title: "User Plans",
        url: "/users/plans",
        icon: Shield,
        permission: "plans.view",
      },
    ],
  },
  {
    title: "Financial",
    icon: Wallet,
    items: [
      {
        title: "Transactions",
        url: "/transactions",
        icon: CreditCard,
        permission: "transactions.view",
      },
      {
        title: "Loans",
        url: "/loans",
        icon: PiggyBank,
        permission: "loans.view",
      },
      {
        title: "Plans",
        url: "/plans",
        icon: Shield,
        permission: "plans.view",
      },
    ],
  },
  {
    title: "Engagement",
    icon: BarChart3,
    items: [
      {
        title: "Tasks",
        url: "/tasks",
        icon: CheckSquare,
        permission: "tasks.view",
      },
      {
        title: "Referrals",
        url: "/referrals",
        icon: UserPlus,
        permission: "referrals.view",
      },
      {
        title: "News",
        url: "/news",
        icon: Newspaper,
        permission: "news.view",
      },
    ],
  },
  {
    title: "Communication",
    icon: Bell,
    items: [
      {
        title: "Notifications",
        url: "/notifications",
        icon: Bell,
        badge: "3",
        permission: "notifications.view",
      },
      {
        title: "Support",
        url: "/support",
        icon: HeadphonesIcon,
        permission: "support.view",
      },
    ],
  },
  {
    title: "System",
    icon: Settings,
    permission: "settings.view",
    items: [
      {
        title: "Audit Logs",
        url: "/audit",
        icon: FileText,
        permission: "audit.view",
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
        permission: "settings.view",
      },
    ],
  },
];

function filterSidebarItems(
  items: SidebarItem[],
  userRole: string
): SidebarItem[] {
  return items
    .filter(
      (item) =>
        !item.permission || hasPermission(userRole as any, item.permission)
    )
    .map((item) => ({
      ...item,
      items: item.items ? filterSidebarItems(item.items, userRole) : undefined,
    }))
    .filter((item) => !item.items || item.items.length > 0);
}

interface LayoutSidebarProps {
  children?: React.ReactNode;
}

export function LayoutSidebar({ children }: LayoutSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { state } = useSidebar();

  if (!user) return null;

  const filteredItems = filterSidebarItems(sidebarData, user.role);

  const isActive = (url?: string) => {
    if (!url) return false;
    if (url === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(url);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="font-bold text-sm">IP</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">IProfit</span>
                  <span className="truncate text-xs">Admin Panel</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        {state === "expanded" && (
          <SidebarGroup className="py-0">
            <SidebarGroupContent className="relative">
              <SidebarInput placeholder="Search..." className="pl-8" />
              <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 select-none opacity-50" />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {filteredItems.map((item) => {
              const Icon = item.icon;

              if (item.items) {
                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={item.items.some((subItem) =>
                      isActive(subItem.url)
                    )}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          <Icon />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => {
                            const SubIcon = subItem.icon;
                            return (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isActive(subItem.url)}
                                >
                                  <Link href={subItem.url || "#"}>
                                    <SubIcon />
                                    <span>{subItem.title}</span>
                                    {subItem.badge && (
                                      <SidebarMenuBadge>
                                        {subItem.badge}
                                      </SidebarMenuBadge>
                                    )}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              }

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(item.url)}
                  >
                    <Link href={item.url || "#"}>
                      <Icon />
                      <span>{item.title}</span>
                      {item.badge && (
                        <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupAction>
            <Plus /> <span className="sr-only">Add new item</span>
          </SidebarGroupAction>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/users/create">
                  <Users />
                  <span>Add User</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/news/create">
                  <Newspaper />
                  <span>Create News</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/notifications/create">
                  <Bell />
                  <span>Send Notification</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <Users className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {children && <SidebarInset>{children}</SidebarInset>}
    </Sidebar>
  );
}
