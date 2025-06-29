// app/loans/[id]/page.tsx
"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  User,
  Building,
  FileText,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Download,
  Mail,
  Phone,
  MapPin,
  Clock,
  Percent,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLoan } from "@/hooks/use-loans";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { RoleGuard } from "@/components/auth/role-guard";

import { RepaymentSchedule } from "../components/repayment-schedule";
import { CreditScoreDisplay } from "../components/credit-score-display";

export default function LoanDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  // Get loanId from params - handle both sync and async params
  const loanId = React.useMemo(() => {
    if (typeof params.id === "string") {
      return params.id;
    }
    return params.id?.[0] || "";
  }, [params.id]);

  const { loan, isLoading, error, refetch } = useLoan(loanId);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Handle loan actions
  const handleExportLoan = () => {
    if (!loan) return;

    const loanData = {
      id: loan._id,
      borrower:
        typeof loan.userId === "object" ? (loan.userId as any).name : "Unknown",
      amount: loan.amount,
      status: loan.status,
      interestRate: loan.interestRate,
      tenure: loan.tenure,
      emiAmount: loan.emiAmount,
      creditScore: loan.creditScore,
      totalPaid: loan.totalPaid,
      remainingAmount: loan.remainingAmount,
      createdAt: formatDate(loan.createdAt),
      disbursedAt: loan.disbursedAt ? formatDate(loan.disbursedAt) : null,
      completedAt: loan.completedAt ? formatDate(loan.completedAt) : null,
    };

    const csvContent = Object.entries(loanData)
      .map(([key, value]) => `${key},${value}`)
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loan-${loanId}-details.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Pending":
        return "secondary";
      case "Approved":
        return "default";
      case "Active":
        return "default";
      case "Completed":
        return "default";
      case "Rejected":
        return "destructive";
      case "Defaulted":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4" />;
      case "Approved":
        return <CheckCircle className="h-4 w-4" />;
      case "Active":
        return <TrendingUp className="h-4 w-4" />;
      case "Completed":
        return <CheckCircle className="h-4 w-4" />;
      case "Rejected":
        return <XCircle className="h-4 w-4" />;
      case "Defaulted":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Loan Not Found</h1>
          <p className="text-gray-600">
            {error ||
              "The loan you're looking for doesn't exist or you don't have permission to view it."}
          </p>
          <Button asChild>
            <Link href="/loans">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Loans
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const borrower =
    typeof loan.userId === "object" ? (loan.userId as any) : null;
  const completionPercentage =
    loan.amount > 0
      ? Math.round(((loan.amount - loan.remainingAmount) / loan.amount) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/loans">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Loan #{loan._id.slice(-8)}
            </h1>
            <p className="text-muted-foreground">
              Loan application details and management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportLoan}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <RoleGuard allowedRoles={["SuperAdmin"]} anyPermissions={["loans.update"]}>
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Loan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Loan</DialogTitle>
                  <DialogDescription>
                    Update loan details and status
                  </DialogDescription>
                </DialogHeader>
                {/* <LoanApplicationReview
                  loan={loan}
                  mode="edit"
                  onSuccess={() => {
                    setShowEditDialog(false);
                    refetch();
                  }}
                  onCancel={() => setShowEditDialog(false)}
                /> */}
              </DialogContent>
            </Dialog>
          </RoleGuard>
        </div>
      </div>

      {/* Status Banner */}
      <Card
        className={`border-l-4 ${
          loan.status === "Completed"
            ? "border-l-green-500 bg-green-50"
            : loan.status === "Active"
            ? "border-l-blue-500 bg-blue-50"
            : loan.status === "Rejected" || loan.status === "Defaulted"
            ? "border-l-red-500 bg-red-50"
            : "border-l-yellow-500 bg-yellow-50"
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge
                variant={getStatusBadgeVariant(loan.status)}
                className="gap-1 text-sm px-3 py-1"
              >
                {getStatusIcon(loan.status)}
                {loan.status}
              </Badge>
              <div className="text-sm text-muted-foreground">
                Last updated {formatRelativeTime(loan.updatedAt)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {formatCurrency(loan.amount, loan.currency)}
              </div>
              <div className="text-sm text-muted-foreground">Loan Amount</div>
            </div>
          </div>
          {loan.rejectionReason && (
            <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-md">
              <div className="text-sm font-medium text-red-800">
                Rejection Reason:
              </div>
              <div className="text-sm text-red-700">{loan.rejectionReason}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly EMI</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(loan.emiAmount, loan.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {loan.interestRate}% interest • {loan.tenure} months
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(loan.totalPaid, loan.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {completionPercentage}% completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(loan.remainingAmount, loan.currency)}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-orange-600 rounded-full h-2 transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Score</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <CreditScoreDisplay
              score={loan.creditScore}
              size="sm"
              variant="badge"
              showLabel={false}
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="borrower">Borrower</TabsTrigger>
          <TabsTrigger value="schedule">Repayment</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Loan Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Loan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      Application Date:
                    </span>
                    <div className="font-medium">
                      {formatDate(loan.createdAt)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Purpose:</span>
                    <div className="font-medium">{loan.purpose}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Loan Amount:</span>
                    <div className="font-medium">
                      {formatCurrency(loan.amount, loan.currency)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Interest Rate:
                    </span>
                    <div className="font-medium">
                      {loan.interestRate}% per annum
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tenure:</span>
                    <div className="font-medium">{loan.tenure} months</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">EMI Amount:</span>
                    <div className="font-medium">
                      {formatCurrency(loan.emiAmount, loan.currency)}
                    </div>
                  </div>
                  {loan.approvedAt && (
                    <div>
                      <span className="text-muted-foreground">
                        Approved Date:
                      </span>
                      <div className="font-medium">
                        {formatDate(loan.approvedAt)}
                      </div>
                    </div>
                  )}
                  {loan.disbursedAt && (
                    <div>
                      <span className="text-muted-foreground">
                        Disbursed Date:
                      </span>
                      <div className="font-medium">
                        {formatDate(loan.disbursedAt)}
                      </div>
                    </div>
                  )}
                </div>

                {loan.overdueAmount > 0 && (
                  <div className="p-3 bg-red-100 border border-red-200 rounded-md">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Overdue Amount:</span>
                      <span className="font-bold">
                        {formatCurrency(loan.overdueAmount, loan.currency)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      Principal Amount:
                    </span>
                    <span className="font-medium">
                      {formatCurrency(loan.amount, loan.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      Total Interest:
                    </span>
                    <span className="font-medium">
                      {formatCurrency(
                        loan.emiAmount * loan.tenure - loan.amount,
                        loan.currency
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        loan.emiAmount * loan.tenure,
                        loan.currency
                      )}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(loan.totalPaid, loan.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(loan.remainingAmount, loan.currency)}
                    </span>
                  </div>
                  {loan.penaltyAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Penalty:</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(loan.penaltyAmount, loan.currency)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completion Progress</span>
                    <span>{completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 rounded-full h-3 transition-all"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Borrower Tab */}
        <TabsContent value="borrower" className="space-y-6">
          {borrower ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Borrower Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Borrower Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{borrower.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Primary Borrower
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{borrower.email}</span>
                    </div>
                    {borrower.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{borrower.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span>KYC Status:</span>
                      <Badge
                        variant={
                          borrower.kycStatus === "Verified"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {borrower.kycStatus || "Pending"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Employment & Financial Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Employment & Financial
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Employment Status:
                      </span>
                      <div className="font-medium">{loan.employmentStatus}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Monthly Income:
                      </span>
                      <div className="font-medium">
                        {formatCurrency(loan.monthlyIncome, loan.currency)}
                      </div>
                    </div>
                    {loan.metadata?.employmentDetails && (
                      <>
                        <div>
                          <span className="text-muted-foreground">
                            Company:
                          </span>
                          <div className="font-medium">
                            {loan.metadata.employmentDetails.company}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Position:
                          </span>
                          <div className="font-medium">
                            {loan.metadata.employmentDetails.position}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Credit Information</h4>
                    <CreditScoreDisplay
                      score={loan.creditScore}
                      showTooltip
                      variant="card"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Borrower information not available
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Repayment Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <RepaymentSchedule loanId={loanId} />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Supporting Documents
              </CardTitle>
              <CardDescription>
                Documents submitted with the loan application
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loan.documents && loan.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loan.documents.map((doc, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <Badge variant="outline">{doc.type}</Badge>
                      </div>
                      <h4 className="font-medium mb-1">{doc.type}</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Uploaded: {formatDate(doc.uploadedAt)}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full"
                      >
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Document
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No documents uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Loan History
              </CardTitle>
              <CardDescription>
                Timeline of all loan activities and status changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Create timeline based on loan status changes */}
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                  <div className="relative flex items-center gap-4 pb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Application Submitted</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(loan.createdAt)} •{" "}
                        {formatRelativeTime(loan.createdAt)}
                      </p>
                    </div>
                  </div>

                  {loan.approvedAt && (
                    <div className="relative flex items-center gap-4 pb-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Application Approved</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(loan.approvedAt)} •{" "}
                          {formatRelativeTime(loan.approvedAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {loan.disbursedAt && (
                    <div className="relative flex items-center gap-4 pb-4">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Loan Disbursed</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(loan.disbursedAt)} •{" "}
                          {formatRelativeTime(loan.disbursedAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {loan.completedAt && (
                    <div className="relative flex items-center gap-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Loan Completed</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(loan.completedAt)} •{" "}
                          {formatRelativeTime(loan.completedAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {loan.status === "Rejected" && (
                    <div className="relative flex items-center gap-4">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <XCircle className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Application Rejected</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatRelativeTime(loan.updatedAt)}
                        </p>
                        {loan.rejectionReason && (
                          <p className="text-sm text-red-600 mt-1">
                            {loan.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
