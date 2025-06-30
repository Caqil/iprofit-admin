import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Transaction } from "@/types";
import { format } from "date-fns";
import { useState } from "react";

interface TransactionApprovalDialogProps {
  transaction: Transaction | null;
  action: "approve" | "reject";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    action: "approve" | "reject";
    reason?: string;
    adminNotes?: string;
  }) => Promise<void>;
}

export function TransactionApprovalDialog({
  transaction,
  action,
  open,
  onOpenChange,
  onConfirm,
}: TransactionApprovalDialogProps) {
  const [reason, setReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);

    try {
      await onConfirm({
        action,
        reason: reason || undefined,
        adminNotes: adminNotes || undefined,
      });

      // Only close dialog and reset state after successful completion
      setReason("");
      setAdminNotes("");
      onOpenChange(false);
    } catch (error) {
      console.error("Transaction approval failed:", error);
      // Don't close dialog on error - let user try again or cancel manually
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      setReason("");
      setAdminNotes("");
      onOpenChange(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === "approve" ? "Approve" : "Reject"} Transaction
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to {action} this transaction?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Transaction ID:</span>
                <span className="ml-2">{transaction._id}</span>
              </div>
              <div>
                <span className="font-medium">Amount:</span>
                <span className="ml-2">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: transaction.currency,
                  }).format(transaction.amount)}
                </span>
              </div>
              <div>
                <span className="font-medium">Type:</span>
                <span className="ml-2 capitalize">{transaction.type}</span>
              </div>
              <div>
                <span className="font-medium">Gateway:</span>
                <span className="ml-2">{transaction.gateway}</span>
              </div>
            </div>
          </div>

          {action === "reject" && (
            <div>
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                required
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
            <Textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Additional notes..."
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant={action === "approve" ? "default" : "destructive"}
            disabled={(action === "reject" && !reason) || isLoading}
          >
            {isLoading
              ? action === "approve"
                ? "Approving..."
                : "Rejecting..."
              : (action === "approve" ? "Approve" : "Reject") + " Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
