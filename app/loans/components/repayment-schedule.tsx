// app/loans/components/repayment-schedule.tsx
"use client";

import React, { useState } from "react";
import {
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Download,
  CreditCard,
  Plus,
  Edit,
  Filter,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLoanRepayments } from "@/hooks/use-loans";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { RepaymentStatus } from "@/types";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { RoleGuard } from "@/components/auth/role-guard";

interface RepaymentScheduleProps {
  loanId: string;
}

interface PaymentRecord {
  installmentNumber: number;
  amount: number;
  paymentMethod: string;
  transactionReference?: string;
  notes?: string;
}

export function RepaymentSchedule({ loanId }: RepaymentScheduleProps) {
  const { user } = useAuth();
  const {
    repaymentSchedule,
    transactions,
    upcomingPayments,
    analytics,
    isLoading,
    error,
    refetch,
  } = useLoanRepayments(loanId);

  // State for recording payments
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<PaymentRecord>({
    installmentNumber: 0,
    amount: 0,
    paymentMethod: "Bank Transfer",
    transactionReference: "",
    notes: "",
  });

  // State for filters
  const [statusFilter, setStatusFilter] = useState<RepaymentStatus | "all">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "installmentNumber" | "dueDate" | "amount"
  >("installmentNumber");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Handle payment recording
  const handleRecordPayment = async () => {
    if (!selectedInstallment) return;

    setRecordingPayment(true);
    try {
      const response = await fetch(`/api/loans/${loanId}/repayment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod,
          transactionId: paymentData.transactionReference,
          notes: paymentData.notes,
          installmentNumbers: [paymentData.installmentNumber],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to record payment");
      }

      toast.success("Payment recorded successfully");
      setSelectedInstallment(null);
      setPaymentData({
        installmentNumber: 0,
        amount: 0,
        paymentMethod: "Bank Transfer",
        transactionReference: "",
        notes: "",
      });
      refetch();
    } catch (error) {
      toast.error(`Failed to record payment: ${error}`);
    } finally {
      setRecordingPayment(false);
    }
  };

  // Get status badge variant and icon
  const getStatusBadge = (status: RepaymentStatus, dueDate: Date) => {
    const isOverdue = status === "Pending" && new Date() > dueDate;

    if (isOverdue) {
      return {
        variant: "destructive" as const,
        icon: <AlertTriangle className="h-3 w-3" />,
        label: "Overdue",
      };
    }

    switch (status) {
      case "Paid":
        return {
          variant: "default" as const,
          icon: <CheckCircle className="h-3 w-3" />,
          label: "Paid",
        };
      case "Pending":
        return {
          variant: "secondary" as const,
          icon: <Clock className="h-3 w-3" />,
          label: "Pending",
        };
      case "Overdue":
        return {
          variant: "destructive" as const,
          icon: <AlertTriangle className="h-3 w-3" />,
          label: "Overdue",
        };
      default:
        return {
          variant: "secondary" as const,
          icon: <Clock className="h-3 w-3" />,
          label: status,
        };
    }
  };

  // Filter and sort schedule
  const filteredSchedule = React.useMemo(() => {
    let filtered =
      repaymentSchedule?.filter((installment) => {
        const matchesStatus =
          statusFilter === "all" || installment.status === statusFilter;
        const matchesSearch =
          !searchTerm ||
          installment.installmentNumber.toString().includes(searchTerm) ||
          formatDate(installment.dueDate)
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

        return matchesStatus && matchesSearch;
      }) || [];

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "installmentNumber":
          aValue = a.installmentNumber;
          bValue = b.installmentNumber;
          break;
        case "dueDate":
          aValue = new Date(a.dueDate);
          bValue = new Date(b.dueDate);
          break;
        case "amount":
          aValue = a.amount;
          bValue = b.amount;
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [repaymentSchedule, statusFilter, searchTerm, sortBy, sortOrder]);

  // Export schedule
  const exportSchedule = () => {
    if (!repaymentSchedule) return;

    const csvContent = [
      [
        "Installment",
        "Due Date",
        "Amount",
        "Principal",
        "Interest",
        "Status",
        "Paid Date",
      ],
      ...repaymentSchedule.map((installment) => [
        installment.installmentNumber,
        formatDate(installment.dueDate),
        installment.amount,
        installment.principal,
        installment.interest,
        installment.status,
        installment.paidAt ? formatDate(installment.paidAt) : "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loan-${loanId}-repayment-schedule.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="text-red-600 font-medium">
              Error loading repayment schedule
            </p>
            <p className="text-sm text-gray-600">{error}</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(analytics.totalPaid)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.paidInstallments} of {analytics.totalInstallments}{" "}
                installments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(analytics.remainingAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.remainingInstallments} installments left
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {analytics.completionPercentage}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-purple-600 rounded-full h-2 transition-all"
                  style={{ width: `${analytics.completionPercentage}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {analytics.overdueInstallments > 0 ? "Overdue" : "Next Payment"}
              </CardTitle>
              {analytics.overdueInstallments > 0 ? (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              ) : (
                <Calendar className="h-4 w-4 text-orange-600" />
              )}
            </CardHeader>
            <CardContent>
              {analytics.overdueInstallments > 0 ? (
                <>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(analytics.overdueAmount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.overdueInstallments} overdue payments
                  </p>
                </>
              ) : analytics.nextPaymentDate ? (
                <>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(analytics.nextPaymentAmount || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Due {formatRelativeTime(analytics.nextPaymentDate)}
                  </p>
                </>
              ) : (
                <div className="text-lg font-medium text-gray-500">
                  No pending payments
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="schedule" className="w-full">
        <TabsList>
          <TabsTrigger value="schedule">Repayment Schedule</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Payments</TabsTrigger>
        </TabsList>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Repayment Schedule</CardTitle>
                  <CardDescription>
                    Complete schedule of loan repayments
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <RoleGuard
                    allowedRoles={["SuperAdmin", "Admin"]}
                    anyPermissions={["loans.read"]}
                  >
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          Record Payment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Record Payment</DialogTitle>
                          <DialogDescription>
                            Record a payment for this loan
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Installment Number
                              </label>
                              <Select
                                value={paymentData.installmentNumber.toString()}
                                onValueChange={(value) => {
                                  const installment = repaymentSchedule?.find(
                                    (i) =>
                                      i.installmentNumber === parseInt(value)
                                  );
                                  setPaymentData((prev) => ({
                                    ...prev,
                                    installmentNumber: parseInt(value),
                                    amount: installment?.amount || 0,
                                  }));
                                  setSelectedInstallment(installment);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select installment" />
                                </SelectTrigger>
                                <SelectContent>
                                  {repaymentSchedule
                                    ?.filter((i) => i.status === "Pending")
                                    .map((installment) => (
                                      <SelectItem
                                        key={installment.installmentNumber}
                                        value={installment.installmentNumber.toString()}
                                      >
                                        #{installment.installmentNumber} -{" "}
                                        {formatCurrency(installment.amount)}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Amount
                              </label>
                              <Input
                                type="number"
                                value={paymentData.amount}
                                onChange={(e) =>
                                  setPaymentData((prev) => ({
                                    ...prev,
                                    amount: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                placeholder="Payment amount"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Payment Method
                            </label>
                            <Select
                              value={paymentData.paymentMethod}
                              onValueChange={(value) =>
                                setPaymentData((prev) => ({
                                  ...prev,
                                  paymentMethod: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Bank Transfer">
                                  Bank Transfer
                                </SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Check">Check</SelectItem>
                                <SelectItem value="Mobile Banking">
                                  Mobile Banking
                                </SelectItem>
                                <SelectItem value="Credit Card">
                                  Credit Card
                                </SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Transaction Reference
                            </label>
                            <Input
                              value={paymentData.transactionReference}
                              onChange={(e) =>
                                setPaymentData((prev) => ({
                                  ...prev,
                                  transactionReference: e.target.value,
                                }))
                              }
                              placeholder="Transaction ID or reference"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Notes</label>
                            <Input
                              value={paymentData.notes}
                              onChange={(e) =>
                                setPaymentData((prev) => ({
                                  ...prev,
                                  notes: e.target.value,
                                }))
                              }
                              placeholder="Additional notes"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setSelectedInstallment(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleRecordPayment}
                              disabled={
                                recordingPayment || !selectedInstallment
                              }
                            >
                              {recordingPayment
                                ? "Recording..."
                                : "Record Payment"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </RoleGuard>
                  <Button
                    variant="outline"
                    onClick={exportSchedule}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search installments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value: any) => setStatusFilter(value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={sortBy}
                  onValueChange={(value: any) => setSortBy(value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="installmentNumber">
                      Installment #
                    </SelectItem>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>

              {/* Schedule Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>EMI Amount</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedule.map((installment) => {
                      const statusBadge = getStatusBadge(
                        installment.status,
                        installment.dueDate
                      );
                      const isOverdue =
                        installment.status === "Pending" &&
                        new Date() > installment.dueDate;

                      return (
                        <TableRow
                          key={installment.installmentNumber}
                          className={isOverdue ? "bg-red-50" : ""}
                        >
                          <TableCell className="font-medium">
                            {installment.installmentNumber}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div>{formatDate(installment.dueDate)}</div>
                              {isOverdue && (
                                <div className="text-xs text-red-600">
                                  {Math.floor(
                                    (Date.now() -
                                      installment.dueDate.getTime()) /
                                      (1000 * 60 * 60 * 24)
                                  )}{" "}
                                  days overdue
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(installment.amount)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(installment.principal)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(installment.interest)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={statusBadge.variant}
                              className="gap-1"
                            >
                              {statusBadge.icon}
                              {statusBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {installment.paidAt ? (
                              <div className="space-y-1">
                                <div>{formatDate(installment.paidAt)}</div>
                                {installment.paidAmount &&
                                  installment.paidAmount !==
                                    installment.amount && (
                                    <div className="text-xs text-muted-foreground">
                                      Paid:{" "}
                                      {formatCurrency(installment.paidAmount)}
                                    </div>
                                  )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <RoleGuard
                              allowedRoles={["SuperAdmin", "Admin"]}
                              anyPermissions={["loans.read"]}
                            >
                              {installment.status === "Pending" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInstallment(installment);
                                    setPaymentData({
                                      installmentNumber:
                                        installment.installmentNumber,
                                      amount: installment.amount,
                                      paymentMethod: "Bank Transfer",
                                      transactionReference: "",
                                      notes: "",
                                    });
                                  }}
                                  className="gap-1"
                                >
                                  <CreditCard className="h-3 w-3" />
                                  Pay
                                </Button>
                              )}
                            </RoleGuard>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {filteredSchedule.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No installments found matching your filters
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                All recorded payments for this loan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions && transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">
                            Payment #{transaction.id.slice(-6)}
                          </span>
                          <Badge variant="outline">
                            {transaction.metadata?.paymentMethod || "Unknown"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(transaction.paidAt)} •{" "}
                          {formatRelativeTime(transaction.paidAt)}
                        </div>
                        {transaction.metadata?.notes && (
                          <div className="text-sm text-muted-foreground">
                            Note: {transaction.metadata.notes}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {formatCurrency(transaction.amount)}
                        </div>
                        {transaction.fees > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Fees: {formatCurrency(transaction.fees)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No payment history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Payments Tab */}
        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Payments</CardTitle>
              <CardDescription>
                Next few payments due for this loan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingPayments && upcomingPayments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingPayments.map((payment) => {
                    const daysUntilDue = Math.ceil(
                      (payment.dueDate.getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24)
                    );
                    const isUrgent = daysUntilDue <= 3;
                    const isOverdue = daysUntilDue < 0;

                    return (
                      <div
                        key={payment.installmentNumber}
                        className={`p-4 border rounded-lg ${
                          isOverdue
                            ? "border-red-200 bg-red-50"
                            : isUrgent
                            ? "border-yellow-200 bg-yellow-50"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                Installment #{payment.installmentNumber}
                              </span>
                              {isOverdue && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Overdue
                                </Badge>
                              )}
                              {isUrgent && !isOverdue && (
                                <Badge variant="secondary" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  Due Soon
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Due: {formatDate(payment.dueDate)}
                            </div>
                            <div className="text-sm">
                              {isOverdue ? (
                                <span className="text-red-600 font-medium">
                                  {Math.abs(daysUntilDue)} days overdue
                                </span>
                              ) : (
                                <span
                                  className={
                                    isUrgent
                                      ? "text-yellow-600 font-medium"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {daysUntilDue} days remaining
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              {formatCurrency(payment.amount)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Principal: {formatCurrency(payment.principal)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Interest: {formatCurrency(payment.interest)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No upcoming payments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
