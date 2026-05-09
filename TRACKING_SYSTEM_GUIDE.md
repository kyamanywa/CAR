# Vehicle Tracking System - Implementation Guide

## Overview
This document explains how the dynamic vehicle tracking system works in the car tracking application, including vehicle capacity tracking and multi-point shipment tracking from origin to final destination.

## What Was Implemented

### 1. Vehicle Capacity Field ✅
- **Database Field**: `capacity_tons` (REAL) added to the `vehicles` table
- **Purpose**: Track the load/engine capacity of each vehicle
- **Usage**: Can be used for logistics planning and load calculations

### 2. Dynamic Tracking System ✅

#### Database Schema Changes

**New Table: `tracking_events`**
```sql
CREATE TABLE tracking_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,              -- Links to import_orders
  event_type TEXT NOT NULL,                -- Type of tracking event
  location TEXT NOT NULL,                  -- Location name (e.g., "Mombasa, Kenya")
  description TEXT,                        -- Additional details
  event_date TEXT NOT NULL,                -- When the event occurred
  latitude REAL,                           -- Optional GPS coordinates
  longitude REAL,
  created_by INTEGER,                      -- User who added the event
  created_at TEXT DEFAULT (datetime('now')),
  notes TEXT
);
```

**Updated Tables:**
- `vehicles`: Added `capacity_tons` field
- `import_orders`: Added `current_location` and `last_tracking_update` fields
- `shipping`: Added `border_point`, `final_destination`, `customs_cleared_date`, `border_crossed_date`, `delivered_date` fields

#### Tracking Event Types

The system supports 6 types of tracking events:

1. **DEPARTURE** - Vehicle leaves origin (e.g., Japan, UK)
   - Auto-updates order status to: "Shipped"

2. **PORT_ARRIVAL** - Arrives at port (e.g., Mombasa, Kenya)
   - Auto-updates order status to: "At Border"
   - Updates shipping `actual_arrival` date

3. **CUSTOMS_CLEARANCE** - Customs cleared at port
   - Maintains status: "At Border"
   - Updates `customs_cleared_date`

4. **BORDER_CROSSING** - Crosses land border (e.g., Malaba, Busia)
   - Auto-updates order status to: "Cleared"
   - Records `border_point` and `border_crossed_date`

5. **INLAND_TRANSIT** - In transit to final destination
   - Maintains status: "Cleared"

6. **FINAL_DELIVERY** - Delivered to final destination (e.g., Kampala)
   - Auto-updates order status to: "Delivered"
   - Updates shipping status to: "Delivered"
   - Records `final_destination` and `delivered_date`

### 3. Backend API Endpoints ✅

**Tracking Routes** (`/api/tracking`)

```javascript
// Get tracking events for an order
GET /api/tracking/order/:orderId

// Get formatted timeline with order details
GET /api/tracking/order/:orderId/timeline

// Add a new tracking event
POST /api/tracking
Body: {
  order_id: number,
  event_type: string,  // One of the 6 event types above
  location: string,
  description: string,
  event_date: string,   // ISO date format
  latitude: number,     // Optional
  longitude: number,    // Optional
  notes: string         // Optional
}

// Update tracking event
PATCH /api/tracking/:id

// Delete tracking event
DELETE /api/tracking/:id
```

**Automatic Status Updates**
When you add a tracking event, the system automatically:
- Updates the order's `current_location`
- Updates the order's `last_tracking_update`
- Changes the order status based on event type
- Updates shipping table fields (arrival dates, border info, etc.)

### 4. Frontend Components ✅

#### TrackingTimeline Component
Location: `frontend/src/components/TrackingTimeline.jsx`

**Features:**
- Visual timeline showing all tracking events
- Color-coded event types
- Current location badge
- Add new tracking events
- Responsive modal design

**Usage:**
```jsx
import TrackingTimeline from '../components/TrackingTimeline';

<TrackingTimeline 
  orderId={order.id}
  onClose={() => setShowTracking(false)}
/>
```

#### Updated Pages

**Orders Page** (`frontend/src/pages/Orders.jsx`)
- Added "View Tracking Timeline" button in order details
- Opens tracking timeline modal for selected order

**Shipping Page** (`frontend/src/pages/Shipping.jsx`)
- Added "Track" button on each shipment card
- Opens tracking timeline modal for the shipment's order

## How the Tracking Works

### Journey Example: Japan → Uganda

