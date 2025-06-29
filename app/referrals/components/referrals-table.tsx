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
        // Assuming you only have referrerId, display it
        const referrerId = row.original.referrerId;
        return (
          <div>
            <div className="font-medium">{referrerId}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "referee",
      header: "Referee",
      cell: ({ row }) => {
        const refereeId = row.original.refereeId;
        return (
          <div>
            <div className="font-medium">{refereeId}</div>
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
        return (
          <div>
            <div className="font-medium">{formatCurrency(amount, "BDT")}</div>
            {profitBonus > 0 && (
              <div className="text-sm text-muted-foreground">
                + {formatCurrency(profitBonus, "BDT")} profit
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
          ? selection(
              selectedReferrals.reduce(
                (acc, id) => ({ ...acc, [id]: true }),
                {}
              )
            )
          : selection;
      setSelectedReferrals(
        Object.keys(newSelection).filter((key) => newSelection[key])
      );
    },
    state: {
      rowSelection: selectedReferrals.reduce(
        (acc, id) => ({ ...acc, [id]: true }),
        {}
      ),
    },
  });

  const totalPages = Math.ceil(totalReferrals / pagination.limit);
  const hasSelectedPending = selectedReferrals.some(
    (id) => referrals.find((r) => r._id === id)?.status === "Pending"
  );

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedReferrals.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedReferrals.length} referral(s) selected
              </span>
              {hasSelectedPending && (
                <div className="flex space-x-2">
                  <Button size="sm" onClick={() => setShowApproveDialog(true)}>
                    <Check className="mr-2 h-4 w-4" />
                    Approve Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject Selected
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Referrals ({totalReferrals.toLocaleString()})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <div className="rounded-md border">
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
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, totalReferrals)}{" "}
                  of {totalReferrals} referrals
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onPaginationChange({
                        ...pagination,
                        page: pagination.page - 1,
                      })
                    }
                    disabled={pagination.page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onPaginationChange({
                        ...pagination,
                        page: pagination.page + 1,
                      })
                    }
                    disabled={pagination.page >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Referral Bonuses</DialogTitle>
            <DialogDescription>
              You are about to approve {selectedReferrals.length} referral
              bonus(es). This will create transactions and update user balances.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="adjustedAmount">Adjusted Amount (Optional)</Label>
              <Input
                id="adjustedAmount"
                type="number"
                placeholder="Leave empty to use original amount"
                value={adjustedAmount || ""}
                onChange={(e) =>
                  setAdjustedAmount(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                If specified, this amount will be used instead of the original
                bonus amount
              </p>
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
              {processingAction && <LoadingSpinner className="mr-2 h-4 w-4" />}
              Approve Bonuses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Referral Bonuses</DialogTitle>
            <DialogDescription>
              You are about to reject {selectedReferrals.length} referral
              bonus(es). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
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
              {processingAction && <LoadingSpinner className="mr-2 h-4 w-4" />}
              Reject Bonuses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
