import { getSetting, BusinessRules } from '@/lib/settings-helper';

export type Currency = 'BDT' | 'USD';

const CURRENCY_SYMBOLS = {
  BDT: '৳',
  USD: '$'
};

const CURRENCY_DECIMALS = {
  BDT: 0,
  USD: 2
};

/**
 * Get system currency from settings
 */
export async function getSystemCurrency(): Promise<Currency> {
  try {
    const financialConfig = await BusinessRules.getFinancialConfig();
    return (financialConfig.primaryCurrency as Currency) || 'BDT';
  } catch (error) {
    console.error('Error getting system currency:', error);
    return 'BDT'; // fallback
  }
}

/**
 * Format currency amount with proper symbol
 */
export function formatCurrency(
  amount: number, 
  currency: Currency = 'BDT'
): string {
  const decimals = CURRENCY_DECIMALS[currency];
  const symbol = CURRENCY_SYMBOLS[currency];
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);
  
  return currency === 'USD' ? `${symbol}${formatted}` : `${formatted} ${symbol}`;
}

/**
 * Convert USD to BDT using exchange rate from settings
 */
export async function convertUsdToBdt(usdAmount: number): Promise<number> {
  try {
    const financialConfig = await BusinessRules.getFinancialConfig();
    return usdAmount * financialConfig.usdToBdtRate;
  } catch (error) {
    console.error('Error converting currency:', error);
    return usdAmount * 110; // fallback rate
  }
}

/**
 * Convert BDT to USD using exchange rate from settings
 */
export async function convertBdtToUsd(bdtAmount: number): Promise<number> {
  try {
    const financialConfig = await BusinessRules.getFinancialConfig();
    return bdtAmount / financialConfig.usdToBdtRate;
  } catch (error) {
    console.error('Error converting currency:', error);
    return bdtAmount / 110; // fallback rate
  }
}
