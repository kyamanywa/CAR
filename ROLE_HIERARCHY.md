# 🎭 ROLE HIERARCHY & DASHBOARD ACCESS

## 📊 System Overview

This is a **B2B SaaS Multi-Tenant Platform** with 3 distinct user types.

---

## 👥 THREE USER ROLES

### 1️⃣ ADMIN (`admin`)
**WHO:** Platform Owner - YOU (the system administrator)

**PURPOSE:** Manage the entire platform and all tenants

**LOGIN EXAMPLE:**
- Email: `admin@cartracking.ug`
- Password: `admin123`

**DASHBOARD:** Main Dashboard (`/`)
- See aggregated stats across ALL suppliers and dealerships
- View total subscribers (active/inactive)
- Monitor total inventory across all tenants
- Access all system functions

**MENU ACCESS:**
```
✅ Dashboard               (/)
✅ System Management       (/system)
✅ Supplier Management     (/supplier-management)
✅ Dealership Management   (/dealership-management)
✅ Inventory               (/inventory)         - See all vehicles
✅ Orders                  (/orders)            - See all orders
✅ Shipping                (/shipping)          - See all shipments
✅ Border Clearance        (/border-clearance)  - See all clearances
✅ Sales                   (/sales)             - See all sales
✅ Customers               (/customers)         - See all customers
✅ Analytics               (/analytics)         - Global analytics
✅ Reports                 (/reports)           - Global reports
```

**PERMISSIONS:**
- ✅ Create/Edit/Delete suppliers
- ✅ Create/Edit/Delete dealerships
- ✅ View all data (including costs, profits, margins)
- ✅ Manage subscriptions
- ✅ System configuration
- ✅ Access audit logs

**WHAT THEY SEE:**
- Purchase prices (supplier costs)
- Sale prices (what buyers pay)
- All profit margins
- Revenue from all tenants
- Every transaction

---

### 2️⃣ SUPPLIER / VENDOR (`foreign_bond_user`)
**WHO:** Vehicle suppliers from abroad (Japan, Dubai, UK, etc.)

**PURPOSE:** List vehicles for sale and manage orders from buyers

**LOGIN EXAMPLE:**
- Email: `supplier@tokyoauto.jp`
- Password: `supplier123`

**DASHBOARD:** Supplier Dashboard (`/supplier/dashboard`)
- Own inventory statistics
- Available vs ordered vehicles
- Total inventory value
- Orders received from buyers

**MENU ACCESS:**
```
✅ Dashboard               (/supplier/dashboard)
✅ Add Vehicle             (/supplier/add-vehicle)
❌ Cannot access admin pages
❌ Cannot access buyer pages
```

**PERMISSIONS:**
- ✅ Add vehicles to marketplace
- ✅ Set sale prices (what buyers will pay)
- ✅ View orders FROM dealerships/bonds
- ✅ Update vehicle status
- ❌ Cannot see other suppliers' vehicles
- ❌ Cannot see other suppliers' prices
- ❌ Cannot see dealership internal data

**WHAT THEY SEE:**
- Their own vehicles only
- Their purchase price (cost)
- Their sale price (markup)
- Orders for their vehicles
- Buyer name (who ordered)
- Order status

**WHAT THEY DON'T SEE:**
- Other suppliers' vehicles
- Other suppliers' prices
- Dealership profit margins
- Dealership local sales
- Other dealerships' orders

---

### 3️⃣ DEALERSHIP / BOND (`dealership_manager`)
**WHO:** Car dealerships/bonds in Uganda (buyers)

**PURPOSE:** Browse marketplace, order vehicles, manage imports and local sales

**LOGIN EXAMPLE:**
- Email: `manager@kpmmotors.ug`
- Password: `bond123`

**DASHBOARD:** Main Dashboard (`/`)
- Own inventory statistics
- Active orders (vehicles in transit)
- Revenue from local sales
- Profit from sold vehicles

**MENU ACCESS:**
```
✅ Dashboard               (/)
✅ Inventory               (/inventory)         - Browse marketplace
✅ Orders                  (/orders)            - Create/track orders
✅ Shipping                (/shipping)          - Track shipments
✅ Border Clearance        (/border-clearance)  - Manage customs
✅ Sales                   (/sales)             - Local customer sales
✅ Customers               (/customers)         - Local customer database
✅ Analytics               (/analytics)         - Own analytics
✅ Reports                 (/reports)           - Own reports
❌ Cannot access admin functions
❌ Cannot access supplier dashboard
```

**PERMISSIONS:**
- ✅ View all supplier vehicles (marketplace)
- ✅ See supplier sale prices only
- ✅ Create import orders
- ✅ Track own shipments
- ✅ Manage border clearance
- ✅ Record local sales
- ✅ Manage customers
- ❌ Cannot see supplier purchase prices (cost)
- ❌ Cannot see other dealerships' data
- ❌ Cannot edit supplier vehicles

**WHAT THEY SEE:**
- All supplier vehicles (marketplace)
- Supplier sale prices (what they pay)
- Their own orders only
- Their own local sales
- Their own profit margins
- Their own customers

**WHAT THEY DON'T SEE:**
- Supplier purchase costs
- Supplier profit margins
- Other dealerships' orders
- Other dealerships' sales
- Other dealerships' customers

---

