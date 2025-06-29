"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Gift,
  TrendingUp,
  DollarSign,
  Award,
  Target,
} from "lucide-react";
import { ReferralOverview, TopReferrer } from "@/types/referral";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { formatCurrency } from "@/lib/utils";

interface ReferralsOverviewProps {
  overview?: ReferralOverview;
  topReferrers: TopReferrer[];
  isLoading: boolean;
}

export function ReferralsOverview({
  overview,
  topReferrers,
  isLoading,
}: ReferralsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <LoadingSpinner className="mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: "Total Referrals",
      value: overview?.totalReferrals?.toLocaleString() || "0",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Active Referrals",
      value: overview?.activeReferrals?.toLocaleString() || "0",
      icon: Target,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total Bonus Paid",
      value: formatCurrency(overview?.totalBonusPaid || 0, "BDT"),
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Pending Bonuses",
      value: formatCurrency(overview?.pendingBonuses || 0, "BDT"),
      icon: Gift,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
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
              {stat.title === "Total Referrals" && overview?.conversionRate && (
                <p className="text-xs text-muted-foreground">
                  {overview.conversionRate.toFixed(1)}% conversion rate
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Referrers */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="mr-2 h-5 w-5" />
              Top Referrers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topReferrers.length > 0 ? (
                topReferrers.slice(0, 5).map((referrer, index) => (
                  <div
                    key={referrer.userId}
                    className="flex items-center space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="secondary"
                        className="w-6 h-6 p-0 rounded-full"
                      >
                        {index + 1}
                      </Badge>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {referrer.userName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {referrer.userName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {referrer.totalReferrals} referrals
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(referrer.totalEarnings, "BDT")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {referrer.conversionRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No referrers yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Referral Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Average Bonus per Referral
                </span>
                <span className="font-semibold">
                  {formatCurrency(
                    overview?.averageBonusPerReferral || 0,
                    "BDT"
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Conversion Rate
                </span>
                <span className="font-semibold">
                  {overview?.conversionRate?.toFixed(1) || "0"}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Total Pending
                </span>
                <Badge variant="outline">
                  {formatCurrency(overview?.pendingBonuses || 0, "BDT")}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
