"use client";

import React, { useState } from "react";
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
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface DepositApprovalProps {
  selectedDeposits: string[];
  onApproval: (action: "approve" | "reject", reason?: string) => Promise<void>;
  canApprove: boolean;
  canReject: boolean;
}

export function DepositApproval({
  selectedDeposits,
  onApproval,
  canApprove,
  canReject,
}: DepositApprovalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleApprove = async () => {
    await onApproval("approve");
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      return;
    }
    await onApproval("reject", rejectionReason);
    setRejectionReason("");
    setShowRejectDialog(false);
  };

  if (selectedDeposits.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <span>Bulk Deposit Actions</span>
        </CardTitle>
        <CardDescription>
          {selectedDeposits.length} deposits selected for bulk action
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          {canApprove && (
            <Button
              onClick={handleApprove}
              className="flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Approve {selectedDeposits.length} Deposits</span>
            </Button>
          )}

          {canReject && (
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="flex items-center space-x-2"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Reject {selectedDeposits.length} Deposits</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Deposits</DialogTitle>
                  <DialogDescription>
                    Please provide a reason for rejecting these{" "}
                    {selectedDeposits.length} deposits.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={!rejectionReason.trim()}
                  >
                    Reject Deposits
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
