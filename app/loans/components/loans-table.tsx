// app/loans/components/loans-table.tsx
"use client";

import React, { useState } from "react";
import {
  MoreHorizontal,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Trash2,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  AlertTriangle,
  Clock,
  FileText,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loan, PaginationParams } from "@/types";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/hooks/use-auth";
import { useLoans } from "@/hooks/use-loans";
import { toast } from "sonner";
import { RoleGuard } from "@/components/auth/role-guard";
import { Pagination } from "@/components/shared/pagination";
import { CreditScoreDisplay } from "./credit-score-display";

interface LoansTableProps {
  loans: Loan[];
  selectedLoans: string[];
  onSelectionChange: (selected: string[]) => void;
  pagination: PaginationParams;
  onPaginationChange: (pagination: PaginationParams) => void;
  totalItems: number;
}

export function LoansTable({
  loans,
  selectedLoans,
  onSelectionChange,
  pagination,
  onPaginationChange,
  totalItems,
}: LoansTableProps) {
  const { user } = useAuth();
  const { approveLoan, rejectLoan, deleteLoan } = useLoans();

  // State for dialogs
  const [viewingLoan, setViewingLoan] = useState<Loan | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [deletingLoan, setDeletingLoan] = useState<Loan | null>(null);

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(loans.map((loan) => loan._id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectLoan = (loanId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedLoans, loanId]);
    } else {
      onSelectionChange(selectedLoans.filter((id) => id !== loanId));
    }
  };

  // Handle loan actions
  const handleApproveLoan = async (loan: Loan) => {
    try {
      await approveLoan({
        loanId: loan._id,
        action: "approve",
      });
      toast.success("Loan approved successfully");
    } catch (error) {
      toast.error(`Failed to approve loan: ${error}`);
    }
  };

  const handleRejectLoan = async (loan: Loan) => {
    try {
      await rejectLoan(loan._id, "Rejected by admin");
      toast.success("Loan rejected successfully");
    } catch (error) {
      toast.error(`Failed to reject loan: ${error}`);
    }
  };

  const handleDeleteLoan = async (loan: Loan) => {
    try {
      await deleteLoan(loan._id);
      toast.success("Loan deleted successfully");
      setDeletingLoan(null);
    } catch (error) {
      toast.error(`Failed to delete loan: ${error}`);
    }
  };

  // Get status badge variant
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

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-3 w-3" />;
      case "Approved":
        return <CheckCircle className="h-3 w-3" />;
      case "Active":
        return <TrendingUp className="h-3 w-3" />;
      case "Completed":
        return <CheckCircle className="h-3 w-3" />;
      case "Rejected":
        return <XCircle className="h-3 w-3" />;
      case "Defaulted":
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  // Calculate completion percentage
  const getCompletionPercentage = (loan: Loan) => {
    if (loan.status === "Completed") return 100;
    if (loan.status === "Pending" || loan.status === "Rejected") return 0;
    return Math.round(
      ((loan.amount - loan.remainingAmount) / loan.amount) * 100
    );
  };

  // Handle sorting
  const handleSort = (field: string) => {
    const newSortOrder =
      pagination.sortBy === field && pagination.sortOrder === "asc"
        ? "desc"
        : "asc";

    onPaginationChange({
      ...pagination,
      sortBy: field,
      sortOrder: newSortOrder,
      page: 1,
    });
  };

  if (loans.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No loans found
        </h3>
        <p className="text-gray-500">
          There are no loans matching your current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedLoans.length === loans.length}
                  onCheckedChange={handleSelectAll}
                  ref={(el) => {
                    // Only set indeterminate if ref is an input element
                    if (el && "indeterminate" in el) {
                      (el as HTMLInputElement).indeterminate =
                        selectedLoans.length > 0 &&
                        selectedLoans.length < loans.length;
                    }
                  }}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort("userId")}
              >
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Borrower
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort("amount")}
              >
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Amount
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <CreditCard className="h-4 w-4" />
                  Credit Score
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort("status")}
              >
                Status
              </TableHead>
              <TableHead>Progress</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort("createdAt")}
              >
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Applied
                </div>
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map((loan) => (
              <TableRow key={loan._id} className="hover:bg-muted/50">
                <TableCell>
                  <Checkbox
                    checked={selectedLoans.includes(loan._id)}
                    onCheckedChange={(checked) =>
                      handleSelectLoan(loan._id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">
                      {typeof loan.userId === "object" && loan.userId
                        ? (loan.userId as any).name
                        : "Unknown User"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {typeof loan.userId === "object" && loan.userId
                        ? (loan.userId as any).email
                        : "No email"}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">
                      {formatCurrency(loan.amount, loan.currency)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      EMI: {formatCurrency(loan.emiAmount, loan.currency)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <CreditScoreDisplay
                    score={loan.creditScore}
                    showLabel={false}
                  />
                </TableCell>
                <TableCell>
                  <Badge
                    variant={getStatusBadgeVariant(loan.status)}
                    className="gap-1"
                  >
                    {getStatusIcon(loan.status)}
                    {loan.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${getCompletionPercentage(loan)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {getCompletionPercentage(loan)}%
                      </span>
                    </div>
                    {loan.overdueAmount > 0 && (
                      <div className="text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Overdue:{" "}
                        {formatCurrency(loan.overdueAmount, loan.currency)}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm">{formatDate(loan.createdAt)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatRelativeTime(loan.createdAt)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => setViewingLoan(loan)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/loans/${loan._id}`} className="gap-2">
                          <FileText className="h-4 w-4" />
                          Full Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <RoleGuard
                        allowedRoles={["SuperAdmin", "Admin"]}
                        anyPermissions={["loans.approve"]}
                      >
                        {loan.status === "Pending" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleApproveLoan(loan)}
                              className="gap-2 text-green-600"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRejectLoan(loan)}
                              className="gap-2 text-red-600"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                      </RoleGuard>
                      <RoleGuard
                        allowedRoles={["SuperAdmin", "Admin"]}
                        anyPermissions={["loans.update"]}
                      >
                        <DropdownMenuItem
                          onClick={() => setEditingLoan(loan)}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </RoleGuard>
                      <RoleGuard
                        allowedRoles={["SuperAdmin", "Admin"]}
                        anyPermissions={["loans.delete"]}
                      >
                        {loan.status === "Pending" && (
                          <DropdownMenuItem
                            onClick={() => setDeletingLoan(loan)}
                            className="gap-2 text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </RoleGuard>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={Math.ceil(totalItems / pagination.limit)}
        pageSize={pagination.limit}
        totalItems={totalItems}
        onPageChange={(page) => onPaginationChange({ ...pagination, page })}
        onPageSizeChange={(limit) =>
          onPaginationChange({ ...pagination, limit, page: 1 })
        }
      />

      {/* View Loan Dialog */}
      <Dialog open={!!viewingLoan} onOpenChange={() => setViewingLoan(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loan Details</DialogTitle>
            <DialogDescription>
              Detailed information for loan application
            </DialogDescription>
          </DialogHeader>
          {/* {viewingLoan && (
            <LoanApplicationReview
              loan={viewingLoan}
              mode="view"
              onCancel={() => setViewingLoan(null)}
            />
          )} */}
        </DialogContent>
      </Dialog>

      {/* Edit Loan Dialog */}
      <Dialog open={!!editingLoan} onOpenChange={() => setEditingLoan(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Loan</DialogTitle>
            <DialogDescription>
              Update loan details and status
            </DialogDescription>
          </DialogHeader>
          {/* {editingLoan && (
            <LoanApplicationReview
              loan={editingLoan}
              mode="edit"
              onSuccess={() => setEditingLoan(null)}
              onCancel={() => setEditingLoan(null)}
            />
          )} */}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingLoan}
        onOpenChange={() => setDeletingLoan(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loan Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this loan application? This action
              cannot be undone. Only pending loan applications can be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingLoan && handleDeleteLoan(deletingLoan)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