## 🔐 DATA PRIVACY MATRIX

| Data Type | Admin | Supplier | Dealership |
|-----------|-------|----------|------------|
| Supplier purchase price | ✅ | ✅ (own) | ❌ |
| Supplier sale price | ✅ | ✅ (own) | ✅ |
| Supplier profit margin | ✅ | ✅ (own) | ❌ |
| Dealership purchase price | ✅ | ✅ (when ordered) | ✅ (own) |
| Dealership sale price | ✅ | ❌ | ✅ (own) |
| Dealership profit margin | ✅ | ❌ | ✅ (own) |
| All vehicles | ✅ | ❌ (own only) | ✅ (marketplace) |
| All orders | ✅ | ❌ (own only) | ❌ (own only) |
| All customers | ✅ | ❌ | ❌ (own only) |

---

## 🚦 ROUTING BEHAVIOR

### On Login:
```javascript
if (role === 'admin') {
  redirect to '/' (Main Dashboard)
}
else if (role === 'foreign_bond_user') {
  redirect to '/supplier/dashboard' (Supplier Dashboard)
}
else if (role === 'dealership_manager') {
  redirect to '/' (Main Dashboard)
}
```

### URL Protection:
- ❌ Supplier tries to access `/system` → Redirect to `/supplier/dashboard`
- ❌ Dealership tries to access `/supplier/dashboard` → Redirect to `/`
- ❌ Dealership tries to access `/system` → Redirect to `/`
- ✅ Admin can access everything

---

## 📋 ROLE COMPARISON TABLE

| Feature | Admin | Supplier | Dealership |
|---------|-------|----------|------------|
| **Entities Managed** | All | Own vehicles | Own operations |
| **View All Vehicles** | ✅ | ❌ | ✅ (marketplace) |
| **Add Vehicles** | ✅ | ✅ | ❌ |
| **Create Orders** | ✅ | ❌ | ✅ |
| **See All Orders** | ✅ | ❌ | ❌ |
| **Manage Suppliers** | ✅ | ❌ | ❌ |
| **Manage Dealerships** | ✅ | ❌ | ❌ |
| **Local Sales** | ✅ (all) | ❌ | ✅ (own) |
| **Customer Management** | ✅ (all) | ❌ | ✅ (own) |
| **System Config** | ✅ | ❌ | ❌ |
| **See Supplier Costs** | ✅ | ✅ (own) | ❌ |
| **See All Profits** | ✅ | ❌ | ❌ |

---

## 🎯 PROPER TERMINOLOGY

### ✅ CORRECT TERMS:
- **Supplier** = Foreign company selling vehicles (Tokyo Auto, Dubai Cars)
- **Dealership/Bond** = Uganda-based buyer importing vehicles (KPM Motors, Spear)
- **Admin** = Platform owner managing the SaaS system
- **Buyer** = When referring to dealerships placing orders
- **Seller** = When referring to suppliers listing vehicles
- **Customer** = End consumer buying from dealership locally

### ❌ DON'T MIX:
- Don't call supplier a "dealership"
- Don't call dealership a "supplier"
- Don't call admin a "bond"
- Don't call customer a "dealership"

---

## 🔧 IMPLEMENTATION NOTES

### Role Database Values:
```sql
-- In users table
role = 'admin'                -- Platform owner
role = 'foreign_bond_user'    -- Supplier/Vendor
role = 'dealership_manager'   -- Dealership/Bond
```

### Frontend Route Guards:
```javascript
allowedRoles={['admin']}                        // Admin only
allowedRoles={['foreign_bond_user']}           // Supplier only
allowedRoles={['dealership_manager']}          // Dealership only
allowedRoles={['admin', 'dealership_manager']} // Admin & Dealerships
```

### User Context Properties:
```javascript
user.role              // 'admin' | 'foreign_bond_user' | 'dealership_manager'
user.dealership_id     // For dealerships
user.foreign_bond_id   // For suppliers
user.email
user.full_name
```

---

## 🎨 UI DIFFERENCES

### Supplier Dashboard:
- Shows: My Vehicles, Orders FROM Buyers
- Actions: Add Vehicle
- Colors: Blue theme
- Focus: Inventory management

### Dealership Dashboard:
- Shows: Available Inventory (marketplace), My Orders, My Sales
- Actions: Create Order, Record Sale
- Colors: Green/Blue theme
- Focus: Buying & selling

### Admin Dashboard:
- Shows: All subscribers, Global stats, System health
- Actions: Manage everything
- Colors: Purple/Blue theme
- Focus: Platform management

---

## ✅ CURRENT STATUS

**FIXED:**
- ✅ Role-based routing implemented
- ✅ Supplier dashboard cleaned up
- ✅ Navigation menu adapts to role
- ✅ URL protection active
- ✅ Proper redirects on login

**WORKING:**
- ✅ Admin can access everything
- ✅ Suppliers see only their dashboard
- ✅ Dealerships see buyer features

**REMAINING ISSUES:**
- ⚠️ Need to test data isolation (each role sees correct data)
- ⚠️ Order table needs role-based filtering
- ⚠️ Vehicle API needs proper foreign_bond_id filtering
- ⚠️ Reports should respect role boundaries

---

This document defines the complete role hierarchy for the Car Tracking System.
Last Updated: January 27, 2026
