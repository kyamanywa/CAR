# System Issues and Explanations

## Issue 1: Supplier Analytics and Sales Data

**Problem**: Supplier dashboard showing "Sales" and "Analytics" - but suppliers don't have "sales" to local customers.

**Explanation**:
- **Dealerships** have SALES (selling cars to local customers for UGX)
- **Suppliers** have ORDERS (dealerships ordering from them in USD)

**Solution**:
- Suppliers should see:
  - **Orders Analytics** (not "Sales") - showing orders received from dealerships
  - **Inventory Analytics** - showing their vehicle stock levels
  - **Revenue** from orders confirmed by dealerships

---

## Issue 2: In Transit Flow - How Orders Progress

**Current Flow**:
1. **Dealership creates order** → Status: `Pending`
2. **Supplier confirms order** → Status: `Confirmed` (inventory reduces)
3. **Supplier marks as shipped** → Status: `Shipped`
4. **System needs shipping record** → Creates entry in `shipping` table
5. **Order arrives at port** → Status: `Delivered`
6. **Vehicles unloaded** → Individual vehicle status changes to `In Transit`
7. **Customs clearance** → Vehicle status `At Border`
8. **Cleared** → Vehicle status `In Stock`
9. **Sold to customer** → Vehicle status `Sold`

**Problem**: No way to update vehicle status from `Shipped` to `In Transit` to `At Border`

**Solution Needed**:
- Add shipping management page where dealerships can:
  - View shipped orders
  - Update vehicle statuses as they progress
  - Mark when vehicles reach border
  - Mark when customs clears them

---

## Issue 3: In Transit Not Showing Anything

**Problem**: Dashboard shows 0 vehicles "In Transit"

**Reason**: No vehicles have status = 'In Transit' in database

**Why**:
- When supplier ships order, ORDER status changes to "Shipped"
- But VEHICLE status doesn't automatically change
- Need to manually update vehicle status when they reach transit

**Fix Needed**: 
- When order is marked "Shipped", ask if vehicles should be marked "In Transit"
- Or add bulk update feature on Shipping page

---

## Issue 4: Photo Upload - Where Is It?

**Current Location**: SupplierOrders page → Browse Vehicle Inventory section

**How it works**:
1. Supplier logs in
2. Goes to "Orders" page (SupplierOrders.jsx)
3. Scrolls down to "Browse Vehicle Inventory"
4. Selects Make (e.g., Toyota)
5. Selects Model (e.g., Land Cruiser) - OPTIONAL
6. **Hover over vehicle image** → Upload icon appears
7. Click to select image file
8. Image uploads and displays

**Problem Reported**: Not visible or not working?

**Possible Issues**:
- Models not loading when make is selected
- Upload button not visible on hover
- Image not persisting after upload

---

## Issue 5: Browse Vehicles - Models Not Loading

**Problem**: When supplier selects make, models dropdown stays empty

**Current Code Flow**:
1. Select make → triggers `loadModels(make)`
2. Calls API: `GET /api/reference-data/models?make=Toyota`
3. Should populate models dropdown

**Possible Causes**:
- API endpoint not returning data
- Models table doesn't have data for that make
- Query filtering issue

**Need to check**: Backend `/api/reference-data/models` endpoint

---

## Recommended Fixes Priority

### HIGH PRIORITY:
1. **Fix models dropdown** - So suppliers can browse vehicles
2. **Add bulk photo upload** - Upload multiple at once
3. **Clarify Supplier menu** - Change "Sales" to "Orders", add "My Inventory" 

### MEDIUM PRIORITY:
4. **Add order tracking flow** - Show dealerships how to update vehicle status
5. **Add shipping status updates** - Let dealerships mark vehicles as "In Transit", "At Border", etc.
6. **Supplier analytics** - Show order metrics instead of sales metrics

### LOW PRIORITY:
7. **Improve photo display** - Larger preview, gallery view
8. **Add bulk status updates** - Update multiple vehicles at once