```
1. DEPARTURE (Tokyo, Japan)
   ↓ Status: Shipped
   
2. PORT_ARRIVAL (Mombasa, Kenya)
   ↓ Status: At Border
   
3. CUSTOMS_CLEARANCE (Mombasa Port, Kenya)
   ↓ Status: At Border (cleared)
   
4. BORDER_CROSSING (Malaba Border, Uganda)
   ↓ Status: Cleared
   
5. INLAND_TRANSIT (Jinja, Uganda)
   ↓ Status: Cleared
   
6. FINAL_DELIVERY (Kampala, Uganda)
   ✓ Status: Delivered
```

### Dynamic vs Hard-Coded

**Before (Hard-Coded):**
- Only 2 static points: Departure Port → Arrival Port
- No intermediate checkpoints
- Manual status updates
- No tracking history

**Now (Dynamic):**
- ✅ Unlimited tracking events
- ✅ Any location can be added (Mombasa, Malaba, Busia, Kampala, etc.)
- ✅ Complete tracking timeline
- ✅ Automatic status updates
- ✅ Real-time location tracking
- ✅ GPS coordinates support
- ✅ Event history with timestamps and user attribution

## Usage Guide

### Adding Tracking Events

1. **Navigate to Orders or Shipping page**
2. **Click "View Tracking Timeline" or "Track"** on any order/shipment
3. **Click "Add Tracking Event"** button
4. **Fill in the form:**
   - Event Type: Select from dropdown
   - Location: Enter location (e.g., "Mombasa Port, Kenya")
   - Date: When the event occurred
   - Description: Optional details
5. **Click "Add Event"**

The system will:
- Record the event
- Update the order's current location
- Automatically update order and shipping statuses
- Display in the timeline

### Viewing Tracking Timeline

The timeline shows:
- All events in chronological order
- Current location badge at the top
- Color-coded event types
- Event descriptions and notes
- Who added each event and when

### API Integration

**Frontend API calls:**
```javascript
import { 
  getOrderTimeline, 
  addTrackingEvent, 
  updateTrackingEvent,
  deleteTrackingEvent 
} from '../api';

// Get timeline
const timeline = await getOrderTimeline(orderId);

// Add event
await addTrackingEvent({
  order_id: 123,
  event_type: 'PORT_ARRIVAL',
  location: 'Mombasa, Kenya',
  event_date: '2025-01-28',
  description: 'Arrived at Mombasa port'
});
```

## Database Migration

**Migration file:** `backend/migrations/004_tracking_system.sql`
**Migration script:** `backend/complete-migration.js`

To apply the migration:
```bash
cd backend
node complete-migration.js
```

## Testing the System

1. **Start the backend:**
   ```bash
   cd backend
   node server.js
   ```

2. **Create an import order** (if you don't have one)

3. **Add tracking events:**
   - Navigate to Orders or Shipping page
   - Click tracking button on an order
   - Add events for the journey:
     - Departure from origin
     - Arrival at Mombasa
     - Customs clearance
     - Border crossing at Malaba/Busia
     - Final delivery to Kampala

4. **Verify:**
   - Check that current location updates
   - Check that order status changes automatically
   - View the complete timeline

## Benefits

1. **Complete Visibility**: Track vehicles through every stage of the journey
2. **Real-Time Updates**: Know exactly where each shipment is
3. **Flexible Locations**: Add any checkpoint (not limited to predefined routes)
4. **Automatic Status Management**: Status updates based on tracking events
5. **Historical Record**: Complete audit trail of all movements
6. **GPS Support**: Optional latitude/longitude for precise tracking
7. **Multi-User**: Track who added each update
8. **No Hard-Coding**: All locations and events are data-driven

## Future Enhancements

Potential improvements:
- Map visualization with route display
- Real-time GPS tracking integration
- Email/SMS notifications on status changes
- Estimated arrival time calculations
- Integration with shipping companies' APIs
- Mobile app for drivers to update location
- Geofencing alerts for specific checkpoints
- Analytics on transit times between checkpoints

## Summary

The tracking system is now **fully dynamic** and supports tracking vehicles from any origin through multiple checkpoints (Mombasa, border points like Malaba/Busia, inland locations) to the final destination. There is no hard-coded data - all tracking events are stored in the database and can be added, viewed, and managed through the UI.

**Key Achievement**: You can now track a car's journey from Japan → Mombasa → Malaba Border → Kampala (or any other route) with complete flexibility and automatic status management.
