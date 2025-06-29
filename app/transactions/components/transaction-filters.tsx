"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionFilter } from "@/types";

interface TransactionFiltersProps {
  filters: TransactionFilter;
  onFilterChange: (key: keyof TransactionFilter, value: any) => void;
}

export function TransactionFilters({
  filters,
  onFilterChange,
}: TransactionFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {/* Type Filter */}
      <div className="space-y-2">
        <Label>Type</Label>
        <Select
          value={filters.type || "all"}
          onValueChange={(value) => onFilterChange("type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="withdrawal">Withdrawal</SelectItem>
            <SelectItem value="bonus">Bonus</SelectItem>
            <SelectItem value="profit">Profit</SelectItem>
            <SelectItem value="penalty">Penalty</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={filters.status || "all"}
          onValueChange={(value) => onFilterChange("status", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Processing">Processing</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gateway Filter */}
      <div className="space-y-2">
        <Label>Gateway</Label>
        <Select
          value={filters.gateway || "all"}
          onValueChange={(value) => onFilterChange("gateway", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Gateways" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Gateways</SelectItem>
            <SelectItem value="CoinGate">CoinGate</SelectItem>
            <SelectItem value="UddoktaPay">UddoktaPay</SelectItem>
            <SelectItem value="Manual">Manual</SelectItem>
            <SelectItem value="System">System</SelectItem>
            <SelectItem value="Bank">Bank</SelectItem>
            <SelectItem value="Mobile">Mobile</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Currency Filter */}
      <div className="space-y-2">
        <Label>Currency</Label>
        <Select
          value={filters.currency || "all"}
          onValueChange={(value) => onFilterChange("currency", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Currencies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Currencies</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="BDT">BDT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Amount Range */}
      <div className="space-y-2">
        <Label>Min Amount</Label>
        <Input
          type="number"
          placeholder="0"
          value={filters.amountMin || ""}
          onChange={(e) =>
            onFilterChange(
              "amountMin",
              e.target.value ? Number(e.target.value) : undefined
            )
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Max Amount</Label>
        <Input
          type="number"
          placeholder="No limit"
          value={filters.amountMax || ""}
          onChange={(e) =>
            onFilterChange(
              "amountMax",
              e.target.value ? Number(e.target.value) : undefined
            )
          }
        />
      </div>
    </div>
  );
}
