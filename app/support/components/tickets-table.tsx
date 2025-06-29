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
  Edit,
  Trash2,
  UserCheck,
  MessageSquare,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { SupportTicket, PaginationParams } from "@/types";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface TicketsTableProps {
  tickets: SupportTicket[];
  totalTickets: number;
  pagination: PaginationParams;
  onPaginationChange: (pagination: PaginationParams) => void;
  selectedTickets: string[];
  onSelectionChange: (selected: string[]) => void;
  onUpdate: (
    id: string,
    data: Partial<SupportTicket>
  ) => Promise<SupportTicket>;
  onAssign: (
    id: string,
    adminId: string,
    notes?: string
  ) => Promise<SupportTicket>;
  onStatusChange: (
    id: string,
    status: string,
    resolution?: string
  ) => Promise<SupportTicket>;
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export function TicketsTable({
  tickets,
  totalTickets,
  pagination,
  onPaginationChange,
  selectedTickets,
  onSelectionChange,
  onUpdate,
  onAssign,
  onStatusChange,
  onDelete,
  isLoading = false,
}: TicketsTableProps) {
  const [processingAction, setProcessingAction] = useState(false);

  const getStatusBadge = (status: string) => {
    const variants = {
      Open: "destructive",
      "In Progress": "default",
      "Waiting for User": "secondary",
      Resolved: "default",
      Closed: "outline",
    };
    return variants[status as keyof typeof variants] || "default";
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      Low: "outline",
      Medium: "secondary",
      High: "default",
      Urgent: "destructive",
    };
    return variants[priority as keyof typeof variants] || "default";
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(tickets.map((t) => t._id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (ticketId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedTickets, ticketId]);
    } else {
      onSelectionChange(selectedTickets.filter((id) => id !== ticketId));
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      setProcessingAction(true);
      await onStatusChange(ticketId, newStatus);
      toast.success("Ticket status updated successfully");
    } catch (error) {
      toast.error("Failed to update ticket status");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return;

    try {
      setProcessingAction(true);
      await onDelete(ticketId);
      toast.success("Ticket deleted successfully");
    } catch (error) {
      toast.error("Failed to delete ticket");
    } finally {
      setProcessingAction(false);
    }
  };

  const totalPages = Math.ceil(totalTickets / pagination.limit);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
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
                  checked={
                    selectedTickets.length === tickets.length &&
                    tickets.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Response</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  No tickets found.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket._id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedTickets.includes(ticket._id)}
                      onCheckedChange={(checked) =>
                        handleSelectRow(ticket._id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/support/tickets/${ticket._id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      #{ticket.ticketNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {((ticket as any).userId?.name || "U")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {(ticket as any).userId?.name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(ticket as any).userId?.email || "No email"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="font-medium truncate">{ticket.subject}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {ticket.category}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadge(ticket.status) as any}>
                      {ticket.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityBadge(ticket.priority) as any}>
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(ticket as any).assignedTo ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {((ticket as any).assignedTo?.name || "A")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {(ticket as any).assignedTo?.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{formatDate(ticket.createdAt)}</p>
                      <p className="text-muted-foreground">
                        {formatRelativeTime(ticket.createdAt)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{formatRelativeTime(ticket.lastResponseAt)}</p>
                      {ticket.responses && ticket.responses.length > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          <span>{ticket.responses.length}</span>
                        </div>
                      )}
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
                        <DropdownMenuItem asChild>
                          <Link href={`/support/tickets/${ticket._id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(ticket._id, "In Progress")
                          }
                          disabled={processingAction}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Mark In Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(ticket._id, "Resolved")
                          }
                          disabled={processingAction}
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
                          Mark Resolved
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(ticket._id)}
                          disabled={processingAction}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        currentPage={pagination.page}
        totalPages={totalPages}
        pageSize={pagination.limit}
        totalItems={totalTickets}
        onPageChange={(page) => onPaginationChange({ ...pagination, page })}
        onPageSizeChange={(limit) =>
          onPaginationChange({ ...pagination, limit, page: 1 })
        }
      />
    </div>
  );
}
