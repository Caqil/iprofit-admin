// app/news/components/news-table.tsx
"use client";

import React, { useState } from "react";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Archive,
  Pin,
  PinOff,
  ExternalLink,
  Calendar,
  User,
  Tag,
  TrendingUp,
  Clock,
  FileText,
  ImageIcon,
} from "lucide-react";
import Link from "next/link";
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
  DropdownMenuLabel,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { News, NewsStatus, PaginationParams } from "@/types";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/hooks/use-auth";
import { useNews } from "@/hooks/use-news";
import { toast } from "sonner";
import { RoleGuard } from "@/components/auth/role-guard";
import { Pagination } from "@/components/shared/pagination";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface NewsTableProps {
  news: News[];
  selectedNews: string[];
  onSelectionChange: (selected: string[]) => void;
  pagination: PaginationParams;
  onPaginationChange: (params: PaginationParams) => void;
  totalNews: number;
  isLoading?: boolean;
}

export function NewsTable({
  news,
  selectedNews,
  onSelectionChange,
  pagination,
  onPaginationChange,
  totalNews,
  isLoading = false,
}: NewsTableProps) {
  const { user } = useAuth();
  const {
    publishNews,
    unpublishNews,
    archiveNews,
    deleteNews,
    stickNews,
    unstickNews,
  } = useNews();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<News | null>(null);
  const [deleteNewsId, setDeleteNewsId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Handle select all
  const isAllSelected = news.length > 0 && selectedNews.length === news.length;
  const isIndeterminate =
    selectedNews.length > 0 && selectedNews.length < news.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(news.map((article) => article._id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (newsId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedNews, newsId]);
    } else {
      onSelectionChange(selectedNews.filter((id) => id !== newsId));
    }
  };

  // Status badge styling
  const getStatusBadge = (status: NewsStatus, isSticky: boolean) => {
    const baseClasses = "text-xs font-medium";

    if (isSticky) {
      return (
        <div className="flex items-center gap-1">
          <Badge
            variant="secondary"
            className={cn(baseClasses, "bg-yellow-100 text-yellow-800")}
          >
            <Pin className="w-3 h-3 mr-1" />
            Sticky
          </Badge>
          <Badge variant={getStatusVariant(status)} className={baseClasses}>
            {status}
          </Badge>
        </div>
      );
    }

    return (
      <Badge variant={getStatusVariant(status)} className={baseClasses}>
        {status}
      </Badge>
    );
  };

  const getStatusVariant = (
    status: NewsStatus
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Published":
        return "default";
      case "Draft":
        return "secondary";
      case "Archived":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Handle quick actions
  const handleQuickAction = async (action: string, newsId: string) => {
    setActionLoading(`${action}-${newsId}`);
    try {
      switch (action) {
        case "publish":
          await publishNews(newsId);
          break;
        case "unpublish":
          await unpublishNews(newsId);
          break;
        case "archive":
          await archiveNews(newsId);
          break;
        case "stick":
          await stickNews(newsId);
          break;
        case "unstick":
          await unstickNews(newsId);
          break;
        default:
          toast.error("Unknown action");
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteNewsId) return;

    setActionLoading(`delete-${deleteNewsId}`);
    try {
      await deleteNews(deleteNewsId);
      setShowDeleteDialog(false);
      setDeleteNewsId(null);
    } catch (error) {
      console.error("Error deleting news:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDetails = (article: News) => {
    setSelectedArticle(article);
    setShowDetailDialog(true);
  };

  // Calculate reading time (rough estimate)
  const calculateReadingTime = (content: string): number => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  // Truncate content for preview
  const truncateContent = (
    content: string,
    maxLength: number = 100
  ): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + "...";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  ref={(el) => {
                    // Try to find the input element and set indeterminate
                    if (el && "querySelector" in el) {
                      const input = (el as HTMLElement).querySelector("input[type='checkbox']") as HTMLInputElement | null;
                      if (input) input.indeterminate = isIndeterminate;
                    }
                  }}
                />
              </TableHead>
              <TableHead>Article</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {news.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No news articles found
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              news.map((article) => (
                <TableRow key={article._id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedNews.includes(article._id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(article._id, checked as boolean)
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <div className="flex items-start gap-3">
                      {article.featuredImage && (
                        <div className="relative w-16 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={article.featuredImage}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3
                            className="font-medium text-sm text-foreground truncate cursor-pointer hover:text-primary"
                            onClick={() => handleViewDetails(article)}
                          >
                            {article.title}
                          </h3>
                          {article.isSticky && (
                            <Pin className="w-3 h-3 text-yellow-600" />
                          )}
                        </div>

                        {article.excerpt && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {article.excerpt}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {calculateReadingTime(article.content)} min read
                          </span>

                          {article.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Tag className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {article.tags.slice(0, 2).join(", ")}
                                {article.tags.length > 2 && " +more"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {article.author?.[0]?.toUpperCase() || "A"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">
                        {article.author || "Unknown"}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {article.category}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {getStatusBadge(article.status, article.isSticky)}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {article.viewCount?.toLocaleString() || 0}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      {article.publishedAt ? (
                        <div>
                          <div className="font-medium">
                            {formatDate(article.publishedAt)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatRelativeTime(article.publishedAt)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Unpublished
                        </span>
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
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>

                        <DropdownMenuItem
                          onClick={() => handleViewDetails(article)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>

                        <RoleGuard requiredPermission="news.update">
                          <DropdownMenuItem asChild>
                            <Link href={`/news/${article._id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Article
                            </Link>
                          </DropdownMenuItem>
                        </RoleGuard>

                        <DropdownMenuSeparator />

                        <RoleGuard requiredPermission="news.update">
                          {article.status === "Draft" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleQuickAction("publish", article._id)
                              }
                              disabled={
                                actionLoading === `publish-${article._id}`
                              }
                            >
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              Publish
                            </DropdownMenuItem>
                          )}

                          {article.status === "Published" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleQuickAction("unpublish", article._id)
                              }
                              disabled={
                                actionLoading === `unpublish-${article._id}`
                              }
                            >
                              <XCircle className="mr-2 h-4 w-4 text-orange-600" />
                              Unpublish
                            </DropdownMenuItem>
                          )}

                          {article.status !== "Archived" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleQuickAction("archive", article._id)
                              }
                              disabled={
                                actionLoading === `archive-${article._id}`
                              }
                            >
                              <Archive className="mr-2 h-4 w-4 text-gray-600" />
                              Archive
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {!article.isSticky ? (
                            <DropdownMenuItem
                              onClick={() =>
                                handleQuickAction("stick", article._id)
                              }
                              disabled={
                                actionLoading === `stick-${article._id}`
                              }
                            >
                              <Pin className="mr-2 h-4 w-4 text-yellow-600" />
                              Stick to Top
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                handleQuickAction("unstick", article._id)
                              }
                              disabled={
                                actionLoading === `unstick-${article._id}`
                              }
                            >
                              <PinOff className="mr-2 h-4 w-4 text-gray-600" />
                              Remove Sticky
                            </DropdownMenuItem>
                          )}
                        </RoleGuard>

                        <DropdownMenuSeparator />

                        <RoleGuard requiredPermission="news.delete">
                          <DropdownMenuItem
                            onClick={() => {
                              setDeleteNewsId(article._id);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </RoleGuard>
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
      <Pagination
        currentPage={pagination.page}
        pageSize={pagination.limit}
        totalPages={Math.ceil(totalNews / pagination.limit)}
        totalItems={totalNews}
        onPageChange={(page) => onPaginationChange({ ...pagination, page })}
        onPageSizeChange={(limit) =>
          onPaginationChange({ ...pagination, limit, page: 1 })
        }
      />

      {/* Article Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Article Details</DialogTitle>
            <DialogDescription>
              Complete article information and statistics
            </DialogDescription>
          </DialogHeader>
          {selectedArticle && (
            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">
                      {selectedArticle.title}
                    </h2>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(
                        selectedArticle.status,
                        selectedArticle.isSticky
                      )}
                      <span className="text-sm text-muted-foreground">
                        By {selectedArticle.author || "Unknown"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {selectedArticle.viewCount?.toLocaleString() || 0} views
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <RoleGuard requiredPermission="news.update">
                      <Button asChild size="sm">
                        <Link href={`/news/${selectedArticle._id}/edit`}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Link>
                      </Button>
                    </RoleGuard>
                  </div>
                </div>

                {selectedArticle.featuredImage && (
                  <div className="w-full h-48 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={selectedArticle.featuredImage}
                      alt={selectedArticle.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium">Category</label>
                  <p className="text-muted-foreground">
                    {selectedArticle.category}
                  </p>
                </div>
                <div>
                  <label className="font-medium">Reading Time</label>
                  <p className="text-muted-foreground">
                    {calculateReadingTime(selectedArticle.content)} minutes
                  </p>
                </div>
                <div>
                  <label className="font-medium">Created</label>
                  <p className="text-muted-foreground">
                    {formatDate(selectedArticle.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="font-medium">Last Updated</label>
                  <p className="text-muted-foreground">
                    {formatDate(selectedArticle.updatedAt)}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {selectedArticle.tags.length > 0 && (
                <div>
                  <label className="font-medium text-sm">Tags</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedArticle.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Excerpt */}
              {selectedArticle.excerpt && (
                <div>
                  <label className="font-medium text-sm">Excerpt</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedArticle.excerpt}
                  </p>
                </div>
              )}

              {/* Content Preview */}
              <div>
                <label className="font-medium text-sm">Content Preview</label>
                <div className="mt-2 p-4 border rounded-lg bg-muted/50 max-h-60 overflow-y-auto">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: truncateContent(selectedArticle.content, 500),
                    }}
                  />
                </div>
              </div>

              {/* SEO Metadata */}
              {selectedArticle.metadata && (
                <div>
                  <label className="font-medium text-sm">SEO Metadata</label>
                  <div className="mt-2 space-y-2 text-sm">
                    {selectedArticle.metadata.seoTitle && (
                      <div>
                        <span className="font-medium">SEO Title:</span>
                        <span className="ml-2 text-muted-foreground">
                          {selectedArticle.metadata.seoTitle}
                        </span>
                      </div>
                    )}
                    {selectedArticle.metadata.seoDescription && (
                      <div>
                        <span className="font-medium">SEO Description:</span>
                        <span className="ml-2 text-muted-foreground">
                          {selectedArticle.metadata.seoDescription}
                        </span>
                      </div>
                    )}
                  </div>
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
            <AlertDialogTitle>Delete News Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this news article? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={actionLoading?.startsWith("delete")}
            >
              {actionLoading?.startsWith("delete") ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
