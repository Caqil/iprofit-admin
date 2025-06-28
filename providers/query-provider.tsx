"use client";

import {
  QueryClient,
  QueryClientProvider,
  MutationCache,
  QueryCache,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, ReactNode } from "react";
import { toast } from "sonner";
import { ApiError } from "@/utils/api";
import { handleApiError } from "@/utils/api";

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time - how long data stays fresh
            staleTime: 5 * 60 * 1000, // 5 minutes

            // Cache time - how long data stays in cache after becoming stale
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)

            // Retry configuration
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors except 429 (rate limit)
              if (error instanceof ApiError) {
                if (
                  error.code >= 400 &&
                  error.code < 500 &&
                  error.code !== 429
                ) {
                  return false;
                }
              }
              return failureCount < 3;
            },

            // Retry delay with exponential backoff
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),

            // Refetch on window focus (useful for real-time data)
            refetchOnWindowFocus: true,

            // Refetch on reconnect
            refetchOnReconnect: true,

            // Background refetch interval for critical data
            refetchInterval: false, // Disabled by default, enable per query

            // Network mode
            networkMode: "online",
          },
          mutations: {
            // Retry failed mutations
            retry: (failureCount, error) => {
              // Don't retry on client errors
              if (
                error instanceof ApiError &&
                error.code >= 400 &&
                error.code < 500
              ) {
                return false;
              }
              return failureCount < 2;
            },

            // Network mode for mutations
            networkMode: "online",
          },
        },

        // Global error handling for queries
        queryCache: new QueryCache({
          onError: (error, query) => {
            // Only show error toasts for background refetches that fail
            // Don't show for initial loads (those should be handled by components)
            if (query.state.data !== undefined) {
              const errorMessage = handleApiError(error);
              toast.error(`Failed to refresh data: ${errorMessage}`);
            }
          },
        }),

        // Global error handling for mutations
        mutationCache: new MutationCache({
          onError: (error, variables, context, mutation) => {
            // Don't show toast if mutation has onError handler
            if (!mutation.options.onError) {
              const errorMessage = handleApiError(error);
              toast.error(`Operation failed: ${errorMessage}`);
            }
          },

          onSuccess: (data, variables, context, mutation) => {
            // Show success toast for mutations that don't have their own success handler
            if (!mutation.options.onSuccess) {
              toast.success("Operation completed successfully");
            }
          },
        }),
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </QueryClientProvider>
  );
}

// Query key factory for consistent cache keys
export const queryKeys = {
  // Authentication
  auth: ["auth"] as const,
  session: () => [...queryKeys.auth, "session"] as const,

  // Users
  users: ["users"] as const,
  usersList: (filters?: any) => [...queryKeys.users, "list", filters] as const,
  userDetail: (id: string) => [...queryKeys.users, "detail", id] as const,
  userProfile: (id: string) => [...queryKeys.users, "profile", id] as const,
  userTransactions: (id: string) =>
    [...queryKeys.users, id, "transactions"] as const,

  // Transactions
  transactions: ["transactions"] as const,
  transactionsList: (filters?: any) =>
    [...queryKeys.transactions, "list", filters] as const,
  transactionDetail: (id: string) =>
    [...queryKeys.transactions, "detail", id] as const,
  transactionSummary: (filters?: any) =>
    [...queryKeys.transactions, "summary", filters] as const,

  // Loans
  loans: ["loans"] as const,
  loansList: (filters?: any) => [...queryKeys.loans, "list", filters] as const,
  loanDetail: (id: string) => [...queryKeys.loans, "detail", id] as const,
  loanAnalytics: () => [...queryKeys.loans, "analytics"] as const,
  emiCalculation: (params: any) => [...queryKeys.loans, "emi", params] as const,

  // Plans
  plans: ["plans"] as const,
  plansList: () => [...queryKeys.plans, "list"] as const,
  planDetail: (id: string) => [...queryKeys.plans, "detail", id] as const,
  planUsage: (id: string) => [...queryKeys.plans, id, "usage"] as const,

  // Tasks
  tasks: ["tasks"] as const,
  tasksList: (filters?: any) => [...queryKeys.tasks, "list", filters] as const,
  taskDetail: (id: string) => [...queryKeys.tasks, "detail", id] as const,
  taskSubmissions: (id: string) =>
    [...queryKeys.tasks, id, "submissions"] as const,

  // Referrals
  referrals: ["referrals"] as const,
  referralsList: (filters?: any) =>
    [...queryKeys.referrals, "list", filters] as const,
  referralOverview: () => [...queryKeys.referrals, "overview"] as const,

  // Notifications
  notifications: ["notifications"] as const,
  notificationsList: (filters?: any) =>
    [...queryKeys.notifications, "list", filters] as const,
  notificationTemplates: () =>
    [...queryKeys.notifications, "templates"] as const,

  // News
  news: ["news"] as const,
  newsList: (filters?: any) => [...queryKeys.news, "list", filters] as const,
  newsDetail: (id: string) => [...queryKeys.news, "detail", id] as const,
  newsAnalytics: () => [...queryKeys.news, "analytics"] as const,

  // Support
  support: ["support"] as const,
  supportTickets: (filters?: any) =>
    [...queryKeys.support, "tickets", filters] as const,
  supportTicketDetail: (id: string) =>
    [...queryKeys.support, "tickets", id] as const,
  supportFAQs: () => [...queryKeys.support, "faqs"] as const,

  // Dashboard
  dashboard: ["dashboard"] as const,
  dashboardMetrics: (filters?: any) =>
    [...queryKeys.dashboard, "metrics", filters] as const,
  dashboardCharts: (filters?: any) =>
    [...queryKeys.dashboard, "charts", filters] as const,
  dashboardAlerts: () => [...queryKeys.dashboard, "alerts"] as const,

  // Audit
  audit: ["audit"] as const,
  auditLogs: (filters?: any) => [...queryKeys.audit, "logs", filters] as const,
};
