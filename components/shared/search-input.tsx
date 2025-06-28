"use client";

import React from "react";
import { Search, X, Filter, SortAsc, SortDesc } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface SearchFilter {
  key: string;
  label: string;
  type: "text" | "select" | "multiselect" | "date" | "number";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export interface SortOption {
  key: string;
  label: string;
}

export interface SearchInputProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;

  // Advanced search features
  filters?: SearchFilter[];
  activeFilters?: Record<string, any>;
  onFiltersChange?: (filters: Record<string, any>) => void;

  // Sorting
  sortOptions?: SortOption[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (sortBy: string, sortOrder: "asc" | "desc") => void;

  // Quick filters
  quickFilters?: Array<{
    key: string;
    label: string;
    value: any;
  }>;

  // Search suggestions
  suggestions?: string[];
  showSuggestions?: boolean;
  onSuggestionSelect?: (suggestion: string) => void;

  // Events
  onSearch?: (value: string) => void;
  onClear?: () => void;

  // Debounce
  debounceMs?: number;
}

export function SearchInput({
  value = "",
  onValueChange,
  placeholder = "Search...",
  className,
  disabled = false,

  filters = [],
  activeFilters = {},
  onFiltersChange,

  sortOptions = [],
  sortBy,
  sortOrder = "asc",
  onSortChange,

  quickFilters = [],

  suggestions = [],
  showSuggestions = false,
  onSuggestionSelect,

  onSearch,
  onClear,

  debounceMs = 300,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = React.useState(value);
  const [showSuggestionsPopover, setShowSuggestionsPopover] =
    React.useState(false);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Debounced search
  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (internalValue !== value) {
        onValueChange?.(internalValue);
        onSearch?.(internalValue);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [internalValue, debounceMs, onValueChange, onSearch, value]);

  // Update internal value when external value changes
  React.useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);

    // Show suggestions if available and input is not empty
    if (showSuggestions && suggestions.length > 0 && newValue.trim()) {
      setShowSuggestionsPopover(true);
    } else {
      setShowSuggestionsPopover(false);
    }
  };

  const handleClear = () => {
    setInternalValue("");
    onValueChange?.("");
    onClear?.();
    setShowSuggestionsPopover(false);
    inputRef.current?.focus();
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setInternalValue(suggestion);
    onValueChange?.(suggestion);
    onSuggestionSelect?.(suggestion);
    setShowSuggestionsPopover(false);
    inputRef.current?.blur();
  };

  const handleFilterChange = (filterKey: string, filterValue: any) => {
    const newFilters = { ...activeFilters };

    if (
      filterValue === undefined ||
      filterValue === "" ||
      filterValue === null
    ) {
      delete newFilters[filterKey];
    } else {
      newFilters[filterKey] = filterValue;
    }

    onFiltersChange?.(newFilters);
  };

  const handleQuickFilterToggle = (quickFilter: any) => {
    const isActive = activeFilters[quickFilter.key] === quickFilter.value;
    handleFilterChange(
      quickFilter.key,
      isActive ? undefined : quickFilter.value
    );
  };

  const clearAllFilters = () => {
    onFiltersChange?.({});
  };

  const activeFilterCount = Object.keys(activeFilters).length;
  const hasActiveFilters = activeFilterCount > 0;

  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      suggestion.toLowerCase().includes(internalValue.toLowerCase()) &&
      suggestion.toLowerCase() !== internalValue.toLowerCase()
  );

  return (
    <div className={cn("relative flex items-center space-x-2", className)}>
      {/* Main Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />

        <Popover
          open={showSuggestionsPopover}
          onOpenChange={setShowSuggestionsPopover}
        >
          <PopoverTrigger asChild>
            <Input
              ref={inputRef}
              value={internalValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              disabled={disabled}
              className="pl-10 pr-10"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setShowSuggestionsPopover(false);
                  inputRef.current?.blur();
                }
                if (e.key === "Enter") {
                  setShowSuggestionsPopover(false);
                  onSearch?.(internalValue);
                }
              }}
            />
          </PopoverTrigger>

          {showSuggestions && filteredSuggestions.length > 0 && (
            <PopoverContent
              className="w-[--radix-popover-trigger-width] p-0"
              align="start"
            >
              <div className="max-h-60 overflow-auto">
                {filteredSuggestions.slice(0, 10).map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground border-b last:border-b-0"
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <div className="flex items-center">
                      <Search className="mr-2 h-3 w-3 text-muted-foreground" />
                      {suggestion}
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          )}
        </Popover>

        {internalValue && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>

      {/* Quick Filters */}
      {quickFilters.length > 0 && (
        <div className="flex items-center space-x-1">
          {quickFilters.map((filter) => {
            const isActive = activeFilters[filter.key] === filter.value;
            return (
              <Button
                key={filter.key}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuickFilterToggle(filter)}
                disabled={disabled}
              >
                {filter.label}
              </Button>
            );
          })}
        </div>
      )}

      {/* Advanced Filters */}
      {filters.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled}>
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    Clear all
                  </Button>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                {filters.map((filter) => (
                  <div key={filter.key} className="space-y-2">
                    <Label className="text-sm font-medium">
                      {filter.label}
                    </Label>

                    {filter.type === "text" && (
                      <Input
                        placeholder={filter.placeholder}
                        value={activeFilters[filter.key] || ""}
                        onChange={(e) =>
                          handleFilterChange(filter.key, e.target.value)
                        }
                      />
                    )}

                    {filter.type === "select" && filter.options && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                          >
                            {activeFilters[filter.key]
                              ? filter.options.find(
                                  (opt) =>
                                    opt.value === activeFilters[filter.key]
                                )?.label
                              : filter.placeholder || "Select option"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-full">
                          <DropdownMenuRadioGroup
                            value={activeFilters[filter.key] || ""}
                            onValueChange={(value) =>
                              handleFilterChange(filter.key, value)
                            }
                          >
                            <DropdownMenuRadioItem value="">
                              All
                            </DropdownMenuRadioItem>
                            {filter.options.map((option) => (
                              <DropdownMenuRadioItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {filter.type === "multiselect" && filter.options && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                          >
                            {Array.isArray(activeFilters[filter.key]) &&
                            activeFilters[filter.key].length > 0
                              ? `${activeFilters[filter.key].length} selected`
                              : filter.placeholder || "Select options"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-full">
                          {filter.options.map((option) => {
                            const selectedValues = Array.isArray(
                              activeFilters[filter.key]
                            )
                              ? activeFilters[filter.key]
                              : [];
                            const isChecked = selectedValues.includes(
                              option.value
                            );

                            return (
                              <DropdownMenuCheckboxItem
                                key={option.value}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const newValues = checked
                                    ? [...selectedValues, option.value]
                                    : selectedValues.filter(
                                        (v: string) => v !== option.value
                                      );
                                  handleFilterChange(
                                    filter.key,
                                    newValues.length > 0 ? newValues : undefined
                                  );
                                }}
                              >
                                {option.label}
                              </DropdownMenuCheckboxItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Sort Options */}
      {sortOptions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled}>
              {sortOrder === "asc" ? (
                <SortAsc className="mr-2 h-4 w-4" />
              ) : (
                <SortDesc className="mr-2 h-4 w-4" />
              )}
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map((option) => (
              <React.Fragment key={option.key}>
                <DropdownMenuItem
                  onClick={() => onSortChange?.(option.key, "asc")}
                  className={cn(
                    sortBy === option.key && sortOrder === "asc" && "bg-accent"
                  )}
                >
                  <SortAsc className="mr-2 h-4 w-4" />
                  {option.label} (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSortChange?.(option.key, "desc")}
                  className={cn(
                    sortBy === option.key && sortOrder === "desc" && "bg-accent"
                  )}
                >
                  <SortDesc className="mr-2 h-4 w-4" />
                  {option.label} (Z-A)
                </DropdownMenuItem>
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center space-x-1">
          {Object.entries(activeFilters).map(([key, value]) => {
            const filter = filters.find((f) => f.key === key);
            if (
              !filter ||
              value === undefined ||
              value === "" ||
              value === null
            )
              return null;

            let displayValue = value;
            if (filter.type === "select" && filter.options) {
              displayValue =
                filter.options.find((opt) => opt.value === value)?.label ||
                value;
            } else if (Array.isArray(value)) {
              displayValue = `${value.length} selected`;
            }

            return (
              <Badge key={key} variant="secondary" className="gap-1">
                {filter.label}: {displayValue}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => handleFilterChange(key, undefined)}
                />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Simple search input without advanced features
export interface SimpleSearchProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onSearch?: (value: string) => void;
  debounceMs?: number;
}

export function SimpleSearch({
  value = "",
  onValueChange,
  placeholder = "Search...",
  className,
  disabled = false,
  onSearch,
  debounceMs = 300,
}: SimpleSearchProps) {
  return (
    <SearchInput
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      onSearch={onSearch}
      debounceMs={debounceMs}
    />
  );
}
