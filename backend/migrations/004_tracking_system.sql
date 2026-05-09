-- Migration: Add vehicle capacity and tracking events system
-- Date: 2025-01-28

-- Add capacity field to vehicles table (for engine/load capacity)
ALTER TABLE vehicles ADD COLUMN capacity_tons REAL;

-- Create tracking_events table for dynamic shipment tracking
CREATE TABLE IF NOT EXISTS tracking_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES import_orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'DEPARTURE', 'PORT_ARRIVAL', 'CUSTOMS_CLEARANCE', 'BORDER_CROSSING', 'INLAND_TRANSIT', 'FINAL_DELIVERY'
  location TEXT NOT NULL,     -- e.g., 'Tokyo, Japan', 'Mombasa, Kenya', 'Malaba Border', 'Kampala, Uganda'
  description TEXT,           -- Event details
  event_date TEXT NOT NULL,   -- ISO date when event occurred
  latitude REAL,              -- Optional GPS coordinates
  longitude REAL,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  notes TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tracking_events_order ON tracking_events(order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_date ON tracking_events(event_date);

-- Add tracking fields to import_orders for better visibility
ALTER TABLE import_orders ADD COLUMN current_location TEXT;
ALTER TABLE import_orders ADD COLUMN last_tracking_update TEXT;

-- Add inland route fields to shipping table
ALTER TABLE shipping ADD COLUMN border_point TEXT;      -- e.g., 'Malaba', 'Busia'
ALTER TABLE shipping ADD COLUMN final_destination TEXT; -- e.g., 'Kampala', 'Jinja'
ALTER TABLE shipping ADD COLUMN customs_cleared_date TEXT;
ALTER TABLE shipping ADD COLUMN border_crossed_date TEXT;
ALTER TABLE shipping ADD COLUMN delivered_date TEXT;
