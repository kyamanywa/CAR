# Multi-Currency Architecture Guide

## Current State (UGX + USD)

The system currently supports **two currencies**:
- **UGX** (Ugandan Shilling) - Primary local currency
- **USD** (US Dollar) - Import order currency

### Current Implementation

**Backend Currency Config** ([backend/config/currency.js](backend/config/currency.js)):
```javascript
const CURRENCIES = {
  'local_sales': { code: 'UGX', symbol: '₦', name: 'Ugandan Shilling' },
  'import_orders': { code: 'USD', symbol: '$', name: 'US Dollar' }
};

const USD_TO_UGX_RATE = parseInt(process.env.USD_TO_UGX_RATE || '3750');
```

**Frontend Currency Utilities** ([frontend/src/utils/currencyUtils.js](frontend/src/utils/currencyUtils.js)):
- `formatUGX(value)` → "UGX 120.0M" (auto-abbreviation: B, M, K)
- `formatUSD(value)` → "$80.0K" (auto-abbreviation: B, M, K)
- `formatCurrency(value, type)` → dispatcher that calls appropriate formatter
- `getExchangeRate(key)` → retrieves stored rates from backend config

**API Endpoint** ([backend/routes/system.js](backend/routes/system.js)):
- `GET /api/system/config` returns:
  ```json
  {
    "currencies": {
      "local_sales": { "code": "UGX", "symbol": "₦", "name": "Ugandan Shilling" },
      "import_orders": { "code": "USD", "symbol": "$", "name": "US Dollar" }
    },
    "exchange_rates": {
      "usd_to_ugx": 3750
    }
  }
  ```

---

## Multi-Currency Enhancement Plan

### Phase 1: Add New Currencies to Config ✅ READY

**When business expands to:** Nigeria (NGN), Kenya (KES), or other regions

**Step 1: Update Backend Config**

Edit [backend/config/currency.js](backend/config/currency.js):

```javascript
const CURRENCIES = {
  'local_sales': { code: 'UGX', symbol: '₦', name: 'Ugandan Shilling', decimals: 0 },
  'import_orders': { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  // NEW: Add when expanding
  'nigerian_sales': { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', decimals: 0 },
  'kenyan_sales': { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', decimals: 2 }
};

const EXCHANGE_RATES = {
  'USD_TO_UGX': 3750,
  'USD_TO_NGN': 1550,
  'USD_TO_KES': 130,
  // Add more rates as needed
};

function getExchangeRate(from, to) {
  const rate = EXCHANGE_RATES[`${from}_TO_${to}`];
  return rate || 1;
}
```

**Step 2: Update System Config Endpoint**

Edit [backend/routes/system.js](backend/routes/system.js) to return all currency definitions and exchange rates:

```javascript
router.get('/config', (req, res) => {
  const { getUsdToUgxRate } = require('../config/currency');
  
  res.json({
    currencies: CURRENCIES,
    exchange_rates: {
      usd_to_ugx: getUsdToUgxRate(),
      usd_to_ngn: 1550,  // or fetch from API
      usd_to_kes: 130    // or fetch from API
    }
  });
});
```

---

### Phase 2: Frontend Currency Formatter Updates ✅ READY

**Step 1: Extend Currency Utilities**

Edit [frontend/src/utils/currencyUtils.js](frontend/src/utils/currencyUtils.js):

```javascript
export function formatCurrency(value, type) {
  const config = getCurrencyConfig(type);
  if (!config) return value;

  const numValue = parseFloat(value) || 0;
  const formatted = abbreviateNumber(numValue, config.decimals || 0);
  
  return `${config.code} ${formatted}`;
}

// Add formatters for new currencies
export function formatNGN(value) {
  const numValue = parseFloat(value) || 0;
  const formatted = abbreviateNumber(numValue, 0); // NGN doesn't use decimals for display
  return `NGN ${formatted}`;
}

export function formatKES(value) {
  const numValue = parseFloat(value) || 0;
  const formatted = abbreviateNumber(numValue, 2);
  return `KES ${formatted}`;
}
```

---

### Phase 3: Implement Currency Context (Optional) 

**For user-selectable currencies:**

Create [frontend/src/context/CurrencyContext.jsx](frontend/src/context/CurrencyContext.jsx):

```javascript
import { createContext, useState, useEffect } from 'react';

export const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const [selectedCurrency, setSelectedCurrency] = useState('UGX');
  const [currencies, setCurrencies] = useState({});

  useEffect(() => {
    // Load available currencies from config
    fetch('/api/system/config')
      .then(r => r.json())
      .then(data => setCurrencies(data.currencies));
  }, []);

  return (
    <CurrencyContext.Provider value={{ selectedCurrency, setSelectedCurrency, currencies }}>
      {children}
    </CurrencyContext.Provider>
  );
}
```

**Usage in App.jsx:**

```javascript
import { CurrencyProvider } from './context/CurrencyContext';

function App() {
  return (
    <CurrencyProvider>
      {/* Your routes */}
    </CurrencyProvider>
  );
}
```

