"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Gift,
  TrendingUp,
  DollarSign,
  Search,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";
import { ReferralsOverview } from "./components/referrals-overview";
import { ReferralsTable } from "./components/referrals-table";
import { BonusManagement } from "./components/bonus-management";
import { useReferrals } from "@/hooks/use-referrals";
import { ReferralFilter, PaginationParams } from "@/types";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function ReferralsPage() {
  const [filters, setFilters] = useState<ReferralFilter>({});
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");

  const {
    referrals,
    totalReferrals,
    overview,
    topReferrers,
    isLoading,
    isOverviewLoading,
    error,
    approveReferral,
    rejectReferral,
    recalculateProfitBonus,
    refreshReferrals,
  } = useReferrals(filters, pagination);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters((prev) => ({ ...prev, search: value || undefined }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key: keyof ReferralFilter, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">
            Error loading referrals
          </p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
          <Button onClick={refreshReferrals} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Referral Management
          </h1>
          <p className="text-muted-foreground">
            Manage referral bonuses and track referral performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={refreshReferrals}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <ReferralsOverview
        overview={overview}
        topReferrers={topReferrers}
        isLoading={isOverviewLoading}
      />

      {/* Filters */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
        
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  handleFilterChange(
                    "status",
                    value === "all" ? undefined : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bonus Type</label>
              <Select
                value={filters.bonusType || "all"}
                onValueChange={(value) =>
                  handleFilterChange(
                    "bonusType",
                    value === "all" ? undefined : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="signup">Signup Bonus</SelectItem>
                  <SelectItem value="profit_share">Profit Share</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
</div>
      {/* Main Content Tabs */}
      <Tabs defaultValue="referrals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="referrals">
            <Users className="mr-2 h-4 w-4" />
            Referrals
          </TabsTrigger>
          <TabsTrigger value="bonuses">
            <Gift className="mr-2 h-4 w-4" />
            Bonus Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="space-y-4">
          <ReferralsTable
            referrals={referrals}
            totalReferrals={totalReferrals}
            pagination={pagination}
            onPaginationChange={setPagination}
            isLoading={isLoading}
            onApprove={approveReferral}
            onReject={rejectReferral}
          />
        </TabsContent>

        <TabsContent value="bonuses" className="space-y-4">
          <BonusManagement
            overview={overview}
            onApprove={approveReferral}
            onReject={rejectReferral}
            onRecalculate={recalculateProfitBonus}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
