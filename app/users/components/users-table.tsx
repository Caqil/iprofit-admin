
"use client";

import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Shield,
  Ban,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { User, PaginationParams } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationParams;
  onPaginationChange: (pagination: PaginationParams) => void;
  selectedUsers: string[];
  onSelectionChange: (selectedUsers: string[]) => void;
  totalUsers: number;
}

export function UsersTable({
  users,
  isLoading,
  error,
  pagination,
  onPaginationChange,
  selectedUsers,
  onSelectionChange,
  totalUsers,
}: UsersTableProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const canView = hasPermission(currentUser?.role || "Moderator", "users.view");
  const canEdit = hasPermission(currentUser?.role || "Moderator", "users.update");
  const canManageKYC = hasPermission(currentUser?.role || "Moderator", "users.kyc.approve");

  const getStatusBadge = (status: string) => {
    const variants = {
      Active: "bg-green-100 text-green-800",
      Suspended: "bg-orange-100 text-orange-800",
      Banned: "bg-red-100 text-red-800",
    };
    return variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800";
  };

  const getKYCBadge = (status: string) => {
    const variants = {
      Approved: "bg-green-100 text-green-800",
      Pending: "bg-yellow-100 text-yellow-800",
      Rejected: "bg-red-100 text-red-800",
    };
    return variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800";
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user status");
      }

      toast.success(`User status updated to ${newStatus}`);
      // Refresh the table data
      window.location.reload();
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const handleKYCAction = async (userId: string, action: "approve" | "reject") => {
    try {
      const response = await fetch(`/api/users/${userId}/kyc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} KYC`);
      }

      toast.success(`KYC ${action}d successfully`);
      // Refresh the table data
      window.location.reload();
    } catch (error) {
      toast.error(`Failed to ${action} KYC`);
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
            onSelectionChange(
              value
                ? users.map((user) => user._id)
                : []
            );
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value);
            const currentSelected = selectedUsers;
            if (value) {
              onSelectionChange([...currentSelected, row.original._id]);
            } else {
              onSelectionChange(currentSelected.filter(id => id !== row.original._id));
            }
          }}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profilePicture} />
              <AvatarFallback>
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue("phone")}</div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge className={getStatusBadge(status)}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "kycStatus",
      header: "KYC",
      cell: ({ row }) => {
        const kycStatus = row.getValue("kycStatus") as string;
        return (
          <Badge className={getKYCBadge(kycStatus)}>
            {kycStatus}
          </Badge>
        );
      },
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }) => {
        const balance = row.getValue("balance") as number;
        return (
          <div className="font-medium">
            ${balance.toLocaleString()}
          </div>
        );
      },
    },
    {
      accessorKey: "plan",
      header: "Plan",
      cell: ({ row }) => {
        const user = row.original;
        return user.plan ? (
          <Badge variant="outline">
            {user.plan.name}
          </Badge>
        ) : (
          <span className="text-muted-foreground">No plan</span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return (
          <div className="text-sm">
            {date.toLocaleDateString()}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/dashboard/users/${user._id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={() => router.push(`/dashboard/users/${user._id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit User
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {canManageKYC && user.kycStatus === "Pending" && (
                <>
                  <DropdownMenuItem onClick={() => handleKYCAction(user._id, "approve")}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve KYC
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleKYCAction(user._id, "reject")}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject KYC
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {canEdit && (
                <>
                  {user.status !== "Active" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(user._id, "Active")}>
                      <Shield className="mr-2 h-4 w-4" />
                      Activate
                    </DropdownMenuItem>
                  )}
                  {user.status !== "Suspended" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(user._id, "Suspended")}>
                      <Ban className="mr-2 h-4 w-4" />
                      Suspend
                    </DropdownMenuItem>
                  )}
                  {user.status !== "Banned" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(user._id, "Banned")}>
                      <Ban className="mr-2 h-4 w-4" />
                      Ban User
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalUsers / pagination.limit),
  });

  const totalPages = Math.ceil(totalUsers / pagination.limit);

  if (error) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-center">
          <div className="text-red-500 text-sm font-medium">Error loading users</div>
          <div className="text-muted-foreground text-sm mt-1">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <LoadingSpinner />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    if (canView) {
                      router.push(`/dashboard/users/${row.original._id}`);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      onClick={(e) => {
                        if (cell.column.id === "select" || cell.column.id === "actions") {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {selectedUsers.length > 0 && (
            <span>{selectedUsers.length} of {users.length} row(s) selected.</span>
          )}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select
              className="h-8 w-[70px] rounded border border-input bg-background px-2 text-sm"
              value={pagination.limit}
              onChange={(e) => {
                onPaginationChange({
                  ...pagination,
                  limit: Number(e.target.value),
                  page: 1,
                });
              }}
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {pagination.page} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPaginationChange({ ...pagination, page: 1 })}
              disabled={pagination.page <= 1}
            >
              <span className="sr-only">Go to first page</span>
              ❮❮
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPaginationChange({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page <= 1}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPaginationChange({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page >= totalPages}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPaginationChange({ ...pagination, page: totalPages })}
              disabled={pagination.page >= totalPages}
            >
              <span className="sr-only">Go to last page</span>
              ❯❯
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}