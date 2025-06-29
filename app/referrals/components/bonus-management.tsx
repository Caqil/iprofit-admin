"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Users,
  AlertCircle,
} from "lucide-react";
import { ReferralOverview } from "@/types/referral";
import { formatCurrency } from "@/lib/utils";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "sonner";

interface BonusManagementProps {
  overview?: ReferralOverview;
  onApprove: (referralIds: string[], adjustedAmount?: number) => Promise<void>;
  onReject: (referralIds: string[], reason?: string) => Promise<void>;
  onRecalculate: (refereeId: string, newProfitAmount: number) => Promise<void>;
  isLoading: boolean;
}

export function BonusManagement({
  overview,
  onApprove,
  onReject,
  onRecalculate,
  isLoading,
}: BonusManagementProps) {
  const [showRecalculateDialog, setShowRecalculateDialog] = useState(false);
  const [refereeId, setRefereeId] = useState("");
  const [newProfitAmount, setNewProfitAmount] = useState<number | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRecalculate = async () => {
    if (!refereeId || !newProfitAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsProcessing(true);
    try {
      await onRecalculate(refereeId, newProfitAmount);
      setShowRecalculateDialog(false);
      setRefereeId("");
      setNewProfitAmount(undefined);
    } finally {
      setIsProcessing(false);
    }
  };

  const bonusStats = [
    {
      title: "Total Bonuses Paid",
      value: formatCurrency(overview?.totalBonusPaid || 0, "BDT"),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pending Bonuses",
      value: formatCurrency(overview?.pendingBonuses || 0, "BDT"),
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Average Per Referral",
      value: formatCurrency(overview?.averageBonusPerReferral || 0, "BDT"),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Conversion Rate",
      value: `${overview?.conversionRate?.toFixed(1) || "0"}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Bonus Statistics */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {bonusStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bonus Management Tools */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="mr-2 h-5 w-5" />
              Profit Bonus Recalculation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Recalculate profit-share bonuses when a user's total profit
              changes. This will update all related profit-share referral
              bonuses.
            </p>
            <Button
              onClick={() => setShowRecalculateDialog(true)}
              disabled={isLoading}
              className="w-full"
            >
              <Calculator className="mr-2 h-4 w-4" />
              Recalculate Profit Bonuses
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Bonus Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Signup Bonus
                </span>
                <Badge variant="outline">100 BDT</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Profit Share
                </span>
                <Badge variant="outline">10%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Auto Approval
                </span>
                <Badge variant="secondary">Manual</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Bonuses Summary */}
      {overview && overview.pendingBonuses > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertCircle className="mr-2 h-5 w-5" />
              Pending Bonus Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700">
                  You have {formatCurrency(overview.pendingBonuses, "BDT")} in
                  pending bonuses awaiting approval.
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Review and approve bonuses in the Referrals tab to process
                  payments.
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-orange-700 border-orange-300"
              >
                {overview.pendingBonuses > 0 ? "Action Required" : "Up to Date"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recalculate Dialog */}
      <Dialog
        open={showRecalculateDialog}
        onOpenChange={setShowRecalculateDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recalculate Profit Bonuses</DialogTitle>
            <DialogDescription>
              Update profit-share bonuses for a specific user. This will
              recalculate all referral bonuses based on the new profit amount.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="refereeId">User ID (Referee)</Label>
              <Input
                id="refereeId"
                placeholder="Enter user ID who earned the profit"
                value={refereeId}
                onChange={(e) => setRefereeId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                The ID of the user whose profit amount has changed
              </p>
            </div>
            <div>
              <Label htmlFor="newProfitAmount">
                New Total Profit Amount (BDT)
              </Label>
              <Input
                id="newProfitAmount"
                type="number"
                placeholder="Enter new total profit amount"
                value={newProfitAmount || ""}
                onChange={(e) =>
                  setNewProfitAmount(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will calculate 10% profit share for all referrers
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRecalculateDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleRecalculate} disabled={isProcessing}>
              {isProcessing && <LoadingSpinner className="mr-2 h-4 w-4" />}
              Recalculate Bonuses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
