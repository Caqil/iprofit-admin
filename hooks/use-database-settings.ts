// hooks/use-database-settings.ts - Using YOUR existing settings API
"use client";

import { useState, useEffect } from 'react';

// Simple interface for what components need
interface DatabaseSettings {
  primaryCurrency: string;
  usdToBdtRate: number;
  minDeposit: number;
  signupBonus: number;
  enableReferralSystem: boolean;
  autoKycApproval: boolean;
  supportedCurrencies: string[];
  appName: string;
  companyName: string;
  withdrawalBankFeePercentage: number;
  withdrawalMobileFeePercentage: number;
}

interface UseSettingsReturn {
  settings: DatabaseSettings | null;
  isLoading: boolean;
  error: string | null;
  validateCurrency: (currency: string) => boolean;
  refreshSettings: () => void;
}

// Global cache to avoid multiple API calls
let globalSettings: DatabaseSettings | null = null;
let globalError: string | null = null;
let isGlobalLoading = false;
let globalPromise: Promise<void> | null = null;
export function clearAllCaches() {
  // Clear global cache
  globalSettings = null;
  globalError = null;
  globalPromise = null;
  
  console.log('🗑️ Frontend cache cleared');
}
export function useDatabaseSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<DatabaseSettings | null>(globalSettings);
  const [isLoading, setIsLoading] = useState(isGlobalLoading);
  const [error, setError] = useState<string | null>(globalError);

  const loadSettings = async () => {
    // If already loading globally, wait for it
    if (globalPromise) {
      await globalPromise;
      setSettings(globalSettings);
      setError(globalError);
      setIsLoading(false);
      return;
    }

    // If already loaded, use cached
    if (globalSettings && !globalError) {
      setSettings(globalSettings);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    isGlobalLoading = true;

    globalPromise = (async () => {
      try {
        console.log('🔄 Loading settings from your existing API...');
        
        // Use YOUR existing settings API with grouped=true
        const response = await fetch('/api/settings?grouped=true', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`Settings API failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || 'Failed to load settings');
        }

        // Your API returns grouped settings by category
        const groupedSettings = result.data;
        
        // Extract the settings we need from your grouped data
        const extractedSettings: DatabaseSettings = {
          // Financial settings
          primaryCurrency: getSettingValue(groupedSettings, 'financial', 'primary_currency') || 'BDT',
          usdToBdtRate: getSettingValue(groupedSettings, 'financial', 'usd_to_bdt_rate') || 110.50,
          minDeposit: getSettingValue(groupedSettings, 'financial', 'min_deposit') || 100,
          signupBonus: getSettingValue(groupedSettings, 'financial', 'signup_bonus') || 100,
          withdrawalBankFeePercentage: getSettingValue(groupedSettings, 'financial', 'withdrawal_bank_fee_percentage') || 0.02,
          withdrawalMobileFeePercentage: getSettingValue(groupedSettings, 'financial', 'withdrawal_mobile_fee_percentage') || 0.015,
          
          // System settings
          appName: getSettingValue(groupedSettings, 'system', 'app_name') || 'IProfit Admin',
          companyName: getSettingValue(groupedSettings, 'system', 'company_name') || 'IProfit Technologies',
          
          // Business settings
          enableReferralSystem: getSettingValue(groupedSettings, 'business', 'enable_referral_system') ?? true,
          autoKycApproval: getSettingValue(groupedSettings, 'business', 'auto_kyc_approval') ?? false,
          
          // Derived settings
          supportedCurrencies: ['BDT', 'USD', 'EUR'] // Based on your primary currency + common ones
        };

        globalSettings = extractedSettings;
        globalError = null;
        console.log('✅ Settings loaded from your API:', Object.keys(extractedSettings).length, 'settings');
        console.log('💱 Currency:', extractedSettings.primaryCurrency, '| Rate:', extractedSettings.usdToBdtRate);
        
      } catch (err) {
        globalError = err instanceof Error ? err.message : 'Unknown error';
        globalSettings = null;
        console.error('❌ Failed to load settings from your API:', err);
      } finally {
        isGlobalLoading = false;
        globalPromise = null;
      }
    })();

    await globalPromise;
    
    setSettings(globalSettings);
    setError(globalError);
    setIsLoading(false);
  };

  const validateCurrency = (currency: string): boolean => {
    if (!settings?.supportedCurrencies) return false;
    return settings.supportedCurrencies.includes(currency);
  };
const forceRefreshAll = async () => {
    try {
      console.log('🔄 FORCE REFRESH: Clearing ALL caches...');
      
      // Step 1: Clear server-side cache
      await fetch('/api/settings/clear-cache', {
        method: 'POST'
      });
      
      // Step 2: Clear frontend cache  
      clearAllCaches();
      
      // Step 3: Force fresh API call
      const response = await fetch('/api/settings?grouped=true&bust=' + Date.now(), {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error(`API failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('📡 FRESH API RESPONSE:', result);
      
      if (result.success) {
        const groupedSettings = result.data;
        
        // Log what we find
        const financialSettings = groupedSettings.financial || [];
        const primaryCurrencySetting = financialSettings.find((s: any) => s.key === 'primary_currency');
        console.log('💱 PRIMARY CURRENCY FROM API:', primaryCurrencySetting);
        
        const newSettings: DatabaseSettings = {
          primaryCurrency: primaryCurrencySetting?.value || 'BDT',
          usdToBdtRate: getSettingValue(groupedSettings, 'financial', 'usd_to_bdt_rate') || 110.50,
          minDeposit: getSettingValue(groupedSettings, 'financial', 'min_deposit') || 100,
          signupBonus: getSettingValue(groupedSettings, 'financial', 'signup_bonus') || 100,
          enableReferralSystem: getSettingValue(groupedSettings, 'business', 'enable_referral_system') ?? true,
          autoKycApproval: getSettingValue(groupedSettings, 'business', 'auto_kyc_approval') ?? false,
          supportedCurrencies: ['BDT', 'USD', 'EUR'],
          appName: getSettingValue(groupedSettings, 'system', 'app_name') || 'IProfit Admin',
          companyName: getSettingValue(groupedSettings, 'system', 'company_name') || 'IProfit Technologies',
          withdrawalBankFeePercentage: getSettingValue(groupedSettings, 'financial', 'withdrawal_bank_fee_percentage') || 0.02,
          withdrawalMobileFeePercentage: getSettingValue(groupedSettings, 'financial', 'withdrawal_mobile_fee_percentage') || 0.015,
        };
        
        console.log('✅ NEW SETTINGS APPLIED:', newSettings.primaryCurrency);
        
        globalSettings = newSettings;
        setSettings(newSettings);
        setError(null);
      }
      
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  };
  const refreshSettings = () => {
    // Clear cache and reload
    globalSettings = null;
    globalError = null;
    globalPromise = null;
    loadSettings();
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    isLoading,
    error,
    validateCurrency,
     refreshSettings: forceRefreshAll
  };
}

// Helper function to extract setting value from your grouped API response
function getSettingValue(groupedSettings: any, category: string, key: string): any {
  const categorySettings = groupedSettings[category];
  if (!categorySettings || !Array.isArray(categorySettings)) {
    return null;
  }
  
  const setting = categorySettings.find((s: any) => s.key === key);
  return setting ? setting.value : null;
}

// Usage examples for your components
export const componentUsageExample = `
// In any component - uses your existing settings API!
import { useDatabaseSettings } from '@/hooks/use-database-settings';

export function MyComponent() {
  const { settings, isLoading, error, validateCurrency } = useDatabaseSettings();

  // Show loading
  if (isLoading) return <div>Loading from your settings API...</div>;
  
  // Show error - NO FALLBACKS
  if (error || !settings) {
    return <div className="text-red-600">Your settings API error: {error}</div>;
  }

  // Use settings from your database
  const currency = 'BDT';
  if (!validateCurrency(currency)) {
    return <div className="text-red-600">Invalid currency: {currency}</div>;
  }

  return (
    <div>
      <p>Primary Currency: {settings.primaryCurrency}</p>
      <p>Exchange Rate: {settings.usdToBdtRate}</p>
      <p>Min Deposit: {settings.minDeposit}</p>
      <p>App Name: {settings.appName}</p>
    </div>
  );
}

// In CurrencyDisplay component - uses your settings
export function CurrencyDisplay({ amount, originalCurrency }: Props) {
  const { settings, isLoading, error, validateCurrency } = useDatabaseSettings();

  if (isLoading) return <span>Loading...</span>;
  if (error || !settings) return <span className="text-red-600">Settings Error</span>;

  const currency = originalCurrency || settings.primaryCurrency;
  
  if (!validateCurrency(currency)) {
    return <span className="text-red-600">Invalid currency: {currency}</span>;
  }

  // Format using your database settings
  const rate = settings.usdToBdtRate;
  const symbol = currency === 'BDT' ? '৳' : '$';
  
  return <span>{amount} {symbol}</span>;
}

// In TransactionsTable - shows your settings status
export function TransactionsTable({ transactions }: Props) {
  const { settings, isLoading, error } = useDatabaseSettings();

  if (isLoading) return <div>Loading your settings...</div>;
  if (error || !settings) {
    return <div className="text-red-600">Cannot load table: {error}</div>;
  }

  return (
    <div>
      <div className="bg-green-50 p-2">
        ✅ Using your settings API: {settings.primaryCurrency} (Rate: {settings.usdToBdtRate})
      </div>
      <table>
        {transactions.map(tx => (
          <tr key={tx.id}>
            <td>
              <CurrencyDisplay amount={tx.amount} originalCurrency={tx.currency} />
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
}

// Debug component to check your settings
export function SettingsDebug() {
  const { settings, isLoading, error } = useDatabaseSettings();
  
  if (isLoading) return <div>Loading from /api/settings...</div>;
  if (error) return <div className="text-red-600">API Error: {error}</div>;
  if (!settings) return <div className="text-red-600">No settings loaded</div>;
  
  return (
    <div className="text-green-600 text-sm">
      ✅ Your /api/settings loaded successfully
      <br />
      💱 Currency: {settings.primaryCurrency} | Rate: {settings.usdToBdtRate}
      <br />
      💰 Min Deposit: {settings.minDeposit} | Signup Bonus: {settings.signupBonus}
      <br />
      🏢 App: {settings.appName} | Company: {settings.companyName}
    </div>
  );
}
`;