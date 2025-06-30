"use client";

import React, { useState } from "react";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Users,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Task, PaginationParams } from "@/types";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

interface TasksTableProps {
  tasks: Task[];
  totalTasks: number;
  pagination: PaginationParams;
  onPaginationChange: (pagination: PaginationParams) => void;
  selectedTasks: string[];
  onSelectionChange: (selected: string[]) => void;
  onUpdate: (taskId: string, data: Partial<Task>) => Promise<Task>;
  onDelete: (taskId: string) => Promise<void>;
  canUpdate: boolean;
  canDelete: boolean;
}

export function TasksTable({
  tasks,
  totalTasks,
  pagination,
  onPaginationChange,
  selectedTasks,
  onSelectionChange,
  onUpdate,
  onDelete,
  canUpdate,
  canDelete,
}: TasksTableProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  const getStatusBadge = (status: string) => {
    const variants = {
      Active: "bg-green-100 text-green-800 border-green-200",
      Inactive: "bg-gray-100 text-gray-800 border-gray-200",
      Paused: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
    return variants[status as keyof typeof variants] || variants.Active;
  };

  const getDifficultyBadge = (difficulty: string) => {
    const variants = {
      Easy: "bg-blue-100 text-blue-800 border-blue-200",
      Medium: "bg-orange-100 text-orange-800 border-orange-200",
      Hard: "bg-red-100 text-red-800 border-red-200",
    };
    return variants[difficulty as keyof typeof variants] || variants.Easy;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(tasks.map((task) => task._id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedTasks, taskId]);
    } else {
      onSelectionChange(selectedTasks.filter((id) => id !== taskId));
    }
  };

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setShowDetailDialog(true);
  };

  const handleDeleteTask = (task: Task) => {
    setSelectedTask(task);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedTask) return;

    setProcessingAction(true);
    try {
      await onDelete(selectedTask._id);
      setShowDeleteDialog(false);
      setSelectedTask(null);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleStatusToggle = async (task: Task) => {
    const newStatus = task.status === "Active" ? "Inactive" : "Active";
    try {
      await onUpdate(task._id, { status: newStatus });
      toast.success(`Task ${newStatus.toLowerCase()}`);
    } catch (error) {
      toast.error("Failed to update task status");
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedTasks.length === tasks.length && tasks.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Reward</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Completions</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!tasks || tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Target className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No tasks found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              Array.isArray(tasks) &&
              tasks.map((task) => (
                <TableRow key={task._id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedTasks.includes(task._id)}
                      onCheckedChange={(checked) =>
                        handleSelectTask(task._id, !!checked)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{task.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{task.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getDifficultyBadge(task.difficulty)}>
                      {task.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-medium">
                        {formatCurrency(task.reward)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(task.status)}>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{task.currentCompletions || 0}</span>
                      {task.maxCompletions && (
                        <span className="text-muted-foreground">
                          / {task.maxCompletions}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{formatDate(task.createdAt)}</div>
                      <div className="text-muted-foreground">
                        {formatRelativeTime(task.createdAt)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewTask(task)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>

                        {canUpdate && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleStatusToggle(task)}
                            >
                              {task.status === "Active" ? (
                                <XCircle className="mr-2 h-4 w-4" />
                              ) : (
                                <CheckCircle className="mr-2 h-4 w-4" />
                              )}
                              {task.status === "Active"
                                ? "Deactivate"
                                : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Task
                            </DropdownMenuItem>
                          </>
                        )}

                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteTask(task)}
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
        totalPages={Math.ceil(totalTasks / pagination.limit)}
        totalItems={totalTasks}
        onPageChange={(currentPage) =>
          onPaginationChange({ ...pagination, page: currentPage })
        }
        onPageSizeChange={(pageSize) =>
          onPaginationChange({ ...pagination, limit: pageSize, page: 1 })
        }
      />

      {/* Task Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTask?.name}</DialogTitle>
            <DialogDescription>Task details and information</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTask.category}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Difficulty</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTask.difficulty}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Reward</label>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(selectedTask.reward, selectedTask.currency)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Estimated Time</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTask.estimatedTime} minutes
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground">
                  {selectedTask.description}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Criteria</label>
                <p className="text-sm text-muted-foreground">
                  {selectedTask.criteria}
                </p>
              </div>
              {selectedTask.instructions.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Instructions</label>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {selectedTask.instructions.map((instruction, index) => (
                      <li key={index}>{instruction}</li>
                    ))}
                  </ul>
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
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTask?.name}"? This
              action cannot be undone.
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
