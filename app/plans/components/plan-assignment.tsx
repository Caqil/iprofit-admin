"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  AlertCircle,
  CheckCircle,
  Upload,
  Download,
} from "lucide-react";
import { Plan } from "@/types";
import { PlanWithStats } from "@/types/plan";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "sonner";

const assignmentSchema = z.object({
  targetPlanId: z.string().min(1, "Please select a target plan"),
  assignmentType: z.enum(["specific_users", "current_plan", "csv_upload"]),
  userIds: z.array(z.string()).optional(),
  currentPlanId: z.string().optional(),
  csvFile: z.any().optional(),
  reason: z.string().min(5, "Please provide a reason for the assignment"),
  notifyUsers: z.boolean(),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

interface PlanAssignmentProps {
  plans: PlanWithStats[];
  isLoading?: boolean;
  onAssignmentComplete: () => void;
}

export function PlanAssignment({
  plans,
  isLoading = false,
  onAssignmentComplete,
}: PlanAssignmentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<{
    userCount: number;
    users: Array<{
      id: string;
      name: string;
      email: string;
      currentPlan: string;
    }>;
  } | null>(null);

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      assignmentType: "specific_users",
      notifyUsers: true,
      userIds: [],
      reason: "",
    },
  });

  const assignmentType = form.watch("assignmentType");
  const currentPlanId = form.watch("currentPlanId");

  // FIXED: Validate plans array before using
  const validPlans = Array.isArray(plans) ? plans : [];
  const activePlans = validPlans.filter((plan) => plan && plan.isActive);

  const handlePreview = async () => {
    const formData = form.getValues();

    setIsProcessing(true);
    try {
      // In a real implementation, this would call your API
      // For now, showing mock data
      setPreviewData({
        userCount: 25,
        users: [
          {
            id: "1",
            name: "John Doe",
            email: "john@example.com",
            currentPlan: "Free Plan",
          },
          {
            id: "2",
            name: "Jane Smith",
            email: "jane@example.com",
            currentPlan: "Basic Plan",
          },
          {
            id: "3",
            name: "Bob Johnson",
            email: "bob@example.com",
            currentPlan: "Premium Plan",
          },
        ],
      });
    } catch (error) {
      toast.error("Failed to preview assignment");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignment = async (data: AssignmentFormData) => {
    setIsProcessing(true);
    try {
      // Mock assignment - in real app, call your API endpoint
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success(
        `Successfully assigned ${previewData?.userCount || 0} users to new plan`
      );
      onAssignmentComplete();
    } catch (error) {
      toast.error("Failed to assign users to plan");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent =
      "user_id,email,reason\n1,user1@example.com,Upgrade for premium features\n2,user2@example.com,Plan migration";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plan_assignment_sample.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Show loading state while plans are being fetched
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
        <span className="ml-2">Loading plans...</span>
      </div>
    );
  }

  // Show message if no plans available
  if (validPlans.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">
          No plans available
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Create some plans first before assigning users.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleAssignment)}
          className="space-y-6"
        >
          {/* Target Plan Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Target Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="targetPlanId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Plan to Assign</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose target plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* FIXED: Proper validation and error handling */}
                        {activePlans.length > 0 ? (
                          activePlans.map((plan) => (
                            <SelectItem key={plan._id} value={plan._id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{plan.name}</span>
                                <Badge variant="outline" className="ml-2">
                                  {plan.price > 0
                                    ? `${plan.price} ${plan.currency || "BDT"}`
                                    : "Free"}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-plans" disabled>
                            No active plans available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Assignment Type */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="assignmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How would you like to select users?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="specific_users">
                          Specific User IDs
                        </SelectItem>
                        <SelectItem value="current_plan">
                          All Users from Current Plan
                        </SelectItem>
                        <SelectItem value="csv_upload">
                          CSV File Upload
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Specific Users */}
              {assignmentType === "specific_users" && (
                <FormField
                  control={form.control}
                  name="userIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User IDs</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter user IDs (one per line or comma-separated)"
                          className="resize-none"
                          onChange={(e) => {
                            const ids = e.target.value
                              .split(/[\n,]/)
                              .map((id) => id.trim())
                              .filter((id) => id.length > 0);
                            field.onChange(ids);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter user IDs separated by commas or new lines
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Current Plan */}
              {assignmentType === "current_plan" && (
                <FormField
                  control={form.control}
                  name="currentPlanId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Plan</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select current plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* FIXED: Safe iteration over plans array */}
                          {validPlans.length > 0 ? (
                            validPlans.map((plan) => (
                              <SelectItem key={plan._id} value={plan._id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{plan.name}</span>
                                  <Badge variant="outline" className="ml-2">
                                    {plan.userCount || 0} users
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-plans" disabled>
                              No plans available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        All users currently on this plan will be moved
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* CSV Upload */}
              {assignmentType === "csv_upload" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>CSV File</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={downloadSampleCSV}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Sample
                    </Button>
                  </div>
                  <FormField
                    control={form.control}
                    name="csvFile"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="file"
                            accept=".csv"
                            onChange={(e) =>
                              field.onChange(e.target.files?.[0])
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Upload a CSV file with user_id, email, and reason
                          columns
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Assignment</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why these users are being assigned to this plan..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This will be logged for audit purposes and optionally sent
                      to users
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notifyUsers"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Notify Users</FormLabel>
                      <FormDescription>
                        Send email notifications to affected users about the
                        plan change
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Preview */}
          {previewData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                  Assignment Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {previewData.userCount} users will be assigned to the
                    selected plan. This action cannot be undone.
                  </AlertDescription>
                </Alert>

                <div className="mt-4">
                  <h4 className="font-medium mb-2">Sample Users:</h4>
                  <div className="space-y-2">
                    {previewData.users.slice(0, 3).map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          {user.name} ({user.email})
                        </span>
                        <Badge variant="outline">{user.currentPlan}</Badge>
                      </div>
                    ))}
                    {previewData.userCount > 3 && (
                      <p className="text-sm text-muted-foreground">
                        ...and {previewData.userCount - 3} more users
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={isProcessing || activePlans.length === 0}
            >
              {isProcessing && <LoadingSpinner className="mr-2 h-4 w-4" />}
              Preview Assignment
            </Button>
            <Button
              type="submit"
              disabled={
                isProcessing || !previewData || activePlans.length === 0
              }
            >
              {isProcessing && <LoadingSpinner className="mr-2 h-4 w-4" />}
              Assign Users
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
