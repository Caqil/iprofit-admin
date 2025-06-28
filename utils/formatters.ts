
import { Currency } from '@/types';
import { CURRENCY } from './constants';

/**
 * Format currency with proper symbol and locale
 */
export function formatCurrency(
  amount: number,
  currency: Currency = 'BDT',
  options: {
    showSymbol?: boolean;
    decimals?: number;
    locale?: string;
  } = {}
): string {
  const { showSymbol = true, locale = 'en-US' } = options;
  const decimals = options.decimals ?? CURRENCY.DECIMALS[currency];
  
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);
  
  if (showSymbol) {
    const symbol = CURRENCY.SYMBOLS[currency];
    return currency === 'USD' ? `${symbol}${formatted}` : `${formatted} ${symbol}`;
  }
  
  return formatted;
}

/**
 * Format large numbers with abbreviations (K, M, B)
 */
export function formatCompactNumber(
  num: number,
  decimals: number = 1
): string {
  const absNum = Math.abs(num);
  
  if (absNum >= 1e9) {
    return (num / 1e9).toFixed(decimals) + 'B';
  } else if (absNum >= 1e6) {
    return (num / 1e6).toFixed(decimals) + 'M';
  } else if (absNum >= 1e3) {
    return (num / 1e3).toFixed(decimals) + 'K';
  }
  
  return num.toString();
}

/**
 * Format percentage with proper symbol
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  options: {
    showSign?: boolean;
    showSymbol?: boolean;
  } = {}
): string {
  const { showSign = false, showSymbol = true } = options;
  
  let formatted = (value * 100).toFixed(decimals);
  
  if (showSign && value > 0) {
    formatted = `+${formatted}`;
  }
  
  return showSymbol ? `${formatted}%` : formatted;
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Format phone number with proper formatting
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Bangladesh phone number format
  if (cleaned.startsWith('880')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 9)} ${cleaned.slice(9)}`;
  }
  
  // US phone number format
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // International format
  if (cleaned.length > 10) {
    return `+${cleaned.slice(0, -10)} ${cleaned.slice(-10, -7)} ${cleaned.slice(-7, -4)} ${cleaned.slice(-4)}`;
  }
  
  return phone;
}

/**
 * Format credit card number with masking
 */
export function formatCreditCard(cardNumber: string, maskLength: number = 12): string {
  const cleaned = cardNumber.replace(/\D/g, '');
  const masked = '*'.repeat(maskLength) + cleaned.slice(-4);
  return masked.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Format account number with partial masking
 */
export function formatAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  
  const visibleStart = 2;
  const visibleEnd = 4;
  const masked = '*'.repeat(accountNumber.length - visibleStart - visibleEnd);
  
  return accountNumber.slice(0, visibleStart) + masked + accountNumber.slice(-visibleEnd);
}

/**
 * Format text to title case
 */
export function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
  );
}

/**
 * Format text to sentence case
 */
export function toSentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Format initials from name
 */
export function getInitials(name: string, maxLength: number = 2): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, maxLength);
}

/**
 * Format address to single line
 */
export function formatAddress(address: {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}): string {
  const parts = [
    address.street,
    address.city,
    address.state,
    address.zipCode,
    address.country
  ].filter(Boolean);
  
  return parts.join(', ');
}

/**
 * Format JSON for display with proper indentation
 */
export function formatJSON(obj: any, indent: number = 2): string {
  try {
    return JSON.stringify(obj, null, indent);
  } catch {
    return 'Invalid JSON';
  }
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    return JSON.stringify(error);
  }
  return 'Unknown error occurred';
}

/**
 * Format list with proper conjunctions
 */
export function formatList(
  items: string[],
  conjunction: 'and' | 'or' = 'and'
): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  
  const lastItem = items[items.length - 1];
  const otherItems = items.slice(0, -1).join(', ');
  
  return `${otherItems}, ${conjunction} ${lastItem}`;
}

/**
 * Format boolean to human readable text
 */
export function formatBoolean(value: boolean, trueText: string = 'Yes', falseText: string = 'No'): string {
  return value ? trueText : falseText;
}

/**
 * Format table column header
 */
export function formatColumnHeader(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Format status with proper styling context
 */
export function formatStatus(status: string): {
  text: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'default';
} {
  const text = toTitleCase(status);
  
  switch (status.toLowerCase()) {
    case 'active':
    case 'approved':
    case 'completed':
    case 'paid':
    case 'delivered':
    case 'success':
      return { text, variant: 'success' };
    
    case 'pending':
    case 'in progress':
    case 'processing':
    case 'waiting':
      return { text, variant: 'warning' };
    
    case 'rejected':
    case 'failed':
    case 'error':
    case 'overdue':
    case 'defaulted':
    case 'banned':
      return { text, variant: 'error' };
    
    case 'info':
    case 'sent':
      return { text, variant: 'info' };
    
    default:
      return { text, variant: 'default' };
  }
}