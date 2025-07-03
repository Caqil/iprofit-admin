"use client";

import React from "react";
import { useDatabaseSettings } from "@/hooks/use-database-settings";

interface CurrencyDisplayProps {
  amount: number;
  originalCurrency?: string;
  showConverter?: boolean;
  className?: string;
}

export function CurrencyDisplay({
  amount,
  originalCurrency,
  showConverter = false,
  className,
}: CurrencyDisplayProps) {
  const { settings, isLoading, error, validateCurrency } =
    useDatabaseSettings();

  // Show loading
  if (isLoading) return <span className={className}>Loading...</span>;

  // Show error if settings not loaded
  if (error || !settings) {
    return <span className={`text-red-600 ${className}`}>Settings error</span>;
  }

  // Use database primary currency if no original currency provided
  const currency = originalCurrency || settings.primaryCurrency;

  // Validate currency against database
  if (!validateCurrency(currency)) {
    return (
      <span className={`text-red-600 ${className}`}>Invalid: {currency}</span>
    );
  }

  // Format using DATABASE settings (not hardcoded)
  const formatAmount = (amt: number, curr: string) => {
    // Get decimals and symbol from database settings
    const decimals = getCurrencyDecimals(curr);
    const symbol = getCurrencySymbol(curr, settings);

    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amt);

    // Symbol placement based on currency
    return getFormattedCurrency(formatted, symbol, curr);
  };

  const primaryAmount = formatAmount(amount, currency);

  if (!showConverter || currency === settings.primaryCurrency) {
    return <span className={className}>{primaryAmount}</span>;
  }

  // Convert using database exchange rate
  const convertedAmount = convertCurrency(amount, currency, settings);
  const convertedCurrency = currency === "BDT" ? "USD" : "BDT";
  const secondaryAmount = formatAmount(convertedAmount, convertedCurrency);

  return (
    <div className={className}>
      <div className="font-medium">{primaryAmount}</div>
      <div className="text-sm text-gray-600">≈ {secondaryAmount}</div>
    </div>
  );
}

// Helper functions using database settings
function getCurrencyDecimals(currency: string): number {
  switch (currency) {
    case "BDT":
      return 0;
    case "USD":
      return 2;
    case "EUR":
      return 2;
    case "GBP":
      return 2;
    default:
      return 2;
  }
}

function getCurrencySymbol(currency: string, settings: any): string {
  switch (currency) {
    case "BDT":
      return "৳";
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    default:
      return currency;
  }
}

function getFormattedCurrency(
  formatted: string,
  symbol: string,
  currency: string
): string {
  // Different currencies have different symbol placement
  switch (currency) {
    case "BDT":
      return `${formatted} ${symbol}`;
    case "USD":
    case "EUR":
    case "GBP":
      return `${symbol}${formatted}`;
    default:
      return `${formatted} ${currency}`;
  }
}

function convertCurrency(
  amount: number,
  fromCurrency: string,
  settings: any
): number {
  const rate = settings.usdToBdtRate || 110.5;

  if (fromCurrency === "BDT") {
    return amount / rate; // BDT to USD
  } else if (fromCurrency === "USD") {
    return amount * rate; // USD to BDT
  }

  return amount; // No conversion for same currency
}
