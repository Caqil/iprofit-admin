// app/news/[id]/edit/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Eye,
  FileText,
  Clock,
  User,
  Calendar,
  TrendingUp,
  ExternalLink,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNews, useNewsArticle } from "@/hooks/use-news";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { NewsUpdateRequest } from "@/types";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { RoleGuard } from "@/components/auth/role-guard";

// Import components
import { NewsForm } from "../../components/news-form";

export default function EditNewsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const newsId = params.id as string;

  const { updateNews } = useNews();
  const {
    data: article,
    isLoading: isLoadingArticle,
    error,
  } = useNewsArticle(newsId);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permissions
  if (!hasPermission(user?.role || "Viewer", "news.update")) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-2">
                Access Denied
              </h2>
              <p className="text-muted-foreground">
                You don't have permission to edit news articles.
              </p>
              <Button
                onClick={() => router.push("/news")}
                className="mt-4"
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to News
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoadingArticle) {
    return (
      <div className="container mx-auto py-12">
        <div className="flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !article) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-2">
                Article Not Found
              </h2>
              <p className="text-muted-foreground">
                The article you're looking for doesn't exist or has been
                deleted.
              </p>
              <Button
                onClick={() => router.push("/news")}
                className="mt-4"
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to News
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (data: NewsUpdateRequest) => {
    setIsSubmitting(true);
    try {
      const updatedArticle = await updateNews(newsId, data);

      toast.success(`Article "${updatedArticle.title}" updated successfully!`);

      // Stay on edit page to allow further edits
      // router.push("/news");
    } catch (error) {
      console.error("Error updating article:", error);
      toast.error("Failed to update article. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/news");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Published":
        return "bg-green-100 text-green-800";
      case "Draft":
        return "bg-gray-100 text-gray-800";
      case "Archived":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const calculateReadingTime = (content: string): number => {
    const wordsPerMinute = 200;
    const wordCount = content
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  const getWordCount = (content: string): number => {
    return content.split(/\s+/).filter((word) => word.length > 0).length;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/news")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Article</h1>
            <p className="text-muted-foreground">
              Make changes to "{article.title}"
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`hidden sm:flex ${getStatusColor(article.status)}`}
          >
            <FileText className="w-3 h-3 mr-1" />
            {article.status}
          </Badge>

          {article.isSticky && (
            <Badge
              variant="outline"
              className="hidden sm:flex bg-yellow-100 text-yellow-800"
            >
              Sticky
            </Badge>
          )}
        </div>
      </div>

      {/* Article Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Article Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Author */}
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Author</p>
                <p className="text-sm text-muted-foreground">
                  {article.author || "Unknown"}
                </p>
              </div>
            </div>

            {/* Status & Views */}
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Views</p>
                <p className="text-sm text-muted-foreground">
                  {article.viewCount?.toLocaleString() || 0} views
                </p>
              </div>
            </div>

            {/* Created Date */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {formatRelativeTime(article.createdAt)}
                </p>
              </div>
            </div>

            {/* Reading Time */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Reading Time</p>
                <p className="text-sm text-muted-foreground">
                  {calculateReadingTime(article.content)} min (
                  {getWordCount(article.content)} words)
                </p>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Article Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium">Category</p>
              <Badge variant="outline" className="mt-1">
                {article.category}
              </Badge>
            </div>

            {article.tags.length > 0 && (
              <div>
                <p className="font-medium">Tags</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {article.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {article.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{article.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div>
              <p className="font-medium">Last Updated</p>
              <p className="text-muted-foreground mt-1">
                {formatDate(article.updatedAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" asChild>
          <a
            href={`/news/${article._id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Preview Article
          </a>
        </Button>

        <Button variant="outline" size="sm" disabled>
          <History className="w-4 h-4 mr-2" />
          View History
        </Button>
      </div>

      {/* Article Form */}
      <NewsForm
        initialData={article}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isSubmitting}
        mode="edit"
      />

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-auto">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <LoadingSpinner size="lg" />
                <div>
                  <h3 className="font-medium">Updating Article...</h3>
                  <p className="text-sm text-muted-foreground">
                    Please wait while we save your changes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
