"use client";

import { useState } from "react";
import {
  Users,
  DollarSign,
  CreditCard,
  TrendingUp,
  Activity,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Bell,
  Settings,
} from "lucide-react";

import { useDashboard } from "@/hooks/use-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Recharts imports for charts
import {
  LineChart as RechartsLineChart,
  AreaChart,
  BarChart,
  PieChart as RechartsPieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  Bar,
  Line,
  Cell,
  Pie,
} from "recharts";

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const {
    metrics,
    chartData,
    alerts,
    isLoading,
    error,
    filters,
    setFilters,
    refreshData,
    isRefreshing,
  } = useDashboard();

  const [selectedTab, setSelectedTab] = useState("overview");

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ [key]: value });
  };

  const handleExportData = async () => {
    try {
      const response = await fetch("/api/dashboard/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters, format: "xlsx" }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dashboard-report-${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Report exported successfully");
      } else {
        throw new Error("Failed to export report");
      }
    } catch (error) {
      toast.error("Failed to export report");
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard data: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}. Here's what's happening with your
            platform.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Date Range Selector */}
          <Select
            value={filters.dateRange}
            onValueChange={(value) => handleFilterChange("dateRange", value)}
          >
            <SelectTrigger className="w-[140px]">
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

          {/* Currency Selector */}
          <Select
            value={filters.currency || "BDT"}
            onValueChange={(value) => handleFilterChange("currency", value)}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BDT">BDT</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>

          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")}
            />
            Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportData}>
                Excel Report
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.info("PDF export coming soon")}
              >
                PDF Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* System Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.slice(0, 3).map((alert) => (
            <Alert
              key={alert.id}
              className={cn(
                alert.type === "error" &&
                  "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
                alert.type === "warning" &&
                  "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
                alert.type === "info" &&
                  "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
              )}
            >
              <Bell className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">{alert.title}:</span>{" "}
                {alert.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : metrics?.users.total.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">
                    +{metrics?.users.newThisMonth || 0}
                  </span>{" "}
                  from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading
                    ? "..."
                    : `${
                        filters.currency
                      } ${metrics?.revenue.totalRevenue.toLocaleString()}`}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">
                    +{metrics?.revenue.revenueGrowth || 0}%
                  </span>{" "}
                  from last month
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
                  {isLoading
                    ? "..."
                    : metrics?.loans.activeLoans.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-blue-600">
                    {metrics?.loans.pendingApplications || 0}
                  </span>{" "}
                  pending applications
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Transaction Volume
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading
                    ? "..."
                    : `${
                        filters.currency
                      } ${metrics?.transactions.totalVolume.toLocaleString()}`}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">
                    +{metrics?.transactions.growthRate || 0}%
                  </span>{" "}
                  from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>
                  User registration trends over time
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData?.userGrowth || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        New user registered
                      </p>
                      <p className="text-xs text-muted-foreground">
                        2 minutes ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        KYC document approved
                      </p>
                      <p className="text-xs text-muted-foreground">
                        5 minutes ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Loan application pending
                      </p>
                      <p className="text-xs text-muted-foreground">
                        10 minutes ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Activity className="mr-2 h-4 w-4 text-green-600" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Transaction completed
                      </p>
                      <p className="text-xs text-muted-foreground">
                        15 minutes ago
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  KYC Status
                </CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending</span>
                  <Badge variant="outline">
                    {metrics?.users.kycPending || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Approved</span>
                  <Badge variant="default">
                    {metrics?.users.kycApproved || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Support Tickets
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Open</span>
                  <Badge variant="destructive">
                    {metrics?.support.openTickets || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Resolved Today</span>
                  <Badge variant="default">
                    {metrics?.support.resolvedToday || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Transaction Status
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending Approvals</span>
                  <Badge variant="outline">
                    {metrics?.transactions.pendingApprovals || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Success Rate</span>
                  <Badge variant="default">
                    {metrics?.transactions.successRate || 0}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Volume</CardTitle>
                <CardDescription>
                  Daily transaction volume over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={chartData?.transactionVolume || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" />
                  </RechartsLineChart>
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
                  <BarChart data={chartData?.revenueChart || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Loan Performance</CardTitle>
                <CardDescription>
                  Loan disbursement and collection trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData?.loanPerformance || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#ffc658"
                      fill="#ffc658"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Support Metrics</CardTitle>
                <CardDescription>
                  Support ticket resolution trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={chartData?.supportMetrics || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#ff7300" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Active Users</span>
                    <Badge>{metrics?.users.active || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Suspended Users</span>
                    <Badge variant="destructive">
                      {metrics?.users.suspended || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>KYC Pending</span>
                    <Badge variant="outline">
                      {metrics?.users.kycPending || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>User Registration Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsLineChart data={chartData?.userGrowth || []}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Deposits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filters.currency}{" "}
                  {metrics?.transactions.depositsToday.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Withdrawals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filters.currency}{" "}
                  {metrics?.transactions.withdrawalsToday.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Loan Disbursed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filters.currency}{" "}
                  {metrics?.loans.totalDisbursed.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Revenue Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  +{metrics?.revenue.revenueGrowth || 0}%
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
              <CardDescription>Revenue and transaction trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData?.revenueChart || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    fill="#8884d8"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
