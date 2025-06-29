"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UserPlus, RefreshCw, AlertCircle } from "lucide-react";
import { User, Plan, AdminUserCreateRequest } from "@/types";
import { toast } from "sonner";
import { adminUserCreateSchema } from "@/lib/validation";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (user: User) => void;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [generatePassword, setGeneratePassword] = useState(true);

  const form = useForm<AdminUserCreateRequest>({
    resolver: zodResolver(adminUserCreateSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      planId: "",
      deviceId: "",
      referralCode: "",
    },
  });

  // Reset and fetch data when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        email: "",
        phone: "",
        planId: "",
        deviceId: "",
        referralCode: "",
      });
      setPlans([]);
      setPlansError(null);
      fetchPlans();
      generateDeviceId();
    }
  }, [open]);

  const fetchPlans = async () => {
    try {
      setIsLoadingPlans(true);
      setPlansError(null);
      console.log("🔍 Fetching plans for user creation...");

      const response = await fetch(
        "/api/plans?limit=100&sortBy=priority&sortOrder=asc",
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📡 Plans response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Plans fetch error:", errorData);
        throw new Error(
          errorData.message || `HTTP ${response.status}: Failed to fetch plans`
        );
      }

      const data = await response.json();
      console.log("📊 Plans API response:", data);

      // Handle different response structures
      let plansArray: Plan[] = [];

      if (data.success && data.data) {
        // Wrapped response with success flag
        if (Array.isArray(data.data.data)) {
          plansArray = data.data.data;
        } else if (Array.isArray(data.data)) {
          plansArray = data.data;
        }
      } else if (Array.isArray(data.data)) {
        // Direct data array
        plansArray = data.data;
      } else if (Array.isArray(data)) {
        // Direct array response
        plansArray = data;
      }

      // Validate plans array
      if (!Array.isArray(plansArray)) {
        console.error("❌ Plans response is not an array:", plansArray);
        throw new Error("Invalid plans data received from server");
      }

      // Filter out invalid plans and ensure required fields
      const validPlans = plansArray.filter((plan) => {
        const hasId = plan._id; // Plan type only has _id property
        const hasName = plan.name;
        if (!hasId || !hasName) {
          console.warn("⚠️ Skipping invalid plan:", plan);
          return false;
        }
        return true;
      });

      console.log(
        `✅ Processed ${validPlans.length} valid plans from ${plansArray.length} total`
      );
      setPlans(validPlans);
    } catch (error) {
      console.error("❌ Error fetching plans:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load plans";
      setPlansError(errorMessage);
      toast.error(errorMessage);
      setPlans([]); // Ensure plans is always an array
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const generateDeviceId = () => {
    const deviceId = `admin_device_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 15)}`;
    form.setValue("deviceId", deviceId);
  };

  const onSubmit = async (data: AdminUserCreateRequest) => {
    try {
      setIsLoading(true);

      // Validate that a plan is selected
      if (!data.planId) {
        toast.error("Please select a plan for the user");
        return;
      }

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          isAdminCreated: true,
          generatePassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create user");
      }

      const result = await response.json();
      const user = result.success ? result.data : result;

      toast.success("User created successfully!");
      onSuccess(user);
      onOpenChange(false);

      // Reset form
      form.reset();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create user"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlansSelect = () => {
    if (isLoadingPlans) {
      return (
        <SelectItem value="loading" disabled>
          <div className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading plans...
          </div>
        </SelectItem>
      );
    }

    if (plansError) {
      return (
        <SelectItem value="error" disabled>
          <div className="flex items-center text-destructive">
            <AlertCircle className="mr-2 h-4 w-4" />
            Error loading plans
          </div>
        </SelectItem>
      );
    }

    if (!Array.isArray(plans) || plans.length === 0) {
      return (
        <SelectItem value="no-plans" disabled>
          No plans available
        </SelectItem>
      );
    }

    return plans
      .map((plan) => {
        const planId = plan._id; // Plan type only has _id, not id
        const planName = plan.name || "Unnamed Plan";
        const planPrice = typeof plan.price === "number" ? plan.price : 0;
        const planDuration = plan.duration ? `${plan.duration} days` : "month";

        // Ensure planId is not empty string
        if (!planId || planId.trim() === "") {
          console.warn("⚠️ Skipping plan with empty ID:", plan);
          return null;
        }

        return (
          <SelectItem key={planId} value={planId}>
            {planName} - ${planPrice}/{planDuration}
          </SelectItem>
        );
      })
      .filter(Boolean); // Remove null values
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Create New User</span>
          </DialogTitle>
          <DialogDescription>
            Add a new user to the system with their basic information. A
            password will be auto-generated and sent via email.
          </DialogDescription>
        </DialogHeader>

        {plansError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{plansError}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPlans}
                disabled={isLoadingPlans}
              >
                <RefreshCw
                  className={`h-3 w-3 ${isLoadingPlans ? "animate-spin" : ""}`}
                />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter full name"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter email address"
                      type="email"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter phone number"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="planId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={isLoading || isLoadingPlans}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingPlans
                              ? "Loading plans..."
                              : plansError
                              ? "Error loading plans"
                              : plans.length === 0
                              ? "No plans available"
                              : "Select a plan"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>{renderPlansSelect()}</SelectContent>
                  </Select>
                  {!isLoadingPlans && plans.length === 0 && !plansError && (
                    <FormDescription>
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={fetchPlans}
                        disabled={isLoadingPlans}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Refresh plans
                      </Button>
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="referralCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referral Code (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter referral code if any"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty if the user was not referred by anyone
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device ID</FormLabel>
                  <FormControl>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Auto-generated device ID"
                        {...field}
                        disabled={isLoading}
                        readOnly
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateDeviceId}
                        disabled={isLoading}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    A unique device identifier for OAuth 2.0 device limiting
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center space-x-2">
              <Checkbox
                id="generate-password"
                checked={generatePassword}
                onCheckedChange={(checked) => setGeneratePassword(checked === true)}
                disabled={isLoading}
              />
              <label
                htmlFor="generate-password"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Auto-generate secure password and send via email
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isLoadingPlans || plans.length === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
