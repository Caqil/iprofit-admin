"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { TransactionSummary } from "@/types";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface TransactionSummaryCardsProps {
  summary?: TransactionSummary;
  isLoading: boolean;
}

export function TransactionSummaryCards({
  summary,
  isLoading,
}: TransactionSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-20">
                <LoadingSpinner size="sm" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT",
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Volume */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.totalDeposits + summary.totalWithdrawals)}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.totalCount} transactions
          </p>
        </CardContent>
      </Card>

      {/* Pending Amount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.pendingAmount)}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.byStatus.Pending?.count || 0} transactions
          </p>
        </CardContent>
      </Card>

      {/* Success Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPercentage(summary.successRate)}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.byStatus.Approved?.count || 0} approved
          </p>
        </CardContent>
      </Card>

      {/* Average Processing Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Processing</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.averageProcessingTime.toFixed(1)}h
          </div>
          <p className="text-xs text-muted-foreground">
            Average time to process
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
