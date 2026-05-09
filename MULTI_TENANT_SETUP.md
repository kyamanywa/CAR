# 🌍 Multi-Tenant Global B2B Marketplace

## Overview
CarTrack Global is a **3-tenant SaaS B2B marketplace** connecting vehicle **suppliers** worldwide with **dealerships** worldwide, managed by an **admin** platform owner.

---

## 🎯 Three Tenant Types

### 1. **Admin** (Platform Owner)
- **Role:** `admin`
- **Account:** admin@cartracking.ug / admin123
- **Access:** Full system access, manages both suppliers and dealerships
- **Capabilities:**
  - View all suppliers (foreign bonds) and dealerships
  - Manage users and permissions
  - Access all analytics and reports
  - System configuration
  - Monitor platform health

### 2. **Suppliers** (Vehicle Sellers)
- **Role:** `foreign_bond_user`
- **Example Account:** supplier@tokyoauto.jp / supplier123
- **Account Type:** Foreign Bond Company
- **Access:** Supplier dashboard and inventory management
- **Capabilities:**
  - Add vehicles to marketplace
  - View own inventory
  - Receive orders from dealerships
  - Track order status
  - Manage company profile

### 3. **Dealerships** (Vehicle Buyers)
- **Role:** `dealership_manager`
- **Example Account:** manager@kpmmotors.ug / bond123
- **Account Type:** Dealership Company
- **Access:** Dealership operations dashboard
- **Capabilities:**
  - Browse all supplier vehicles
  - Create import orders
  - Track shipments
  - Manage border clearance
  - Sell to local customers
  - View analytics

---

## 🔐 Account Registration

### Supplier Self-Registration
**Endpoint:** `POST /api/foreign-bonds/register`

```javascript
{
  "business_name": "Tokyo Auto Exports",
  "country": "Japan",
  "city": "Tokyo",
  "address": "123 Shibuya Street",
  "phone": "+81-3-1234-5678",
  "email": "info@tokyoauto.jp",
  "contact_person": "Tanaka Hiroshi",
  "specialization": "Japanese Vehicles",
  "admin_email": "admin@tokyoauto.jp",
  "admin_password": "securepass123"
}
```

**What Happens:**
1. Creates a new `foreign_bonds` record (supplier company)
2. Creates a `users` record with `role='foreign_bond_user'` and `foreign_bond_id` linking to the company
3. User can login and access supplier dashboard

### Dealership Self-Registration
**Endpoint:** `POST /api/dealerships/register`

```javascript
{
  "business_name": "KPM Motors",
  "country": "Uganda",
  "city": "Kampala",
  "address": "Plot 5, Industrial Area",
  "phone": "+256-700-123456",
  "email": "info@kpmmotors.ug",
  "contact_person": "John Mugisha",
  "license_number": "DL-2024-001",
  "admin_email": "manager@kpmmotors.ug",
  "admin_password": "securepass123"
}
```

**What Happens:**
1. Creates a new `dealerships` record (dealership company)
2. Creates a `users` record with `role='dealership_manager'` and `dealership_id` linking to the company
3. User can login and access dealership operations

---

## 🎨 User Interface Routes

### Supplier Routes
- `/supplier/dashboard` - View inventory, orders received, statistics
- `/supplier/add-vehicle` - Add new vehicles to marketplace
- Access controlled by: `role === 'foreign_bond_user'`

### Dealership Routes
- `/` - Main dashboard
- `/inventory` - Browse all vehicles
- `/orders` - Create and manage import orders
- `/shipping` - Track shipments
- `/border-clearance` - Border processing
- `/sales` - Local customer sales
- Access controlled by: `role === 'dealership_manager'`

### Admin Routes
- All dealership routes PLUS:
- `/dealerships` - Manage all dealerships
- `/foreign-bonds` - Manage all suppliers
- `/system` - System configuration
- Access controlled by: `role === 'admin'`

---

## 🗄️ Database Schema

### Users Table
```sql
users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  full_name TEXT,
  role TEXT,  -- 'admin' | 'dealership_manager' | 'foreign_bond_user'
  dealership_id INTEGER,  -- NULL for admin and suppliers
  foreign_bond_id INTEGER  -- NULL for admin and dealerships
)
```

