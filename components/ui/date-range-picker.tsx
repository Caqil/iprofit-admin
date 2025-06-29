"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerWithRangeProps {
  date?: { from?: Date; to?: Date };
  onDateChange?: (date: { from?: Date; to?: Date }) => void;
  className?: string;
  placeholder?: string;
}

export function DatePickerWithRange({
  date,
  onDateChange,
  className,
  placeholder = "Select date range",
}: DatePickerWithRangeProps) {
  const [fromDate, setFromDate] = React.useState<string>(
    date?.from ? date.from.toISOString().split("T")[0] : ""
  );
  const [toDate, setToDate] = React.useState<string>(
    date?.to ? date.to.toISOString().split("T")[0] : ""
  );

  const formatDateDisplay = () => {
    if (!fromDate && !toDate) return placeholder;
    if (fromDate && !toDate) return `From ${fromDate}`;
    if (!fromDate && toDate) return `Until ${toDate}`;
    return `${fromDate} - ${toDate}`;
  };

  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    onDateChange?.({
      from: value ? new Date(value) : undefined,
      to: toDate ? new Date(toDate) : undefined,
    });
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    onDateChange?.({
      from: fromDate ? new Date(fromDate) : undefined,
      to: value ? new Date(value) : undefined,
    });
  };

  const clearDates = () => {
    setFromDate("");
    setToDate("");
    onDateChange?.({ from: undefined, to: undefined });
  };

  const setQuickRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);

    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    setFromDate(fromStr);
    setToDate(toStr);
    onDateChange?.({ from, to });
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !fromDate && !toDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateDisplay()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Date Range</h4>
              <p className="text-sm text-muted-foreground">
                Set the date range for filtering
              </p>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="from-date">From Date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                  max={toDate || undefined}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="to-date">To Date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => handleToDateChange(e.target.value)}
                  min={fromDate || undefined}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quick Select</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickRange(7)}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickRange(30)}
                >
                  Last 30 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickRange(90)}
                >
                  Last 3 months
                </Button>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={clearDates}>
                Clear
              </Button>
              <Button size="sm" asChild>
                <PopoverTrigger>Apply</PopoverTrigger>
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
