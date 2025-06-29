// app/news/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,
  FileText,
  TrendingUp,
  Users,
  Eye,
  Calendar,
  Tag,
  Pin,
  Archive,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import Link from "next/link";
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
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
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
import { useNews } from "@/hooks/use-news";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { NewsFilter, PaginationParams } from "@/types";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { RoleGuard } from "@/components/auth/role-guard";

// Import components
import { NewsTable } from "./components/news-table";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

export default function NewsPage() {
  const { user } = useAuth();

  // State management
  const [filters, setFilters] = useState<NewsFilter>({});
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNews, setSelectedNews] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Build filters based on active tab and search
  const activeFilters = useMemo(() => {
    const baseFilters: NewsFilter = {
      ...filters,
      search: searchTerm || undefined,
      dateFrom: dateRange.from?.toISOString(),
      dateTo: dateRange.to?.toISOString(),
    };

    // Apply tab-specific filters
    switch (activeTab) {
      case "published":
        return { ...baseFilters, status: "Published" as NewsFilter["status"] };
      case "draft":
        return { ...baseFilters, status: "Draft" as NewsFilter["status"] };
      case "archived":
        return { ...baseFilters, status: "Archived" as NewsFilter["status"] };
      case "sticky":
        return { ...baseFilters, isSticky: true };
      default:
        return baseFilters;
    }
  }, [filters, searchTerm, activeTab, dateRange]);

  // Fetch data using the hook
  const {
    news,
    totalNews,
    categories,
    analytics,
    isLoading,
    isAnalyticsLoading,
    error,
    bulkAction,
    refreshNews,
  } = useNews(activeFilters, pagination);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof NewsFilter, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedNews.length === 0) {
      toast.error("Please select articles to perform bulk action");
      return;
    }

    try {
      await bulkAction(action, selectedNews);
      setSelectedNews([]);
    } catch (error) {
      console.error("Bulk action error:", error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNews.length === 0) return;

    try {
      await bulkAction("delete", selectedNews);
      setSelectedNews([]);
      setShowBulkDeleteDialog(false);
    } catch (error) {
      console.error("Bulk delete error:", error);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({});
    setSearchTerm("");
    setDateRange({});
    setActiveTab("all");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Get analytics stats
  const statsCards = [
    {
      title: "Total Articles",
      value: analytics?.totalArticles || 0,
      icon: FileText,
      description: "All articles",
      color: "text-blue-600",
    },
    {
      title: "Published",
      value: analytics?.publishedArticles || 0,
      icon: CheckCircle,
      description: "Live articles",
      color: "text-green-600",
    },
    {
      title: "Draft Articles",
      value: analytics?.draftArticles || 0,
      icon: Eye,
      description: "Unpublished",
      color: "text-orange-600",
    },
    {
      title: "Total Views",
      value: analytics?.totalViews || 0,
      icon: TrendingUp,
      description: "All time views",
      color: "text-purple-600",
    },
  ];

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-red-600">Error loading news: {error}</p>
          <Button onClick={refreshNews} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">News Management</h1>
          <p className="text-muted-foreground">
            Create, manage, and publish news articles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshNews} disabled={isLoading}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <RoleGuard anyPermissions={["news.create"]}>
            <Button asChild>
              <Link href="/news/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Article
              </Link>
            </Button>
          </RoleGuard>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {stat.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <Select
                value={filters.category || "all"}
                onValueChange={(value) => handleFilterChange("category", value)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.name} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Author Filter */}
              <Select
                value={filters.author || "all"}
                onValueChange={(value) => handleFilterChange("author", value)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Author" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Authors</SelectItem>
                  {/* Add author options from API if available */}
                </SelectContent>
              </Select>

              {/* Date Range */}
              {/* <DatePickerWithRange
                from={dateRange.from}
                to={dateRange.to}
                onSelect={(range) => setDateRange(range || {})}
              /> */}

              {/* Reset Filters */}
              <Button
                variant="outline"
                onClick={resetFilters}
                disabled={
                  Object.keys(filters).length === 0 &&
                  !searchTerm &&
                  !dateRange.from
                }
              >
                <Filter className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Articles</CardTitle>
              <CardDescription>
                {totalNews} article{totalNews !== 1 ? "s" : ""} found
              </CardDescription>
            </div>

            {/* Bulk Actions */}
            {selectedNews.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedNews.length} selected
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="w-4 h-4 mr-2" />
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <RoleGuard anyPermissions={["news.update"]}>
                      <DropdownMenuItem
                        onClick={() => handleBulkAction("publish")}
                      >
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                        Publish Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleBulkAction("unpublish")}
                      >
                        <XCircle className="mr-2 h-4 w-4 text-orange-600" />
                        Unpublish Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleBulkAction("archive")}
                      >
                        <Archive className="mr-2 h-4 w-4 text-gray-600" />
                        Archive Selected
                      </DropdownMenuItem>
                    </RoleGuard>

                    <DropdownMenuSeparator />

                    <RoleGuard anyPermissions={["news.delete"]}>
                      <DropdownMenuItem
                        onClick={() => setShowBulkDeleteDialog(true)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected
                      </DropdownMenuItem>
                    </RoleGuard>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Status Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="px-6 border-b">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="published">Published</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
                <TabsTrigger value="sticky">Sticky</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              <div className="p-6">
                <NewsTable
                  news={news}
                  selectedNews={selectedNews}
                  onSelectionChange={setSelectedNews}
                  pagination={pagination}
                  onPaginationChange={setPagination}
                  totalNews={totalNews}
                  isLoading={isLoading}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Articles</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedNews.length} selected
              article{selectedNews.length !== 1 ? "s" : ""}? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete {selectedNews.length} Article
              {selectedNews.length !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
