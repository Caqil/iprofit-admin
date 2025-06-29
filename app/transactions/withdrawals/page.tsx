"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Search,
  Ban,
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
import { useTransactions } from "@/hooks/use-transactions";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { TransactionFilter, PaginationParams } from "@/types";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { RoleGuard } from "@/components/auth/role-guard";

// Import components
import { TransactionsTable } from "../components/transactions-table";
import { WithdrawalApproval } from "../components/withdrawal-approval";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

export default function WithdrawalsPage() {
  const { user } = useAuth();

  // State management
  const [filters, setFilters] = useState<TransactionFilter>({
    type: "withdrawal", // Always filter for withdrawals
  });
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedWithdrawals, setSelectedWithdrawals] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Apply filters based on active tab and search
  const appliedFilters = useMemo(
    () => ({
      ...filters,
      type: "withdrawal" as const, // Always filter for withdrawals
      search: searchTerm || undefined,
      dateFrom: dateRange.from?.toISOString(),
      dateTo: dateRange.to?.toISOString(),
      // Apply tab-based filters
      ...(activeTab === "pending" && { status: "Pending" as const }),
      ...(activeTab === "approved" && { status: "Approved" as const }),
      ...(activeTab === "rejected" && { status: "Rejected" as const }),
      ...(activeTab === "high_amount" && { amountMin: 10000 }),
      ...(activeTab === "flagged" && { flagged: true }),
    }),
    [filters, searchTerm, dateRange, activeTab]
  );

  // Use transactions hook
  const {
    transactions: withdrawals,
    totalTransactions: totalWithdrawals,
    summary,
    isLoading,
    error,
    approveTransaction,
    bulkAction,
    refreshTransactions,
    exportTransactions,
  } = useTransactions(appliedFilters, pagination);

  // Handlers
  const handleFilterChange = (key: keyof TransactionFilter, value: any) => {
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

  const handleBulkAction = async (
    action: "approve" | "reject",
    reason?: string
  ) => {
    if (selectedWithdrawals.length === 0) {
      toast.error("Please select withdrawals first");
      return;
    }

    try {
      await bulkAction({
        transactionIds: selectedWithdrawals,
        action,
        reason,
      });
      setSelectedWithdrawals([]);
    } catch (error) {
      console.error("Bulk action failed:", error);
    }
  };

  // Permission checks
  const canApprove: boolean | undefined = user ? hasPermission(user.role, "transactions.approve") : undefined;
  const canReject: boolean | undefined = user ? hasPermission(user.role, "transactions.reject") : undefined;
  const canExport: boolean | undefined = user ? hasPermission(user.role, "transactions.export") : undefined;

  // Calculate withdrawal-specific metrics
  const withdrawalMetrics = useMemo(() => {
    if (!summary) return null;

    return {
      totalAmount: summary.byType.withdrawal?.amount || 0,
      totalCount: summary.byType.withdrawal?.count || 0,
      pendingAmount: summary.byStatus.Pending?.amount || 0,
      pendingCount: summary.byStatus.Pending?.count || 0,
      approvedAmount: summary.byStatus.Approved?.amount || 0,
      approvedCount: summary.byStatus.Approved?.count || 0,
      rejectedAmount: summary.byStatus.Rejected?.amount || 0,
      rejectedCount: summary.byStatus.Rejected?.count || 0,
    };
  }, [summary]);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-bold tracking-tight">Withdrawals</h3>
          <p className="text-muted-foreground">
            Manage and approve user withdrawals
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshTransactions}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <RoleGuard requiredPermission="transactions.export">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportTransactions("xlsx")}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </RoleGuard>
        </div>
      </div>

      {/* Withdrawal Metrics */}
      {withdrawalMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Withdrawals
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${withdrawalMetrics.totalAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {withdrawalMetrics.totalCount} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Review
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${withdrawalMetrics.pendingAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {withdrawalMetrics.pendingCount} pending withdrawals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${withdrawalMetrics.approvedAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {withdrawalMetrics.approvedCount} approved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <Ban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${withdrawalMetrics.rejectedAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {withdrawalMetrics.rejectedCount} rejected
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            {/* Search and Date Range */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search withdrawals..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>

            {/* Withdrawal-specific filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Processing">Processing</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Gateway</label>
                <Select
                  value={filters.gateway || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("gateway", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Gateways" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Gateways</SelectItem>
                    <SelectItem value="Bank">Bank Transfer</SelectItem>
                    <SelectItem value="Mobile">Mobile Banking</SelectItem>
                    <SelectItem value="Manual">Manual</SelectItem>
                    <SelectItem value="System">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Min Amount</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.amountMin || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "amountMin",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Max Amount</label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={filters.amountMax || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "amountMax",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawals Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Withdrawal Requests</CardTitle>
              <CardDescription>
                {totalWithdrawals} total withdrawal requests
              </CardDescription>
            </div>

            {/* Bulk Actions for Withdrawals */}
            {selectedWithdrawals.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {selectedWithdrawals.length} selected
                </span>
                <RoleGuard requiredPermission="transactions.approve">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("approve")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve All
                  </Button>
                </RoleGuard>
                <RoleGuard requiredPermission="transactions.reject">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("reject")}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Reject All
                  </Button>
                </RoleGuard>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="high_amount">High Amount</TabsTrigger>
              <TabsTrigger value="flagged">Flagged</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <TransactionsTable
                transactions={withdrawals}
                isLoading={isLoading}
                selectedTransactions={selectedWithdrawals}
                onSelectionChange={setSelectedWithdrawals}
                pagination={pagination}
                onPaginationChange={setPagination}
                totalTransactions={totalWithdrawals}
                onApprove={approveTransaction}
                canApprove={canApprove}
                canReject={canReject}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Withdrawal Approval Component */}
      <WithdrawalApproval
        selectedWithdrawals={selectedWithdrawals}
        onApproval={handleBulkAction}
        canApprove={!!canApprove}
        canReject={!!canReject}
      />
    </div>
  );
}
