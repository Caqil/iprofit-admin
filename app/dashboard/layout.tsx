"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  TrendingUp,
  UserPlus,
  MessageSquare,
  HelpCircle,
  Settings,
  Shield,
  BarChart3,
  Wallet,
  FileText,
  Bell,
  LogOut,
  User,
  ChevronUp,
  Plus,
  Search,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

// Navigation items based on user permissions
const navigationItems = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.view",
  },
  {
    title: "Users",
    icon: Users,
    permission: "users.view",
    items: [
      {
        title: "All Users",
        url: "/dashboard/users",
        permission: "users.view",
      },
      {
        title: "Add User",
        url: "/dashboard/users/create",
        permission: "users.create",
      },
      {
        title: "KYC Approval",
        url: "/dashboard/users/kyc",
        permission: "users.kyc.approve",
      },
    ],
  },
  {
    title: "Transactions",
    icon: CreditCard,
    permission: "transactions.view",
    items: [
      {
        title: "All Transactions",
        url: "/dashboard/transactions",
        permission: "transactions.view",
      },
      {
        title: "Pending Approvals",
        url: "/dashboard/transactions/pending",
        permission: "transactions.approve",
      },
      {
        title: "Transaction Reports",
        url: "/dashboard/transactions/reports",
        permission: "transactions.view",
      },
    ],
  },
  {
    title: "Loans",
    icon: Wallet,
    permission: "loans.view",
    items: [
      {
        title: "All Loans",
        url: "/dashboard/loans",
        permission: "loans.view",
      },
      {
        title: "Loan Applications",
        url: "/dashboard/loans/applications",
        permission: "loans.approve",
      },
      {
        title: "Loan Analytics",
        url: "/dashboard/loans/analytics",
        permission: "loans.view",
      },
    ],
  },
  {
    title: "Plans",
    icon: TrendingUp,
    permission: "plans.view",
    items: [
      {
        title: "All Plans",
        url: "/dashboard/plans",
        permission: "plans.view",
      },
      {
        title: "Create Plan",
        url: "/dashboard/plans/create",
        permission: "plans.create",
      },
    ],
  },
  {
    title: "Tasks",
    icon: FileText,
    permission: "tasks.view",
    items: [
      {
        title: "All Tasks",
        url: "/dashboard/tasks",
        permission: "tasks.view",
      },
      {
        title: "Create Task",
        url: "/dashboard/tasks/create",
        permission: "tasks.create",
      },
      {
        title: "Task Approvals",
        url: "/dashboard/tasks/approvals",
        permission: "tasks.approve",
      },
    ],
  },
  {
    title: "Referrals",
    icon: UserPlus,
    permission: "referrals.view",
    items: [
      {
        title: "All Referrals",
        url: "/dashboard/referrals",
        permission: "referrals.view",
      },
      {
        title: "Referral Analytics",
        url: "/dashboard/referrals/analytics",
        permission: "referrals.view",
      },
    ],
  },
  {
    title: "Support",
    icon: HelpCircle,
    permission: "support.view",
    items: [
      {
        title: "Support Tickets",
        url: "/dashboard/support",
        permission: "support.view",
      },
      {
        title: "FAQ Management",
        url: "/dashboard/support/faq",
        permission: "support.view",
      },
    ],
  },
  {
    title: "News",
    icon: MessageSquare,
    permission: "news.view",
    items: [
      {
        title: "All News",
        url: "/dashboard/news",
        permission: "news.view",
      },
      {
        title: "Create News",
        url: "/dashboard/news/create",
        permission: "news.create",
      },
    ],
  },
  {
    title: "Analytics",
    icon: BarChart3,
    permission: "dashboard.view",
    items: [
      {
        title: "User Analytics",
        url: "/dashboard/analytics/users",
        permission: "users.view",
      },
      {
        title: "Financial Analytics",
        url: "/dashboard/analytics/finance",
        permission: "transactions.view",
      },
      {
        title: "Performance Reports",
        url: "/dashboard/analytics/reports",
        permission: "dashboard.view",
      },
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    permission: "notifications.view",
    items: [
      {
        title: "All Notifications",
        url: "/dashboard/notifications",
        permission: "notifications.view",
      },
      {
        title: "Send Notification",
        url: "/dashboard/notifications/send",
        permission: "notifications.send",
      },
    ],
  },
];

