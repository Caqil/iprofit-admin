// app/loans/components/credit-score-display.tsx
"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreditScoreDisplayProps {
  score: number;
  previousScore?: number;
  showLabel?: boolean;
  showTrend?: boolean;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "card" | "badge";
  className?: string;
}

export function CreditScoreDisplay({
  score,
  previousScore,
  showLabel = true,
  showTrend = true,
  showTooltip = true,
  size = "md",
  variant = "default",
  className,
}: CreditScoreDisplayProps) {
  // Credit score ranges and colors
  const getScoreDetails = (score: number) => {
    if (score >= 750) {
      return {
        range: "Excellent",
        color: "text-green-600",
        bgColor: "bg-green-100",
        borderColor: "border-green-200",
        percentage: 100,
        description:
          "Excellent credit score. You qualify for the best loan terms and lowest interest rates.",
      };
    } else if (score >= 700) {
      return {
        range: "Good",
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        borderColor: "border-blue-200",
        percentage: 80,
        description:
          "Good credit score. You qualify for competitive loan terms and rates.",
      };
    } else if (score >= 650) {
      return {
        range: "Fair",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        borderColor: "border-yellow-200",
        percentage: 60,
        description:
          "Fair credit score. You may qualify for loans with moderate terms.",
      };
    } else if (score >= 600) {
      return {
        range: "Poor",
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        borderColor: "border-orange-200",
        percentage: 40,
        description:
          "Poor credit score. Loan approval may be challenging with higher interest rates.",
      };
    } else {
      return {
        range: "Very Poor",
        color: "text-red-600",
        bgColor: "bg-red-100",
        borderColor: "border-red-200",
        percentage: 20,
        description:
          "Very poor credit score. Loan approval is unlikely without significant improvements.",
      };
    }
  };

  const scoreDetails = getScoreDetails(score);

  // Calculate trend
  const trend = previousScore ? score - previousScore : 0;
  const trendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor =
    trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-gray-500";

  // Size configurations
  const sizeConfig = {
    sm: {
      text: "text-sm",
      score: "text-lg",
      badge: "text-xs",
      circle: "w-8 h-8",
      strokeWidth: 4,
    },
    md: {
      text: "text-base",
      score: "text-xl",
      badge: "text-sm",
      circle: "w-12 h-12",
      strokeWidth: 6,
    },
    lg: {
      text: "text-lg",
      score: "text-2xl",
      badge: "text-base",
      circle: "w-16 h-16",
      strokeWidth: 8,
    },
  };

  const config = sizeConfig[size];


  // Badge variant
  if (variant === "badge") {
    const BadgeContent = (
      <Badge
        variant="outline"
        className={cn(
          "gap-1",
          scoreDetails.color,
          scoreDetails.borderColor,
          className
        )}
      >
        <span className="font-bold">{score}</span>
        {showLabel && <span>{scoreDetails.range}</span>}
        {showTrend && trend !== 0 && (
          <span className={cn("flex items-center gap-1", trendColor)}>
            {React.createElement(trendIcon, { className: "h-3 w-3" })}
            {Math.abs(trend)}
          </span>
        )}
      </Badge>
    );

    if (showTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{BadgeContent}</TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{scoreDetails.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return BadgeContent;
  }

  // Card variant
  if (variant === "card") {
    return (
      <Card className={cn("p-4", className)}>
        <CardContent className="p-0 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div
                className={cn("font-bold", config.score, scoreDetails.color)}
              >
                {score}
              </div>
              {showLabel && (
                <div
                  className={cn("font-medium", config.text, scoreDetails.color)}
                >
                  {scoreDetails.range}
                </div>
              )}
            </div>
           
          </div>

          {showTrend && previousScore && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-1",
                  trendColor,
                  config.text
                )}
              >
                {React.createElement(trendIcon, { className: "h-4 w-4" })}
                {trend > 0 ? "+" : ""}
                {trend} points
              </span>
              <span className="text-muted-foreground text-sm">
                from {previousScore}
              </span>
            </div>
          )}

          {showTooltip && (
            <div className="text-sm text-muted-foreground">
              {scoreDetails.description}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant
  const DefaultContent = (
    <div className={cn("flex items-center gap-3", className)}>
     

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className={cn("font-bold", config.score, scoreDetails.color)}>
            {score}
          </span>
          {showLabel && (
            <Badge
              variant="outline"
              className={cn(
                scoreDetails.color,
                scoreDetails.borderColor,
                config.badge
              )}
            >
              {scoreDetails.range}
            </Badge>
          )}
        </div>

        {showTrend && previousScore && trend !== 0 && (
          <div
            className={cn("flex items-center gap-1", trendColor, config.text)}
          >
            {React.createElement(trendIcon, { className: "h-4 w-4" })}
            <span>
              {trend > 0 ? "+" : ""}
              {trend} points
            </span>
            <span className="text-muted-foreground">
              (from {previousScore})
            </span>
          </div>
        )}
      </div>

      {showTooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs space-y-2">
                <p className="font-medium">{scoreDetails.range} Credit Score</p>
                <p>{scoreDetails.description}</p>
                <div className="text-xs space-y-1">
                  <div>Excellent: 750+</div>
                  <div>Good: 700-749</div>
                  <div>Fair: 650-699</div>
                  <div>Poor: 600-649</div>
                  <div>Very Poor: Below 600</div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  return DefaultContent;
}

// Credit score improvement tips component
export function CreditScoreImprovementTips({
  currentScore,
}: {
  currentScore: number;
}) {
  const tips = [
    {
      title: "Pay bills on time",
      description:
        "Payment history is the most important factor affecting your credit score.",
      impact: "High",
    },
    {
      title: "Keep credit utilization low",
      description: "Try to use less than 30% of your available credit limit.",
      impact: "High",
    },
    {
      title: "Don't close old credit cards",
      description:
        "Keeping old accounts open helps maintain a longer credit history.",
      impact: "Medium",
    },
    {
      title: "Limit new credit applications",
      description: "Too many hard inquiries can temporarily lower your score.",
      impact: "Medium",
    },
    {
      title: "Monitor your credit report",
      description: "Check for errors and dispute any inaccuracies you find.",
      impact: "Low",
    },
  ];

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "High":
        return "text-red-600 bg-red-100";
      case "Medium":
        return "text-yellow-600 bg-yellow-100";
      case "Low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          Ways to Improve Your Credit Score
        </h3>
        <div className="space-y-4">
          {tips.map((tip, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 border rounded-lg"
            >
              <div className="flex-1">
                <h4 className="font-medium">{tip.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {tip.description}
                </p>
              </div>
              <Badge className={getImpactColor(tip.impact)}>
                {tip.impact} Impact
              </Badge>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Credit score improvements typically take 1-3
            months to reflect in your report. Consistent good habits will lead
            to steady improvement.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
