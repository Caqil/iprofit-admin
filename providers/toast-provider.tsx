"use client";

import { Toaster } from "sonner";
import { ThemeProvider, useTheme } from "./theme-provider";
import { ReactNode } from "react";
import { AuthProvider } from "./auth-provider";
import { QueryProvider } from "./query-provider";

export function ToastProvider() {
  const { actualTheme } = useTheme();

  return (
    <Toaster
      position="top-right"
      expand={true}
      richColors
      closeButton
      theme={actualTheme}
      toastOptions={{
        style: {
          background:
            actualTheme === "dark" ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)",
          border:
            actualTheme === "dark"
              ? "hsl(217.2 32.6% 17.5%)"
              : "hsl(214.3 31.8% 91.4%)",
          color:
            actualTheme === "dark" ? "hsl(210 40% 98%)" : "hsl(222.2 84% 4.9%)",
        },
        className:
          "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
        duration: 4000,
      }}
      icons={{
        success: "✅",
        info: "ℹ️",
        warning: "⚠️",
        error: "❌",
        loading: "⏳",
      }}
    />
  );
}

// Toast utility functions for consistent usage
export const toast = {
  success: (message: string, options?: any) => {
    return (window as any).sonner?.toast?.success(message, {
      ...options,
      className:
        "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
    });
  },

  error: (message: string, options?: any) => {
    return (window as any).sonner?.toast?.error(message, {
      ...options,
      className:
        "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
    });
  },

  warning: (message: string, options?: any) => {
    return (window as any).sonner?.toast?.warning(message, {
      ...options,
      className:
        "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200",
    });
  },

  info: (message: string, options?: any) => {
    return (window as any).sonner?.toast?.info(message, {
      ...options,
      className:
        "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200",
    });
  },

  loading: (message: string, options?: any) => {
    return (window as any).sonner?.toast?.loading(message, {
      ...options,
      className:
        "bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-200",
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return (window as any).sonner?.toast?.promise(promise, options);
  },

  custom: (jsx: React.ReactNode, options?: any) => {
    return (window as any).sonner?.toast?.custom(jsx, options);
  },

  dismiss: (id?: string | number) => {
    return (window as any).sonner?.toast?.dismiss(id);
  },
};

// Root provider that combines all providers
export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        <AuthProvider>
          <ToastProvider />
          {children}
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
