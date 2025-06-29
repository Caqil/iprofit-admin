"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Send,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { NotificationFilter, PaginationParams } from "@/types";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { RoleGuard } from "@/components/auth/role-guard";

// Import components
import { NotificationsList } from "./components/notifications-list";
import { NotificationComposer } from "./components/notification-composer";
import { EmailTemplate } from "./components/email-template";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

export default function NotificationsPage() {
  const { user } = useAuth();

  // State management
  const [filters, setFilters] = useState<NotificationFilter>({});
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showComposer, setShowComposer] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Apply filters based on active tab and search
  const appliedFilters = useMemo(
    () => ({
      ...filters,
      search: searchTerm || undefined,
      dateFrom: dateRange.from?.toISOString(),
      dateTo: dateRange.to?.toISOString(),
      // Apply tab-based filters
      ...(activeTab === "email" && { channel: "email" as const }),
      ...(activeTab === "sms" && { channel: "sms" as const }),
      ...(activeTab === "in_app" && { channel: "in_app" as const }),
      ...(activeTab === "push" && { channel: "push" as const }),
      ...(activeTab === "pending" && { status: "Pending" as const }),
      ...(activeTab === "sent" && { status: "Sent" as const }),
      ...(activeTab === "failed" && { status: "Failed" as const }),
    }),
    [filters, searchTerm, dateRange, activeTab]
  );

  // Use notifications hook
  const {
    notifications,
    totalNotifications,
    templates,
    isLoading,
    error,
    sendNotification,
    markAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications(appliedFilters, pagination);

  // Handlers
  const handleFilterChange = (key: keyof NotificationFilter, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSendNotification = async (data: any) => {
    await sendNotification(data);
    setShowComposer(false);
    refreshNotifications();
  };

  // Permission checks
  const canCreate = !!(
    user && hasPermission(user.role, "notifications.create")
  );
  const canSend = !!(user && hasPermission(user.role, "notifications.send"));
  const canDelete = !!(
    user && hasPermission(user.role, "notifications.delete")
  );

  // Calculate summary stats
  const summaryStats = {
    total: totalNotifications,
    pending: notifications.filter((n) => n.status === "Pending").length,
    sent: notifications.filter(
      (n) => n.status === "Sent" || n.status === "Delivered"
    ).length,
    failed: notifications.filter((n) => n.status === "Failed").length,
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
          <p>Error loading notifications: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notification Center</h1>
          <p className="text-muted-foreground">
            Send and manage user notifications across all channels
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshNotifications}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplates(true)}
          >
            <Mail className="h-4 w-4 mr-2" />
            Templates
          </Button>
          {canCreate && (
            <Button onClick={() => setShowComposer(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Notifications
            </CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
            <p className="text-xs text-muted-foreground">All notifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summaryStats.pending}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summaryStats.sent}
            </div>
            <p className="text-xs text-muted-foreground">Successfully sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summaryStats.failed}
            </div>
            <p className="text-xs text-muted-foreground">Delivery failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select
            value={filters.type || "all"}
            onValueChange={(value) => handleFilterChange("type", value)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="KYC">KYC</SelectItem>
              <SelectItem value="Withdrawal">Withdrawal</SelectItem>
              <SelectItem value="Loan">Loan</SelectItem>
              <SelectItem value="Task">Task</SelectItem>
              <SelectItem value="Referral">Referral</SelectItem>
              <SelectItem value="System">System</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.priority || "all"}
            onValueChange={(value) => handleFilterChange("priority", value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {}}>
                <Download className="mr-2 h-4 w-4" />
                Export Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {}}>
                <Send className="mr-2 h-4 w-4" />
                Process Pending
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms">
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="in_app">
            <Bell className="h-4 w-4 mr-2" />
            In-App
          </TabsTrigger>
          <TabsTrigger value="push">
            <Smartphone className="h-4 w-4 mr-2" />
            Push
          </TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <NotificationsList
              notifications={notifications}
              totalNotifications={totalNotifications}
              pagination={pagination}
              onPaginationChange={setPagination}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
              canDelete={canDelete}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <NotificationComposer
        open={showComposer}
        onOpenChange={setShowComposer}
        onSend={handleSendNotification}
        templates={templates}
      />

      <EmailTemplate
        open={showTemplates}
        onOpenChange={setShowTemplates}
        templates={templates}
      />
    </div>
  );
}
