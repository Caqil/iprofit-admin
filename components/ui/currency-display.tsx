"use client";

import { useDatabaseSettings } from "@/hooks/use-database-settings";

interface CurrencyDisplayProps {
  amount: number;
  originalCurrency?: string; // Currency transaction was made in
  originalAmount?: number; // Original amount before conversion
  exchangeRate?: number; // Rate used during transaction
  showOriginal?: boolean; // Show "USD $100 (BDT ৳11,050)" format
}

export function CurrencyDisplay({
  amount,
  originalCurrency,
  originalAmount,
  exchangeRate,
  showOriginal = false,
}: CurrencyDisplayProps) {
  const { settings, isLoading, error } = useDatabaseSettings();

  if (isLoading) return <span>Loading...</span>;
  if (error || !settings) return <span className="text-red-600">Error</span>;

  const primaryCurrency = settings.primaryCurrency;
  const currentRate = settings.usdToBdtRate;

  // ✅ SMART LOGIC: Convert to primary currency for display
  const displayAmount = convertToPrimaryCurrency(
    amount,
    originalCurrency || "BDT",
    primaryCurrency,
    currentRate
  );

  const formattedAmount = formatCurrency(displayAmount, primaryCurrency);

  // Show dual currency format if requested and currencies differ
  if (
    showOriginal &&
    originalCurrency &&
    originalCurrency !== primaryCurrency &&
    originalAmount
  ) {
    const originalFormatted = formatCurrency(originalAmount, originalCurrency);
    return (
      <span className="space-x-2">
        <span className="font-medium">{formattedAmount}</span>
        <span className="text-sm text-gray-500">
          (originally {originalFormatted})
        </span>
      </span>
    );
  }

  return <span>{formattedAmount}</span>;
}

// ✅ CONVERSION HELPER
function convertToPrimaryCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate: number
): number {
  if (fromCurrency === toCurrency) return amount;

  // Convert from USD to BDT
  if (fromCurrency === "USD" && toCurrency === "BDT") {
    return amount * exchangeRate;
  }

  // Convert from BDT to USD
  if (fromCurrency === "BDT" && toCurrency === "USD") {
    return amount / exchangeRate;
  }

  return amount; // Fallback
}

// ✅ FORMATTING HELPER
function formatCurrency(amount: number, currency: string): string {
  if (currency === "USD") {
    return `$${amount.toFixed(2)}`;
  }

  if (currency === "BDT") {
    return `৳${Math.round(amount).toLocaleString()}`;
  }

  return `${amount} ${currency}`;
}
