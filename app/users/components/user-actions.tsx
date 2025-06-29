"use client";

import React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ChevronDown,
  Shield,
  Ban,
  CheckCircle,
  XCircle,
  CreditCard,
  Users,
} from "lucide-react";
import { Plan } from "@/types";

interface UserActionsProps {
  selectedUsers: string[];
  onBulkAction: (action: string, metadata?: any) => Promise<void>;
}

export function UserActions({ selectedUsers, onBulkAction }: UserActionsProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState<string>("");
  const [reason, setReason] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleActionSelect = async (action: string) => {
    setActionType(action);

    if (action === "upgrade_plan") {
      // Fetch plans if needed
      await fetchPlans();
    }

    setShowDialog(true);
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/plans", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPlans(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const handleConfirmAction = async () => {
    setIsLoading(true);
    try {
      const metadata: any = {};

      if (reason) metadata.reason = reason;
      if (selectedPlan) metadata.planId = selectedPlan;
      if (rejectionReason) metadata.rejectionReason = rejectionReason;

      await onBulkAction(actionType, metadata);

      // Reset form
      setReason("");
      setSelectedPlan("");
      setRejectionReason("");
      setShowDialog(false);
    } catch (error) {
      console.error("Bulk action failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionTitle = () => {
    switch (actionType) {
      case "activate":
        return "Activate Users";
      case "suspend":
        return "Suspend Users";
      case "ban":
        return "Ban Users";
      case "approve_kyc":
        return "Approve KYC";
      case "reject_kyc":
        return "Reject KYC";
      case "upgrade_plan":
        return "Upgrade Plan";
      default:
        return "Bulk Action";
    }
  };

  const getActionDescription = () => {
    const userCount = selectedUsers.length;
    switch (actionType) {
      case "activate":
        return `Activate ${userCount} selected user(s). They will regain access to all platform features.`;
      case "suspend":
        return `Suspend ${userCount} selected user(s). They will lose access to platform features but can be reactivated.`;
      case "ban":
        return `Ban ${userCount} selected user(s). This is a permanent action that cannot be easily reversed.`;
      case "approve_kyc":
        return `Approve KYC verification for ${userCount} selected user(s). They will gain access to all platform features.`;
      case "reject_kyc":
        return `Reject KYC verification for ${userCount} selected user(s). Please provide a reason for rejection.`;
      case "upgrade_plan":
        return `Upgrade the plan for ${userCount} selected user(s) to a new plan.`;
      default:
        return `Perform bulk action on ${userCount} selected user(s).`;
    }
  };

  const isActionDestructive = () => {
    return ["ban", "reject_kyc"].includes(actionType);
  };

  const canProceed = () => {
    if (actionType === "upgrade_plan" && !selectedPlan) return false;
    if (actionType === "reject_kyc" && !rejectionReason.trim()) return false;
    return true;
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Badge variant="secondary" className="px-2 py-1">
          <Users className="h-3 w-3 mr-1" />
          {selectedUsers.length} selected
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Bulk Actions
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem onClick={() => handleActionSelect("activate")}>
              <Shield className="mr-2 h-4 w-4" />
              Activate Users
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleActionSelect("suspend")}>
              <Ban className="mr-2 h-4 w-4" />
              Suspend Users
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleActionSelect("ban")}>
              <Ban className="mr-2 h-4 w-4" />
              Ban Users
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleActionSelect("approve_kyc")}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve KYC
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleActionSelect("reject_kyc")}>
              <XCircle className="mr-2 h-4 w-4" />
              Reject KYC
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleActionSelect("upgrade_plan")}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Upgrade Plan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getActionTitle()}</DialogTitle>
            <DialogDescription>{getActionDescription()}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionType === "upgrade_plan" && (
              <div className="space-y-2">
                <Label htmlFor="plan">Select New Plan</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan._id} value={plan._id}>
                        {plan.name} - ${plan.price || 0}/
                        {plan.duration ? `${plan.duration} days` : "month"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {actionType === "reject_kyc" && (
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Please provide a detailed reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
            )}

            {["suspend", "ban", "activate"].includes(actionType) && (
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Provide a reason for this action..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant={isActionDestructive() ? "destructive" : "default"}
              onClick={handleConfirmAction}
              disabled={isLoading || !canProceed()}
            >
              {isLoading ? "Processing..." : "Confirm Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
