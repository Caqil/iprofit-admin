"use client";

import React, { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Calculator,
  FileText,
  Eye,
  Search,
  Calendar,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLoans } from "@/hooks/use-loans";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { LoanFilter, PaginationParams, LoanStatus } from "@/types";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { RoleGuard } from "@/components/auth/role-guard";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

// Import loan components
import { LoansTable } from "./components/loans-table";
import { EMICalculator } from "./components/emi-calculator";
import { CreditScoreDisplay } from "./components/credit-score-display";

export default function LoansPage() {
  const { user } = useAuth();

  // State management
  const [filters, setFilters] = useState<LoanFilter>({});
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedLoans, setSelectedLoans] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEMICalculator, setShowEMICalculator] = useState(false);

  // Apply filters based on active tab and search
  const appliedFilters = useMemo(() => {
    let statusFilter: LoanStatus | undefined;

    switch (activeTab) {
      case "pending":
        statusFilter = "Pending";
        break;
      case "approved":
        statusFilter = "Approved";
        break;
      case "active":
        statusFilter = "Active";
        break;
      case "completed":
        statusFilter = "Completed";
        break;
      case "overdue":
        return { ...filters, isOverdue: true };
      default:
        statusFilter = undefined;
    }

    const result: LoanFilter = {
      ...filters,
      status: statusFilter,
    };

    if (searchTerm.trim()) {
      result.search = searchTerm.trim();
    }

    if (dateRange.from) {
      result.dateFrom = dateRange.from.toISOString();
    }
    if (dateRange.to) {
      result.dateTo = dateRange.to.toISOString();
    }

    return result;
  }, [filters, activeTab, searchTerm, dateRange]);

  // Fetch loans data
  const {
    loans,
    analytics,
    totalLoans,
    isLoading,
    error,
    refreshLoans,
    approveLoan,
    rejectLoan,
    deleteLoan,
  } = useLoans(appliedFilters, pagination);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof LoanFilter, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedLoans.length === 0) {
      toast.error("Please select loans to perform bulk action");
      return;
    }

    try {
      switch (action) {
        case "approve":
          for (const loanId of selectedLoans) {
            await approveLoan({ loanId, action: "approve" });
          }
          toast.success(
            `${selectedLoans.length} loan(s) approved successfully`
          );
          break;
        case "reject":
          for (const loanId of selectedLoans) {
            await rejectLoan(loanId, "Bulk rejection");
          }
          toast.success(
            `${selectedLoans.length} loan(s) rejected successfully`
          );
          break;
        case "delete":
          for (const loanId of selectedLoans) {
            await deleteLoan(loanId);
          }
          toast.success(`${selectedLoans.length} loan(s) deleted successfully`);
          break;
      }
      setSelectedLoans([]);
      refreshLoans();
    } catch (error) {
      toast.error(`Bulk action failed: ${error}`);
    }
  };

  // Export loans data
  const handleExport = () => {
    // Implementation for exporting loans data
    toast.success("Export functionality will be implemented");
  };

  // Summary cards data
  const summaryCards = [
    {
      title: "Total Loans",
      value: analytics?.totalLoans || 0,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Active Loans",
      value: analytics?.activeLoans || 0,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total Disbursed",
      value: `$${analytics?.totalDisbursed?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Overdue Amount",
      value: `$${analytics?.overdueAmount?.toLocaleString() || 0}`,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Loans Management
          </h1>
          <p className="text-muted-foreground">
            Manage loan applications, approvals, and repayments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEMICalculator(true)}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            EMI Calculator
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshLoans}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <RoleGuard
            allowedRoles={["SuperAdmin"]}
            anyPermissions={["loans.create"]}
          >
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Loan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Loan Application</DialogTitle>
                  <DialogDescription>
                    Create a new loan application for a user
                  </DialogDescription>
                </DialogHeader>
                {/* <LoanApplicationReview
                  mode="create"
                  onSuccess={() => {
                    setShowCreateDialog(false);
                    refreshLoans();
                  }}
                  onCancel={() => setShowCreateDialog(false)}
                /> */}
              </DialogContent>
            </Dialog>
          </RoleGuard>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search loans..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.status || "all"}
            onValueChange={(value) =>
              handleFilterChange("status", value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Defaulted">Defaulted</SelectItem>
            </SelectContent>
          </Select>

          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
            placeholder="Select date range"
          />

          <Input
            type="number"
            placeholder="Min Amount"
            value={filters.amountMin || ""}
            onChange={(e) =>
              handleFilterChange(
                "amountMin",
                e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
            className="w-[120px]"
          />

          <Input
            type="number"
            placeholder="Max Amount"
            value={filters.amountMax || ""}
            onChange={(e) =>
              handleFilterChange(
                "amountMax",
                e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
            className="w-[120px]"
          />

          {/* Clear filters button */}
          {(Object.keys(appliedFilters).length > 0 || searchTerm) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({});
                setSearchTerm("");
                setDateRange({});
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Loans Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <LoansTabContent />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <LoansTabContent />
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <LoansTabContent />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <LoansTabContent />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <LoansTabContent />
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <LoansTabContent />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Loan Analytics</CardTitle>
              <CardDescription>
                Comprehensive analytics for loan performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-medium">Approval Rate</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {(analytics.approvalRate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Default Rate</h4>
                    <p className="text-2xl font-bold text-red-600">
                      {(analytics.defaultRate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Average Loan Amount</h4>
                    <p className="text-2xl font-bold">
                      ${analytics.averageLoanAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Average Credit Score</h4>
                    <CreditScoreDisplay score={analytics.averageCreditScore} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* EMI Calculator Dialog */}
      <Dialog open={showEMICalculator} onOpenChange={setShowEMICalculator}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>EMI Calculator</DialogTitle>
            <DialogDescription>
              Calculate EMI for loan amounts with different interest rates and
              tenures
            </DialogDescription>
          </DialogHeader>
          <EMICalculator />
        </DialogContent>
      </Dialog>
    </div>
  );

  // Loans table content component
  function LoansTabContent() {
    if (error) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
              <p className="text-red-600 font-medium">Error loading loans</p>
              <p className="text-sm text-gray-600">{error}</p>
              <Button onClick={refreshLoans} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Loans ({totalLoans})</CardTitle>
            {selectedLoans.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedLoans.length} selected
                </span>
                <RoleGuard
                  allowedRoles={["SuperAdmin", "Admin"]}
                  anyPermissions={["loans.approve"]}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction("approve")}
                  >
                    Approve Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction("reject")}
                  >
                    Reject Selected
                  </Button>
                </RoleGuard>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <LoansTable
              loans={loans}
              selectedLoans={selectedLoans}
              onSelectionChange={setSelectedLoans}
              pagination={pagination}
              onPaginationChange={setPagination}
              totalItems={totalLoans}
            />
          )}
        </CardContent>
      </Card>
    );
  }
}
