"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,
  Target,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTasks } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { TaskFilter, PaginationParams } from "@/types";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { RoleGuard } from "@/components/auth/role-guard";

// Import components
import { TasksTable } from "./components/tasks-table";
import { TaskForm } from "./components/task-form";
import { SubmissionsReview } from "./components/submissions-review";

export default function TasksPage() {
  const { user } = useAuth();

  // State management
  const [filters, setFilters] = useState<TaskFilter>({});
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Apply filters based on active tab and search
  const appliedFilters = useMemo(
    () => ({
      ...filters,
      search: searchTerm || undefined,
      // Apply tab-based filters
      ...(activeTab === "active" && { status: "Active" as const }),
      ...(activeTab === "inactive" && { status: "Inactive" as const }),
      ...(activeTab === "pending_review" && { hasSubmissions: true }),
      ...(activeTab === "easy" && { difficulty: "Easy" as const }),
      ...(activeTab === "medium" && { difficulty: "Medium" as const }),
      ...(activeTab === "hard" && { difficulty: "Hard" as const }),
    }),
    [filters, searchTerm, activeTab]
  );

  // Use tasks hook
  const {
    tasks,
    totalTasks,
    submissions,
    totalSubmissions,
    analytics,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    refreshTasks,
  } = useTasks(appliedFilters, pagination);

  // Handlers
  const handleFilterChange = (key: keyof TaskFilter, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleTaskCreate = async (data: any) => {
    await createTask(data);
    setShowCreateDialog(false);
  };

  // Permission checks
  const canCreate = !!(user && hasPermission(user.role, "tasks.create"));
  const canUpdate = !!(user && hasPermission(user.role, "tasks.update"));
  const canDelete = !!(user && hasPermission(user.role, "tasks.delete"));
  const canReview = !!(user && hasPermission(user.role, "tasks.approve"));

  // Calculate summary stats
  const summaryStats = {
    total: analytics?.totalTasks || 0,
    active: analytics?.activeTasks || 0,
    pendingSubmissions: totalSubmissions || 0,
    totalRewardsPaid: analytics?.totalRewardsPaid || 0,
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
          <p>Error loading tasks: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Management</h1>
          <p className="text-muted-foreground">
            Manage tasks, review submissions, and track performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshTasks}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canReview && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSubmissionsDialog(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Review Submissions
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
            <p className="text-xs text-muted-foreground">All tasks in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summaryStats.active}
            </div>
            <p className="text-xs text-muted-foreground">Currently available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Review
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summaryStats.pendingSubmissions}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summaryStats.totalRewardsPaid} BDT
            </div>
            <p className="text-xs text-muted-foreground">Rewards distributed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select
            value={filters.category || "all"}
            onValueChange={(value) => handleFilterChange("category", value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Social Media">Social Media</SelectItem>
              <SelectItem value="App Installation">App Installation</SelectItem>
              <SelectItem value="Survey">Survey</SelectItem>
              <SelectItem value="Review">Review</SelectItem>
              <SelectItem value="Referral">Referral</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.difficulty || "all"}
            onValueChange={(value) => handleFilterChange("difficulty", value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="Easy">Easy</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Hard">Hard</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {}}>
                <Download className="mr-2 h-4 w-4" />
                Export Tasks
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {}}>
                <TrendingUp className="mr-2 h-4 w-4" />
                View Analytics
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="pending_review">Pending Review</TabsTrigger>
          <TabsTrigger value="easy">Easy</TabsTrigger>
          <TabsTrigger value="medium">Medium</TabsTrigger>
          <TabsTrigger value="hard">Hard</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <TasksTable
              tasks={tasks}
              totalTasks={totalTasks}
              pagination={pagination}
              onPaginationChange={setPagination}
              selectedTasks={selectedTasks}
              onSelectionChange={setSelectedTasks}
              onUpdate={updateTask}
              onDelete={deleteTask}
              canUpdate={canUpdate}
              canDelete={canDelete}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TaskForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleTaskCreate}
        mode="create"
      />

      <SubmissionsReview
        open={showSubmissionsDialog}
        onOpenChange={setShowSubmissionsDialog}
      />
    </div>
  );
}
