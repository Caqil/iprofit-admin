"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  CheckCircle,
  AlertTriangle,
  Send,
  TrendingUp,
} from "lucide-react";
import { Notification } from "@/types";
import { formatRelativeTime } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface NotificationDashboardProps {
  recentNotifications: Notification[];
  stats: {
    totalSent: number;
    pendingDelivery: number;
    failedDelivery: number;
    deliveryRate: number;
  };
  onViewAll: () => void;
  onSendNew: () => void;
}

export function NotificationDashboard({
  recentNotifications,
  stats,
  onViewAll,
  onSendNew,
}: NotificationDashboardProps) {
  const channelStats = {
    email: recentNotifications.filter((n) => n.channel === "email").length,
    sms: recentNotifications.filter((n) => n.channel === "sms").length,
    in_app: recentNotifications.filter((n) => n.channel === "in_app").length,
    push: recentNotifications.filter((n) => n.channel === "push").length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Delivered":
      case "Sent":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "Failed":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChannelIcon = (channel: string) => {
    const icons = {
      email: Mail,
      sms: MessageSquare,
      in_app: Bell,
      push: Smartphone,
    };
    const Icon = icons[channel as keyof typeof icons] || Bell;
    return <Icon className="h-4 w-4" />;
  };

  // Sample delivery trends data
  const deliveryTrends = [
    { day: "Mon", delivered: 150, failed: 5 },
    { day: "Tue", delivered: 180, failed: 8 },
    { day: "Wed", delivered: 165, failed: 3 },
    { day: "Thu", delivered: 200, failed: 12 },
    { day: "Fri", delivered: 190, failed: 7 },
    { day: "Sat", delivered: 120, failed: 2 },
    { day: "Sun", delivered: 95, failed: 1 },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingDelivery}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.failedDelivery}
            </div>
            <p className="text-xs text-muted-foreground">Delivery failed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.deliveryRate}%
            </div>
            <p className="text-xs text-muted-foreground">Success rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Notifications</CardTitle>
                <CardDescription>
                  Latest notification activities
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onSendNew}>
                  <Send className="h-4 w-4 mr-2" />
                  Send New
                </Button>
                <Button variant="outline" size="sm" onClick={onViewAll}>
                  View All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentNotifications.slice(0, 5).map((notification: any) => (
                <div
                  key={notification._id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {getChannelIcon(notification.channel)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.user?.name || "System"} •{" "}
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(notification.status)}
                    <Badge variant="outline" className="text-xs">
                      {notification.channel}
                    </Badge>
                  </div>
                </div>
              ))}

              {recentNotifications.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent notifications</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Trends</CardTitle>
            <CardDescription>
              7-day notification delivery performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={deliveryTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="delivered"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="Delivered"
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Failed"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Channel Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Distribution</CardTitle>
          <CardDescription>
            Notification distribution across channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Mail className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{channelStats.email}</p>
                <p className="text-sm text-muted-foreground">Email</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{channelStats.sms}</p>
                <p className="text-sm text-muted-foreground">SMS</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Bell className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{channelStats.in_app}</p>
                <p className="text-sm text-muted-foreground">In-App</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Smartphone className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{channelStats.push}</p>
                <p className="text-sm text-muted-foreground">Push</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
