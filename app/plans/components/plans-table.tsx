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
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  Star,
  DollarSign,
} from "lucide-react";
import { Plan, PaginationParams } from "@/types";
import { PlanWithStats } from "@/types/plan";
import { formatCurrency, formatDate } from "@/lib/utils";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanForm } from "./plan-form";

interface PlansTableProps {
  plans: PlanWithStats[]; // Use extended type that includes userCount
  totalPlans: number;
  pagination: PaginationParams;
  onPaginationChange: (pagination: PaginationParams) => void;
  isLoading: boolean;
  onUpdate: (planId: string, data: Partial<Plan>) => Promise<Plan>;
  onDelete: (planId: string) => Promise<void>;
}

export function PlansTable({
  plans,
  totalPlans,
  pagination,
  onPaginationChange,
  isLoading,
  onUpdate,
  onDelete,
}: PlansTableProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanWithStats | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  const handleEdit = (plan: PlanWithStats) => {
    setSelectedPlan(plan);
    setShowEditDialog(true);
  };

  const handleDelete = (plan: PlanWithStats) => {
    setSelectedPlan(plan);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedPlan) return;

    setProcessingAction(true);
    try {
      await onDelete(selectedPlan._id);
      setShowDeleteDialog(false);
      setSelectedPlan(null);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleUpdate = async (data: Partial<Plan>) => {
    if (!selectedPlan) return;

    setProcessingAction(true);
    try {
      await onUpdate(selectedPlan._id, data);
      setShowEditDialog(false);
      setSelectedPlan(null);
    } finally {
      setProcessingAction(false);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">Active</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
    );
  };

  const getPriorityBadge = (priority: number) => {
    if (priority <= 1) return <Badge variant="default">High</Badge>;
    if (priority <= 3) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  const columns: ColumnDef<PlanWithStats>[] = [
    {
      accessorKey: "name",
      header: "Plan Name",
      cell: ({ row }) => {
        const plan = row.original;
        return (
          <div className="flex items-center space-x-2">
            <div>
              <div className="font-medium">{plan.name}</div>
              <div className="text-sm text-muted-foreground line-clamp-1">
                {plan.description}
              </div>
            </div>
            {plan.priority === 1 && (
              <Star className="h-4 w-4 text-yellow-500" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => {
        const plan = row.original;
        return (
          <div>
            <div className="font-medium">
              {formatCurrency(plan.price, plan.currency || "BDT")}
            </div>
            {plan.duration && (
              <div className="text-sm text-muted-foreground">
                {plan.duration} days
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "limits",
      header: "Limits",
      cell: ({ row }) => {
        const plan = row.original;
        return (
          <div className="space-y-1">
            <div className="text-xs">
              Deposit:{" "}
              {formatCurrency(plan.depositLimit, plan.currency || "BDT")}
            </div>
            <div className="text-xs">
              Withdrawal:{" "}
              {formatCurrency(plan.withdrawalLimit, plan.currency || "BDT")}
            </div>
            <div className="text-xs">
              Profit: {formatCurrency(plan.profitLimit, plan.currency || "BDT")}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "userCount",
      header: "Users",
      cell: ({ row }) => {
        const userCount = row.original.userCount || 0;
        return (
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{userCount.toLocaleString()}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => getPriorityBadge(row.getValue("priority")),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.getValue("isActive")),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDate(row.getValue("createdAt")),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const plan = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(plan)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Plan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(plan)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: plans,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.ceil(totalPlans / pagination.limit);

  return (
    <div className="space-y-4">
      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Plans ({totalPlans.toLocaleString()})</CardTitle>
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
                        <TableRow key={row.id}>
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
                          No plans found.
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
                  {Math.min(pagination.page * pagination.limit, totalPlans)} of{" "}
                  {totalPlans} plans
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

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>
              Update the plan details below. Changes will affect all users
              assigned to this plan.
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <PlanForm
              initialData={selectedPlan}
              onSubmit={handleUpdate}
              onCancel={() => setShowEditDialog(false)}
              isLoading={processingAction}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the plan "{selectedPlan?.name}"?
              This action cannot be undone. Users assigned to this plan will
              need to be reassigned to another plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingAction}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={processingAction}
              className="bg-red-600 hover:bg-red-700"
            >
              {processingAction && <LoadingSpinner className="mr-2 h-4 w-4" />}
              Delete Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
