"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

interface LayoutBreadcrumbProps {
  items?: BreadcrumbItem[];
  maxItems?: number;
  className?: string;
}

// Route mappings for dynamic breadcrumb generation
const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Users",
  transactions: "Transactions",
  loans: "Loans",
  plans: "Plans",
  tasks: "Tasks",
  referrals: "Referrals",
  notifications: "Notifications",
  news: "News",
  support: "Support",
  audit: "Audit Logs",
  settings: "Settings",
  profile: "Profile",
  security: "Security",
  create: "Create",
  edit: "Edit",
  view: "View",
  analytics: "Analytics",
  reports: "Reports",
};

function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Skip IDs (assume segments that are UUIDs or numbers are IDs)
    const isId = /^[0-9a-f]{24}$|^\d+$/.test(segment);
    if (isId && !isLast) return;

    const label =
      routeLabels[segment] ||
      segment.charAt(0).toUpperCase() + segment.slice(1);

    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
      isActive: isLast,
    });
  });

  return breadcrumbs;
}

export function LayoutBreadcrumb({
  items,
  maxItems = 3,
  className,
}: LayoutBreadcrumbProps) {
  const pathname = usePathname();

  // Use provided items or generate from pathname
  const breadcrumbItems = items || generateBreadcrumbsFromPath(pathname);

  // Don't show breadcrumbs on homepage or login/register pages
  if (pathname === "/" || pathname === "/login" || pathname === "/register") {
    return null;
  }

  // Add home as first item if not present
  const itemsWithHome =
    breadcrumbItems[0]?.label !== "Dashboard"
      ? [{ label: "Dashboard", href: "/dashboard" }, ...breadcrumbItems]
      : breadcrumbItems;

  const shouldCollapse = itemsWithHome.length > maxItems;
  const visibleItems = shouldCollapse
    ? [itemsWithHome[0], ...itemsWithHome.slice(-2)]
    : itemsWithHome;
  const hiddenItems = shouldCollapse ? itemsWithHome.slice(1, -2) : [];

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {shouldCollapse && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={visibleItems[0].href || "#"}>
                  <Home className="h-4 w-4" />
                  <span className="sr-only">{visibleItems[0].label}</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1">
                  <BreadcrumbEllipsis className="h-4 w-4" />
                  <span className="sr-only">More</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {hiddenItems.map((item, index) => (
                    <DropdownMenuItem key={index}>
                      <Link href={item.href || "#"} className="w-full">
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {visibleItems.slice(1).map((item, index) => (
              <React.Fragment key={index}>
                <BreadcrumbItem>
                  {item.isActive ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={item.href || "#"}>{item.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < visibleItems.slice(1).length - 1 && (
                  <BreadcrumbSeparator />
                )}
              </React.Fragment>
            ))}
          </>
        )}

        {!shouldCollapse &&
          itemsWithHome.map((item, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {item.isActive ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href || "#"}>
                      {index === 0 && <Home className="h-4 w-4" />}
                      <span className={cn(index === 0 && "sr-only")}>
                        {item.label}
                      </span>
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index < itemsWithHome.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
