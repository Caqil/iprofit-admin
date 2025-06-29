

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Currency } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: Currency = 'BDT'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatter.format(amount);
}

export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDate(date: Date | string, format: 'short' | 'long' | 'relative' = 'short'): string {
  const d = new Date(date);
  
  if (format === 'relative') {
    return formatRelativeTime(d);
  }
  
  const options: Intl.DateTimeFormatOptions = format === 'long' 
    ? { year: 'numeric', month: 'long', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
    
  return d.toLocaleDateString('en-US', options);
}
export function formatRelativeTime(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return 'invalid date';
  }

  const now = new Date();
  const diffInSeconds = Math.floor(Math.abs((now.getTime() - date.getTime()) / 1000));
  const isFuture = now.getTime() < date.getTime();

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      const unit = `${interval.label}${count > 1 ? 's' : ''}`;
      return isFuture ? `in ${count} ${unit}` : `${count} ${unit} ago`;
    }
  }

  return 'just now';
}
export function generateReferralCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

export function calculateEMI(principal: number, rate: number, tenure: number): number {
  const monthlyRate = rate / 100 / 12;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / 
              (Math.pow(1 + monthlyRate, tenure) - 1);
  return Math.round(emi * 100) / 100;
}

export function generateRepaymentSchedule(
  loanAmount: number, 
  interestRate: number, 
  tenure: number, 
  startDate: Date = new Date()
) {
  const monthlyRate = interestRate / 100 / 12;
  const emiAmount = calculateEMI(loanAmount, interestRate, tenure);
  type RepaymentScheduleItem = {
    installmentNumber: number;
    dueDate: Date;
    amount: number;
    principal: number;
    interest: number;
    status: 'Pending';
    remainingBalance: number;
  };
  const schedule: RepaymentScheduleItem[] = [];
  let remainingBalance = loanAmount;
  
  for (let i = 1; i <= tenure; i++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = emiAmount - interestPayment;
    remainingBalance -= principalPayment;
    
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    
    schedule.push({
      installmentNumber: i,
      dueDate,
      amount: Math.round(emiAmount * 100) / 100,
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interestPayment * 100) / 100,
      status: 'Pending' as const,
      remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100)
    });
  }
  
  return schedule;
}

export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  // Fixed exchange rate: 1 USD = 120 BDT
  const USD_TO_BDT = 120;
  
  if (from === to) return amount;
  
  if (from === 'USD' && to === 'BDT') {
    return amount * USD_TO_BDT;
  }
  
  if (from === 'BDT' && to === 'USD') {
    return amount / USD_TO_BDT;
  }
  
  return amount;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9.-]/gi, '_');
}

export function calculateCreditScore(factors: {
  income: number;
  employmentStability: number; // months
  existingLoans: number;
  bankBalance: number;
  paymentHistory: number; // 0-100
}): number {
  const { income, employmentStability, existingLoans, bankBalance, paymentHistory } = factors;
  
  // Base score
  let score = 300;
  
  // Income factor (0-150 points)
  if (income >= 100000) score += 150;
  else if (income >= 50000) score += 100;
  else if (income >= 25000) score += 50;
  
  // Employment stability (0-100 points)
  if (employmentStability >= 24) score += 100;
  else if (employmentStability >= 12) score += 75;
  else if (employmentStability >= 6) score += 50;
  else if (employmentStability >= 3) score += 25;
  
  // Existing loans penalty (0 to -100 points)
  score -= Math.min(100, existingLoans * 10);
  
  // Bank balance (0-100 points)
  if (bankBalance >= 50000) score += 100;
  else if (bankBalance >= 25000) score += 75;
  else if (bankBalance >= 10000) score += 50;
  else if (bankBalance >= 5000) score += 25;
  
  // Payment history (0-200 points)
  score += Math.floor((paymentHistory / 100) * 200);
  
  // Ensure score is within bounds
  return Math.max(300, Math.min(850, Math.round(score)));
}
