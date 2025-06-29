// app/tasks/components/submissions-review.tsx
"use client";

import React, { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Eye,
  User,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  Filter,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useTasks } from "@/hooks/use-tasks";
import { TaskSubmission, PaginationParams } from "@/types";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

interface SubmissionsReviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmissionsReview({
  open,
  onOpenChange,
}: SubmissionsReviewProps) {
  const [filters, setFilters] = useState<any>({});
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [processingSubmission, setProcessingSubmission] = useState<
    string | null
  >(null);
  const [reviewNote, setReviewNote] = useState("");
  const [selectedSubmission, setSelectedSubmission] =
    useState<TaskSubmission | null>(null);

  const appliedFilters = {
    ...filters,
    search: searchTerm || undefined,
  };

  const {
    submissions,
    totalSubmissions,
    isLoading,
    processSubmission,
    bulkProcessSubmissions,
    refreshSubmissions,
  } = useTasks(appliedFilters, pagination);

  // Ensure submissions is always an array
  const safeSubmissions = Array.isArray(submissions) ? submissions : [];

  const getStatusBadge = (status: string) => {
    const variants = {
      Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Approved: "bg-green-100 text-green-800 border-green-200",
      Rejected: "bg-red-100 text-red-800 border-red-200",
    };
    return variants[status as keyof typeof variants] || variants.Pending;
  };

  const handleProcessSubmission = async (
    submission: TaskSubmission,
    action: "approve" | "reject"
  ) => {
    setProcessingSubmission(submission._id);
    try {
      await processSubmission(submission._id, action, {
        reviewNote: reviewNote || undefined,
      });
      setReviewNote("");
      refreshSubmissions();
    } catch (error) {
      console.error("Failed to process submission:", error);
    } finally {
      setProcessingSubmission(null);
    }
  };

  const handleBulkProcess = async (action: "approve" | "reject") => {
    if (selectedSubmissions.length === 0) {
      toast.error("Please select submissions first");
      return;
    }

    try {
      await bulkProcessSubmissions(selectedSubmissions, action, {
        reviewNote: reviewNote || undefined,
      });
      setSelectedSubmissions([]);
      setReviewNote("");
      refreshSubmissions();
    } catch (error) {
      console.error("Bulk process failed:", error);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingSubmissions = safeSubmissions
        .filter((s) => s.status === "Pending")
        .map((s) => s._id);
      setSelectedSubmissions(pendingSubmissions);
    } else {
      setSelectedSubmissions([]);
    }
  };

  const handleSelectSubmission = (submissionId: string, checked: boolean) => {
    if (checked) {
      setSelectedSubmissions([...selectedSubmissions, submissionId]);
    } else {
      setSelectedSubmissions(
        selectedSubmissions.filter((id) => id !== submissionId)
      );
    }
  };

  const viewSubmissionDetails = (submission: TaskSubmission) => {
    setSelectedSubmission(submission);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Task Submissions</DialogTitle>
            <DialogDescription>
              Review and approve or reject user task submissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search submissions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      status: value === "all" ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshSubmissions}
                  disabled={isLoading}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedSubmissions.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedSubmissions.length} submissions selected
                </span>
                <div className="flex-1">
                  <Textarea
                    placeholder="Review note (optional)"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleBulkProcess("approve")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve All
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleBulkProcess("reject")}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject All
                  </Button>
                </div>
              </div>
            )}

            {/* Submissions Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedSubmissions.length ===
                            safeSubmissions.filter(
                              (s) => s.status === "Pending"
                            ).length &&
                          safeSubmissions.filter((s) => s.status === "Pending")
                            .length > 0
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <LoadingSpinner />
                      </TableCell>
                    </TableRow>
                  ) : safeSubmissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No submissions found
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    safeSubmissions.map((submission: any) => (
                      <TableRow key={submission._id}>
                        <TableCell>
                          {submission.status === "Pending" && (
                            <Checkbox
                              checked={selectedSubmissions.includes(
                                submission._id
                              )}
                              onCheckedChange={(checked) =>
                                handleSelectSubmission(
                                  submission._id,
                                  !!checked
                                )
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {submission.task?.name}
                            </div>
                            <Badge variant="outline">
                              {submission.task?.category}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {submission.user?.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {submission.user?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(submission.status)}>
                            {submission.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(submission.reward, "BDT")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatRelativeTime(submission.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewSubmissionDetails(submission)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {submission.status === "Pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleProcessSubmission(
                                      submission,
                                      "approve"
                                    )
                                  }
                                  disabled={
                                    processingSubmission === submission._id
                                  }
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    handleProcessSubmission(
                                      submission,
                                      "reject"
                                    )
                                  }
                                  disabled={
                                    processingSubmission === submission._id
                                  }
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
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
              totalPages={Math.ceil(totalSubmissions / pagination.limit)}
              totalItems={totalSubmissions}
              onPageChange={(currentPage) =>
                setPagination({ ...pagination, page: currentPage })
              }
              onPageSizeChange={(pageSize) =>
                setPagination({ ...pagination, limit: pageSize, page: 1 })
              }
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Submission Detail Dialog */}
      <Dialog
        open={!!selectedSubmission}
        onOpenChange={() => setSelectedSubmission(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              Review the submission proof and details
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Submission Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Task</label>
                  <p className="text-sm text-muted-foreground">
                    {(selectedSubmission as any).task?.name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">User</label>
                  <p className="text-sm text-muted-foreground">
                    {(selectedSubmission as any).user?.name} (
                    {(selectedSubmission as any).user?.email})
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge className={getStatusBadge(selectedSubmission.status)}>
                    {selectedSubmission.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Reward</label>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(selectedSubmission.reward, "BDT")}
                  </p>
                </div>
              </div>

              {/* Submission Note */}
              {selectedSubmission.submissionNote && (
                <div>
                  <label className="text-sm font-medium">User Note</label>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {selectedSubmission.submissionNote}
                  </p>
                </div>
              )}

              {/* Proof */}
              <div>
                <label className="text-sm font-medium">Submitted Proof</label>
                <div className="space-y-3 mt-2">
                  {selectedSubmission.proof?.map((proof, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {proof.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(proof.uploadedAt)}
                        </span>
                      </div>
                      <div className="text-sm">
                        {proof.type === "image" ? (
                          <img
                            src={proof.content}
                            alt="Proof"
                            className="max-w-full h-auto max-h-[300px] rounded"
                          />
                        ) : proof.type === "url" ? (
                          <a
                            href={proof.content}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {proof.content}
                          </a>
                        ) : (
                          <p className="bg-muted p-2 rounded">
                            {proof.content}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Note */}
              {selectedSubmission.reviewNote && (
                <div>
                  <label className="text-sm font-medium">Review Note</label>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {selectedSubmission.reviewNote}
                  </p>
                </div>
              )}

              {/* Actions for Pending Submissions */}
              {selectedSubmission.status === "Pending" && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add review note (optional)"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() =>
                        handleProcessSubmission(selectedSubmission, "approve")
                      }
                      disabled={processingSubmission === selectedSubmission._id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Submission
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        handleProcessSubmission(selectedSubmission, "reject")
                      }
                      disabled={processingSubmission === selectedSubmission._id}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Submission
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
