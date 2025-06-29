// app/audit/page.tsx
"use client";

import React, { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarIcon,
  DownloadIcon,
  FilterIcon,
  RefreshCwIcon,
  SearchIcon,
  ActivityIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  ClockIcon,
  UsersIcon,
  DatabaseIcon,
} from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { toast } from "sonner";
import { AuditLogs } from "./components/audit-logs";
import { ActivityTimeline } from "./components/activity-timeline";
import { useAudit } from "@/hooks/use-audit";
import { useAuth } from "@/hooks/use-auth";
import { PaginationParams, FilterParams } from "@/types";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { RoleGuard } from "@/components/auth/role-guard";

export default function AuditPage() {
  const { user } = useAuth();
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [filters, setFilters] = useState<FilterParams>({
    search: "",
    adminId: "",
    action: "",
    entity: "",
    severity: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("logs");

  const { auditLogs, totalLogs, isLoading, error, exportLogs, refreshLogs } =
    useAudit(filters, pagination);

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  // Handle date range changes
  const handleDateRangeChange = useCallback(
    (date: { from?: Date; to?: Date }) => {
      setSelectedDateRange(date);
      if (date?.from && date?.to) {
        setFilters((prev) => ({
          ...prev,
          dateFrom: date.from!.toISOString(),
          dateTo: date.to!.toISOString(),
        }));
      } else {
        setFilters((prev) => ({
          ...prev,
          dateFrom: "",
          dateTo: "",
        }));
      }
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    []
  );

  // Handle export
  const handleExport = async () => {
    try {
      await exportLogs(filters);
      toast.success("Audit logs exported successfully");
    } catch (error) {
      toast.error("Failed to export audit logs");
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: "",
      adminId: "",
      action: "",
      entity: "",
      severity: "",
      status: "",
      dateFrom: "",
      dateTo: "",
    });
    setSelectedDateRange(null);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Calculate filter stats
  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-muted-foreground">
            Track all system activities and administrative actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <FilterIcon className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">
                Active
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={refreshLogs}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCwIcon
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <RoleGuard requiredPermission="audit.export" fallback={null}>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <DownloadIcon className="h-4 w-4" />
              Export
            </Button>
          </RoleGuard>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalLogs.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All audit records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <ShieldCheckIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.5%</div>
            <p className="text-xs text-muted-foreground">
              Successful operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Failed Actions
            </CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              In the last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Admins</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Currently online</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FilterIcon className="h-5 w-5" />
              Advanced Filters
            </CardTitle>
            <CardDescription>
              Filter audit logs by date range, admin, action type, and more
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={filters.search || ""}
                    onChange={(e) =>
                      handleFilterChange("search", e.target.value)
                    }
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Action */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Action</label>
                <Select
                  value={filters.action || ""}
                  onValueChange={(value) => handleFilterChange("action", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All actions</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="approve">Approve</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                    <SelectItem value="export">Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Entity */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Entity</label>
                <Select
                  value={filters.entity || ""}
                  onValueChange={(value) => handleFilterChange("entity", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All entities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All entities</SelectItem>
                    <SelectItem value="User">User</SelectItem>
                    <SelectItem value="Transaction">Transaction</SelectItem>
                    <SelectItem value="Loan">Loan</SelectItem>
                    <SelectItem value="Plan">Plan</SelectItem>
                    <SelectItem value="Task">Task</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Severity */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Severity</label>
                <Select
                  value={filters.severity || ""}
                  onValueChange={(value) =>
                    handleFilterChange("severity", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All severities</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.status || ""}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="Success">Success</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Date Range</label>
                <DatePickerWithRange
                  date={selectedDateRange}
                  onDateChange={handleDateRangeChange}
                  className="w-full"
                  placeholder="Select date range"
                />
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="logs" className="gap-2">
            <DatabaseIcon className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <ActivityIcon className="h-4 w-4" />
            Activity Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {error ? (
            <Card>
              <CardContent className="flex items-center justify-center py-10">
                <div className="text-center">
                  <AlertTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-600 mb-2">
                    Error Loading Audit Logs
                  </h3>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={refreshLogs} variant="outline">
                    <RefreshCwIcon className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <AuditLogs
              logs={auditLogs}
              totalLogs={totalLogs}
              pagination={pagination}
              onPaginationChange={setPagination}
              isLoading={isLoading}
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <ActivityTimeline
            logs={auditLogs}
            isLoading={isLoading}
            filters={filters}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
