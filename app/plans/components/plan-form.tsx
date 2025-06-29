
"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Plan, Currency } from "@/types";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

// Updated schema to match your Plan type structure
const planFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().min(0, "Price must be non-negative"),
  currency: z.enum(["USD", "BDT"]),
  duration: z.number().min(1, "Duration must be at least 1 day").optional(),
  features: z.array(z.string()).min(1, "At least one feature is required"),
  // Individual limit fields to match your Plan type
  depositLimit: z.number().min(0),
  withdrawalLimit: z.number().min(0),
  profitLimit: z.number().min(0),
  minimumDeposit: z.number().min(0),
  minimumWithdrawal: z.number().min(0),
  dailyWithdrawalLimit: z.number().min(0),
  monthlyWithdrawalLimit: z.number().min(0),
  priority: z.number().min(1).max(10),
  isActive: z.boolean(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

type PlanFormData = z.infer<typeof planFormSchema>;

interface PlanFormProps {
  initialData?: Plan;
  onSubmit: (data: Partial<Plan>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PlanForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: PlanFormProps) {
  const [features, setFeatures] = React.useState<string[]>(
    initialData?.features || [""]
  );

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      price: initialData?.price || 0,
      currency: initialData?.currency || "BDT",
      duration: initialData?.duration || 30,
      features: initialData?.features || [""],
      depositLimit: initialData?.depositLimit || 0,
      withdrawalLimit: initialData?.withdrawalLimit || 0,
      profitLimit: initialData?.profitLimit || 0,
      minimumDeposit: initialData?.minimumDeposit || 0,
      minimumWithdrawal: initialData?.minimumWithdrawal || 0,
      dailyWithdrawalLimit: initialData?.dailyWithdrawalLimit || 0,
      monthlyWithdrawalLimit: initialData?.monthlyWithdrawalLimit || 0,
      priority: initialData?.priority || 5,
      isActive: initialData?.isActive ?? true,
      color: initialData?.color || "#000000",
      icon: initialData?.icon || "",
    },
  });

  const addFeature = () => {
    const newFeatures = [...features, ""];
    setFeatures(newFeatures);
    form.setValue("features", newFeatures);
  };

  const removeFeature = (index: number) => {
    const newFeatures = features.filter((_, i) => i !== index);
    setFeatures(newFeatures);
    form.setValue("features", newFeatures);
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = features.map((feature, i) =>
      i === index ? value : feature
    );
    setFeatures(newFeatures);
    form.setValue("features", newFeatures);
  };

  const handleSubmit = async (data: PlanFormData) => {
    try {
      // Filter out empty features
      const filteredFeatures = data.features.filter(
        (feature) => feature.trim() !== ""
      );

      await onSubmit({
        ...data,
        features: filteredFeatures,
      });
    } catch (error) {
      console.error("Error submitting plan:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Premium Plan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 - Highest</SelectItem>
                        <SelectItem value="2">2 - High</SelectItem>
                        <SelectItem value="3">3 - Medium High</SelectItem>
                        <SelectItem value="4">4 - Medium</SelectItem>
                        <SelectItem value="5">5 - Normal</SelectItem>
                        <SelectItem value="6">6 - Low</SelectItem>
                        <SelectItem value="7">7 - Lower</SelectItem>
                        <SelectItem value="8">8 - Lowest</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this plan offers..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Set to 0 for free plans</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BDT">
                          BDT (Bangladeshi Taka)
                        </SelectItem>
                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (Days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>How long the plan lasts</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Color</FormLabel>
                    <FormControl>
                      <Input type="color" {...field} />
                    </FormControl>
                    <FormDescription>Color theme for this plan</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., star, crown, diamond"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Icon identifier for this plan
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>
                      Enable this plan for user selection
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  placeholder="Enter feature description"
                  value={feature}
                  onChange={(e) => updateFeature(index, e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeFeature(index)}
                  disabled={features.length === 1}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addFeature}
              className="w-full"
            >
              Add Feature
            </Button>
          </CardContent>
        </Card>

        {/* Limits - Updated to match your Plan type structure */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="depositLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit Limit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>0 = unlimited</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="withdrawalLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Withdrawal Limit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>0 = unlimited</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="profitLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profit Limit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>0 = unlimited</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minimumDeposit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Deposit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum amount for deposits
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minimumWithdrawal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Withdrawal</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum amount for withdrawals
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dailyWithdrawalLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Withdrawal Limit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Max withdrawals per day (0 = unlimited)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monthlyWithdrawalLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Withdrawal Limit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Max withdrawals per month (0 = unlimited)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <LoadingSpinner className="mr-2 h-4 w-4" />}
            {initialData ? "Update Plan" : "Create Plan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
