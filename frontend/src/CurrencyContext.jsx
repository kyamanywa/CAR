import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from './api';

// ─── Supported currencies ───────────────────────────────────────────────────
export const CURRENCIES = [
  { code: 'UGX', symbol: 'UGX', name: 'Ugandan Shilling',      flag: '🇺🇬' },
  { code: 'USD', symbol: '$',   name: 'US Dollar',              flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',   name: 'Euro',                   flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',   name: 'British Pound',          flag: '🇬🇧' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling',        flag: '🇰🇪' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling',     flag: '🇹🇿' },
  { code: 'RWF', symbol: 'RWF', name: 'Rwandan Franc',          flag: '🇷🇼' },
  { code: 'BIF', symbol: 'BIF', name: 'Burundian Franc',        flag: '🇧🇮' },
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand',     flag: '🇿🇦' },
  { code: 'NGN', symbol: '₦',   name: 'Nigerian Naira',         flag: '🇳🇬' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi',          flag: '🇬🇭' },
  { code: 'ETB', symbol: 'Br',  name: 'Ethiopian Birr',         flag: '🇪🇹' },
  { code: 'ZMW', symbol: 'ZK',  name: 'Zambian Kwacha',         flag: '🇿🇲' },
  { code: 'MWK', symbol: 'MK',  name: 'Malawian Kwacha',        flag: '🇲🇼' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham',             flag: '🇦🇪' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal',            flag: '🇸🇦' },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen',           flag: '🇯🇵' },
  { code: 'CNY', symbol: '¥',   name: 'Chinese Yuan',           flag: '🇨🇳' },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee',           flag: '🇮🇳' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar',        flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar',      flag: '🇦🇺' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc',            flag: '🇨🇭' },
  { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar',       flag: '🇸🇬' },
  { code: 'SEK', symbol: 'kr',  name: 'Swedish Krona',          flag: '🇸🇪' },
  { code: 'NOK', symbol: 'kr',  name: 'Norwegian Krone',        flag: '🇳🇴' },
  { code: 'BRL', symbol: 'R$',  name: 'Brazilian Real',         flag: '🇧🇷' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso',           flag: '🇲🇽' },
  { code: 'EGP', symbol: 'E£',  name: 'Egyptian Pound',         flag: '🇪🇬' },
  { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham',        flag: '🇲🇦' },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', flag: '🌍' },
];

// Currencies that use 0 decimal places
const ZERO_DECIMAL = new Set(['UGX','KES','TZS','RWF','BIF','NGN','JPY','MWK','ETB','XOF','XAF','CDF']);

// Fallback rates (1 USD = X) — used when API is unreachable
const FALLBACK_RATES = {
  USD: 1, UGX: 3750, EUR: 0.92, GBP: 0.79, KES: 129, TZS: 2550,
  RWF: 1290, BIF: 2900, ZAR: 18.5, NGN: 1550, GHS: 15.5,
  ETB: 56.8, ZMW: 26.5, MWK: 1730, AED: 3.67, SAR: 3.75,
  JPY: 149, CNY: 7.24, INR: 83.2, CAD: 1.36, AUD: 1.53,
  CHF: 0.88, SGD: 1.34, SEK: 10.4, NOK: 10.6, BRL: 4.97,
  MXN: 17.1, EGP: 48.6, MAD: 10.0, XOF: 603,
};

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(null);
  const [displayCode, setDisplayCode] = useState(
    () => localStorage.getItem('displayCurrency') || 'UGX'
  );

  // Fetch live rates from backend (which proxies open.er-api.com)
  useEffect(() => {
    api.get('/exchange-rates/all-currencies')
      .then(res => {
        if (res.data?.data) {
          setRates({ ...FALLBACK_RATES, ...res.data.data });
          setRatesUpdatedAt(res.data.updated_at || null);
        }
      })
      .catch(() => {})
      .finally(() => setRatesLoading(false));
  }, []);

  const setCurrency = useCallback((code) => {
    localStorage.setItem('displayCurrency', code);
    setDisplayCode(code);
  }, []);

  // Convert amount from any currency → display currency
  const convert = useCallback((amount, fromCurrency = 'UGX') => {
    if (!amount || isNaN(Number(amount))) return 0;
    const num = Number(amount);
    const fromRate = rates[fromCurrency] ?? 1;
    const toRate = rates[displayCode] ?? 1;
    return (num / fromRate) * toRate;
  }, [rates, displayCode]);

  // Format amount in the current display currency
  const format = useCallback((amount, fromCurrency = 'UGX') => {
    const converted = convert(amount, fromCurrency);
    const decimals = ZERO_DECIMAL.has(displayCode) ? 0 : 2;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: displayCode,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(converted);
    } catch {
      const cfg = CURRENCIES.find(c => c.code === displayCode);
      return `${cfg?.symbol ?? displayCode} ${converted.toLocaleString()}`;
    }
  }, [convert, displayCode]);

  // Convenience shorthands
  const formatUGX = useCallback((amount) => format(amount, 'UGX'), [format]);
  const formatUSD = useCallback((amount) => format(amount, 'USD'), [format]);

  const displayCurrency = CURRENCIES.find(c => c.code === displayCode) || CURRENCIES[0];

  return (
    <CurrencyContext.Provider value={{
      currencies: CURRENCIES,
      rates,
      ratesLoading,
      ratesUpdatedAt,
      displayCode,
      displayCurrency,
      setCurrency,
      convert,
      format,
      formatUGX,
      formatUSD,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside <CurrencyProvider>');
  return ctx;
}
