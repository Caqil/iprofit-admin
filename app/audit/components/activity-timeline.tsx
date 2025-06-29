// app/audit/components/activity-timeline.tsx
"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Database,
  FileEdit,
  Trash2,
  Plus,
  Shield,
  MapPin,
  Monitor,
  RefreshCw,
  Filter,
} from "lucide-react";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { FilterParams } from "@/types";

// Define audit log interface (same as in audit-logs.tsx)
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

// Timeline group interface
interface TimelineGroup {
  date: string;
  logs: AuditLog[];
}

interface ActivityTimelineProps {
  logs: AuditLog[];
  isLoading: boolean;
  filters: FilterParams;
}

export function ActivityTimeline({
  logs,
  isLoading,
  filters,
}: ActivityTimelineProps) {
  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups: Record<string, AuditLog[]> = {};

    logs.forEach((log) => {
      const date = new Date(log.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
    });

    // Convert to array and sort by date (newest first)
    return Object.entries(groups)
      .map(([date, logs]) => ({
        date,
        logs: logs.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs]);

  // Get status icon
  const getStatusIcon = (status: string, size = 4) => {
    const className = `h-${size} w-${size}`;
    switch (status) {
      case "Success":
        return <CheckCircle className={cn(className, "text-green-600")} />;
      case "Failed":
        return <XCircle className={cn(className, "text-red-600")} />;
      case "Partial":
        return <AlertTriangle className={cn(className, "text-yellow-600")} />;
      default:
        return <Activity className={cn(className, "text-gray-600")} />;
    }
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
      case "add":
        return <Plus className="h-4 w-4 text-green-600" />;
      case "update":
      case "edit":
      case "modify":
        return <FileEdit className="h-4 w-4 text-blue-600" />;
      case "delete":
      case "remove":
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case "login":
      case "logout":
        return <Shield className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "border-red-500 bg-red-50";
      case "High":
        return "border-orange-500 bg-orange-50";
      case "Medium":
        return "border-yellow-500 bg-yellow-50";
      case "Low":
        return "border-blue-500 bg-blue-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
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

  // Format action text
  const formatActionText = (log: AuditLog) => {
    const action = log.action.charAt(0).toUpperCase() + log.action.slice(1);
    const entity = log.entity.toLowerCase();

    if (log.entityId) {
      return `${action} ${entity} (${log.entityId.slice(0, 8)}...)`;
    }

    return `${action} ${entity}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Activity className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Activity Found</h3>
          <p className="text-muted-foreground text-center mb-4">
            No audit logs match your current filters.
          </p>
          {Object.values(filters).some((value) => value !== "") && (
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Clear filters to see all activity
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
        <CardDescription>
          Chronological view of system activities and administrative actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {groupedLogs.map((group, groupIndex) => (
            <div key={group.date} className="relative">
              {/* Date Header */}
              <div className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 backdrop-blur-sm py-2 mb-4">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg">
                  {new Date(group.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <Badge variant="secondary" className="ml-auto">
                  {group.logs.length}{" "}
                  {group.logs.length === 1 ? "activity" : "activities"}
                </Badge>
              </div>

              {/* Timeline Items */}
              <div className="relative">
                {/* Vertical line */}
                {groupIndex !== groupedLogs.length - 1 && (
                  <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
                )}

                <div className="space-y-4">
                  {group.logs.map((log, logIndex) => (
                    <div
                      key={log.id}
                      className="relative flex items-start gap-4 group"
                    >
                      {/* Timeline dot */}
                      <div className="relative z-10 flex-shrink-0">
                        <div
                          className={cn(
                            "flex items-center justify-center w-12 h-12 rounded-full border-2 bg-background",
                            getSeverityColor(log.severity)
                          )}
                        >
                          {getStatusIcon(log.status)}
                        </div>

                        {/* Connecting line to next item */}
                        {logIndex !== group.logs.length - 1 && (
                          <div className="absolute left-6 top-12 w-px h-4 bg-border" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-4">
                        <Card
                          className={cn(
                            "transition-all duration-200 hover:shadow-md",
                            log.status === "Failed" && "border-red-200",
                            log.severity === "Critical" && "border-red-300"
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                {/* Action and Entity */}
                                <div className="flex items-center gap-2 mb-2">
                                  {getActionIcon(log.action)}
                                  <span className="font-semibold text-sm">
                                    {formatActionText(log)}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {log.entity}
                                  </Badge>
                                </div>

                                {/* Admin and Time */}
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">
                                        {log.adminName === "System"
                                          ? "SYS"
                                          : getAdminInitials(log.adminName)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">
                                      {log.adminName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatRelativeTime(
                                      new Date(log.createdAt)
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {log.ipAddress}
                                  </div>
                                </div>

                                {/* Error Message */}
                                {log.errorMessage && (
                                  <div className="bg-red-50 border border-red-200 rounded-md p-2 mb-2">
                                    <div className="text-xs text-red-700 font-medium">
                                      Error: {log.errorMessage}
                                    </div>
                                  </div>
                                )}

                                {/* Changes Summary */}
                                {log.changes && log.changes.length > 0 && (
                                  <div className="bg-muted/50 rounded-md p-2 mb-2">
                                    <div className="text-xs font-medium text-muted-foreground mb-1">
                                      Modified {log.changes.length} field
                                      {log.changes.length > 1 ? "s" : ""}:
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {log.changes
                                        .slice(0, 3)
                                        .map((change, idx) => (
                                          <Badge
                                            key={idx}
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            {change.field}
                                          </Badge>
                                        ))}
                                      {log.changes.length > 3 && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          +{log.changes.length - 3} more
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Status and Severity */}
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      log.status === "Success"
                                        ? "default"
                                        : "destructive"
                                    }
                                    className="text-xs"
                                  >
                                    {log.status}
                                  </Badge>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge
                                          variant="outline"
                                          className={cn("text-xs", {
                                            "border-red-500 text-red-700":
                                              log.severity === "Critical",
                                            "border-orange-500 text-orange-700":
                                              log.severity === "High",
                                            "border-yellow-500 text-yellow-700":
                                              log.severity === "Medium",
                                            "border-blue-500 text-blue-700":
                                              log.severity === "Low",
                                          })}
                                        >
                                          {log.severity}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Severity Level: {log.severity}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>

                                {/* Duration */}
                                {log.duration && (
                                  <div className="text-xs text-muted-foreground">
                                    {log.duration}ms
                                  </div>
                                )}

                                {/* Exact timestamp on hover */}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div className="text-xs text-muted-foreground cursor-help">
                                        {new Date(
                                          log.createdAt
                                        ).toLocaleTimeString()}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {formatDate(new Date(log.createdAt))}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Load More Button (if needed) */}
          {logs.length >= 50 && (
            <div className="flex justify-center pt-6">
              <Button variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Load More Activities
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