### Foreign Bonds Table (Suppliers)
```sql
foreign_bonds (
  id INTEGER PRIMARY KEY,
  name TEXT,
  country TEXT,
  city TEXT,
  address TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  license_number TEXT,
  specialization TEXT,
  status TEXT DEFAULT 'Active'
)
```

### Dealerships Table (Buyers)
```sql
dealerships (
  id INTEGER PRIMARY KEY,
  name TEXT,
  country TEXT,
  city TEXT,
  address TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  license_number TEXT,
  status TEXT DEFAULT 'Active'
)
```

---

## 🔄 Complete Business Flow

### 1. Supplier Adds Vehicle
```
Supplier logs in → Supplier Dashboard → Add Vehicle
→ POST /api/inventory/my/vehicles
→ Vehicle stored with foreign_bond_id = supplier's ID
→ Vehicle appears in marketplace with status='available'
```

### 2. Dealership Orders Vehicle
```
Dealership logs in → Inventory → Browse vehicles
→ Create Order → Select vehicles from supplier
→ POST /api/import-orders
→ Creates import_order record
→ Links vehicles to order (import_order_id)
→ Vehicle status changes to 'ordered'
→ Supplier sees order in their dashboard
```

### 3. Shipment & Delivery
```
Dealership → Shipping → Create Shipment
→ POST /api/shipping
→ Track BL number, container, ETA
→ Border Clearance → Update customs status
→ POST /api/border-clearance
→ Vehicle status → 'in_transit' → 'cleared' → 'in_stock'
```

### 4. Local Sale
```
Dealership → Sales → Create Sale
→ POST /api/local-sales
→ Links customer, vehicle, payment terms
→ Vehicle status → 'sold'
→ Customer receives vehicle
```

---

## 🛡️ Data Isolation & Security

### Bond Filter Middleware
Automatically filters data based on user role:

```javascript
// Dealership managers see only their dealership data
if (role === 'dealership_manager') {
  WHERE dealership_id = user.dealership_id
}

// Suppliers see only their vehicles and orders
if (role === 'foreign_bond_user') {
  WHERE foreign_bond_id = user.foreign_bond_id
}

// Admin sees everything
if (role === 'admin') {
  // No filters, full access
}
```

### JWT Token Structure
```javascript
{
  id: 1,
  email: "supplier@tokyoauto.jp",
  role: "foreign_bond_user",
  bond_id: null,           // For dealerships
  foreign_bond_id: 5       // For suppliers
}
```

---

## 📊 Dashboard Views

### Admin Dashboard
- Total platform revenue
- Active suppliers count
- Active dealerships count
- Total vehicles in marketplace
- Orders by country
- Platform health metrics

### Supplier Dashboard
- My total vehicles
- Available vehicles
- Ordered vehicles
- Total inventory value
- Orders received
- Order status tracking

### Dealership Dashboard
- Import orders status
- Vehicles in transit
- Border clearance pending
- Local inventory
- Sales statistics
- Customer management

---

## 🚀 Registration Page

The registration page (`/register`) has a **toggle button** to switch between:
- **🏪 Dealership (Buyer)** - For companies buying vehicles
- **🏭 Supplier (Seller)** - For companies selling vehicles

The form adapts based on selection:
- Suppliers get "Specialization" field (Japanese Vehicles, European, etc.)
- Both get same core fields (company name, location, contact, credentials)

---

## 🎭 How to Tell Account Type

### 1. In Database
```sql
-- Check user role
SELECT role FROM users WHERE email = 'user@example.com';

-- Check if user is a supplier
SELECT * FROM users WHERE foreign_bond_id IS NOT NULL;

-- Check if user is a dealership
SELECT * FROM users WHERE dealership_id IS NOT NULL;

-- Check if user is admin
SELECT * FROM users WHERE role = 'admin';
```

### 2. In Backend (JWT)
```javascript
if (req.user.role === 'foreign_bond_user') {
  // This is a supplier
  const supplierId = req.user.foreign_bond_id;
}

if (req.user.role === 'dealership_manager') {
  // This is a dealership
  const dealershipId = req.user.bond_id;
}

if (req.user.role === 'admin') {
  // This is platform admin
}
```

