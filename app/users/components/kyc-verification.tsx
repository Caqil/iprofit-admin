"use client";

import React from "react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { User } from "@/types";
import { toast } from "sonner";

interface KYCVerificationProps {
  user: User;
  onKYCAction: (action: "approve" | "reject", reason?: string) => Promise<void>;
  canManage: boolean;
}

export function KYCVerification({
  user,
  onKYCAction,
  canManage,
}: KYCVerificationProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onKYCAction("approve");
      toast.success("KYC approved successfully");
    } catch (error) {
      toast.error("Failed to approve KYC");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setIsProcessing(true);
    try {
      await onKYCAction("reject", rejectionReason);
      setRejectionReason("");
      toast.success("KYC rejected successfully");
    } catch (error) {
      toast.error("Failed to reject KYC");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return <CheckCircle className="h-4 w-4" />;
      case "Pending":
        return <AlertTriangle className="h-4 w-4" />;
      case "Rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* KYC Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                {getStatusIcon(user.kycStatus)}
                <span>KYC Verification Status</span>
              </CardTitle>
              <CardDescription>
                Know Your Customer verification details for {user.name}
              </CardDescription>
            </div>
            <Badge className={getStatusColor(user.kycStatus)}>
              {user.kycStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Status
              </label>
              <div className="mt-1">
                <Badge className={getStatusColor(user.kycStatus)}>
                  {user.kycStatus}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Submitted At
              </label>
              <div className="mt-1 text-sm">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "Not submitted"}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Last Updated
              </label>
              <div className="mt-1 text-sm">
                {user.updatedAt
                  ? new Date(user.updatedAt).toLocaleDateString()
                  : "Never"}
              </div>
            </div>
          </div>

          {user.kycRejectionReason && (
            <div className="border-t pt-4">
              <label className="text-sm font-medium text-muted-foreground">
                Rejection Reason
              </label>
              <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  {user.kycRejectionReason}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KYC Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Submitted Documents</CardTitle>
          <CardDescription>
            Review the documents submitted by the user for verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user.kycDocuments && user.kycDocuments.length > 0 ? (
            <div className="space-y-4">
              {user.kycDocuments.map((document, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{document.type}</div>
                      <div className="text-sm text-muted-foreground">
                        Uploaded on{" "}
                        {new Date(document.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDocument(document)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle>{document.type}</DialogTitle>
                          <DialogDescription>
                            Document uploaded on{" "}
                            {new Date(document.uploadedAt).toLocaleDateString()}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4">
                          {document.url && (
                            <div className="border rounded-lg p-4">
                              <img
                                src={document.url}
                                alt={document.type}
                                className="max-w-full h-auto"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  (e.currentTarget.nextElementSibling as HTMLElement)!.style.display =
                                    "block";
                                }}
                              />
                              <div className="hidden text-center py-8">
                                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">
                                  Document preview not available
                                </p>
                                <Button
                                  variant="outline"
                                  className="mt-2"
                                  onClick={() =>
                                    window.open(document.url, "_blank")
                                  }
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Document
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(document.url, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
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
      {canManage && user.kycStatus === "Pending" && (
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
                      Are you sure you want to approve {user.name}'s KYC
                      verification? This action will grant them full access to
                      all platform features.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleApprove}
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
                      Please provide a reason for rejecting {user.name}'s KYC
                      verification. This will help them understand what needs to
                      be corrected.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Textarea
                      placeholder="Enter rejection reason..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={4}
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
                      onClick={handleReject}
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
