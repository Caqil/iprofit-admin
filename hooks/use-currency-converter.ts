import { useState, useEffect, useCallback } from 'react';
import { BusinessRules } from '@/lib/settings-helper';

export type Currency = 'BDT' | 'USD';

interface CurrencyConverter {
  selectedCurrency: Currency;
  exchangeRate: number;
  isLoading: boolean;
  error: string | null;
  convertAmount: (amount: number, from: Currency, to?: Currency) => Promise<number>;
  formatAmount: (amount: number, currency?: Currency) => string;
  switchCurrency: (newCurrency: Currency) => void;
}

export function useCurrencyConverter(defaultCurrency: Currency = 'BDT'): CurrencyConverter {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(defaultCurrency);
  const [exchangeRate, setExchangeRate] = useState<number>(110);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load exchange rate from database
  useEffect(() => {
    async function loadExchangeRate() {
      try {
        setIsLoading(true);
        setError(null);
        const rate = await BusinessRules.getExchangeRate();
        setExchangeRate(rate);
      } catch (err) {
        console.error('Error loading exchange rate:', err);
        setError('Failed to load exchange rate');
        setExchangeRate(110); // fallback
      } finally {
        setIsLoading(false);
      }
    }

    loadExchangeRate();
  }, []);

  // Convert amount between currencies
  const convertAmount = useCallback(async (
    amount: number, 
    from: Currency, 
    to: Currency = selectedCurrency
  ): Promise<number> => {
    if (from === to) return amount;

    try {
      return await BusinessRules.convertCurrency(amount, from, to);
    } catch (error) {
      console.error('Currency conversion error:', error);
      // Fallback conversion
      if (from === 'USD' && to === 'BDT') return amount * exchangeRate;
      if (from === 'BDT' && to === 'USD') return amount / exchangeRate;
      return amount;
    }
  }, [selectedCurrency, exchangeRate]);

  // Format amount with currency symbol
  const formatAmount = useCallback((amount: number, currency: Currency = selectedCurrency): string => {
    const symbols = { BDT: '৳', USD: '$' };
    const decimals = { BDT: 0, USD: 2 };
    
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals[currency],
      maximumFractionDigits: decimals[currency]
    }).format(amount);
    
    return currency === 'USD' 
      ? `${symbols[currency]}${formatted}` 
      : `${formatted} ${symbols[currency]}`;
  }, [selectedCurrency]);

  // Switch selected currency
  const switchCurrency = useCallback((newCurrency: Currency) => {
    setSelectedCurrency(newCurrency);
  }, []);

  return {
    selectedCurrency,
    exchangeRate,
    isLoading,
    error,
    convertAmount,
    formatAmount,
    switchCurrency
  };
}
