import { format, formatDistanceToNow, isValid, parseISO, addDays, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export type DateFormat = 'short' | 'long' | 'datetime' | 'time' | 'relative';
export type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

/**
 * Format a date according to the specified format
 */
export function formatDate(
  date: Date | string | number,
  formatType: DateFormat = 'short'
): string {
  const dateObj = parseDate(date);
  if (!dateObj) return 'Invalid Date';

  switch (formatType) {
    case 'short':
      return format(dateObj, 'MMM dd, yyyy');
    case 'long':
      return format(dateObj, 'MMMM dd, yyyy');
    case 'datetime':
      return format(dateObj, 'MMM dd, yyyy HH:mm');
    case 'time':
      return format(dateObj, 'HH:mm:ss');
    case 'relative':
      return formatDistanceToNow(dateObj, { addSuffix: true });
    default:
      return format(dateObj, 'MMM dd, yyyy');
  }
}

/**
 * Parse various date inputs into a Date object
 */
export function parseDate(date: Date | string | number): Date | null {
  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }
  
  if (typeof date === 'string') {
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : null;
  }
  
  if (typeof date === 'number') {
    const parsed = new Date(date);
    return isValid(parsed) ? parsed : null;
  }
  
  return null;
}

/**
 * Get date range based on predefined periods
 */
export function getDateRange(range: DateRange, customStart?: Date, customEnd?: Date): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  
  switch (range) {
    case 'today':
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now)
      };
    
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday)
      };
    
    case 'week':
      return {
        startDate: startOfWeek(now),
        endDate: endOfWeek(now)
      };
    
    case 'month':
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now)
      };
    
    case 'quarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
      return {
        startDate: quarterStart,
        endDate: quarterEnd
      };
    
    case 'year':
      return {
        startDate: startOfYear(now),
        endDate: endOfYear(now)
      };
    
    case 'custom':
      return {
        startDate: customStart || startOfDay(now),
        endDate: customEnd || endOfDay(now)
      };
    
    default:
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now)
      };
  }
}

/**
 * Check if a date is within business hours
 */
export function isBusinessHours(date: Date = new Date()): boolean {
  const hour = date.getHours();
  const day = date.getDay();
  
  // Monday to Friday (1-5), 9 AM to 5 PM
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
}

/**
 * Calculate business days between two dates
 */
export function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  let count = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return count;
}

/**
 * Add business days to a date
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let remainingDays = days;
  
  while (remainingDays > 0) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remainingDays--;
    }
  }
  
  return result;
}

/**
 * Get next business day
 */
export function getNextBusinessDay(date: Date = new Date()): Date {
  return addBusinessDays(date, 1);
}

/**
 * Format duration in milliseconds to human readable format
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Check if date is overdue
 */
export function isOverdue(dueDate: Date | string, currentDate: Date = new Date()): boolean {
  const due = parseDate(dueDate);
  return due ? due < currentDate : false;
}

/**
 * Get time zone offset in hours
 */
export function getTimezoneOffset(): number {
  return -new Date().getTimezoneOffset() / 60;
}

/**
 * Convert date to UTC
 */
export function toUTC(date: Date): Date {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
}

/**
 * Convert UTC date to local time
 */
export function fromUTC(date: Date): Date {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
}

/**
 * Get age from birth date
 */
export function calculateAge(birthDate: Date | string): number {
  const birth = parseDate(birthDate);
  if (!birth) return 0;
  
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Get days until a future date
 */
export function getDaysUntil(futureDate: Date | string): number {
  const future = parseDate(futureDate);
  if (!future) return 0;
  
  const today = new Date();
  const diffTime = future.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format time ago with smart intervals
 */
export function timeAgo(date: Date | string): string {
  const parsedDate = parseDate(date);
  if (!parsedDate) return 'Unknown';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - parsedDate.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
}