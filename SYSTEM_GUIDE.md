# Car Tracking System - User Guide

## 🔐 Login Credentials

### Admin Account
- **Email:** `admin@cartracking.ug`
- **Password:** `admin123`
- **Access:** Full system access

### Dealership Manager Account  
- **Email:** `manager@kpmmotors.ug`
- **Password:** `bond123`
- **Access:** Dealership operations only

---

## 📋 Complete Workflow Process

### 1️⃣ **Foreign Bonds Add Vehicles** (Admin Only)
- Foreign bonds in Japan, UAE, UK add their available vehicles to the system
- **Sample Data:** 10 vehicles already seeded from various foreign bonds

### 2️⃣ **Dealerships Browse & Order Vehicles**
1. Login as dealership manager
2. Go to **Inventory** page
3. View available vehicles from foreign bonds
4. Go to **Orders** page
5. Click **"Create Order"** button
6. Select a foreign bond (e.g., Tokyo Auto Exports - Japan)
7. Select vehicles by clicking on them
8. Review total amount
9. Click **"Create Order"**

### 3️⃣ **Track Import Progress**
After creating order, track it through these stages:
- ⏳ **Pending** - Order placed
- ✅ **Confirmed** - Foreign bond confirmed
- 🚢 **Shipped** - Vehicles en route
- 🛡️ **At Border** - Customs clearance
- ✅ **Cleared** - Customs cleared
- 📍 **Delivered** - Arrived at dealership

### 4️⃣ **Manage Shipping** (Admin/Manager)
- Go to **Shipping** page
- Add shipping details (BL number, container, vessel)
- Track vessel location and arrival dates

### 5️⃣ **Border Clearance**
- Go to **Border Clearance** page
- Process customs documentation
- Calculate and pay taxes
- Get clearance approval

### 6️⃣ **Receive at Dealership**
- Vehicles arrive and go to **In Stock** status
- Now available for local sales

### 7️⃣ **Sell to Customers**
1. Go to **Customers** page
2. Add customer details
3. Go to **Sales** page
4. Create new sale
5. Select vehicle and customer
6. Set selling price
7. Track payment status

### 8️⃣ **Analytics & Reports**
- **Dashboard:** Overview of all operations
- **Analytics:** Sales trends, import analytics, inventory breakdown
- **Reports:** Financial summary, customer reports, import reports

---

## 🎯 Key Features

### For Dealership Managers:
- ✅ Browse vehicles from multiple foreign bonds
- ✅ Create import orders
- ✅ Track shipping and clearance
- ✅ Manage local inventory
- ✅ Record sales to customers
- ✅ View analytics and reports
- ✅ Manage customer database

### For Admin:
- ✅ Everything dealerships can do PLUS:
- ✅ Manage all dealerships
- ✅ Manage foreign bonds
- ✅ System-wide analytics
- ✅ User management
- ✅ System configuration

---

## 💡 Quick Tips

1. **First Time Setup:**
   - Use seeded data to understand the system
   - Create test orders to see the workflow
   - Explore all menu items

2. **Creating Orders:**
   - Always check vehicle availability status
   - Select vehicles from the same foreign bond for one order
   - Review total amount before confirming

3. **Multi-Tenant:** 
   - Each dealership only sees their own data
   - Admin sees everything
   - Bond filtering is automatic

4. **Navigation:**
   - Menu is organized by workflow: Dashboard → Operations → Reports → Settings
   - Use filter dropdowns on each page
   - Click "View Details" for more information

---

## 🗺️ System Architecture

```
Foreign Bonds (Japan/UAE/UK) 
    ↓ Add Vehicles
Available Inventory
    ↓ Dealerships Create Orders
Import Orders
    ↓ Shipping
In Transit
    ↓ Border Clearance
Customs Cleared
    ↓ Delivery
Dealership Stock
    ↓ Local Sales
Customers
```

---

## 📊 Seeded Data Summary

- **5 Foreign Bonds** (Tokyo, Osaka, Dubai, Sharjah, London)
- **5 Dealerships** in Uganda (Kampala, Jinja, Mbarara)
- **10 Vehicles** available from foreign bonds
- **1 Sample Order** in "Shipped" status
- **3 Sample Customers**
- **2 User Accounts** (1 admin, 1 dealership manager)

---

## 🚀 Next Steps

1. **Login** with provided credentials
2. **Explore** the dashboard and menu items
3. **Create** a new import order
4. **Track** the order through different stages
5. **Add** customers and make sales
6. **View** analytics and reports

---

## 📞 Support

For issues or questions, check:
- [ENDPOINT_ANALYSIS.md](ENDPOINT_ANALYSIS.md) - Complete API documentation
- [FIXES_APPLIED.md](FIXES_APPLIED.md) - Recent system updates

Enjoy using the Car Tracking System! 🚗✨