---

### Phase 4: Add Currency Selector UI (Optional)

**Create settings dropdown** in dashboard header or settings page:

```javascript
import { useContext } from 'react';
import { CurrencyContext } from '../context/CurrencyContext';

export function CurrencySelector() {
  const { selectedCurrency, setSelectedCurrency, currencies } = useContext(CurrencyContext);

  return (
    <select 
      value={selectedCurrency}
      onChange={(e) => setSelectedCurrency(e.target.value)}
      className="px-3 py-2 border rounded-lg"
    >
      {Object.entries(currencies).map(([key, config]) => (
        <option key={key} value={config.code}>
          {config.name} ({config.code})
        </option>
      ))}
    </select>
  );
}
```

---

### Phase 5: Real-Time Exchange Rates (Future)

**Option 1: Use exchange rate API** (Fixer.io, Open Exchange Rates, etc.)

Edit [backend/routes/system.js](backend/routes/system.js):

```javascript
async function getExchangeRates() {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
    const data = await response.json();
    return {
      usd_to_ugx: data.rates.UGX,
      usd_to_ngn: data.rates.NGN,
      usd_to_kes: data.rates.KES
    };
  } catch (error) {
    console.error('Error fetching rates:', error);
    // Fallback to hardcoded rates
    return FALLBACK_RATES;
  }
}
```

**Option 2: Manual rate update**

Admin settings page to update rates manually:

```javascript
POST /api/system/exchange-rates
Body: { USD_TO_UGX: 3800, USD_TO_NGN: 1600, USD_TO_KES: 135 }
```

---

## Current Pages Using Shared Currency Formatters

✅ All financial pages use centralized formatters:
- [Dashboard.jsx](frontend/src/pages/Dashboard.jsx) - Revenue, Profit display
- [Sales.jsx](frontend/src/pages/Sales.jsx) - Sale amounts, selling price
- [Analytics.jsx](frontend/src/pages/Analytics.jsx) - Chart tooltips, axis labels
- [Reports.jsx](frontend/src/pages/Reports.jsx) - Financial report tables
- [BorderClearance.jsx](frontend/src/pages/BorderClearance.jsx) - Tax amount display
- [FinancialManagement.jsx](frontend/src/pages/FinancialManagement.jsx) - All financial metrics
- [PrintableInvoice.jsx](frontend/src/components/PrintableInvoice.jsx) - Invoice amounts

---

## Implementation Checklist for New Currency

When business needs to support a new currency (e.g., NGN):

- [ ] Add NGN to CURRENCIES object in [backend/config/currency.js](backend/config/currency.js)
- [ ] Add USD_TO_NGN rate to EXCHANGE_RATES in currency.js
- [ ] Update /api/system/config endpoint to include NGN exchange rate
- [ ] Add formatNGN() function to [frontend/src/utils/currencyUtils.js](frontend/src/utils/currencyUtils.js)
- [ ] Update getCurrencyConfig() to recognize NGN
- [ ] Update any new business process routes to use formatNGN()
- [ ] Test invoice download with NGN amounts
- [ ] (Optional) Update currency context to include NGN in selector
- [ ] Update documentation

---

## Testing Multi-Currency

### Test Invoice Download with Different Currency
```javascript
// Create a test order with NGN currency
POST /api/local-sales
{
  "customer_id": 1,
  "vehicle_id": 2,
  "selling_price_ngn": 2500000,  // Using NGN instead of UGX
  "currency": "NGN"
}

// View invoice → Download
// Expected: sales-invoice-INV-XXXXX.html with "NGN 2.5M" formatting
```

### Test Exchange Rate Updates
```javascript
// Update exchange rate via environment variable
export USD_TO_UGX=4000

// Restart backend
// Verify /api/system/config returns 4000

// All financial pages should auto-update displays
```

---

## Architecture Benefits

✅ **Centralized**: Single source of truth in backend config  
✅ **Scalable**: Easy to add new currencies  
✅ **Consistent**: All pages use same formatters  
✅ **Maintainable**: Change one place, all pages update  
✅ **Future-proof**: API supports multi-currency without code changes  
✅ **Reversible**: No breaking changes to existing functionality  

---

## Related Files

- [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) - Overall system design
- [SYSTEM_GUIDE.md](SYSTEM_GUIDE.md) - Configuration and setup
- [backend/config/currency.js](backend/config/currency.js) - Currency definitions
- [frontend/src/utils/currencyUtils.js](frontend/src/utils/currencyUtils.js) - Frontend formatters
- [backend/routes/system.js](backend/routes/system.js) - Config API endpoint

---

## Next Steps

1. **When user provides list of target currencies**: Follow Phase 1 implementation steps
2. **For live exchange rates**: Implement Phase 5 using exchange rate API
3. **For user preference**: Implement Phase 3 & 4 (Currency Context + Selector)
4. **For regional rollout**: Update database schema to support multi-currency sales by region
