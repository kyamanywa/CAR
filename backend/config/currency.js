const DEFAULT_USD_TO_UGX_RATE = 3750;

function getUsdToUgxRate() {
  const fromEnv = Number(process.env.USD_TO_UGX_RATE);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  return DEFAULT_USD_TO_UGX_RATE;
}

function getCurrencyConfig() {
  return {
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
}

function getExchangeRates() {
  return {
    usd_to_ugx: getUsdToUgxRate()
  };
}

module.exports = {
  getCurrencyConfig,
  getExchangeRates,
  getUsdToUgxRate
};
