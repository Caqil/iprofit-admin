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
                  onClick={() => handleSort("userId")}
                  className="h-auto p-0 font-semibold"
                >
                  User
                  {getSortIcon("userId")}
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
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={`/avatars/${transaction.userId}.png`}
                          />
                          <AvatarFallback>
                            {transaction.userId.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {transaction.userId}
                          </p>
                          {transaction.userNotes && (
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {transaction.userNotes}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div
                        className={cn(
                          "flex items-center space-x-2 px-2 py-1 rounded-md w-fit",
                          typeDisplay.bg
                        )}
                      >
                        <span className={typeDisplay.color}>
                          {typeDisplay.icon}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium capitalize",
                            typeDisplay.color
                          )}
                        >
                          {transaction.type}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {formatCurrency(
                            transaction.amount,
                            transaction.currency
                          )}
                        </p>
                        {transaction.fees > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Fee:{" "}
                            {formatCurrency(
                              transaction.fees,
                              transaction.currency
                            )}
                          </p>
                        )}
                        <p className="text-xs font-medium text-green-600">
                          Net:{" "}
                          {formatCurrency(
                            transaction.netAmount,
                            transaction.currency
                          )}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {transaction.gateway}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          variant={
                            getStatusBadgeVariant(transaction.status) as any
                          }
                        >
                          {transaction.status}
                        </Badge>
                        {transaction.flagged && (
                          <div className="flex items-center space-x-1">
                            <Flag className="h-3 w-3 text-orange-500" />
                            <span className="text-xs text-orange-600">
                              Flagged
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">
                          {format(
                            new Date(transaction.createdAt),
                            "MMM dd, yyyy"
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(transaction.createdAt), "HH:mm")}
                        </p>
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
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => copyTransactionId(transaction._id)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy ID
                          </DropdownMenuItem>

                          {transaction.status === "Pending" && (
                            <>
                              <DropdownMenuSeparator />
                              {canApprove && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleApprovalAction(transaction, "approve")
                                  }
                                  className="text-green-600"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve
                                </DropdownMenuItem>
                              )}
                              {canReject && (
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
                            </>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Export
                          </DropdownMenuItem>
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
        totalPages={Math.ceil(totalTransactions / pagination.limit)}
        pageSize={pagination.limit}
        totalItems={totalTransactions}
        onPageChange={(page) => onPaginationChange({ ...pagination, page })}
        onPageSizeChange={(limit) =>
          onPaginationChange({ ...pagination, limit, page: 1 })
        }
      />

      {/* Dialogs */}
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
          if (selectedTransaction) {
            await onApprove({
              transactionId: selectedTransaction._id,
              action: data.action,
              reason: data.reason,
              adminNotes: data.adminNotes,
            });
          }
          setShowApprovalDialog(false);
        }}
      />
    </>
  );
}
