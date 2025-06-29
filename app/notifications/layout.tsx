"use client";

import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { LayoutSidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface NotificationsLayoutProps {
  children: ReactNode;
}

export default function NotificationsLayout({
  children,
}: NotificationsLayoutProps) {
  return (
    <SidebarProvider>
      <LayoutSidebar />
      <div className="flex flex-1 flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </SidebarProvider>
  );
}
