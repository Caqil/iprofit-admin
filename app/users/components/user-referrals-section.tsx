// components/users/user-referrals-section.tsx - FIXED COMPONENT
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import { useUserReferrals } from "@/hooks/use-user-referrals";
import { formatCurrency, formatDate } from "@/lib/utils";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { PaginationParams } from "@/types";

interface UserReferralsSectionProps {
  userId: string;
}

export function UserReferralsSection({ userId }: UserReferralsSectionProps) {
  const [filters, setFilters] = useState({
    type: "all" as "referrer" | "referee" | "all",
    status: undefined as "Pending" | "Paid" | "Cancelled" | undefined,
    bonusType: undefined as "signup" | "profit_share" | undefined,
  });

  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const {
    referrals,
    totalReferrals,
    summary,
    user,
    isLoading,
    error,
    refreshReferrals,
  } = useUserReferrals(userId, filters, pagination);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      Pending: "bg-yellow-100 text-yellow-800",
      Paid: "bg-green-100 text-green-800",
      Cancelled: "bg-red-100 text-red-800",
    };
    return (
      variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"
    );
  };

  const getBonusTypeBadge = (bonusType: string) => {
    const variants = {
      signup: "bg-blue-100 text-blue-800",
      profit_share: "bg-purple-100 text-purple-800",
    };
    return (
      variants[bonusType as keyof typeof variants] ||
      "bg-gray-100 text-gray-800"
    );
  };

  const getRelationshipBadge = (type: string) => {
    const variants = {
      referrer: "bg-emerald-100 text-emerald-800",
      referee: "bg-orange-100 text-orange-800",
    };
    return (
      variants[type as keyof typeof variants] || "bg-gray-100 text-gray-800"
    );
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading referrals: {error}</p>
            <Button onClick={refreshReferrals} className="mt-2" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Referrals
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalReferrals}</div>
              <p className="text-xs text-muted-foreground">
                {summary.referrerCount} made, {summary.refereeCount} received
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Earnings
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalEarnings)}
              </div>
              <p className="text-xs text-muted-foreground">All time earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Earnings
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.pendingEarnings)}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Paid Earnings
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.paidEarnings)}
              </div>
              <p className="text-xs text-muted-foreground">Successfully paid</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Referral Activity</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshReferrals}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <Select
              value={filters.type}
              onValueChange={(value) => handleFilterChange("type", value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Relationship Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Referrals</SelectItem>
                <SelectItem value="referrer">As Referrer</SelectItem>
                <SelectItem value="referee">As Referee</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status ? filters.status : "all"}
              onValueChange={(value) =>
                handleFilterChange(
                  "status",
                  value === "all" ? undefined : value
                )
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.bonusType ? filters.bonusType : "all"}
              onValueChange={(value) =>
                handleFilterChange(
                  "bonusType",
                  value === "all" ? undefined : value
                )
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Bonus Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="signup">Signup Bonus</SelectItem>
                <SelectItem value="profit_share">Profit Share</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : referrals.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  No referrals found
                </h3>
                <p className="text-muted-foreground">
                  {filters.type === "all"
                    ? "This user has no referral activity yet."
                    : filters.type === "referrer"
                    ? "This user has not referred anyone yet."
                    : "This user was not referred by anyone."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referee</TableHead>
                    <TableHead>Bonus Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral: any) => (
                    <TableRow key={referral._id}>
                      <TableCell>
                        <Badge
                          className={getBonusTypeBadge(referral.bonusType)}
                        >
                          {referral.bonusType === "signup"
                            ? "Signup"
                            : "Profit Share"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getRelationshipBadge(
                            referral.relationshipType
                          )}
                        >
                          {referral.relationshipType === "referrer"
                            ? "Referrer"
                            : "Referee"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {referral.referrer ? (
                          <div>
                            <div className="font-medium">
                              {referral.referrer.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {referral.referrer.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {referral.referee ? (
                          <div>
                            <div className="font-medium">
                              {referral.referee.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {referral.referee.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(referral.bonusAmount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(referral.status)}>
                          {referral.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(referral.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination could be added here if needed */}
              {totalReferrals > pagination.limit && (
                <div className="flex items-center justify-between px-2 mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {referrals.length} of {totalReferrals} referrals
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: Math.max(1, prev.page - 1),
                        }))
                      }
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {pagination.page} of{" "}
                      {Math.ceil(totalReferrals / pagination.limit)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page + 1,
                        }))
                      }
                      disabled={
                        pagination.page >=
                        Math.ceil(totalReferrals / pagination.limit)
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
