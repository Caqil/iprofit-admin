import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CURRENCY, LOAN_CONFIG, REFERRAL_CONFIG } from './constants';
import { Currency } from '@/types';
import { User } from '@/models/User';

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate unique ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Generate referral code
 */
export function generateReferralCode(length: number = REFERRAL_CONFIG.REFERRAL_CODE_LENGTH): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate ticket number
 */
export function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function
 */
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

/**
 * Throttle function
 */
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

/**
 * Currency conversion
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): number {
  if (from === to) return amount;
  
  if (from === 'USD' && to === 'BDT') {
    return amount * CURRENCY.EXCHANGE_RATE.USD_TO_BDT;
  }
  
  if (from === 'BDT' && to === 'USD') {
    return amount * CURRENCY.EXCHANGE_RATE.BDT_TO_USD;
  }
  
  return amount;
}

/**
 * Calculate EMI (Equated Monthly Installment)
 */
export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / 
              (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return Math.round(emi * 100) / 100;
}

/**
 * Calculate total loan amount with interest
 */
export function calculateTotalLoanAmount(
  principal: number,
  annualRate: number,
  tenureMonths: number
): { totalAmount: number; totalInterest: number } {
  const emi = calculateEMI(principal, annualRate, tenureMonths);
  const totalAmount = emi * tenureMonths;
  const totalInterest = totalAmount - principal;
  
  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100
  };
}

/**
 * Calculate credit score based on multiple factors
 */
export function calculateCreditScore(factors: {
  income: number;
  employmentStability: number; // months
  existingLoans: number;
  bankBalance: number;
  paymentHistory: number; // 0-100
  age: number;
}): number {
  const { income, employmentStability, existingLoans, bankBalance, paymentHistory, age } = factors;
  
  let score = 300; // Base score
  
  // Income factor (0-150 points)
  if (income >= 100000) score += 150;
  else if (income >= 50000) score += 100;
  else if (income >= 25000) score += 75;
  else if (income >= 15000) score += 50;
  else if (income >= 10000) score += 25;
  
  // Employment stability (0-100 points)
  if (employmentStability >= 60) score += 100;
  else if (employmentStability >= 36) score += 80;
  else if (employmentStability >= 24) score += 60;
  else if (employmentStability >= 12) score += 40;
  else if (employmentStability >= 6) score += 20;
  
  // Existing loans penalty (0 to -100 points)
  score -= Math.min(100, existingLoans * 15);
  
  // Bank balance (0-100 points)
  if (bankBalance >= 100000) score += 100;
  else if (bankBalance >= 50000) score += 80;
  else if (bankBalance >= 25000) score += 60;
  else if (bankBalance >= 10000) score += 40;
  else if (bankBalance >= 5000) score += 20;
  
  // Payment history (0-200 points)
  score += Math.floor((paymentHistory / 100) * 200);
  
  // Age factor (0-50 points)
  if (age >= 30 && age <= 50) score += 50;
  else if (age >= 25) score += 30;
  else if (age >= 21) score += 20;
  
  // Ensure score is within bounds
  return Math.max(300, Math.min(850, Math.round(score)));
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9.-]/gi, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Create URL-friendly slug
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as { [key: string]: any };
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj as T;
  }
  return obj;
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: any): boolean {
  if (obj == null) return true;
  if (typeof obj === 'string' || Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

/**
 * Get nested object property safely
 */
export function getNestedProperty(obj: any, path: string, defaultValue: any = undefined): any {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result == null || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
}

/**
 * Set nested object property
 */
export function setNestedProperty(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current = obj;
  
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
}

/**
 * Remove undefined properties from object
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  
  return result;
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Generate random number within range
 */
export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Round number to specified decimal places
 */
export function roundTo(num: number, decimals: number = 2): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Clamp number within range
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

/**
 * Check if current environment is development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if current environment is production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get environment variable with default
 */
export function getEnvVar(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

/**
 * Create download link for file
 */
export function downloadFile(data: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  }
}

export async  function generateRepaymentSchedule(
    loanAmount: number,
    interestRate: number,
    tenure: number
) {
    const monthlyRate = interestRate / 12 / 100;
    const emi = calculateEMI(loanAmount, interestRate, tenure);
    let balance = loanAmount;
    const schedule: {
        installmentNumber: number;
        amount: number;
        principal: number;
        interest: number;
        remainingBalance: number;
    }[] = [];

    for (let i = 1; i <= tenure; i++) {
        const interest = Math.round(balance * monthlyRate * 100) / 100;
        const principal = Math.round((emi - interest) * 100) / 100;
        const amount = Math.round(emi * 100) / 100;
        balance = Math.round((balance - principal) * 100) / 100;
        schedule.push({
            installmentNumber: i,
            amount,
            principal,
            interest,
            remainingBalance: balance > 0 ? balance : 0
        });
    }

    return schedule;
}

export function generateSecurePassword(): string {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  
  // Ensure at least one of each required character type
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]; // uppercase
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]; // lowercase
  password += "0123456789"[Math.floor(Math.random() * 10)]; // number
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)]; // special
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export async function generateUniqueReferralCode(): Promise<string> {
  let referralCode: string;
  let isUnique = false;
  
  while (!isUnique) {
    referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existing = await User.findOne({ referralCode });
    if (!existing) {
      isUnique = true;
    }
  }
  
  return referralCode!;
}