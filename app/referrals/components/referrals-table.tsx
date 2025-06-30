// app/referrals/components/referrals-table.tsx - FIXED VERSION
"use client";

import React, { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MoreHorizontal,
  Check,
  X,
  Eye,
  Calculator,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Referral, PaginationParams } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReferralsTableProps {
  referrals: Referral[];
  totalReferrals: number;
  pagination: PaginationParams;
  onPaginationChange: (pagination: PaginationParams) => void;
  isLoading: boolean;
  onApprove: (referralIds: string[], adjustedAmount?: number) => Promise<void>;
  onReject: (referralIds: string[], reason?: string) => Promise<void>;
}

export function ReferralsTable({
  referrals,
  totalReferrals,
  pagination,
  onPaginationChange,
  isLoading,
  onApprove,
  onReject,
}: ReferralsTableProps) {
  const [selectedReferrals, setSelectedReferrals] = useState<string[]>([]);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [adjustedAmount, setAdjustedAmount] = useState<number | undefined>();
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  const getStatusBadge = (status: string) => {
    const variants = {
      Pending: "bg-yellow-100 text-yellow-800",
      Paid: "bg-green-100 text-green-800",
      Cancelled: "bg-red-100 text-red-800",
    };
    return (
      variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"
    );
  };

  const getBonusTypeBadge = (bonusType: string) => {
    const variants = {
      signup: "bg-blue-100 text-blue-800",
      profit_share: "bg-purple-100 text-purple-800",
    };
    return (
      variants[bonusType as keyof typeof variants] ||
      "bg-gray-100 text-gray-800"
    );
  };

  const handleApprove = async () => {
    setProcessingAction(true);
    try {
      await onApprove(selectedReferrals, adjustedAmount);
      setSelectedReferrals([]);
      setShowApproveDialog(false);
      setAdjustedAmount(undefined);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReject = async () => {
    setProcessingAction(true);
    try {
      await onReject(selectedReferrals, rejectionReason);
      setSelectedReferrals([]);
      setShowRejectDialog(false);
      setRejectionReason("");
    } finally {
      setProcessingAction(false);
    }
  };

  const columns: ColumnDef<Referral>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "referrer",
      header: "Referrer",
      cell: ({ row }) => {
        // FIXED: Access the populated referrer data correctly
        const referrer = row.original.referrer;

        if (!referrer) {
          return (
            <div className="text-muted-foreground">
              <div className="text-sm">No referrer data</div>
            </div>
          );
        }

        return (
          <div>
            <div className="font-medium">{referrer.name}</div>
            <div className="text-sm text-muted-foreground">
              {referrer.email}
            </div>
            {referrer.referralCode && (
              <div className="text-xs text-blue-600">
                #{referrer.referralCode}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "referee",
      header: "Referee",
      cell: ({ row }) => {
        // FIXED: Access the populated referee data correctly
        const referee = row.original.referee;

        if (!referee) {
          return (
            <div className="text-muted-foreground">
              <div className="text-sm">No referee data</div>
            </div>
          );
        }

        return (
          <div>
            <div className="font-medium">{referee.name}</div>
            <div className="text-sm text-muted-foreground">{referee.email}</div>
            {referee.kycStatus && (
              <Badge
                variant="outline"
                className={`text-xs mt-1 ${
                  referee.kycStatus === "Approved"
                    ? "text-green-600"
                    : referee.kycStatus === "Rejected"
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              >
                KYC: {referee.kycStatus}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "bonusType",
      header: "Type",
      cell: ({ row }) => (
        <Badge className={getBonusTypeBadge(row.getValue("bonusType"))}>
          {row.getValue("bonusType") === "signup" ? "Signup" : "Profit Share"}
        </Badge>
      ),
    },
    {
      accessorKey: "bonusAmount",
      header: "Bonus Amount",
      cell: ({ row }) => {
        const amount = row.getValue("bonusAmount") as number;
        const profitBonus = row.original.profitBonus || 0;
        const totalBonus = amount + profitBonus;

        return (
          <div>
            <div className="font-medium">
              {formatCurrency(totalBonus, "BDT")}
            </div>
            {profitBonus > 0 && (
              <div className="text-sm text-muted-foreground">
                Base: {formatCurrency(amount, "BDT")} + Profit:{" "}
                {formatCurrency(profitBonus, "BDT")}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={getStatusBadge(row.getValue("status"))}>
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDate(row.getValue("createdAt")),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const referral = row.original;
        const isPending = referral.status === "Pending";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {isPending && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedReferrals([referral._id]);
                      setShowApproveDialog(true);
                    }}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedReferrals([referral._id]);
                      setShowRejectDialog(true);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}
              {referral.bonusType === "profit_share" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Calculator className="mr-2 h-4 w-4" />
                    Recalculate Profit
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: referrals,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: (selection) => {
      const newSelection =
        typeof selection === "function"
          ? selection(table.getState().rowSelection)
          : selection;

      const selectedIds = Object.keys(newSelection).filter(
        (key) => newSelection[key]
      );
      setSelectedReferrals(
        selectedIds.map((index) => referrals[parseInt(index)]._id)
      );
    },
    state: {
      rowSelection: selectedReferrals.reduce((acc, id) => {
        const index = referrals.findIndex((r) => r._id === id);
        if (index !== -1) acc[index] = true;
        return acc;
      }, {} as Record<string, boolean>),
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedReferrals.length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedReferrals.length} referral(s) selected
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              onClick={() => setShowApproveDialog(true)}
              disabled={processingAction}
            >
              <Check className="mr-2 h-4 w-4" />
              Approve Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRejectDialog(true)}
              disabled={processingAction}
            >
              <X className="mr-2 h-4 w-4" />
              Reject Selected
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No referrals found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, totalReferrals)} of{" "}
          {totalReferrals} referrals
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onPaginationChange({ ...pagination, page: pagination.page - 1 })
            }
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm">
            Page {pagination.page} of{" "}
            {Math.ceil(totalReferrals / pagination.limit)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onPaginationChange({ ...pagination, page: pagination.page + 1 })
            }
            disabled={
              pagination.page >= Math.ceil(totalReferrals / pagination.limit)
            }
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Approval Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Referral Bonuses</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve {selectedReferrals.length}{" "}
              referral bonus(es)? This will create transactions and update user
              balances.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adjusted-amount" className="text-right">
                Adjusted Amount (optional)
              </Label>
              <Input
                id="adjusted-amount"
                type="number"
                placeholder="Leave empty for original amount"
                value={adjustedAmount || ""}
                onChange={(e) =>
                  setAdjustedAmount(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={processingAction}
            >
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processingAction}>
              {processingAction ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Processing...
                </>
              ) : (
                "Approve"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Referral Bonuses</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {selectedReferrals.length}{" "}
              referral bonus(es)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rejection-reason" className="text-right">
                Reason
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={processingAction}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processingAction}
            >
              {processingAction ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Processing...
                </>
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
