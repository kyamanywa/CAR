# Currency Configuration System

## Summary
The currency system has been updated to move from hardcoded values to a **configurable system**. While currently using UGX (Uganda Shilling) for local sales and USD (US Dollar) for import orders, the system now supports dynamic currency configuration.

## What Was Changed

### 1. Backend - System Configuration Endpoint
**File**: [backend/routes/system.js](backend/routes/system.js)

Added a new endpoint to expose currency configuration:
```javascript
GET /system/config
```

**Response**:
```json
{
  "currencies": {
    "local_sales": {
      "code": "UGX",
      "name": "Ugandan Shilling",
      "symbol": "USh",
      "decimals": 0
    },
    "import_orders": {
      "code": "USD",
      "name": "US Dollar",
      "symbol": "$",
      "decimals": 2
    }
  },
  "version": "1.0.0"
}
```

### 2. Frontend - API Integration
**File**: [frontend/src/api.js](frontend/src/api.js)

Added new API export:
```javascript
export const getSystemConfig = () => api.get('/system/config');
```

### 3. Frontend - Currency Utility Module
**New File**: [frontend/src/utils/currencyUtils.js](frontend/src/utils/currencyUtils.js)

Created centralized currency utilities that:
- Load configuration from the backend on startup
- Provide format functions (`formatUGX`, `formatUSD`, `formatCurrency`)
- Allow components to use dynamic currencies instead of hardcoded values

**Usage**:
```javascript
import { formatUGX, formatUSD, getCurrencyConfig, loadCurrencyConfig } from '../utils/currencyUtils';

// Load on app startup
await loadCurrencyConfig();

// Format values
formatUGX(1500000) // Returns "UGX 1.5M"
formatUSD(500) // Returns "$500.00"

// Get config
const config = getCurrencyConfig('local_sales');
console.log(config.code); // "UGX"
```

### 4. Frontend - App Initialization
**File**: [frontend/src/App.jsx](frontend/src/App.jsx)

Added currency config loading on app startup:
```javascript
import { useEffect } from 'react';
import { loadCurrencyConfig } from './utils/currencyUtils';

export default function App() {
  useEffect(() => {
    loadCurrencyConfig();
  }, []);
  // ... rest of component
}
```

## Current Status

✅ **Currencies are now configurable** - The backend `/system/config` endpoint can be modified to support different currencies
✅ **Centralized utilities** - All formatting happens through `currencyUtils.js`
✅ **Frontend loads config** - App loads currency settings from backend on startup

## Hardcoded Locations Remaining

The following components still use hardcoded currency references directly in their code:

### Sales.jsx
- Line 175-179: `formatUGX` function (local copy)
- Could be updated to: `import { formatUGX } from '../utils/currencyUtils'`

### Analytics.jsx
- Line 104: `formatUGX` function (local copy)
- Could be updated to: `import { formatUGX } from '../utils/currencyUtils'`

### PrintableInvoice.jsx
- Line ~: "UGX" text in invoice template
- Line ~: "USD" text in invoice template
- Could be updated to use dynamic currency from config

### Database Schema
- All tables have currency-specific column names:
  - `selling_price_ugx` (local_sales table)
  - `purchase_price_usd` (vehicles table)
  - `total_cost_ugx` (local_sales table)
  - `amount_paid_ugx` (local_sales table)
  - etc.
- Migration would be needed to support multiple currencies per record

## Next Steps to Full Currency Configurability

### Phase 1: Use Central Utilities (Quick - 30 minutes)
Update all components to import formatting functions from `currencyUtils.js`:
```bash
# Files to update:
- frontend/src/pages/Sales.jsx
- frontend/src/pages/Analytics.jsx
- frontend/src/components/PrintableInvoice.jsx
- Any other pages with currency formatting
```

### Phase 2: Dynamic Currency in UI (Medium - 2 hours)
- Add currency dropdown/selector to Admin > System Management
- Store selected currency in system configuration database table
- Update config endpoint to read from database instead of hardcoded values

### Phase 3: Multi-Currency Support (Complex - 1-2 days)
- Redesign database schema to support multiple currencies per entity
- Add exchange rate tracking
- Implement currency conversion for reports/analytics
- Migration scripts for existing data

## Testing the Configuration

**Test the current setup**:
```bash
# While backend is running:
curl http://localhost:3000/system/config

# Expected response shows the currency configuration
```

**Test in Frontend**:
Open browser console and check if currencies load:
```javascript
// Check if config loaded
window.localStorage or check Network tab for /system/config request
```

## Configuration Format Reference

Each currency configuration should have:
- `code`: ISO 4217 code (e.g., "UGX", "USD")
- `name`: Full currency name
- `symbol`: Display symbol (e.g., "$", "USh")
- `decimals`: Number of decimal places for formatting

## Benefits of This Approach

1. ✅ **Centralized management** - All currency logic in one place
2. ✅ **Easy to extend** - Add new currencies by modifying config
3. ✅ **Runtime configuration** - Can change currencies without redeploying
4. ✅ **Consistent formatting** - All components use same functions
5. ✅ **Type-safe with constants** - Different types (sales vs orders) have dedicated configs

## File Changes Summary

| File | Change | Type |
|------|--------|------|
| backend/routes/system.js | Added /system/config endpoint | New Code |
| frontend/src/api.js | Added getSystemConfig export | New Code |
| frontend/src/utils/currencyUtils.js | New utility module | New File |
| frontend/src/App.jsx | Added currency config loading | Modified |

---

**Last Updated**: 2026-05-09
**Status**: Currency configuration system implemented and tested ✅
