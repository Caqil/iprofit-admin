"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Calendar,
  MoreHorizontal,
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTransactions } from "@/hooks/use-transactions";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { TransactionFilter, PaginationParams } from "@/types";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { RoleGuard } from "@/components/auth/role-guard";

// Import components
import { TransactionsTable } from "./components/transactions-table";
import { TransactionFilters } from "./components/transaction-filters";
import { TransactionSummaryCards } from "./components/transactions-summary-cards";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

export default function TransactionsPage() {
  const { user } = useAuth();

  // State management
  const [filters, setFilters] = useState<TransactionFilter>({});
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>(
    []
  );
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Apply filters based on active tab and search
  const appliedFilters = useMemo(
    () => ({
      ...filters,
      search: searchTerm || undefined,
      dateFrom: dateRange.from?.toISOString(),
      dateTo: dateRange.to?.toISOString(),
      // Apply tab-based filters
      ...(activeTab === "pending" && { status: "Pending" as const }),
      ...(activeTab === "approved" && { status: "Approved" as const }),
      ...(activeTab === "rejected" && { status: "Rejected" as const }),
      ...(activeTab === "deposits" && { type: "deposit" as const }),
      ...(activeTab === "withdrawals" && { type: "withdrawal" as const }),
      ...(activeTab === "flagged" && { flagged: true }),
    }),
    [filters, searchTerm, dateRange, activeTab]
  );

  // Use transactions hook
  const {
    transactions,
    totalTransactions,
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

  const handleBulkAction = async (action: string, reason?: string) => {
    if (selectedTransactions.length === 0) {
      toast.error("Please select transactions first");
      return;
    }

    try {
      await bulkAction({
        transactionIds: selectedTransactions,
        action: action as any,
        reason,
      });
      setSelectedTransactions([]);
    } catch (error) {
      console.error("Bulk action failed:", error);
    }
  };

  const handleExport = async (format: "csv" | "xlsx") => {
    await exportTransactions(format);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Permission checks
  const canApprove: boolean | undefined = !!(user && hasPermission(user.role, "transactions.approve"));
  const canReject: boolean | undefined = !!(user && hasPermission(user.role, "transactions.reject"));
  const canExport: boolean | undefined = !!(user && hasPermission(user.role, "transactions.export"));

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-bold tracking-tight">Transactions</h3>
          <p className="text-muted-foreground">
            Manage and monitor all financial transactions
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </RoleGuard>
        </div>
      </div>

      {/* Summary Cards */}
      <TransactionSummaryCards summary={summary} isLoading={isLoading} />

      {/* Filters and Search */}
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
                    placeholder="Search transactions..."
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

            {/* Filter Controls */}
            <TransactionFilters
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction List</CardTitle>
              <CardDescription>
                {totalTransactions} total transactions
              </CardDescription>
            </div>

            {/* Bulk Actions */}
            {selectedTransactions.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {selectedTransactions.length} selected
                </span>
                <RoleGuard requiredPermission="transactions.approve">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("approve")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </RoleGuard>
                <RoleGuard requiredPermission="transactions.reject">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("reject")}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </RoleGuard>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="deposits">Deposits</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
              <TabsTrigger value="flagged">Flagged</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <TransactionsTable
                transactions={transactions}
                isLoading={isLoading}
                selectedTransactions={selectedTransactions}
                onSelectionChange={setSelectedTransactions}
                pagination={pagination}
                onPaginationChange={setPagination}
                totalTransactions={totalTransactions}
                onApprove={approveTransaction}
                canApprove={canApprove}
                canReject={canReject}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
