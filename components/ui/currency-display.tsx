import React, { useState, useEffect } from "react";
import { useCurrencyConverter, Currency } from "@/hooks/use-currency-converter";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { CurrencySwitcher } from "./currency-switcher";

interface CurrencyDisplayProps {
  amount: number;
  originalCurrency: Currency;
  showConverter?: boolean;
  className?: string;
}

export function CurrencyDisplay({
  amount,
  originalCurrency,
  showConverter = false,
  className,
}: CurrencyDisplayProps) {
  const {
    selectedCurrency,
    convertAmount,
    formatAmount,
    switchCurrency,
    isLoading,
    exchangeRate,
  } = useCurrencyConverter(originalCurrency);

  const [convertedAmount, setConvertedAmount] = useState<number>(amount);
  const [converting, setConverting] = useState(false);

  // Convert amount when currency changes
  useEffect(() => {
    async function convert() {
      if (originalCurrency === selectedCurrency) {
        setConvertedAmount(amount);
        return;
      }

      setConverting(true);
      try {
        const converted = await convertAmount(
          amount,
          originalCurrency,
          selectedCurrency
        );
        setConvertedAmount(converted);
      } catch (error) {
        console.error("Conversion error:", error);
        setConvertedAmount(amount);
      } finally {
        setConverting(false);
      }
    }

    convert();
  }, [amount, originalCurrency, selectedCurrency, convertAmount]);

  if (isLoading) {
    return <LoadingSpinner size="sm" />;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={converting ? "opacity-50" : ""}>
        {formatAmount(convertedAmount, selectedCurrency)}
      </span>

      {showConverter && (
        <CurrencySwitcher
          selectedCurrency={selectedCurrency}
          onCurrencyChange={switchCurrency}
          exchangeRate={exchangeRate}
          className="ml-2"
        />
      )}

      {converting && <LoadingSpinner />}
    </div>
  );
}
