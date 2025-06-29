"use client";

import React from "react";
import { useState } from "react";
import { Plus, Download, Filter, Search, MoreHorizontal } from "lucide-react";
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
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { UserFilter, PaginationParams } from "@/types";
import { toast } from "sonner";
import { UsersTable } from "./components/users-table";
import { UserActions } from "./components/user-actions";
import { CreateUserDialog } from "./components/create-user-dialog";

export default function UsersPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<UserFilter>({});
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Apply search to filters
  const appliedFilters = {
    ...filters,
    search: searchTerm || undefined,
    // Apply tab-based filters
    ...(activeTab === "active" && { status: "Active" as const }),
    ...(activeTab === "suspended" && { status: "Suspended" as const }),
    ...(activeTab === "kyc_pending" && { kycStatus: "Pending" as const }),
  };

  const {
    users,
    totalUsers,
    isLoading,
    error,
    createUser,
    bulkAction,
    refreshUsers,
  } = useUsers(appliedFilters, pagination);

  const handleFilterChange = (key: keyof UserFilter, value: any) => {
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

  const handleBulkAction = async (action: string, metadata?: any) => {
    if (selectedUsers.length === 0) {
      toast.error("Please select users first");
      return;
    }

    try {
      await bulkAction({
        userIds: selectedUsers,
        action: action as any,
        metadata,
      });

      setSelectedUsers([]);
      toast.success(`Bulk ${action} completed successfully`);
    } catch (error) {
      toast.error(`Failed to perform bulk ${action}`);
    }
  };

  const handleExport = () => {
    // Implementation for export functionality
    toast.info("Export functionality coming soon");
  };

  const canCreate = hasPermission(user?.role || "Moderator", "users.create");
  const canBulkAction = hasPermission(
    user?.role || "Moderator",
    "users.update"
  );

  // Calculate summary stats
  const summaryStats = {
    total: totalUsers,
    active: users.filter((u) => u.status === "Active").length,
    suspended: users.filter((u) => u.status === "Suspended").length,
    kycPending: users.filter((u) => u.kycStatus === "Pending").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage and monitor user accounts, KYC status, and activities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {canCreate && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summaryStats.active.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summaryStats.suspended.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summaryStats.kycPending.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Filter and manage user accounts</CardDescription>
            </div>
            {canBulkAction && selectedUsers.length > 0 && (
              <UserActions
                selectedUsers={selectedUsers}
                onBulkAction={handleBulkAction}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, phone, or referral code..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <div className="p-2 space-y-2">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={filters.status || "all"}
                      onValueChange={(value) =>
                        handleFilterChange("status", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Suspended">Suspended</SelectItem>
                        <SelectItem value="Banned">Banned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">KYC Status</label>
                    <Select
                      value={filters.kycStatus || "all"}
                      onValueChange={(value) =>
                        handleFilterChange("kycStatus", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All KYC" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All KYC</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Users</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="suspended">Suspended</TabsTrigger>
              <TabsTrigger value="kyc_pending">
                KYC Pending
                {summaryStats.kycPending > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {summaryStats.kycPending}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <UsersTable
                users={users}
                isLoading={isLoading}
                error={error}
                pagination={pagination}
                onPaginationChange={setPagination}
                selectedUsers={selectedUsers}
                onSelectionChange={setSelectedUsers}
                totalUsers={totalUsers}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={(user) => {
          refreshUsers();
          toast.success(`User ${user.name} created successfully`);
        }}
      />
    </div>
  );
}
