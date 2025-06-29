"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";
import { useSupport } from "@/hooks/use-support";
import { TicketsTable } from "../components/tickets-table";
import { TicketFilter, PaginationParams } from "@/types";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function TicketsPage() {
  const [filters, setFilters] = useState<TicketFilter>({});
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);

  const {
    tickets,
    totalTickets,
    isTicketsLoading,
    updateTicket,
    assignTicket,
    updateTicketStatus,
    deleteTicket,
    error,
  } = useSupport(filters, pagination);

  const handleFiltersChange = (newFilters: Partial<TicketFilter>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setFilters((prev) => ({ ...prev, search: term }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  if (isTicketsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground">
            Manage customer support requests and track resolutions
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Ticket
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={filters.status || ""}
                onChange={(e) =>
                  handleFiltersChange({ status: e.target.value as any })
                }
              >
                <option value="">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting for User">Waiting for User</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={filters.priority || ""}
                onChange={(e) =>
                  handleFiltersChange({ priority: e.target.value as any })
                }
              >
                <option value="">All Priority</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <TicketsTable
        tickets={tickets}
        totalTickets={totalTickets}
        pagination={pagination}
        onPaginationChange={setPagination}
        selectedTickets={selectedTickets}
        onSelectionChange={setSelectedTickets}
        onUpdate={updateTicket}
        onAssign={assignTicket}
        onStatusChange={updateTicketStatus}
        onDelete={deleteTicket}
        isLoading={isTicketsLoading}
      />
    </div>
  );
}