const adminItems = [
  {
    title: "Admin Management",
    icon: Shield,
    permission: "admin.create",
    items: [
      {
        title: "All Admins",
        url: "/dashboard/admin",
        permission: "admin.create",
      },
      {
        title: "Create Admin",
        url: "/dashboard/admin/create",
        permission: "admin.create",
      },
      {
        title: "Audit Logs",
        url: "/dashboard/admin/audit",
        permission: "audit.view",
      },
    ],
  },
  {
    title: "System Settings",
    icon: Settings,
    permission: "settings.view",
    items: [
      {
        title: "General Settings",
        url: "/dashboard/settings",
        permission: "settings.view",
      },
      {
        title: "Email Templates",
        url: "/dashboard/settings/emails",
        permission: "settings.update",
      },
      {
        title: "System Configuration",
        url: "/dashboard/settings/system",
        permission: "settings.update",
      },
    ],
  },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuth();

  // Filter navigation items based on user permissions
  const filteredNavItems = navigationItems.filter((item) =>
    hasPermission(item.permission as any)
  );

  const filteredAdminItems = adminItems.filter((item) =>
    hasPermission(item.permission as any)
  );

  // Generate breadcrumbs
  type Breadcrumb = {
    title: string;
    href: string;
    isLast: boolean;
  };

  const generateBreadcrumbs = (): Breadcrumb[] => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs: Breadcrumb[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const href = "/" + segments.slice(0, i + 1).join("/");
      const isLast = i === segments.length - 1;

      // Capitalize and format segment
      const title =
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");

      breadcrumbs.push({
        title,
        href,
        isLast,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Shield className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      IProfit Platform
                    </span>
                    <span className="truncate text-xs">Admin Panel</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {/* Search */}
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input placeholder="Search..." className="pl-8 h-8 w-full" />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Main Navigation */}
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.items ? (
                      <SidebarMenuButton asChild>
                        <span className="cursor-pointer">
                          <item.icon />
                          <span>{item.title}</span>
                        </span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                      >
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    )}

                    {item.items && (
                      <SidebarMenuSub>
                        {item.items
                          .filter((subItem) =>
                            hasPermission(subItem.permission as any)
                          )
                          .map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.url}
                              >
                                <a href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Admin Navigation */}
          {filteredAdminItems.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredAdminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <span className="cursor-pointer">
                          <item.icon />
                          <span>{item.title}</span>
                        </span>
                      </SidebarMenuButton>

                      {item.items && (
                        <SidebarMenuSub>
                          {item.items
                            .filter((subItem) =>
                              hasPermission(subItem.permission as any)
                            )
                            .map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === subItem.url}
                                >
                                  <a href={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </a>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
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
                      <AvatarImage
                        src={user?.avatar || ""}
                        alt={user?.name || ""}
                      />
                      <AvatarFallback className="rounded-lg">
                        {user?.name?.charAt(0) || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user?.name}
                      </span>
                      <span className="truncate text-xs">{user?.email}</span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage
                          src={user?.avatar || ""}
                          alt={user?.name || ""}
                        />
                        <AvatarFallback className="rounded-lg">
                          {user?.name?.charAt(0) || "A"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {user?.name}
                        </span>
                        <span className="truncate text-xs">{user?.email}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <User />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Bell />
                      Notifications
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((breadcrumb, index) => (
                  <div key={breadcrumb.href} className="flex items-center">
                    {index > 0 && <BreadcrumbSeparator className="mx-2" />}
                    <BreadcrumbItem>
                      {breadcrumb.isLast ? (
                        <BreadcrumbPage>{breadcrumb.title}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={breadcrumb.href}>
                          {breadcrumb.title}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
