import { Currency } from '../types';

export const SUPPORTED_CURRENCIES: { code: Currency; name: string; symbol: string; flag: string }[] = [
  { code: 'AED', name: 'درهم إماراتي', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'ETB', name: 'بير إثيوبي', symbol: 'ETB', flag: '🇪🇹' },
  { code: 'KES', name: 'شلن كيني', symbol: 'KSh', flag: '🇰🇪' },
  { code: 'USD', name: 'دولار أمريكي', symbol: '$', flag: '🇺🇸' },
];

// أسعار الصرف الافتراضية مقابل 1 دولار أمريكي
export const DEFAULT_EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1.0,
  AED: 3.6725,
  ETB: 128.5,
  KES: 129.0,
};

/**
 * تحويل المبالغ بين العملات باستخدام أسعار الصرف المحددة
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rates: Record<Currency, number> = DEFAULT_EXCHANGE_RATES
): number {
  if (fromCurrency === toCurrency) return amount;
  
  const fromRate = rates[fromCurrency] || DEFAULT_EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = rates[toCurrency] || DEFAULT_EXCHANGE_RATES[toCurrency] || 1;
  
  if (fromRate === 0) return 0;

  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
}

/**
 * تنسيق العملة بالأرقام والرموز المناسبة
 */
export function formatCurrency(
  amount: number,
  currency: Currency,
  options: { showSymbol?: boolean; decimals?: number } = {}
): string {
  const { showSymbol = true, decimals = 2 } = options;
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  const currInfo = SUPPORTED_CURRENCIES.find(c => c.code === currency);
  const symbol = currInfo?.symbol || currency;

  if (!showSymbol) return formattedNumber;
  return `${formattedNumber} ${symbol}`;
}

export function getCurrencyInfo(code: Currency) {
  return SUPPORTED_CURRENCIES.find(c => c.code === code) || SUPPORTED_CURRENCIES[0];
}
