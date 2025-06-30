import React, { useEffect, useState } from "react";
import { Currency, formatCurrency, getSystemCurrency } from "@/utils/currency";

interface CurrencyDisplayProps {
  amount: number;
  currency?: Currency;
  className?: string;
}

export function CurrencyDisplay({
  amount,
  currency,
  className,
}: CurrencyDisplayProps) {
  const [systemCurrency, setSystemCurrency] = useState<Currency>("BDT");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSystemCurrency() {
      try {
        const curr = await getSystemCurrency();
        setSystemCurrency(curr);
      } catch (error) {
        console.error("Error loading system currency:", error);
        setSystemCurrency("BDT");
      } finally {
        setLoading(false);
      }
    }

    if (!currency) {
      loadSystemCurrency();
    } else {
      setLoading(false);
    }
  }, [currency]);

  if (loading && !currency) {
    return <span className={className}>Loading...</span>;
  }

  const displayCurrency = currency || systemCurrency;
  const formatted = formatCurrency(amount, displayCurrency);

  return <span className={className}>{formatted}</span>;
}
