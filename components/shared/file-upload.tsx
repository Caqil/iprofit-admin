"use client";

import React from "react";
import { useDropzone, DropzoneOptions, FileRejection } from "react-dropzone";
import {
  Upload,
  File,
  Image,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface FileUploadFile extends File {
  id: string;
  preview?: string;
  status: "pending" | "uploading" | "success" | "error";
  progress?: number;
  error?: string;
  url?: string;
}

export interface FileUploadProps {
  value?: FileUploadFile[];
  onValueChange?: (files: FileUploadFile[]) => void;
  onUpload?: (files: FileUploadFile[]) => Promise<void>;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  description?: string;
  showPreview?: boolean;
  allowDownload?: boolean;
}

export function FileUpload({
  value = [],
  onValueChange,
  onUpload,
  accept = {
    "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    "application/pdf": [".pdf"],
    "text/*": [".txt", ".csv"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
  },
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024, // 5MB
  multiple = true,
  disabled = false,
  className,
  placeholder = "Drag and drop files here, or click to select",
  description = "Supports images, PDFs, and documents up to 5MB",
  showPreview = true,
  allowDownload = false,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);

  const onDrop = React.useCallback(
    async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Handle rejected files
      rejectedFiles.forEach((rejection) => {
        const { file, errors } = rejection;
        errors.forEach((error) => {
          if (error.code === "file-too-large") {
            toast.error(
              `File ${file.name} is too large. Maximum size is ${formatFileSize(
                maxSize
              )}.`
            );
          } else if (error.code === "file-invalid-type") {
            toast.error(`File ${file.name} has an invalid type.`);
          } else {
            toast.error(`Error with file ${file.name}: ${error.message}`);
          }
        });
      });

      if (acceptedFiles.length === 0) return;

      // Check if adding files would exceed maxFiles
      if (value.length + acceptedFiles.length > maxFiles) {
        toast.error(`Cannot upload more than ${maxFiles} files.`);
        return;
      }

      // Create file objects with preview URLs for images
      const newFiles: FileUploadFile[] = await Promise.all(
        acceptedFiles.map(async (file) => {
          const fileWithId: FileUploadFile = Object.assign(file, {
            id: Math.random().toString(36).substring(2),
            status: "pending" as const,
            progress: 0,
          });

          // Generate preview for images
          if (file.type.startsWith("image/")) {
            fileWithId.preview = URL.createObjectURL(file);
          }

          return fileWithId;
        })
      );

      const updatedFiles = [...value, ...newFiles];
      onValueChange?.(updatedFiles);

      // Auto-upload if onUpload is provided
      if (onUpload) {
        try {
          setIsUploading(true);

          // Update status to uploading
          const uploadingFiles = updatedFiles.map((file) =>
            newFiles.find((f) => f.id === file.id)
              ? { ...file, status: "uploading" as const }
              : file
          );
          onValueChange?.(uploadingFiles);

          await onUpload(newFiles);

          // Update status to success
          const successFiles = updatedFiles.map((file) =>
            newFiles.find((f) => f.id === file.id)
              ? { ...file, status: "success" as const, progress: 100 }
              : file
          );
          onValueChange?.(successFiles);

          toast.success(`Successfully uploaded ${newFiles.length} file(s).`);
        } catch (error) {
          // Update status to error
          const errorFiles = updatedFiles.map((file) =>
            newFiles.find((f) => f.id === file.id)
              ? {
                  ...file,
                  status: "error" as const,
                  error:
                    error instanceof Error ? error.message : "Upload failed",
                }
              : file
          );
          onValueChange?.(errorFiles);

          toast.error("Failed to upload files. Please try again.");
        } finally {
          setIsUploading(false);
        }
      }
    },
    [value, onValueChange, onUpload, maxFiles, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles - value.length,
    maxSize,
    multiple,
    disabled: disabled || isUploading,
  });

  const removeFile = (fileId: string) => {
    const updatedFiles = value.filter((file) => file.id !== fileId);
    onValueChange?.(updatedFiles);

    // Cleanup preview URLs
    const fileToRemove = value.find((f) => f.id === fileId);
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
  };

  const retryUpload = async (file: FileUploadFile) => {
    if (!onUpload) return;

    try {
      setIsUploading(true);

      const updatedFiles = value.map((f) =>
        f.id === file.id
          ? { ...f, status: "uploading" as const, error: undefined }
          : f
      );
      onValueChange?.(updatedFiles);

      await onUpload([file]);

      const successFiles = value.map((f) =>
        f.id === file.id
          ? { ...f, status: "success" as const, progress: 100 }
          : f
      );
      onValueChange?.(successFiles);

      toast.success("File uploaded successfully.");
    } catch (error) {
      const errorFiles = value.map((f) =>
        f.id === file.id
          ? {
              ...f,
              status: "error" as const,
              error: error instanceof Error ? error.message : "Upload failed",
            }
          : f
      );
      onValueChange?.(errorFiles);

      toast.error("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadFile = (file: FileUploadFile) => {
    if (file.url) {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (file: FileUploadFile) => {
    if (file.type.startsWith("image/")) {
      return <Image className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const getStatusIcon = (file: FileUploadFile) => {
    switch (file.status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <Card>
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive && "border-primary bg-primary/5",
            disabled && "opacity-50 cursor-not-allowed",
            "hover:border-primary/50 hover:bg-primary/5"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium">{placeholder}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            </div>
            <Badge variant="outline">
              {value.length}/{maxFiles} files
            </Badge>
          </div>
        </div>
      </Card>

      {/* File List */}
      {value.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Uploaded Files</CardTitle>
            <CardDescription>
              {value.length} of {maxFiles} files selected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {value.map((file) => (
              <div
                key={file.id}
                className="flex items-center space-x-3 p-3 border rounded-lg"
              >
                {/* File Icon/Preview */}
                <div className="flex-shrink-0">
                  {showPreview && file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="h-10 w-10 object-cover rounded"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                      {getFileIcon(file)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    {getStatusIcon(file)}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                    <Badge
                      variant={
                        file.status === "success"
                          ? "default"
                          : file.status === "error"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {file.status}
                    </Badge>
                  </div>

                  {/* Progress bar for uploading files */}
                  {file.status === "uploading" &&
                    file.progress !== undefined && (
                      <Progress value={file.progress} className="mt-2" />
                    )}

                  {/* Error message */}
                  {file.status === "error" && file.error && (
                    <p className="text-xs text-red-500 mt-1">{file.error}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1">
                  {file.status === "error" && onUpload && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retryUpload(file)}
                      disabled={isUploading}
                    >
                      Retry
                    </Button>
                  )}

                  {allowDownload && file.url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadFile(file)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeFile(file.id)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
