import { getSystemConfig } from '../api';

let currencyConfig = {
  local_sales: {
    code: 'UGX',
    name: 'Ugandan Shilling',
    symbol: 'USh',
    decimals: 0
  },
  import_orders: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimals: 2
  }
};

let exchangeRates = {
  usd_to_ugx: 3750
};

// Load currency config from server
export const loadCurrencyConfig = async () => {
  try {
    const response = await getSystemConfig();
    if (response.data?.currencies) {
      currencyConfig = response.data.currencies;
    }
    if (response.data?.exchange_rates) {
      exchangeRates = response.data.exchange_rates;
    }
  } catch (error) {
    console.warn('Failed to load currency config, using defaults:', error.message);
  }
};

export const getExchangeRate = (key = 'usd_to_ugx') => {
  return Number(exchangeRates[key]) || 0;
};

export const getCurrencyConfig = (type) => {
  return currencyConfig[type] || currencyConfig.local_sales;
};

// Format currency for local sales (UGX)
export const formatUGX = (value) => {
  if (!value) return `${currencyConfig.local_sales.symbol} 0`;
  const numValue = parseFloat(value);
  return `${currencyConfig.local_sales.code} ${numValue.toLocaleString()}`;
};

// Format currency for import orders (USD)
export const formatUSD = (value) => {
  if (!value) return `${currencyConfig.import_orders.symbol}0`;
  const numValue = parseFloat(value);
  return `${currencyConfig.import_orders.symbol}${numValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Generic currency formatter
export const formatCurrency = (value, type = 'local_sales') => {
  const config = getCurrencyConfig(type);
  if (!value) return `${config.symbol} 0`;
  const numValue = parseFloat(value);

  if (type === 'import_orders') {
    return `${config.symbol}${numValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else {
    return `${config.code} ${numValue.toLocaleString()}`;
  }
};

export default {
  loadCurrencyConfig,
  getCurrencyConfig,
  getExchangeRate,
  formatUGX,
  formatUSD,
  formatCurrency
};
