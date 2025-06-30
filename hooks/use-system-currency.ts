import { useState, useEffect } from 'react';
import { Currency, getSystemCurrency } from '@/utils/currency';

export function useSystemCurrency() {
  const [currency, setCurrency] = useState<Currency>('BDT');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCurrency() {
      try {
        const systemCurrency = await getSystemCurrency();
        setCurrency(systemCurrency);
      } catch (error) {
        console.error('Error loading system currency:', error);
        setCurrency('BDT');
      } finally {
        setLoading(false);
      }
    }

    loadCurrency();
  }, []);

  return { currency, loading };
}