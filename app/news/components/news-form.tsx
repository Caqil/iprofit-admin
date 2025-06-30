// app/news/components/news-form.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Save,
  X,
  Upload,
  Eye,
  Calendar,
  Tag,
  Image as ImageIcon,
  Plus,
  Trash2,
  FileText,
  Globe,
  Pin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { newsCreateSchema } from "@/lib/validation";
import {
  News,
  NewsUpdateRequest,
  NewsStatus,
  NewsCreateRequest,
} from "@/types";
import { useNews } from "@/hooks/use-news";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "sonner";
import { z } from "zod";

// Use the original schema type but with proper form handling
type NewsFormData = {
  title: string;
  content: string;
  excerpt?: string;
  category: string;
  tags: string[];
  featuredImage?: string;
  status: "Draft" | "Published" | "Archived";
  isSticky: boolean;
  publishedAt?: string | Date;
  metadata?: {
    seoTitle?: string;
    seoDescription?: string;
    socialImage?: string;
  };
  schedulePublish?: boolean;
  scheduledAt?: string | Date;
};

interface NewsFormProps {
  initialData?: News;
  onSubmit: (data: NewsCreateRequest | NewsUpdateRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: "create" | "edit";
}

const defaultCategories = [
  "General",
  "Technology",
  "Finance",
  "Product",
  "Company",
  "Security",
  "Updates",
  "Announcements",
];

export function NewsForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = "create",
}: NewsFormProps) {
  const { categories } = useNews();
  const [imagePreview, setImagePreview] = useState<string>("");
  const [contentPreview, setContentPreview] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const form = useForm<NewsFormData>({
    mode: "onChange",
    defaultValues: {
      title: "",
      content: "",
      excerpt: "",
      category: "",
      tags: [],
      featuredImage: "",
      status: "Draft" as const,
      isSticky: false,
      publishedAt: undefined,
      schedulePublish: false,
      scheduledAt: undefined,
      metadata: {
        seoTitle: "",
        seoDescription: "",
        socialImage: "",
      },
    },
  });

  // Watch form values for dynamic updates
  const watchedValues = form.watch();
  const currentStatus = form.watch("status");

  // Initialize form with existing data
  useEffect(() => {
    if (initialData && mode === "edit") {
      const resetData: Partial<NewsFormData> = {
        title: initialData.title,
        content: initialData.content,
        excerpt: initialData.excerpt || "",
        category: initialData.category,
        tags: initialData.tags || [],
        featuredImage: initialData.featuredImage || "",
        status: initialData.status,
        isSticky: initialData.isSticky || false,
        publishedAt: initialData.publishedAt
          ? new Date(initialData.publishedAt)
          : undefined,
        schedulePublish: false,
        scheduledAt: undefined,
        metadata: {
          seoTitle: initialData.metadata?.seoTitle || "",
          seoDescription: initialData.metadata?.seoDescription || "",
          socialImage: initialData.metadata?.socialImage || "",
        },
      };

      form.reset(resetData);

      if (initialData.featuredImage) {
        setImagePreview(initialData.featuredImage);
      }
    }
  }, [initialData, mode, form]);

  // Generate SEO fields from title automatically
  useEffect(() => {
    const title = watchedValues.title;
    if (title && !watchedValues.metadata?.seoTitle) {
      form.setValue("metadata.seoTitle", title.substring(0, 60));
    }
  }, [watchedValues.title, watchedValues.metadata?.seoTitle, form]);

  // Generate excerpt from content if not provided
  useEffect(() => {
    const content = watchedValues.content;
    if (content && !watchedValues.excerpt) {
      const plainText = content.replace(/<[^>]*>/g, ""); // Remove HTML tags
      const excerpt = plainText.substring(0, 150).trim();
      if (excerpt.length > 100) {
        form.setValue("excerpt", excerpt + "...");
      }
    }
  }, [watchedValues.content, watchedValues.excerpt, form]);

  const handleSubmit = async (data: NewsFormData) => {
    try {
      // Client-side validation
      const errors: string[] = [];

      if (!data.title?.trim()) {
        errors.push("Title is required");
      } else if (data.title.length > 200) {
        errors.push("Title must be less than 200 characters");
      }

      if (!data.content?.trim()) {
        errors.push("Content is required");
      }

      if (!data.category?.trim()) {
        errors.push("Category is required");
      }

      if (data.excerpt && data.excerpt.length > 500) {
        errors.push("Excerpt must be less than 500 characters");
      }

      // Validate image URL if provided
      if (data.featuredImage && data.featuredImage.trim()) {
        if (!data.featuredImage.startsWith("data:image/")) {
          try {
            new URL(data.featuredImage);
          } catch {
            errors.push("Featured image must be a valid URL");
          }
        }
      }

      // Validate social image URL if provided
      if (data.metadata?.socialImage && data.metadata.socialImage.trim()) {
        try {
          new URL(data.metadata.socialImage);
        } catch {
          errors.push("Social image must be a valid URL");
        }
      }

      // Validate metadata field lengths
      if (data.metadata?.seoTitle && data.metadata.seoTitle.length > 70) {
        errors.push("SEO title must be less than 70 characters");
      }

      if (
        data.metadata?.seoDescription &&
        data.metadata.seoDescription.length > 160
      ) {
        errors.push("SEO description must be less than 160 characters");
      }

      if (errors.length > 0) {
        toast.error(errors[0]);
        return;
      }

      // Clean up the data before submission
      const submissionData: NewsCreateRequest = {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt?.trim() || undefined,
        category: data.category,
        tags: data.tags?.filter((tag) => tag.trim() !== "") || [],
        featuredImage: data.featuredImage?.trim() || undefined,
        status: data.status,
        isSticky: data.isSticky || false,
        publishedAt: data.publishedAt
          ? data.publishedAt instanceof Date
            ? data.publishedAt
            : new Date(data.publishedAt)
          : undefined,
      };

      // Handle metadata - only include if there's actual content
      if (data.metadata) {
        const metadata: any = {};
        if (data.metadata.seoTitle?.trim()) {
          metadata.seoTitle = data.metadata.seoTitle.trim();
        }
        if (data.metadata.seoDescription?.trim()) {
          metadata.seoDescription = data.metadata.seoDescription.trim();
        }
        if (data.metadata.socialImage?.trim()) {
          metadata.socialImage = data.metadata.socialImage.trim();
        }

        if (Object.keys(metadata).length > 0) {
          submissionData.metadata = metadata;
        }
      }

      await onSubmit(submissionData);
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Failed to save article");
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error("Image size should be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        form.setValue("featuredImage", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview("");
    form.setValue("featuredImage", "");
  };

  const addTag = () => {
    if (tagInput.trim() && !watchedValues.tags?.includes(tagInput.trim())) {
      const currentTags = form.getValues("tags") || [];
      form.setValue("tags", [...currentTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue(
      "tags",
      currentTags.filter((tag) => tag !== tagToRemove)
    );
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
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

  const availableCategories =
    categories.length > 0
      ? categories.map((cat) => cat.name)
      : defaultCategories;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        noValidate
        className="space-y-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Article Content
                </CardTitle>
                <CardDescription>
                  Create engaging content for your audience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  rules={{
                    required: "Title is required",
                    maxLength: {
                      value: 200,
                      message: "Title must be less than 200 characters",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter article title..."
                          {...field}
                          className="text-lg font-medium"
                        />
                      </FormControl>
                      {fieldState.error && (
                        <FormMessage>{fieldState.error.message}</FormMessage>
                      )}
                      {field.value && (
                        <FormDescription>
                          {field.value.length}/200 characters
                        </FormDescription>
                      )}
                    </FormItem>
                  )}
                />

                {/* Content */}
                <FormField
                  control={form.control}
                  name="content"
                  rules={{
                    required: "Content is required",
                  }}
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span>Content *</span>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{getWordCount(field.value || "")} words</span>
                          <span>
                            {calculateReadingTime(field.value || "")} min read
                          </span>
                        </div>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write your article content here..."
                          className="min-h-[300px] font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      {fieldState.error && (
                        <FormMessage>{fieldState.error.message}</FormMessage>
                      )}
                      <FormDescription>
                        You can use HTML markup for formatting
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {/* Excerpt */}
                <FormField
                  control={form.control}
                  name="excerpt"
                  rules={{
                    maxLength: {
                      value: 500,
                      message: "Excerpt must be less than 500 characters",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Excerpt</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief summary of the article (optional)..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      {fieldState.error && (
                        <FormMessage>{fieldState.error.message}</FormMessage>
                      )}
                      <FormDescription>
                        Leave empty to auto-generate from content
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* SEO & Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  SEO & Metadata
                </CardTitle>
                <CardDescription>
                  Optimize your article for search engines and social media
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="seo" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="seo">SEO</TabsTrigger>
                    <TabsTrigger value="social">Social Media</TabsTrigger>
                  </TabsList>

                  <TabsContent value="seo" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="metadata.seoTitle"
                      rules={{
                        maxLength: {
                          value: 70,
                          message: "SEO title must be less than 70 characters",
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>SEO Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="SEO optimized title..."
                              {...field}
                            />
                          </FormControl>
                          {fieldState.error && (
                            <FormMessage>
                              {fieldState.error.message}
                            </FormMessage>
                          )}
                          <FormDescription>
                            {(field.value || "").length}/70 characters
                            (recommended)
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="metadata.seoDescription"
                      rules={{
                        maxLength: {
                          value: 160,
                          message:
                            "SEO description must be less than 160 characters",
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>SEO Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Meta description for search results..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          {fieldState.error && (
                            <FormMessage>
                              {fieldState.error.message}
                            </FormMessage>
                          )}
                          <FormDescription>
                            {(field.value || "").length}/160 characters
                            (recommended)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="social" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="metadata.socialImage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Social Media Image</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="URL for social media preview image..."
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Recommended size: 1200x630px (will use featured
                            image if empty)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Publish Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Publish Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Draft">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gray-500 rounded-full" />
                              Draft
                            </div>
                          </SelectItem>
                          <SelectItem value="Published">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                              Published
                            </div>
                          </SelectItem>
                          <SelectItem value="Archived">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full" />
                              Archived
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sticky */}
                <FormField
                  control={form.control}
                  name="isSticky"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                          <Pin className="w-4 h-4" />
                          Stick to Top
                        </FormLabel>
                        <FormDescription>
                          Pin this article to the top of the list
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Publish Date */}
                {currentStatus === "Published" && (
                  <FormField
                    control={form.control}
                    name="publishedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Publish Date</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            value={
                              field.value
                                ? field.value instanceof Date
                                  ? field.value.toISOString().slice(0, 16)
                                  : new Date(field.value)
                                      .toISOString()
                                      .slice(0, 16)
                                : ""
                            }
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? new Date(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Leave empty to use current time
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                )}

                {/* Schedule Publish */}
                <FormField
                  control={form.control}
                  name="schedulePublish"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Schedule Publishing
                        </FormLabel>
                        <FormDescription>
                          Schedule this article for future publishing
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Scheduled Date */}
                {watchedValues.schedulePublish && (
                  <FormField
                    control={form.control}
                    name="scheduledAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scheduled Date *</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            value={
                              field.value
                                ? field.value instanceof Date
                                  ? field.value.toISOString().slice(0, 16)
                                  : new Date(field.value)
                                      .toISOString()
                                      .slice(0, 16)
                                : ""
                            }
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? new Date(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Category & Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  rules={{
                    required: "Category is required",
                  }}
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && (
                        <FormMessage>{fieldState.error.message}</FormMessage>
                      )}
                    </FormItem>
                  )}
                />

                {/* Tags */}
                <div>
                  <FormLabel>Tags</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={addTag}
                        disabled={!tagInput.trim()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {watchedValues.tags && watchedValues.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {watchedValues.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Featured Image */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Featured Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {imagePreview ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden bg-muted">
                      <img
                        src={imagePreview}
                        alt="Featured image preview"
                        className="w-full h-32 object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload featured image
                    </p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full"
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="featuredImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/image.jpg"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setImagePreview(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Or paste an image URL directly
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-2">
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        {mode === "create" ? "Creating..." : "Updating..."}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {mode === "create"
                          ? "Create Article"
                          : "Update Article"}
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>

                  {watchedValues.content && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setContentPreview(!contentPreview)}
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {contentPreview ? "Hide Preview" : "Show Preview"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content Preview */}
        {contentPreview && watchedValues.content && (
          <Card>
            <CardHeader>
              <CardTitle>Content Preview</CardTitle>
              <CardDescription>
                Preview how your article will appear to readers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Article Header */}
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold">
                    {watchedValues.title || "Untitled Article"}
                  </h1>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>By Admin</span>
                    <span>•</span>
                    <span>
                      {calculateReadingTime(watchedValues.content)} min read
                    </span>
                    <span>•</span>
                    <span>{getWordCount(watchedValues.content)} words</span>
                    {watchedValues.category && (
                      <>
                        <span>•</span>
                        <Badge variant="outline">
                          {watchedValues.category}
                        </Badge>
                      </>
                    )}
                  </div>

                  {watchedValues.tags && watchedValues.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {watchedValues.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Featured Image */}
                {imagePreview && (
                  <div className="w-full h-64 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={imagePreview}
                      alt="Featured image"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Excerpt */}
                {watchedValues.excerpt && (
                  <div className="text-lg text-muted-foreground italic border-l-4 border-primary pl-4">
                    {watchedValues.excerpt}
                  </div>
                )}

                <Separator />

                {/* Content */}
                <div
                  className="prose prose-gray max-w-none"
                  dangerouslySetInnerHTML={{ __html: watchedValues.content }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </Form>
  );
}
