"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { TaskAnalytics } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Target, Users, DollarSign, TrendingUp } from "lucide-react";

interface TaskAnalyticsProps {
  analytics: TaskAnalytics;
}

export function TaskAnalyticsComponent({ analytics }: TaskAnalyticsProps) {
  // Sample data for charts
  const categoryData = analytics.popularCategories.map((cat) => ({
    name: cat.name,
    taskCount: cat.taskCount,
    totalRewards: cat.totalRewards,
  }));

  const submissionStatusData = [
    {
      name: "Approved",
      value: analytics.approvedSubmissions,
      color: "#22c55e",
    },
    {
      name: "Rejected",
      value: analytics.rejectedSubmissions,
      color: "#ef4444",
    },
    {
      name: "Pending",
      value:
        analytics.totalSubmissions -
        analytics.approvedSubmissions -
        analytics.rejectedSubmissions,
      color: "#f59e0b",
    },
  ];

  const monthlyTrends = [
    { month: "Jan", submissions: 120, rewards: 15000 },
    { month: "Feb", submissions: 142, rewards: 18500 },
    { month: "Mar", submissions: 165, rewards: 22000 },
    { month: "Apr", submissions: 189, rewards: 24500 },
    { month: "May", submissions: 210, rewards: 28000 },
    { month: "Jun", submissions: 235, rewards: 31000 },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeTasks} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Submissions
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalSubmissions}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(
                (analytics.approvedSubmissions / analytics.totalSubmissions) *
                  100
              )}
              % approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rewards Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.totalRewardsPaid, "BDT")}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg{" "}
              {formatCurrency(
                analytics.totalRewardsPaid / analytics.approvedSubmissions || 0,
                "BDT"
              )}{" "}
              per task
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Completion Time
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.averageCompletionTime}h
            </div>
            <p className="text-xs text-muted-foreground">
              Average time to complete
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks by Category</CardTitle>
            <CardDescription>
              Number of tasks and total rewards by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="taskCount" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Submission Status */}
        <Card>
          <CardHeader>
            <CardTitle>Submission Status</CardTitle>
            <CardDescription>
              Distribution of submission statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={submissionStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {submissionStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>
              Task submissions and rewards over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="submissions"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="rewards"
                  stackId="2"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
