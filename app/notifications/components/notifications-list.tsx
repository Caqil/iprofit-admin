"use client";

import React, { useState } from "react";
import {
  MoreHorizontal,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  Mail,
  MessageSquare,
  Bell,
  Smartphone,
  AlertTriangle,
  User,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Notification, PaginationParams } from "@/types";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

interface NotificationsListProps {
  notifications: Notification[];
  totalNotifications: number;
  pagination: PaginationParams;
  onPaginationChange: (pagination: PaginationParams) => void;
  onMarkAsRead: (notificationId: string) => Promise<void>;
  onDelete: (notificationId: string) => Promise<void>;
  canDelete: boolean;
}

export function NotificationsList({
  notifications,
  totalNotifications,
  pagination,
  onPaginationChange,
  onMarkAsRead,
  onDelete,
  canDelete,
}: NotificationsListProps) {
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  const getStatusBadge = (status: string) => {
    const variants = {
      Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Sent: "bg-blue-100 text-blue-800 border-blue-200",
      Delivered: "bg-green-100 text-green-800 border-green-200",
      Failed: "bg-red-100 text-red-800 border-red-200",
      Read: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return variants[status as keyof typeof variants] || variants.Pending;
  };

  const getChannelIcon = (channel: string) => {
    const icons = {
      email: Mail,
      sms: MessageSquare,
      in_app: Bell,
      push: Smartphone,
    };
    const Icon = icons[channel as keyof typeof icons] || Bell;
    return <Icon className="h-4 w-4" />;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      Low: "bg-gray-100 text-gray-800 border-gray-200",
      Medium: "bg-blue-100 text-blue-800 border-blue-200",
      High: "bg-orange-100 text-orange-800 border-orange-200",
      Urgent: "bg-red-100 text-red-800 border-red-200",
    };
    return variants[priority as keyof typeof variants] || variants.Medium;
  };

  const handleViewNotification = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDetailDialog(true);

    // Mark as read if it's unread
    if (notification.status !== "Read") {
      onMarkAsRead(notification._id);
    }
  };

  const handleDeleteNotification = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedNotification) return;

    setProcessingAction(true);
    try {
      await onDelete(selectedNotification._id);
      setShowDeleteDialog(false);
      setSelectedNotification(null);
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Bell className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No notifications found
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              notifications.map((notification: any) => (
                <TableRow key={notification._id}>
                  <TableCell>
                    <Badge variant="outline">{notification.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getChannelIcon(notification.channel)}
                      <span className="capitalize">{notification.channel}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[300px]">
                      <div className="font-medium truncate">
                        {notification.title}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {notification.message}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {notification.user ? (
                      <div className="space-y-1">
                        <div className="font-medium">
                          {notification.user.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {notification.user.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">System</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityBadge(notification.priority)}>
                      {notification.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(notification.status)}>
                      {notification.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {notification.sentAt ? (
                      <div className="space-y-1">
                        <div>{formatRelativeTime(notification.sentAt)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(notification.sentAt)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not sent</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleViewNotification(notification)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>

                        {notification.status !== "Read" && (
                          <DropdownMenuItem
                            onClick={() => onMarkAsRead(notification._id)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Mark as Read
                          </DropdownMenuItem>
                        )}

                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                handleDeleteNotification(notification)
                              }
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination
        currentPage={pagination.page}
        pageSize={pagination.limit}
        totalPages={Math.ceil(totalNotifications / pagination.limit)}
        totalItems={totalNotifications}
        onPageChange={(currentPage) =>
          onPaginationChange({ ...pagination, page: currentPage })
        }
        onPageSizeChange={(pageSize) =>
          onPaginationChange({ ...pagination, limit: pageSize, page: 1 })
        }
      />

      {/* Notification Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
            <DialogDescription>
              Complete notification information and status
            </DialogDescription>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedNotification.type}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Channel</label>
                  <div className="flex items-center gap-2">
                    {getChannelIcon(selectedNotification.channel)}
                    <span className="text-sm text-muted-foreground capitalize">
                      {selectedNotification.channel}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Badge
                    className={getPriorityBadge(selectedNotification.priority)}
                  >
                    {selectedNotification.priority}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge
                    className={getStatusBadge(selectedNotification.status)}
                  >
                    {selectedNotification.status}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Title</label>
                <p className="text-sm text-muted-foreground">
                  {selectedNotification.title}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Message</label>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {selectedNotification.message}
                </p>
              </div>

              {(selectedNotification as any).user && (
                <div>
                  <label className="text-sm font-medium">Recipient</label>
                  <p className="text-sm text-muted-foreground">
                    {(selectedNotification as any).user.name} (
                    {(selectedNotification as any).user.email})
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedNotification.createdAt)}
                  </p>
                </div>
                {selectedNotification.sentAt && (
                  <div>
                    <label className="text-sm font-medium">Sent</label>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedNotification.sentAt)}
                    </p>
                  </div>
                )}
              </div>

              {selectedNotification.failureReason && (
                <div>
                  <label className="text-sm font-medium text-red-600">
                    Failure Reason
                  </label>
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
                    {selectedNotification.failureReason}
                  </p>
                </div>
              )}

              {selectedNotification.retryCount > 0 && (
                <div>
                  <label className="text-sm font-medium">Retry Count</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedNotification.retryCount} /{" "}
                    {selectedNotification.maxRetries}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this notification? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={processingAction}
              className="bg-red-600 hover:bg-red-700"
            >
              {processingAction ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
