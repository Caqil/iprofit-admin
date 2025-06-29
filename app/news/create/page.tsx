// app/news/create/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNews } from "@/hooks/use-news";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { NewsCreateRequest, NewsUpdateRequest } from "@/types";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { RoleGuard } from "@/components/auth/role-guard";

// Import components
import { NewsForm } from "../components/news-form";

export default function CreateNewsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { createNews } = useNews();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permissions
  if (!hasPermission(user?.role || "Viewer", "news.create")) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-2">
                Access Denied
              </h2>
              <p className="text-muted-foreground">
                You don't have permission to create news articles.
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

  const handleSubmit = async (data: NewsCreateRequest | NewsUpdateRequest) => {
    setIsSubmitting(true);
    try {
      // Ensure required fields for create
      if (!data.title) {
        toast.error("Title is required.");
        setIsSubmitting(false);
        return;
      }

      // Type assertion: treat as NewsCreateRequest
      const newArticle = await createNews(data as NewsCreateRequest);

      toast.success(
        `Article "${newArticle.title}" ${
          data.status === "Published" ? "published" : "saved as draft"
        } successfully!`
      );

      // Redirect based on status
      if (data.status === "Published") {
        router.push("/news");
      } else {
        router.push(`/news/${newArticle._id}/edit`);
      }
    } catch (error) {
      console.error("Error creating article:", error);
      toast.error("Failed to create article. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/news");
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
            <h1 className="text-3xl font-bold tracking-tight">
              Create New Article
            </h1>
            <p className="text-muted-foreground">
              Write and publish engaging content for your audience
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:flex">
            <FileText className="w-3 h-3 mr-1" />
            New Article
          </Badge>
        </div>
      </div>

      {/* Quick Tips Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Writing Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                📝 Great Headlines
              </h4>
              <p className="text-blue-700">
                Keep titles under 60 characters for better SEO and readability
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                🖼️ Visual Appeal
              </h4>
              <p className="text-blue-700">
                Add a featured image to increase engagement by 80%
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                🏷️ Smart Tagging
              </h4>
              <p className="text-blue-700">
                Use 3-5 relevant tags to improve discoverability
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                📖 Reading Time
              </h4>
              <p className="text-blue-700">
                Aim for 3-7 minutes reading time for optimal engagement
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                🎯 SEO Optimization
              </h4>
              <p className="text-blue-700">
                Fill out SEO metadata to improve search rankings
              </p>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">💾 Save Often</h4>
              <p className="text-blue-700">
                Save as draft first, then review before publishing
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Article Form */}
      <NewsForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isSubmitting}
        mode="create"
      />

      {/* Help Section */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
          <CardDescription>
            Tips and resources for creating great content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Content Guidelines */}
            <div className="space-y-3">
              <h4 className="font-medium">Content Guidelines</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Write clear, engaging headlines</li>
                <li>• Use short paragraphs for readability</li>
                <li>• Include relevant keywords naturally</li>
                <li>• Add subheadings to break up content</li>
                <li>• Proofread before publishing</li>
              </ul>
            </div>

            {/* SEO Best Practices */}
            <div className="space-y-3">
              <h4 className="font-medium">SEO Best Practices</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• SEO title: 50-60 characters</li>
                <li>• Meta description: 150-160 characters</li>
                <li>• Use focus keywords in title and content</li>
                <li>• Add alt text to images</li>
                <li>• Include internal and external links</li>
              </ul>
            </div>

            {/* Formatting Tips */}
            <div className="space-y-3">
              <h4 className="font-medium">Formatting Tips</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use HTML tags for formatting</li>
                <li>
                  • <code>&lt;h2&gt;</code> for main headings
                </li>
                <li>
                  • <code>&lt;h3&gt;</code> for subheadings
                </li>
                <li>
                  • <code>&lt;strong&gt;</code> for emphasis
                </li>
                <li>
                  • <code>&lt;em&gt;</code> for italics
                </li>
              </ul>
            </div>

            {/* Image Guidelines */}
            <div className="space-y-3">
              <h4 className="font-medium">Image Guidelines</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Recommended size: 1200x630px</li>
                <li>• File size: Under 5MB</li>
                <li>• Formats: JPG, PNG, WebP</li>
                <li>• Use high-quality, relevant images</li>
                <li>• Consider mobile viewing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-auto">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <LoadingSpinner size="lg" />
                <div>
                  <h3 className="font-medium">Creating Article...</h3>
                  <p className="text-sm text-muted-foreground">
                    Please wait while we save your article
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
