import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Transaction } from "@/types";
import { format } from "date-fns";

interface TransactionDetailDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailDialog({
  transaction,
  open,
  onOpenChange,
}: TransactionDetailDialogProps) {
  if (!transaction) return null;

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            Complete information for transaction {transaction._id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Transaction ID</Label>
              <p className="text-sm text-muted-foreground">{transaction._id}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">User ID</Label>
              <p className="text-sm text-muted-foreground">
                {transaction.userId}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Type</Label>
              <Badge variant="outline" className="ml-2">
                {transaction.type}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Badge variant="outline" className="ml-2">
                {transaction.status}
              </Badge>
            </div>
          </div>

          {/* Financial Information */}
          <div>
            <h4 className="text-sm font-medium mb-2">Financial Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Amount</Label>
                <p className="text-lg font-semibold">
                  {formatCurrency(transaction.amount, transaction.currency)}
                </p>
              </div>
              <div>
                <Label className="text-sm">Fees</Label>
                <p className="text-sm">
                  {formatCurrency(transaction.fees, transaction.currency)}
                </p>
              </div>
              <div>
                <Label className="text-sm">Net Amount</Label>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(transaction.netAmount, transaction.currency)}
                </p>
              </div>
              <div>
                <Label className="text-sm">Gateway</Label>
                <p className="text-sm">{transaction.gateway}</p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          {transaction.description && (
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-muted-foreground">
                {transaction.description}
              </p>
            </div>
          )}

          {transaction.adminNotes && (
            <div>
              <Label className="text-sm font-medium">Admin Notes</Label>
              <p className="text-sm text-muted-foreground">
                {transaction.adminNotes}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Created At</Label>
              <p className="text-sm text-muted-foreground">
                {format(new Date(transaction.createdAt), "PPpp")}
              </p>
            </div>
            {transaction.processedAt && (
              <div>
                <Label className="text-sm font-medium">Processed At</Label>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(transaction.processedAt), "PPpp")}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
