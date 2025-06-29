"use client";

import { useState, useEffect } from "react";
import {
  Users,
  DollarSign,
  CreditCard,
  TrendingUp,
  Activity,
  Calendar,
  Download,
  RefreshCw,
  SquaresExcludeIcon,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Recharts imports
import {
  LineChart,
  AreaChart,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  Bar,
  Line,
} from "recharts";

// Types
interface DashboardMetrics {
  users: {
    total: number;
    active: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    kycPending: number;
    kycApproved: number;
    suspended: number;
    growthRate: number;
  };
  transactions: {
    totalVolume: number;
    totalFees: number;
    depositsToday: number;
    withdrawalsToday: number;
    pendingApprovals: number;
    successRate: number;
    averageAmount: number;
    growthRate: number;
  };
  loans: {
    totalLoans: number;
    activeLoans: number;
    totalDisbursed: number;
    totalCollected: number;
    overdueAmount: number;
    pendingApplications: number;
    approvalRate: number;
    defaultRate: number;
  };
  referrals: {
    totalReferrals: number;
    activeReferrals: number;
    totalBonusPaid: number;
    pendingBonuses: number;
    conversionRate: number;
    averageBonusPerReferral: number;
  };
  support: {
    openTickets: number;
    resolvedToday: number;
    averageResponseTime: number;
    satisfactionScore: number;
    escalatedTickets: number;
    agentsOnline: number;
  };
  revenue: {
    totalRevenue: number;
    monthlyRevenue: number;
    revenueGrowth?: number;
    monthlyGrowth?: number;
    revenueBySource?: Array<{
      source: string;
      amount: number;
      percentage: number;
      growth: number;
    }>;
    projectedRevenue?: number;
    profitMargin?: number;
  };
}

interface ChartData {
  userGrowth?: Array<{ date: string; value: number; label?: string }>;
  transactionVolume?: Array<{ date: string; value: number; label?: string }>;
  revenueChart?: Array<{ date: string; value: number; label?: string }>;
  loanPerformance?: Array<{ date: string; value: number; label?: string }>;
  supportMetrics?: Array<{ date: string; value: number; label?: string }>;
}

interface RecentActivity {
  id: string;
  user: string;
  action: string;
  amount: number;
  time: string;
  status: "success" | "pending" | "failed";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: "month",
    currency: "BDT",
  });

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      // Fetch metrics and charts in parallel
      const [metricsResponse, chartsResponse] = await Promise.all([
        fetch(`/api/dashboard/metrics?${params}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
        fetch(`/api/dashboard/charts?${params}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
      ]);

      if (!metricsResponse.ok) {
        throw new Error(`Metrics API error: ${metricsResponse.status}`);
      }

      const metricsData = await metricsResponse.json();
      if (metricsData.success && metricsData.data?.metrics) {
        setMetrics(metricsData.data.metrics);
      } else {
        throw new Error(metricsData.error || "Failed to fetch metrics");
      }

      // Handle charts (non-blocking)
      if (chartsResponse.ok) {
        const chartsData = await chartsResponse.json();
        if (chartsData.success && chartsData.data?.chartData) {
          setChartData(chartsData.data.chartData);
        }
      } else {
        console.warn("Charts API failed, continuing without charts");
      }

      // Fetch recent activity
      try {
        const activityResponse = await fetch(
          "/api/dashboard/activity?limit=5",
          {
            credentials: "include",
          }
        );
        if (activityResponse.ok) {
          const activityData = await activityResponse.json();
          if (activityData.success) {
            setRecentActivity(activityData.data || []);
          }
        }
      } catch (activityError) {
        console.warn("Activity fetch failed:", activityError);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    toast.success("Dashboard refreshed");
  };

  // Filter change handler
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Export handler
  const handleExport = async () => {
    try {
      const response = await fetch("/api/dashboard/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters, format: "xlsx" }),
        credentials: "include",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dashboard-export-${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Dashboard exported successfully");
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      toast.error("Failed to export dashboard data");
    }
  };

  // Safe data access
  const safeMetrics = metrics || {
    users: {
      total: 0,
      active: 0,
      newToday: 0,
      newThisWeek: 0,
      newThisMonth: 0,
      kycPending: 0,
      kycApproved: 0,
      suspended: 0,
      growthRate: 0,
    },
    transactions: {
      totalVolume: 0,
      totalFees: 0,
      depositsToday: 0,
      withdrawalsToday: 0,
      pendingApprovals: 0,
      successRate: 0,
      averageAmount: 0,
      growthRate: 0,
    },
    loans: {
      totalLoans: 0,
      activeLoans: 0,
      totalDisbursed: 0,
      totalCollected: 0,
      overdueAmount: 0,
      pendingApplications: 0,
      approvalRate: 0,
      defaultRate: 0,
    },
    referrals: {
      totalReferrals: 0,
      activeReferrals: 0,
      totalBonusPaid: 0,
      pendingBonuses: 0,
      conversionRate: 0,
      averageBonusPerReferral: 0,
    },
    support: {
      openTickets: 0,
      resolvedToday: 0,
      averageResponseTime: 0,
      satisfactionScore: 0,
      escalatedTickets: 0,
      agentsOnline: 0,
    },
    revenue: {
      totalRevenue: 0,
      monthlyRevenue: 0,
      revenueGrowth: 0,
      monthlyGrowth: 0,
      revenueBySource: [],
      projectedRevenue: 0,
      profitMargin: 0,
    },
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Loading Dashboard</h2>
          <p className="text-muted-foreground">Fetching your latest data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Select
            value={filters.dateRange}
            onValueChange={(value) => handleFilterChange("dateRange", value)}
          >
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert>
          <SquaresExcludeIcon className="h-4 w-4" />
          <AlertDescription>
            {error} - Some data may not be current.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 md:grid-cols-2 lg:grid-cols-4 ">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {safeMetrics.users.total.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{safeMetrics.users.growthRate?.toFixed(1) || "0"}% from last
                  month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Transaction Volume
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filters.currency}{" "}
                  {safeMetrics.transactions.totalVolume?.toLocaleString() ||
                    "0"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {safeMetrics.transactions.successRate?.toFixed(1) || "0"}%
                  success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Loans
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {safeMetrics.loans.activeLoans?.toLocaleString() || "0"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {safeMetrics.loans.approvalRate?.toFixed(1) || "0"}% approval
                  rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filters.currency}{" "}
                  {safeMetrics.revenue.totalRevenue?.toLocaleString() || "0"}
                </div>
                <p className="text-xs text-muted-foreground">
                  +
                  {(
                    safeMetrics.revenue.monthlyGrowth ||
                    safeMetrics.revenue.revenueGrowth ||
                    0
                  ).toFixed(1)}
                  % from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData?.transactionVolume || []}>
                    <XAxis
                      dataKey="date"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                    />
                    <Tooltip />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs col-span-3">
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>
                  You made {safeMetrics.transactions.pendingApprovals || 0}{" "}
                  sales this month.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {recentActivity.length > 0 ? (
                    recentActivity.slice(0, 5).map((activity, index) => (
                      <div key={activity.id} className="flex items-center">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {activity.user
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {activity.user}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {activity.action}
                          </p>
                        </div>
                        <div className="ml-auto font-medium">
                          {activity.amount > 0
                            ? `+${
                                filters.currency
                              }${activity.amount.toLocaleString()}`
                            : "-"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground">
                        No recent activity
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  KYC Pending
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {safeMetrics.users.kycPending?.toLocaleString() || "0"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting verification
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Support Tickets
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {safeMetrics.support.openTickets?.toLocaleString() || "0"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {safeMetrics.support.resolvedToday || 0} resolved today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Loan Applications
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {safeMetrics.loans.pendingApplications?.toLocaleString() ||
                    "0"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pending approval
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Referrals
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {safeMetrics.referrals?.totalReferrals?.toLocaleString() ||
                    "0"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {safeMetrics.referrals?.activeReferrals || 0} active
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>
                  New user registrations over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData?.userGrowth || []}>
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--chart-2))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Tooltip />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Revenue growth over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData?.revenueChart || []}>
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Tooltip />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Performance</CardTitle>
              <CardDescription>
                Key performance indicators and system health
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">System Uptime</p>
                  <p className="text-2xl font-bold">99.9%</p>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Average Response Time</p>
                  <p className="text-2xl font-bold">
                    {safeMetrics.support.averageResponseTime?.toFixed(1) || "0"}
                    h
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Support tickets
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Satisfaction Score</p>
                  <p className="text-2xl font-bold">
                    {safeMetrics.support.satisfactionScore?.toFixed(1) || "0"}/5
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Customer feedback
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