### 3. In Frontend
```javascript
const user = JSON.parse(localStorage.getItem('user'));

if (user.role === 'foreign_bond_user') {
  // Show supplier UI
  navigate('/supplier/dashboard');
}

if (user.role === 'dealership_manager') {
  // Show dealership UI
  navigate('/');
}
```

---

## 🌐 Global Marketplace Features

### Multi-Country Support
- Suppliers can be from ANY country (Japan, UAE, UK, USA, etc.)
- Dealerships can be from ANY country (Uganda, Kenya, Tanzania, etc.)
- Countries list available in `/frontend/src/data/countries.js`

### Pricing
- All prices in USD for consistency
- Purchase price (supplier cost)
- Sale price (marketplace price)
- Local sale price (dealership to customer)

### Specializations
Suppliers can specialize in:
- Japanese Vehicles
- European Vehicles
- American Vehicles
- Luxury Cars
- Commercial Vehicles
- All Types

---

## 📋 Testing the System

### 1. Test Supplier Account
```
Login: supplier@tokyoauto.jp / supplier123
→ See supplier dashboard
→ Click "Add Vehicle"
→ Fill form (chassis, make, model, price)
→ Submit
→ Vehicle appears in "My Vehicles"
```

### 2. Test Dealership Account
```
Login: manager@kpmmotors.ug / bond123
→ See dealership dashboard
→ Go to Inventory
→ See supplier's vehicle
→ Go to Orders → Create Order
→ Select supplier and vehicles
→ Submit order
```

### 3. Test Admin Account
```
Login: admin@cartracking.ug / admin123
→ See all data
→ Go to Foreign Bonds → See all suppliers
→ Go to Dealerships → See all dealerships
→ Access System Management
```

---

## ✅ Registration Flow Summary

**How to Register a Supplier:**
1. Go to `/register`
2. Click "🏭 Supplier (Seller)" tab
3. Fill company details (business name, country, contact)
4. Select specialization
5. Enter admin email/password
6. Submit → Company created in `foreign_bonds` table
7. User created with `role='foreign_bond_user'`
8. Login → Redirected to `/supplier/dashboard`

**How Admin Creates Supplier:**
1. Login as admin
2. Go to System Management
3. Click "Add Supplier" (or use Foreign Bonds page)
4. Fill supplier details
5. System creates foreign_bond + user account

---

## 🎯 Key Differences

| Feature | Supplier | Dealership | Admin |
|---------|----------|------------|-------|
| **Role** | `foreign_bond_user` | `dealership_manager` | `admin` |
| **Company Type** | Foreign Bond | Dealership | N/A |
| **ID Field** | `foreign_bond_id` | `dealership_id` | NULL |
| **Can Add Vehicles** | ✅ Yes (own) | ❌ No | ❌ No |
| **Can Order Vehicles** | ❌ No | ✅ Yes | ❌ No |
| **Can View All Data** | ❌ No | ❌ No | ✅ Yes |
| **Dashboard** | `/supplier/dashboard` | `/` | `/` |
| **Registration Endpoint** | `/foreign-bonds/register` | `/dealerships/register` | Manual |

---

## 🔧 API Endpoints Summary

### Supplier Endpoints
- `POST /api/foreign-bonds/register` - Self-registration
- `GET /api/inventory/my/vehicles` - Get my vehicles
- `POST /api/inventory/my/vehicles` - Add vehicle
- `GET /api/inventory/my/orders` - Orders received

### Dealership Endpoints
- `POST /api/dealerships/register` - Self-registration
- `GET /api/inventory` - Browse all vehicles (filtered by availability)
- `POST /api/import-orders` - Create order
- All shipping, border, sales endpoints

### Admin Endpoints
- All endpoints with no filtering
- `GET /api/foreign-bonds` - Manage suppliers
- `GET /api/dealerships` - Manage dealerships
- `GET /api/system/*` - System management

---

This is your complete **3-tenant global B2B SaaS marketplace** where:
- **Suppliers** sell vehicles
- **Dealerships** buy and resell vehicles
- **Admin** manages the platform

Both suppliers and dealerships can **self-register**, and the system automatically assigns the correct role and permissions! 🎉
