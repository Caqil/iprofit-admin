// app/transactions/components/transactions-table.tsx
"use client";

import React, { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Flag,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Download,
  AlertTriangle,
  DollarSign,
  Calendar,
  User,
} from "lucide-react";
import { Transaction, TransactionApproval, PaginationParams } from "@/types";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TransactionDetailDialog } from "./transaction-detail-dialog";
import { TransactionApprovalDialog } from "./transaction-approve-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

interface TransactionsTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  selectedTransactions: string[];
  onSelectionChange: (selected: string[]) => void;
  pagination: PaginationParams;
  onPaginationChange: (pagination: PaginationParams) => void;
  totalTransactions: number;
  onApprove: (data: TransactionApproval) => Promise<void>;
  canApprove?: boolean;
  canReject?: boolean;
}

export function TransactionsTable({
  transactions,
  isLoading,
  selectedTransactions,
  onSelectionChange,
  pagination,
  onPaginationChange,
  totalTransactions,
  onApprove,
  canApprove = false,
  canReject = false,
}: TransactionsTableProps) {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">(
    "approve"
  );

  // Handle row selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(transactions.map((t) => t._id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (transactionId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedTransactions, transactionId]);
    } else {
      onSelectionChange(
        selectedTransactions.filter((id) => id !== transactionId)
      );
    }
  };

  // Handle sorting
  const handleSort = (column: string) => {
    const newSortOrder =
      pagination.sortBy === column && pagination.sortOrder === "asc"
        ? "desc"
        : "asc";

    onPaginationChange({
      ...pagination,
      sortBy: column,
      sortOrder: newSortOrder,
      page: 1,
    });
  };

  // Get sort icon
  const getSortIcon = (column: string) => {
    if (pagination.sortBy !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return pagination.sortOrder === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Approved":
        return "success";
      case "Rejected":
        return "destructive";
      case "Pending":
        return "warning";
      case "Processing":
        return "secondary";
      case "Failed":
        return "destructive";
      case "Cancelled":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Get type icon and color
  const getTypeDisplay = (type: string) => {
    switch (type) {
      case "deposit":
        return {
          icon: <ArrowDown className="h-3 w-3" />,
          color: "text-green-600",
          bg: "bg-green-50",
        };
      case "withdrawal":
        return {
          icon: <ArrowUp className="h-3 w-3" />,
          color: "text-red-600",
          bg: "bg-red-50",
        };
      case "bonus":
        return {
          icon: <DollarSign className="h-3 w-3" />,
          color: "text-blue-600",
          bg: "bg-blue-50",
        };
      case "profit":
        return {
          icon: <DollarSign className="h-3 w-3" />,
          color: "text-purple-600",
          bg: "bg-purple-50",
        };
      case "penalty":
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          color: "text-orange-600",
          bg: "bg-orange-50",
        };
      default:
        return {
          icon: <DollarSign className="h-3 w-3" />,
          color: "text-gray-600",
          bg: "bg-gray-50",
        };
    }
  };

  // Handle approval action
  const handleApprovalAction = (
    transaction: Transaction,
    action: "approve" | "reject"
  ) => {
    setSelectedTransaction(transaction);
    setApprovalAction(action);
    setShowApprovalDialog(true);
  };

  // Copy transaction ID
  const copyTransactionId = (transactionId: string) => {
    navigator.clipboard.writeText(transactionId);
    toast.success("Transaction ID copied to clipboard");
  };

  // Copy user ID
  const copyUserId = (userId: string) => {
    navigator.clipboard.writeText(userId);
    toast.success("User ID copied to clipboard");
  };

  // Get user display information
  const getUserDisplay = (transaction: any) => {
    // Handle both old format (string userId) and new format (populated user object)
    if (transaction.user && typeof transaction.user === "object") {
      return {
        name: transaction.user.name || "Unknown User",
        email: transaction.user.email || "",
        profilePicture: transaction.user.profilePicture,
        userId:
          transaction.userSubtitle ||
          transaction.originalUserId ||
          transaction.userId,
        initials: transaction.user.name
          ? transaction.user.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
          : "UU",
      };
    } else {
      // Fallback for old format or missing user data
      const userId =
        transaction.userSubtitle || transaction.userId || "Unknown";
      return {
        name: transaction.userDisplayName || "Unknown User",
        email: "",
        profilePicture: null,
        userId: userId,
        initials: userId.slice(0, 2).toUpperCase(),
      };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={
                    selectedTransactions.length === transactions.length &&
                    transactions.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("user.name")}
                  className="h-auto p-0 font-semibold"
                >
                  User
                  {getSortIcon("user.name")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("type")}
                  className="h-auto p-0 font-semibold"
                >
                  Type
                  {getSortIcon("type")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("amount")}
                  className="h-auto p-0 font-semibold"
                >
                  Amount
                  {getSortIcon("amount")}
                </Button>
              </TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("status")}
                  className="h-auto p-0 font-semibold"
                >
                  Status
                  {getSortIcon("status")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("createdAt")}
                  className="h-auto p-0 font-semibold"
                >
                  Created
                  {getSortIcon("createdAt")}
                </Button>
              </TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center space-y-2">
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No transactions found
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => {
                const typeDisplay = getTypeDisplay(transaction.type);
                const userDisplay = getUserDisplay(transaction);
                const isSelected = selectedTransactions.includes(
                  transaction._id
                );

                return (
                  <TableRow
                    key={transaction._id}
                    className={cn(
                      "hover:bg-muted/50",
                      isSelected && "bg-muted",
                      transaction.flagged && "border-l-4 border-l-orange-500"
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectRow(transaction._id, checked as boolean)
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={userDisplay.profilePicture} />
                          <AvatarFallback>
                            {userDisplay.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium truncate">
                              {userDisplay.name}
                            </p>
                            {transaction.flagged && (
                              <Flag className="h-3 w-3 text-orange-500" />
                            )}
                          </div>
                          {/* <div className="flex items-center space-x-2">
                            <p className="text-xs text-muted-foreground truncate">
                              {userDisplay.email && (
                                <span className="mr-2">{userDisplay.email}</span>
                              )}
                            </p>
                          </div> */}
                          <div className="flex items-center space-x-1 mt-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <button
                              onClick={() => copyUserId(userDisplay.userId)}
                              className="text-xs text-muted-foreground hover:text-foreground font-mono"
                              title="Click to copy User ID"
                            >
                              {userDisplay.userId.slice(0, 8)}...
                            </button>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div
                          className={cn(
                            "p-1 rounded-full",
                            typeDisplay.bg,
                            typeDisplay.color
                          )}
                        >
                          {typeDisplay.icon}
                        </div>
                        <span className="text-sm font-medium capitalize">
                          {transaction.type}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {formatCurrency(
                            transaction.amount,
                            transaction.currency
                          )}
                        </div>
                        {transaction.fees > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Fee:{" "}
                            {formatCurrency(
                              transaction.fees,
                              transaction.currency
                            )}
                          </div>
                        )}
                        <div className="text-xs font-medium text-green-600">
                          Net:{" "}
                          {formatCurrency(
                            transaction.netAmount,
                            transaction.currency
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {transaction.gateway}
                        </div>
                        {transaction.transactionId && (
                          <button
                            onClick={() =>
                              copyTransactionId(transaction.transactionId!)
                            }
                            className="text-xs text-muted-foreground hover:text-foreground font-mono"
                            title="Click to copy Transaction ID"
                          >
                            {transaction.transactionId.slice(0, 8)}...
                          </button>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          getStatusBadgeVariant(transaction.status) as any
                        }
                        className="text-xs"
                      >
                        {transaction.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          {format(
                            new Date(transaction.createdAt),
                            "MMM dd, yyyy"
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(transaction.createdAt), "hh:mm a")}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>

                          {transaction.transactionId && (
                            <DropdownMenuItem
                              onClick={() =>
                                copyTransactionId(transaction.transactionId!)
                              }
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Transaction ID
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => copyUserId(userDisplay.userId)}
                          >
                            <User className="mr-2 h-4 w-4" />
                            Copy User ID
                          </DropdownMenuItem>

                          {transaction.status === "Pending" && canApprove && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleApprovalAction(transaction, "approve")
                                }
                                className="text-green-600"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                            </>
                          )}

                          {transaction.status === "Pending" && canReject && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleApprovalAction(transaction, "reject")
                              }
                              className="text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination
        currentPage={pagination.page}
        pageSize={pagination.limit}
        totalPages={Math.ceil(totalTransactions / pagination.limit)}
        totalItems={totalTransactions}
        onPageChange={(currentPage) =>
          onPaginationChange({ ...pagination, page: currentPage })
        }
        onPageSizeChange={(pageSize) =>
          onPaginationChange({ ...pagination, limit: pageSize, page: 1 })
        }
      />

      {/* Dialogs */}
      {selectedTransaction && (
        <>
          <TransactionDetailDialog
            transaction={selectedTransaction}
            open={showDetailDialog}
            onOpenChange={setShowDetailDialog}
          />

          <TransactionApprovalDialog
            transaction={selectedTransaction}
            action={approvalAction}
            open={showApprovalDialog}
            onOpenChange={setShowApprovalDialog}
            onConfirm={async (data) => {
              if (!selectedTransaction) return;
              await onApprove({
                transactionId: selectedTransaction._id,
                action: data.action,
                reason: data.reason,
                adminNotes: data.adminNotes,
              });
            }}
          />
        </>
      )}
    </>
  );
}
