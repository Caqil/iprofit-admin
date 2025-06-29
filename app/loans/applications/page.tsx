// app/loans/applications/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Filter,
  Download,
  RefreshCw,
  Search,
  Calendar,
  DollarSign,
  User,
  CreditCard,
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
import { useUserLoans } from "@/hooks/use-loans";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { LoanFilter, PaginationParams, LoanStatus } from "@/types";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { RoleGuard } from "@/components/auth/role-guard";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

// Import loan components
import { EMICalculator } from "../components/emi-calculator";
import { CreditScoreDisplay } from "../components/credit-score-display";

export default function LoanApplicationsPage() {
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
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
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
      case "rejected":
        statusFilter = "Rejected";
        break;
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

  // Fetch user's loan applications
  const {
    loans: applications,
    isLoading,
    error,
    refreshLoans,
    submitApplication,
  } = useUserLoans(appliedFilters);

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

  // Export applications data
  const handleExport = () => {
    if (!applications || applications.length === 0) {
      toast.error("No applications to export");
      return;
    }

    const csvContent = [
      ["Application ID", "Amount", "Status", "EMI", "Applied Date", "Purpose"],
      ...applications.map((app) => [
        app._id.slice(-8),
        app.amount,
        app.status,
        app.emiAmount,
        formatDate(app.createdAt),
        app.purpose,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loan-applications-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get status badge variant and icon
  const getStatusBadge = (status: LoanStatus) => {
    switch (status) {
      case "Pending":
        return {
          variant: "secondary" as const,
          icon: <Clock className="h-3 w-3" />,
          color: "text-yellow-600",
        };
      case "Approved":
        return {
          variant: "default" as const,
          icon: <CheckCircle className="h-3 w-3" />,
          color: "text-green-600",
        };
      case "Active":
        return {
          variant: "default" as const,
          icon: <TrendingUp className="h-3 w-3" />,
          color: "text-blue-600",
        };
      case "Completed":
        return {
          variant: "default" as const,
          icon: <CheckCircle className="h-3 w-3" />,
          color: "text-green-600",
        };
      case "Rejected":
        return {
          variant: "destructive" as const,
          icon: <XCircle className="h-3 w-3" />,
          color: "text-red-600",
        };
      case "Defaulted":
        return {
          variant: "destructive" as const,
          icon: <AlertTriangle className="h-3 w-3" />,
          color: "text-red-600",
        };
      default:
        return {
          variant: "secondary" as const,
          icon: <Clock className="h-3 w-3" />,
          color: "text-gray-600",
        };
    }
  };

//   // Summary cards data
//   const summaryCards = [
//     {
//       title: "Total Applications",
//       value: analytics?.totalLoans || 0,
//       icon: FileText,
//       color: "text-blue-600",
//       bgColor: "bg-blue-100",
//     },
//     {
//       title: "Active Loans",
//       value: analytics?.activeLoans || 0,
//       icon: TrendingUp,
//       color: "text-green-600",
//       bgColor: "bg-green-100",
//     },
//     {
//       title: "Total Borrowed",
//       value: `$${analytics?.totalDisbursed?.toLocaleString() || 0}`,
//       icon: DollarSign,
//       color: "text-purple-600",
//       bgColor: "bg-purple-100",
//     },
//     {
//       title: "Outstanding",
//       value: `$${analytics?.overdueAmount?.toLocaleString() || 0}`,
//       icon: AlertTriangle,
//       color: "text-red-600",
//       bgColor: "bg-red-100",
//     },
//   ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            My Loan Applications
          </h1>
          <p className="text-muted-foreground">
            View and manage your loan applications
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEMICalculator(true)}
            className="gap-2"
          >
            <CreditCard className="h-4 w-4" />
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
          <Dialog
            open={showApplicationDialog}
            onOpenChange={setShowApplicationDialog}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Application
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit Loan Application</DialogTitle>
                <DialogDescription>
                  Apply for a new loan with competitive rates
                </DialogDescription>
              </DialogHeader>
              {/* <LoanApplicationReview
                mode="create"
                onSuccess={() => {
                  setShowApplicationDialog(false);
                  refreshLoans();
                }}
                onCancel={() => setShowApplicationDialog(false)}
              /> */}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      </div> */}

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

      {/* Applications Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <ApplicationsTabContent />
        </TabsContent>
      </Tabs>

      {/* EMI Calculator Dialog */}
      <Dialog open={showEMICalculator} onOpenChange={setShowEMICalculator}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>EMI Calculator</DialogTitle>
            <DialogDescription>
              Calculate EMI for different loan amounts and check your
              eligibility
            </DialogDescription>
          </DialogHeader>
          <EMICalculator />
        </DialogContent>
      </Dialog>
    </div>
  );

  // Applications content component
  function ApplicationsTabContent() {
    if (error) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
              <p className="text-red-600 font-medium">
                Error loading applications
              </p>
              <p className="text-sm text-gray-600">{error}</p>
              <Button onClick={refreshLoans} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (isLoading) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </CardContent>
        </Card>
      );
    }

    if (!applications || applications.length === 0) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 text-gray-400 mx-auto" />
              <h3 className="text-lg font-medium text-gray-900">
                No applications found
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {activeTab === "all"
                  ? "You haven't submitted any loan applications yet. Get started by applying for a loan."
                  : `No ${activeTab} applications found. Try adjusting your filters.`}
              </p>
              {activeTab === "all" && (
                <Button
                  onClick={() => setShowApplicationDialog(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Apply for Loan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {applications.map((application) => {
          const statusBadge = getStatusBadge(application.status);
          const completionPercentage =
            application.amount > 0
              ? Math.round(
                  ((application.amount - application.remainingAmount) /
                    application.amount) *
                    100
                )
              : 0;

          return (
            <Card
              key={application._id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    #{application._id.slice(-8)}
                  </CardTitle>
                  <Badge variant={statusBadge.variant} className="gap-1">
                    {statusBadge.icon}
                    {application.status}
                  </Badge>
                </div>
                <CardDescription>
                  Applied {formatRelativeTime(application.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Loan Amount
                    </span>
                    <span className="font-bold text-lg">
                      {formatCurrency(application.amount, application.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Purpose
                    </span>
                    <span className="font-medium text-sm">
                      {application.purpose.length > 20
                        ? `${application.purpose.substring(0, 20)}...`
                        : application.purpose}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Tenure
                    </span>
                    <span className="font-medium">
                      {application.tenure} months
                    </span>
                  </div>
                </div>

                {/* Progress bar for active/completed loans */}
                {["Active", "Completed"].includes(application.status) && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {completionPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 rounded-full h-2 transition-all"
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>
                        Paid:{" "}
                        {formatCurrency(
                          application.totalPaid,
                          application.currency
                        )}
                      </span>
                      <span>
                        Remaining:{" "}
                        {formatCurrency(
                          application.remainingAmount,
                          application.currency
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Credit Score */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Credit Score
                  </span>
                  <CreditScoreDisplay
                    score={application.creditScore}
                    variant="badge"
                    size="sm"
                    showLabel={false}
                  />
                </div>

                {/* Overdue warning */}
                {application.overdueAmount > 0 && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center gap-2 text-red-700 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">
                        Overdue:{" "}
                        {formatCurrency(
                          application.overdueAmount,
                          application.currency
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Rejection reason */}
                {application.status === "Rejected" &&
                  application.rejectionReason && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                      <div className="text-red-700 text-sm">
                        <span className="font-medium">Rejected:</span>{" "}
                        {application.rejectionReason}
                      </div>
                    </div>
                  )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex-1"
                  >
                    <a href={`/loans/${application._id}`}>View Details</a>
                  </Button>

                  {application.status === "Active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <a href={`/loans/${application._id}#repayment`}>
                        Make Payment
                      </a>
                    </Button>
                  )}

                  {application.status === "Pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Open edit dialog - would need to implement
                        toast.info("Edit functionality coming soon");
                      }}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }
}
