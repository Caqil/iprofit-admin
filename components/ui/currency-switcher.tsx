import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Currency } from "@/types";

interface CurrencySwitcherProps {
  selectedCurrency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  exchangeRate?: number;
  className?: string;
}

export function CurrencySwitcher({
  selectedCurrency,
  onCurrencyChange,
  exchangeRate,
  className,
}: CurrencySwitcherProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={selectedCurrency} onValueChange={onCurrencyChange}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="BDT">
            <div className="flex items-center gap-2">
              <span>৳</span>
              <span>BDT</span>
            </div>
          </SelectItem>
          <SelectItem value="USD">
            <div className="flex items-center gap-2">
              <span>$</span>
              <span>USD</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {exchangeRate && (
        <Badge variant="outline" className="text-xs">
          1 USD = {exchangeRate.toFixed(2)} BDT
        </Badge>
      )}
    </div>
  );
}
