// app/transactions/components/transactions-summary-cards.tsx
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { useDatabaseSettings } from "@/hooks/use-database-settings";

// Flexible summary type that handles both flat and nested structures
interface FlexibleTransactionSummary {
  // Flat structure (what APIs actually return)
  totalTransactions?: number;
  pendingTransactions?: number;
  approvedTransactions?: number;
  rejectedTransactions?: number;
  totalAmount?: number;
  pendingAmount?: number;
  approvedAmount?: number;
  rejectedAmount?: number;
  totalDeposits?: number;
  totalWithdrawals?: number;
  totalFees?: number;
  successRate?: number;

  // Nested structure (for future compatibility)
  byStatus?: {
    Pending?: { count: number; amount: number };
    Approved?: { count: number; amount: number };
    Rejected?: { count: number; amount: number };
    Processing?: { count: number; amount: number };
    Failed?: { count: number; amount: number };
  };
  byType?: {
    deposit?: { count: number; amount: number };
    withdrawal?: { count: number; amount: number };
    bonus?: { count: number; amount: number };
    profit?: { count: number; amount: number };
    penalty?: { count: number; amount: number };
  };
}

interface TransactionSummaryCardsProps {
  summary: FlexibleTransactionSummary | undefined;
  isLoading: boolean;
  className?: string;
}

export function TransactionSummaryCards({
  summary,
  isLoading,
  className,
}: TransactionSummaryCardsProps) {
  // Helper function to safely get values with fallbacks
  const getValue = (path: string, fallback: number = 0): number => {
    if (!summary) return fallback;

    // Try nested structure first (future-proof)
    if (path.includes(".")) {
      const [parent, child, prop] = path.split(".");
      const parentObj = summary[
        parent as keyof FlexibleTransactionSummary
      ] as any;
      if (
        parentObj &&
        parentObj[child] &&
        typeof parentObj[child][prop] === "number"
      ) {
        return parentObj[child][prop];
      }
    }

    // Fall back to flat structure (current API format)
    const flatKey = path.replace(
      /.*\./,
      ""
    ) as keyof FlexibleTransactionSummary;
    const value = summary[flatKey];
    return typeof value === "number" ? value : fallback;
  };

  // Normalize the data to handle both structures
  const normalizedSummary = {
    total: getValue("totalTransactions"),
    pending:
      getValue("byStatus.Pending.count") || getValue("pendingTransactions"),
    approved:
      getValue("byStatus.Approved.count") || getValue("approvedTransactions"),
    rejected:
      getValue("byStatus.Rejected.count") || getValue("rejectedTransactions"),
    processing: getValue("byStatus.Processing.count") || 0,
    failed: getValue("byStatus.Failed.count") || 0,

    totalAmount: getValue("totalAmount"),
    pendingAmount:
      getValue("byStatus.Pending.amount") || getValue("pendingAmount"),
    approvedAmount:
      getValue("byStatus.Approved.amount") || getValue("approvedAmount"),
    rejectedAmount:
      getValue("byStatus.Rejected.amount") || getValue("rejectedAmount"),

    totalDeposits:
      getValue("byType.deposit.amount") || getValue("totalDeposits"),
    totalWithdrawals:
      getValue("byType.withdrawal.amount") || getValue("totalWithdrawals"),
    totalFees: getValue("totalFees"),
    successRate: getValue("successRate"),
  };

  const cards = [
    {
      title: "Total Transactions",
      value: normalizedSummary.total.toLocaleString(),
      description: `${normalizedSummary.approved} approved, ${normalizedSummary.pending} pending`,
      icon: ArrowUpDown,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: normalizedSummary.total > 0 ? "neutral" : "neutral",
    },
    {
      title: "Pending Review",
      value: normalizedSummary.pending.toLocaleString(),
      description: `${normalizedSummary.pending} transactions`,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      trend: normalizedSummary.pending > 0 ? "attention" : "neutral",
      badge: normalizedSummary.pending > 0 ? "Requires Action" : null,
    },
    {
      title: "Approved",
      value: normalizedSummary.approved.toLocaleString(),
      description: (
        <CurrencyDisplay
          amount={normalizedSummary.approvedAmount}
          originalCurrency="BDT"
        />
      ),
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: "positive",
    },
    {
      title: "Rejected",
      value: normalizedSummary.rejected.toLocaleString(),
      description: (
        <CurrencyDisplay
          amount={normalizedSummary.rejectedAmount}
          originalCurrency="BDT"
        />
      ),
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      trend: normalizedSummary.rejected > 0 ? "negative" : "neutral",
    },
    {
      title: "Total Volume",
      value: (
        <CurrencyDisplay
          amount={normalizedSummary.totalAmount}
          originalCurrency="BDT"
        />
      ),
      description: `Deposits: ${normalizedSummary.totalDeposits.toLocaleString()} BDT`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      trend: "neutral",
    },
    {
      title: "Success Rate",
      value: `${normalizedSummary.successRate.toFixed(1)}%`,
      description: `${normalizedSummary.approved} of ${normalizedSummary.total} transactions`,
      icon: TrendingUp,
      color:
        normalizedSummary.successRate >= 90
          ? "text-green-600"
          : normalizedSummary.successRate >= 70
          ? "text-yellow-600"
          : "text-red-600",
      bgColor:
        normalizedSummary.successRate >= 90
          ? "bg-green-50"
          : normalizedSummary.successRate >= 70
          ? "bg-yellow-50"
          : "bg-red-50",
      trend:
        normalizedSummary.successRate >= 90
          ? "positive"
          : normalizedSummary.successRate >= 70
          ? "neutral"
          : "negative",
    },
  ];

  if (isLoading) {
    return (
      <div
        className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}
      >
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-8 w-8 bg-muted rounded-lg"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {cards.map((card, index) => (
        <Card
          key={index}
          className={cn(
            "relative overflow-hidden transition-all hover:shadow-md",
            card.trend === "attention" && "ring-2 ring-orange-200",
            card.trend === "negative" && "ring-1 ring-red-200"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className="flex items-center space-x-2">
              {card.badge && (
                <Badge variant="outline" className="text-xs">
                  {card.badge}
                </Badge>
              )}
              <div className={cn("p-2 rounded-lg", card.bgColor)}>
                <card.icon className={cn("h-4 w-4", card.color)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {typeof card.value === "string" ? card.value : card.value}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {typeof card.description === "string"
                ? card.description
                : card.description}
            </div>

            {/* Trend indicator */}
            {card.trend === "positive" && (
              <div className="flex items-center mt-2 text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span className="text-xs">Good</span>
              </div>
            )}
            {card.trend === "negative" && (
              <div className="flex items-center mt-2 text-red-600">
                <TrendingDown className="h-3 w-3 mr-1" />
                <span className="text-xs">Needs attention</span>
              </div>
            )}
            {card.trend === "attention" && (
              <div className="flex items-center mt-2 text-orange-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span className="text-xs">Action required</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
