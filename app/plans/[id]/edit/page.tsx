"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanForm } from "../../components/plan-form";
import { usePlans } from "@/hooks/use-plans";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function EditPlanPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;

  const { updatePlan } = usePlans();

  // Fetch plan details
  const {
    data: plan,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["plans", "detail", planId],
    queryFn: async () => {
      const response = await fetch(`/api/plans/${planId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch plan details");
      }
      return response.json();
    },
    enabled: !!planId,
  });

  const handleUpdate = async (data: any) => {
    await updatePlan(planId, data);
    router.push("/plans");
  };

  const handleCancel = () => {
    router.push("/plans");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">
            Error loading plan
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : "Plan not found"}
          </p>
          <Button onClick={() => router.push("/plans")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Plans
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/plans")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Plan</h1>
          <p className="text-muted-foreground">
            Update plan details and configuration
          </p>
        </div>
      </div>

      {/* Plan Form */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanForm
            initialData={plan}
            onSubmit={handleUpdate}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
