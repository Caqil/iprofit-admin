// app/audit/components/audit-logs.tsx
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MoreHorizontal,
  Eye,
  Calendar,
  Clock,
  User,
  Database,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  Monitor,
  Activity,
  FileText,
  Filter,
} from "lucide-react";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PaginationParams, FilterParams } from "@/types";

// Define audit log interface
interface AuditLog {
  id: string;
  adminId: string | null;
  adminName: string;
  adminEmail: string | null;
  action: string;
  entity: string;
  entityId?: string;
  oldData?: any;
  newData?: any;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  ipAddress: string;
  userAgent: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Success" | "Failed" | "Partial";
  errorMessage?: string;
  duration?: number;
  metadata?: any;
  createdAt: Date;
}

interface AuditLogsProps {
  logs: AuditLog[];
  totalLogs: number;
  pagination: PaginationParams;
  onPaginationChange: (pagination: PaginationParams) => void;
  isLoading: boolean;
  filters: FilterParams;
  onFilterChange: (key: string, value: string) => void;
}

export function AuditLogs({
  logs,
  totalLogs,
  pagination,
  onPaginationChange,
  isLoading,
  filters,
  onFilterChange,
}: AuditLogsProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Handle row click
  const handleRowClick = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailDialog(true);
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    const variants = {
      Success: "bg-green-100 text-green-800 border-green-200",
      Failed: "bg-red-100 text-red-800 border-red-200",
      Partial: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
    return variants[status as keyof typeof variants] || variants.Success;
  };

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    const variants = {
      Low: "bg-blue-100 text-blue-800 border-blue-200",
      Medium: "bg-orange-100 text-orange-800 border-orange-200",
      High: "bg-red-100 text-red-800 border-red-200",
      Critical: "bg-purple-100 text-purple-800 border-purple-200",
    };
    return variants[severity as keyof typeof variants] || variants.Low;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "Partial":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  // Format action for display
  const formatAction = (action: string, entity: string) => {
    return `${action.charAt(0).toUpperCase() + action.slice(1)} ${entity}`;
  };

  // Get admin initials
  const getAdminInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Audit Logs
          </CardTitle>
          <CardDescription>
            Showing {logs.length} of {totalLogs.toLocaleString()} audit records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Status</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <LoadingSpinner />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Database className="h-12 w-12 text-muted-foreground" />
                        <div className="text-sm text-muted-foreground">
                          No audit logs found
                        </div>
                        {Object.values(filters).some(
                          (value) => value !== ""
                        ) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              Object.keys(filters).forEach((key) =>
                                onFilterChange(key, "")
                              );
                            }}
                            className="gap-2"
                          >
                            <Filter className="h-4 w-4" />
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(log)}
                    >
                      {/* Status */}
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {getStatusIcon(log.status)}
                            </TooltipTrigger>
                            <TooltipContent>
                              {log.status}
                              {log.errorMessage && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {log.errorMessage}
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      {/* Admin */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {log.adminName === "System"
                                ? "SYS"
                                : getAdminInitials(log.adminName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {log.adminName}
                            </div>
                            {log.adminEmail && (
                              <div className="text-xs text-muted-foreground">
                                {log.adminEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Action */}
                      <TableCell>
                        <div className="font-medium">
                          {formatAction(log.action, log.entity)}
                        </div>
                        {log.entityId && (
                          <div className="text-xs text-muted-foreground">
                            ID: {log.entityId}
                          </div>
                        )}
                      </TableCell>

                      {/* Entity */}
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.entity}
                        </Badge>
                      </TableCell>

                      {/* Severity */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            getSeverityBadge(log.severity)
                          )}
                        >
                          {log.severity}
                        </Badge>
                      </TableCell>

                      {/* IP Address */}
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {log.ipAddress}
                        </div>
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell>
                        <div className="text-sm">
                          {formatRelativeTime(new Date(log.createdAt))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(new Date(log.createdAt))}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(log);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalLogs > 0 && (
            <div className="mt-4">
              <DataTablePagination
                currentPage={pagination.page}
                totalPages={Math.ceil(totalLogs / pagination.limit)}
                pageSize={pagination.limit}
                totalItems={totalLogs}
                onPageChange={(page) =>
                  onPaginationChange({ ...pagination, page })
                }
                onPageSizeChange={(pageSize) =>
                  onPaginationChange({
                    ...pagination,
                    limit: pageSize,
                    page: 1,
                  })
                }
                pageSizeOptions={[10, 20, 30, 50, 100]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Log Details
            </DialogTitle>
            <DialogDescription>
              Comprehensive information about this audit log entry
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      Action Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Status
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(selectedLog.status)}
                        <Badge className={getStatusBadge(selectedLog.status)}>
                          {selectedLog.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Action
                      </label>
                      <div className="font-medium">
                        {formatAction(selectedLog.action, selectedLog.entity)}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Entity
                      </label>
                      <Badge variant="outline">{selectedLog.entity}</Badge>
                    </div>
                    {selectedLog.entityId && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Entity ID
                        </label>
                        <div className="font-mono text-sm">
                          {selectedLog.entityId}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Severity
                      </label>
                      <Badge className={getSeverityBadge(selectedLog.severity)}>
                        {selectedLog.severity}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      Session Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Admin
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {selectedLog.adminName === "System"
                              ? "SYS"
                              : getAdminInitials(selectedLog.adminName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">
                            {selectedLog.adminName}
                          </div>
                          {selectedLog.adminEmail && (
                            <div className="text-xs text-muted-foreground">
                              {selectedLog.adminEmail}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        IP Address
                      </label>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono text-sm">
                          {selectedLog.ipAddress}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        User Agent
                      </label>
                      <div className="text-xs text-muted-foreground break-all">
                        {selectedLog.userAgent}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Timestamp
                      </label>
                      <div>
                        <div className="font-medium text-sm">
                          {formatDate(new Date(selectedLog.createdAt))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(selectedLog.createdAt))}
                        </div>
                      </div>
                    </div>
                    {selectedLog.duration && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Duration
                        </label>
                        <div className="text-sm">{selectedLog.duration}ms</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Error Message */}
              {selectedLog.errorMessage && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-red-600">
                      Error Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <div className="text-sm text-red-800">
                        {selectedLog.errorMessage}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Changes */}
              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Data Changes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedLog.changes.map((change, index) => (
                        <div
                          key={index}
                          className="border rounded-md p-3 bg-muted/30"
                        >
                          <div className="font-medium text-sm mb-2">
                            {change.field}
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="text-muted-foreground">
                                Old Value
                              </label>
                              <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded font-mono">
                                {JSON.stringify(change.oldValue, null, 2)}
                              </div>
                            </div>
                            <div>
                              <label className="text-muted-foreground">
                                New Value
                              </label>
                              <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded font-mono">
                                {JSON.stringify(change.newValue, null, 2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Raw Data */}
              {(selectedLog.oldData || selectedLog.newData) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Raw Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedLog.oldData && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            Old Data
                          </label>
                          <pre className="mt-1 text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                            {JSON.stringify(selectedLog.oldData, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedLog.newData && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            New Data
                          </label>
                          <pre className="mt-1 text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                            {JSON.stringify(selectedLog.newData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Metadata */}
              {selectedLog.metadata && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      Additional Metadata
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
