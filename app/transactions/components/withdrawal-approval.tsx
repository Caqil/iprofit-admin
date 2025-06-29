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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Ban, AlertTriangle, DollarSign } from "lucide-react";

interface WithdrawalApprovalProps {
  selectedWithdrawals: string[];
  onApproval: (action: "approve" | "reject", reason?: string) => Promise<void>;
  canApprove: boolean;
  canReject: boolean;
}

export function WithdrawalApproval({
  selectedWithdrawals,
  onApproval,
  canApprove,
  canReject,
}: WithdrawalApprovalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const handleApprove = async () => {
    await onApproval("approve");
    setShowApproveDialog(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      return;
    }
    await onApproval("reject", rejectionReason);
    setRejectionReason("");
    setShowRejectDialog(false);
  };

  if (selectedWithdrawals.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-blue-500" />
          <span>Bulk Withdrawal Actions</span>
        </CardTitle>
        <CardDescription>
          {selectedWithdrawals.length} withdrawal requests selected for
          processing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please review withdrawal requests carefully before approval. Ensure
            sufficient funds and verify user details.
          </AlertDescription>
        </Alert>

        <div className="flex items-center space-x-4">
          {canApprove && (
            <Dialog
              open={showApproveDialog}
              onOpenChange={setShowApproveDialog}
            >
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Approve {selectedWithdrawals.length} Withdrawals</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve Withdrawals</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to approve these{" "}
                    {selectedWithdrawals.length} withdrawal requests? This
                    action will process the payments and cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please ensure you have verified all withdrawal details and
                    account information before approving.
                  </AlertDescription>
                </Alert>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowApproveDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleApprove}>Approve Withdrawals</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {canReject && (
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="flex items-center space-x-2"
                >
                  <Ban className="h-4 w-4" />
                  <span>Reject {selectedWithdrawals.length} Withdrawals</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Withdrawals</DialogTitle>
                  <DialogDescription>
                    Please provide a reason for rejecting these{" "}
                    {selectedWithdrawals.length} withdrawal requests.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Reason for rejection (e.g., insufficient funds, invalid account details, etc.)..."
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
                    Reject Withdrawals
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
