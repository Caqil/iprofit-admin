// Complete KYC Document Viewer System
// File: app/users/[id]/kyc/page.tsx

"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  Mail,
  Phone,
  Camera,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { hasPermission } from "@/lib/permissions";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

interface KYCData {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  status: string;
  documents: KYCDocument[];
  rejectionReason?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  isVerified: boolean;
}

interface KYCDocument {
  _id?: string;
  type: string;
  url: string;
  uploadedAt: string | Date;
  status?: string;
  documentNumber?: string;
  expiryDate?: string;
}

export default function KYCDocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { approveKYC } = useUsers();
  const userId = params.id as string;

  const [selectedDocument, setSelectedDocument] = useState<KYCDocument | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageZoom, setImageZoom] = useState(100);
  const [imageRotation, setImageRotation] = useState(0);

  // Check permissions
  const canManageKYC = hasPermission(
    currentUser?.role || "Viewer",
    "users.kyc.approve"
  );

  // Fetch KYC data
  const {
    data: kycData,
    isLoading,
    error,
    refetch,
  } = useQuery<KYCData>({
    queryKey: ["kyc-documents", userId],
    queryFn: async (): Promise<KYCData> => {
      const response = await fetch(`/api/users/${userId}/kyc`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch KYC data");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch KYC data");
      }

      return result.data;
    },
    enabled: !!userId,
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      Approved: "bg-green-100 text-green-800",
      Pending: "bg-yellow-100 text-yellow-800",
      Rejected: "bg-red-100 text-red-800",
    };
    return (
      variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "Pending":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "Rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes("passport")) return "🛂";
    if (lowerType.includes("license") || lowerType.includes("driving"))
      return "🪪";
    if (lowerType.includes("id") || lowerType.includes("national")) return "🆔";
    if (lowerType.includes("utility") || lowerType.includes("bill"))
      return "📄";
    if (lowerType.includes("bank") || lowerType.includes("statement"))
      return "🏦";
    return "📋";
  };

  const handleKYCAction = async (action: "approve" | "reject") => {
    if (action === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setIsProcessing(true);
    try {
      await approveKYC({
        userId,
        action,
        rejectionReason: action === "reject" ? rejectionReason : undefined,
        adminNotes: `${
          action === "approve" ? "Approved" : "Rejected"
        } via document viewer`,
      });

      toast.success(`KYC ${action}d successfully`);
      setRejectionReason("");
      refetch(); // Refresh the data
    } catch (error: any) {
      console.error("KYC action error:", error);
      toast.error(`Failed to ${action} KYC: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadDocument = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetImageControls = () => {
    setImageZoom(100);
    setImageRotation(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !kycData) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-2">
                Error Loading KYC Data
              </h2>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error
                  ? error.message
                  : "Failed to load KYC information"}
              </p>
              <Button onClick={() => router.push("/users")} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Users
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/users")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">KYC Documents</h1>
            <p className="text-muted-foreground">
              Review and manage {kycData.userName}'s verification documents
            </p>
          </div>
        </div>
        <Badge className={getStatusBadge(kycData.status)}>
          {getStatusIcon(kycData.status)}
          <span className="ml-2">{kycData.status}</span>
        </Badge>
      </div>

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>User Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Full Name
              </Label>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{kycData.userName}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Email Address
              </Label>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{kycData.userEmail}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Phone Number
              </Label>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{kycData.userPhone}</span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Submitted At
              </Label>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {kycData.submittedAt
                    ? formatDate(new Date(kycData.submittedAt))
                    : "Not submitted"}
                </span>
              </div>
            </div>
            {kycData.approvedAt && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Approved At
                </Label>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{formatDate(new Date(kycData.approvedAt))}</span>
                </div>
              </div>
            )}
            {kycData.rejectedAt && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Rejected At
                </Label>
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>{formatDate(new Date(kycData.rejectedAt))}</span>
                </div>
              </div>
            )}
          </div>

          {/* Rejection Reason */}
          {kycData.rejectionReason && (
            <div className="mt-6 pt-6 border-t">
              <Label className="text-sm font-medium text-muted-foreground">
                Rejection Reason
              </Label>
              <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  {kycData.rejectionReason}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Submitted Documents ({kycData.documents.length})</span>
          </CardTitle>
          <CardDescription>
            Click on any document to view it in detail
          </CardDescription>
        </CardHeader>
        <CardContent>
          {kycData.documents && kycData.documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kycData.documents.map((document, index) => (
                <Card
                  key={index}
                  className="border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">
                          {getDocumentTypeIcon(document.type)}
                        </div>
                        <div>
                          <h4 className="font-medium capitalize">
                            {document.type.replace(/_/g, " ")}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {formatRelativeTime(new Date(document.uploadedAt))}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Document Preview */}
                    {document.url && (
                      <div className="mb-3">
                        <img
                          src={document.url}
                          alt={document.type}
                          className="w-full h-32 object-cover rounded-md border"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            (e.currentTarget
                              .nextElementSibling as HTMLElement)!.style.display =
                              "flex";
                          }}
                        />
                        <div className="hidden w-full h-32 border rounded-md items-center justify-center bg-gray-50">
                          <div className="text-center">
                            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                            <p className="text-xs text-muted-foreground">
                              Preview unavailable
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <Dialog onOpenChange={() => resetImageControls()}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setSelectedDocument(document)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh]">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              <span className="text-xl">
                                {getDocumentTypeIcon(document.type)}
                              </span>
                              <span className="capitalize">
                                {document.type.replace(/_/g, " ")}
                              </span>
                            </DialogTitle>
                            <DialogDescription>
                              Uploaded on{" "}
                              {formatDate(new Date(document.uploadedAt))}
                            </DialogDescription>
                          </DialogHeader>

                          {/* Image Controls */}
                          <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setImageZoom(Math.max(25, imageZoom - 25))
                                }
                              >
                                <ZoomOut className="h-4 w-4" />
                              </Button>
                              <span className="text-sm font-medium min-w-[60px] text-center">
                                {imageZoom}%
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setImageZoom(Math.min(200, imageZoom + 25))
                                }
                              >
                                <ZoomIn className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setImageRotation((imageRotation + 90) % 360)
                                }
                              >
                                <RotateCw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resetImageControls()}
                              >
                                Reset
                              </Button>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(document.url, "_blank")
                                }
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open in New Tab
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  downloadDocument(
                                    document.url,
                                    `${document.type}_${index + 1}`
                                  )
                                }
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </div>

                          {/* Document Viewer */}
                          <div className="overflow-auto max-h-[60vh] flex justify-center items-center bg-gray-50 rounded-lg p-4">
                            {document.url ? (
                              <img
                                src={document.url}
                                alt={document.type}
                                className="max-w-none transition-transform duration-200"
                                style={{
                                  transform: `scale(${
                                    imageZoom / 100
                                  }) rotate(${imageRotation}deg)`,
                                }}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  (e.currentTarget
                                    .nextElementSibling as HTMLElement)!.style.display =
                                    "block";
                                }}
                              />
                            ) : null}
                            <div className="hidden text-center py-12">
                              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">
                                Document preview not available
                              </p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          downloadDocument(
                            document.url,
                            `${document.type}_${index + 1}`
                          )
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Documents Submitted</h3>
              <p className="text-muted-foreground">
                The user has not submitted any KYC documents yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KYC Actions */}
      {canManageKYC && kycData.status === "Pending" && (
        <Card>
          <CardHeader>
            <CardTitle>KYC Actions</CardTitle>
            <CardDescription>
              Approve or reject the user's KYC verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve KYC
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Approve KYC Verification
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to approve {kycData.userName}'s KYC
                      verification? This action will grant them full access to
                      all platform features.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleKYCAction("approve")}
                      disabled={isProcessing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing ? "Approving..." : "Approve"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject KYC
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reject KYC Verification</DialogTitle>
                    <DialogDescription>
                      Please provide a reason for rejecting {kycData.userName}'s
                      KYC verification.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="rejectionReason">Rejection Reason</Label>
                    <Textarea
                      id="rejectionReason"
                      placeholder="Enter rejection reason..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setRejectionReason("")}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleKYCAction("reject")}
                      disabled={isProcessing || !rejectionReason.trim()}
                    >
                      {isProcessing ? "Rejecting..." : "Reject KYC"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
