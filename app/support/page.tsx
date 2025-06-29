"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Ticket,
  MessageSquare,
  HelpCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Timer,
  Star,
} from "lucide-react";
import { useSupport } from "@/hooks/use-support";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";
import { formatDuration } from "date-fns";

export default function SupportPage() {
  const {
    analytics,
    isAnalyticsLoading,
    tickets,
    totalTickets,
    faqs,
    totalFAQs,
    chats,
    totalChats,
    error,
  } = useSupport();

  if (isAnalyticsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Error loading support data
          </h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
        <p className="text-muted-foreground">
          Manage support tickets, live chat, and FAQ content
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(analytics?.totalTickets || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.openTickets || 0} open tickets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.averageResponseTime ? formatDuration({
                seconds: Math.floor(analytics.averageResponseTime / 1000)
              }) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Target: 2 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resolution Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalTickets
                ? Math.round(
                    (analytics.resolvedTickets / analytics.totalTickets) * 100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.resolvedTickets || 0} resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Satisfaction Score
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.satisfactionScore?.toFixed(1) || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Out of 5.0</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Support Tickets
            </CardTitle>
            <CardDescription>
              Manage and respond to customer support requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Open</span>
                <Badge variant="destructive">
                  {analytics?.openTickets || 0}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">In Progress</span>
                <Badge variant="secondary">
                  {analytics?.ticketsByStatus?.find(
                    (s) => s.status === "In Progress"
                  )?.count || 0}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Resolved</span>
                <Badge variant="default">
                  {analytics?.resolvedTickets || 0}
                </Badge>
              </div>
            </div>
            <div className="mt-4 space-x-2">
              <Button asChild>
                <Link href="/support/tickets">View All Tickets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Live Chat
            </CardTitle>
            <CardDescription>
              Monitor and join active chat sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Active Chats</span>
                <Badge variant="default">
                  {chats.filter((chat) => chat.status === "Active").length}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Waiting</span>
                <Badge variant="secondary">
                  {chats.filter((chat) => chat.status === "Waiting").length}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Today</span>
                <span className="text-sm font-medium">{totalChats}</span>
              </div>
            </div>
            <div className="mt-4">
              <Button asChild>
                <Link href="/support/chat">Manage Chats</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              FAQ Management
            </CardTitle>
            <CardDescription>
              Create and update frequently asked questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Published FAQs</span>
                <span className="text-sm font-medium">
                  {faqs.filter((faq) => faq.isActive).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total FAQs</span>
                <span className="text-sm font-medium">{totalFAQs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Categories</span>
                <span className="text-sm font-medium">
                  {new Set(faqs.map((faq) => faq.category)).size}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <Button asChild>
                <Link href="/support/faq">Manage FAQs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance */}
      {analytics?.agentPerformance && analytics.agentPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
            <CardDescription>
              Support team performance metrics for this period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {analytics.agentPerformance.map((agent) => (
                <div
                  key={agent.adminId}
                  className="space-y-2 rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{agent.adminName}</h4>
                    <Badge variant="outline">
                      {agent.satisfactionScore.toFixed(1)} ⭐
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Assigned:</span>
                      <span>{agent.assignedTickets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Resolved:</span>
                      <span>{agent.resolvedTickets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Response:</span>
                      <span>{formatDuration({
                        seconds: Math.floor(agent.averageResponseTime / 1000)
                      })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
