-- Migration: Industrial-Grade Inventory Management System
-- Adds comprehensive tracking fields for complete vehicle lifecycle management
-- Date: 2026-05-14

-- ============================================================
-- VEHICLE TRACKING & DELIVERY DATES
-- ============================================================

-- Delivery & Receipt tracking
ALTER TABLE vehicles ADD COLUMN expected_delivery_date TEXT;
ALTER TABLE vehicles ADD COLUMN actual_delivery_date TEXT;
ALTER TABLE vehicles ADD COLUMN received_date TEXT;  -- When physically received at dealership
ALTER TABLE vehicles ADD COLUMN days_in_inventory INTEGER DEFAULT 0;

-- Location & Storage
ALTER TABLE vehicles ADD COLUMN warehouse_location TEXT;  -- e.g., "Main Yard", "Showroom", "Workshop"
ALTER TABLE vehicles ADD COLUMN parking_bay TEXT;  -- Specific parking slot/bay number
ALTER TABLE vehicles ADD COLUMN current_location_details TEXT;  -- Additional location notes

-- ============================================================
-- DOCUMENTATION & COMPLIANCE
-- ============================================================

-- Document Status tracking
ALTER TABLE vehicles ADD COLUMN import_permit_status TEXT DEFAULT 'Pending';  -- Pending, Approved, Rejected
ALTER TABLE vehicles ADD COLUMN import_permit_number TEXT;
ALTER TABLE vehicles ADD COLUMN import_permit_date TEXT;

ALTER TABLE vehicles ADD COLUMN registration_status TEXT DEFAULT 'Unregistered';  -- Unregistered, In Process, Registered
ALTER TABLE vehicles ADD COLUMN registration_number TEXT;  -- License plate
ALTER TABLE vehicles ADD COLUMN registration_date TEXT;

ALTER TABLE vehicles ADD COLUMN ownership_docs_status TEXT DEFAULT 'Pending';  -- Pending, Complete, Incomplete
ALTER TABLE vehicles ADD COLUMN logbook_number TEXT;
ALTER TABLE vehicles ADD COLUMN logbook_received_date TEXT;

-- Insurance
ALTER TABLE vehicles ADD COLUMN insurance_provider TEXT;
ALTER TABLE vehicles ADD COLUMN insurance_policy_number TEXT;
ALTER TABLE vehicles ADD COLUMN insurance_start_date TEXT;
ALTER TABLE vehicles ADD COLUMN insurance_expiry_date TEXT;
ALTER TABLE vehicles ADD COLUMN insurance_premium_ugx REAL;

-- ============================================================
-- INSPECTION & CONDITION TRACKING
-- ============================================================

-- Inspection details
ALTER TABLE vehicles ADD COLUMN last_inspection_date TEXT;
ALTER TABLE vehicles ADD COLUMN next_inspection_due TEXT;
ALTER TABLE vehicles ADD COLUMN inspection_score INTEGER;  -- 1-10 scale
ALTER TABLE vehicles ADD COLUMN inspector_name TEXT;
ALTER TABLE vehicles ADD COLUMN inspection_notes TEXT;

-- Physical condition
ALTER TABLE vehicles ADD COLUMN exterior_condition TEXT;  -- Excellent, Good, Fair, Poor, Damaged
ALTER TABLE vehicles ADD COLUMN interior_condition TEXT;
ALTER TABLE vehicles ADD COLUMN mechanical_condition TEXT;
ALTER TABLE vehicles ADD COLUMN tire_condition TEXT;

-- Defects & Damage
ALTER TABLE vehicles ADD COLUMN has_defects INTEGER DEFAULT 0;  -- Boolean: 0=No, 1=Yes
ALTER TABLE vehicles ADD COLUMN defects_list TEXT;  -- JSON or comma-separated list
ALTER TABLE vehicles ADD COLUMN damage_notes TEXT;
ALTER TABLE vehicles ADD COLUMN requires_repair INTEGER DEFAULT 0;  -- Boolean

-- ============================================================
-- SERVICE & MAINTENANCE
-- ============================================================

-- Service history
ALTER TABLE vehicles ADD COLUMN last_service_date TEXT;
ALTER TABLE vehicles ADD COLUMN last_service_type TEXT;  -- e.g., "Oil Change", "Full Service", "Pre-sale Inspection"
ALTER TABLE vehicles ADD COLUMN next_service_due_date TEXT;
ALTER TABLE vehicles ADD COLUMN next_service_due_km INTEGER;
ALTER TABLE vehicles ADD COLUMN service_history TEXT;  -- JSON array of service records

-- Repairs
ALTER TABLE vehicles ADD COLUMN repair_history TEXT;  -- JSON array of repairs
ALTER TABLE vehicles ADD COLUMN pending_repairs TEXT;
ALTER TABLE vehicles ADD COLUMN total_repair_cost_ugx REAL DEFAULT 0;

-- ============================================================
-- FINANCIAL TRACKING (Cost Breakdown)
-- ============================================================

-- Purchase costs
ALTER TABLE vehicles ADD COLUMN fob_price_usd REAL;  -- Free on Board price
ALTER TABLE vehicles ADD COLUMN shipping_cost_usd REAL;
ALTER TABLE vehicles ADD COLUMN insurance_cost_usd REAL;
ALTER TABLE vehicles ADD COLUMN freight_charges_usd REAL;

-- Import duties & taxes
ALTER TABLE vehicles ADD COLUMN import_duty_ugx REAL;
ALTER TABLE vehicles ADD COLUMN vat_ugx REAL;
ALTER TABLE vehicles ADD COLUMN environmental_levy_ugx REAL;
ALTER TABLE vehicles ADD COLUMN infrastructure_levy_ugx REAL;
ALTER TABLE vehicles ADD COLUMN withholding_tax_ugx REAL;
ALTER TABLE vehicles ADD COLUMN total_taxes_ugx REAL;

-- Additional costs
ALTER TABLE vehicles ADD COLUMN clearing_agent_fee_ugx REAL;
ALTER TABLE vehicles ADD COLUMN transport_inland_ugx REAL;  -- Transport from border to dealership
ALTER TABLE vehicles ADD COLUMN storage_fees_ugx REAL;
ALTER TABLE vehicles ADD COLUMN registration_fees_ugx REAL;
ALTER TABLE vehicles ADD COLUMN other_costs_ugx REAL;

-- Total landed cost
ALTER TABLE vehicles ADD COLUMN total_landed_cost_ugx REAL;  -- All costs combined
ALTER TABLE vehicles ADD COLUMN cost_per_unit_ugx REAL;  -- For vehicles with quantity > 1

-- Pricing
ALTER TABLE vehicles ADD COLUMN min_selling_price_ugx REAL;  -- Minimum acceptable price
ALTER TABLE vehicles ADD COLUMN target_selling_price_ugx REAL;  -- Target/list price
ALTER TABLE vehicles ADD COLUMN max_discount_percentage REAL DEFAULT 0;

-- ============================================================
-- SALES & MARKETING
-- ============================================================

-- Marketing status
ALTER TABLE vehicles ADD COLUMN is_featured INTEGER DEFAULT 0;  -- Featured on website/ads
ALTER TABLE vehicles ADD COLUMN is_hot_deal INTEGER DEFAULT 0;  -- Special promotion
ALTER TABLE vehicles ADD COLUMN listing_status TEXT DEFAULT 'Unlisted';  -- Unlisted, Listed, Featured, Sold
ALTER TABLE vehicles ADD COLUMN listing_date TEXT;
ALTER TABLE vehicles ADD COLUMN views_count INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN inquiries_count INTEGER DEFAULT 0;

-- Reservation & Holds
ALTER TABLE vehicles ADD COLUMN is_reserved INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN reserved_by TEXT;  -- Customer name or ID
ALTER TABLE vehicles ADD COLUMN reserved_until TEXT;  -- Reservation expiry date
ALTER TABLE vehicles ADD COLUMN deposit_paid_ugx REAL DEFAULT 0;

-- ============================================================
-- SUPPLIER & ORDER INFORMATION
-- ============================================================

-- Link to origin
ALTER TABLE vehicles ADD COLUMN supplier_invoice_number TEXT;
ALTER TABLE vehicles ADD COLUMN supplier_invoice_date TEXT;
ALTER TABLE vehicles ADD COLUMN purchase_order_number TEXT;

-- Shipping details (for reference)
ALTER TABLE vehicles ADD COLUMN container_number TEXT;
ALTER TABLE vehicles ADD COLUMN bl_number TEXT;  -- Bill of Lading
ALTER TABLE vehicles ADD COLUMN vessel_name TEXT;
ALTER TABLE vehicles ADD COLUMN port_of_loading TEXT;
ALTER TABLE vehicles ADD COLUMN port_of_discharge TEXT;
ALTER TABLE vehicles ADD COLUMN estimated_arrival_date TEXT;

-- ============================================================
-- SPECIFICATIONS ENHANCEMENTS
-- ============================================================

-- Additional vehicle specs
ALTER TABLE vehicles ADD COLUMN vin TEXT;  -- Vehicle Identification Number (same as chassis but explicit)
ALTER TABLE vehicles ADD COLUMN engine_number TEXT;
ALTER TABLE vehicles ADD COLUMN drive_type TEXT;  -- 2WD, 4WD, AWD
ALTER TABLE vehicles ADD COLUMN seating_capacity INTEGER;
ALTER TABLE vehicles ADD COLUMN doors INTEGER;
ALTER TABLE vehicles ADD COLUMN weight_kg REAL;
ALTER TABLE vehicles ADD COLUMN dimensions TEXT;  -- e.g., "4500x1800x1600mm"

-- Features & Options
ALTER TABLE vehicles ADD COLUMN features TEXT;  -- JSON: ["sunroof", "leather_seats", "navigation"]
ALTER TABLE vehicles ADD COLUMN extras TEXT;  -- Additional equipment
ALTER TABLE vehicles ADD COLUMN modifications TEXT;  -- Any modifications made

-- ============================================================
-- AUDIT & METADATA
-- ============================================================

-- Tracking changes
ALTER TABLE vehicles ADD COLUMN last_status_change TEXT;
ALTER TABLE vehicles ADD COLUMN status_change_reason TEXT;
ALTER TABLE vehicles ADD COLUMN last_modified_by INTEGER REFERENCES users(id);

-- Tags for filtering
ALTER TABLE vehicles ADD COLUMN tags TEXT;  -- JSON: ["clearance", "premium", "certified"]
ALTER TABLE vehicles ADD COLUMN internal_notes TEXT;  -- Private notes not shown to customers

-- Photos & media
ALTER TABLE vehicles ADD COLUMN photo_count INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN has_video INTEGER DEFAULT 0;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles(year);
CREATE INDEX IF NOT EXISTS idx_vehicles_delivery_date ON vehicles(actual_delivery_date);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration_status ON vehicles(registration_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_warehouse_location ON vehicles(warehouse_location);
CREATE INDEX IF NOT EXISTS idx_vehicles_listing_status ON vehicles(listing_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_dealership ON vehicles(dealership_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_foreign_bond ON vehicles(foreign_bond_id);

-- ============================================================
-- VIEWS FOR REPORTING
-- ============================================================

-- View: Vehicles with full cost breakdown
CREATE VIEW IF NOT EXISTS vehicle_cost_analysis AS
SELECT 
  v.id,
  v.chassis_number,
  v.make,
  v.model,
  v.year,
  v.status,
  v.purchase_price_usd,
  v.fob_price_usd,
  v.shipping_cost_usd,
  v.total_taxes_ugx,
  v.total_repair_cost_ugx,
  v.total_landed_cost_ugx,
  v.target_selling_price_ugx,
  (v.target_selling_price_ugx - v.total_landed_cost_ugx) as projected_profit_ugx,
  CASE 
    WHEN v.total_landed_cost_ugx > 0 
    THEN ((v.target_selling_price_ugx - v.total_landed_cost_ugx) / v.total_landed_cost_ugx * 100)
    ELSE 0 
  END as profit_margin_percentage,
  v.days_in_inventory,
  v.dealership_id,
  d.name as dealership_name
FROM vehicles v
LEFT JOIN dealerships d ON v.dealership_id = d.id;

-- View: Inventory aging report
CREATE VIEW IF NOT EXISTS inventory_aging AS
SELECT 
  v.id,
  v.chassis_number,
  v.make,
  v.model,
  v.year,
  v.status,
  v.received_date,
  v.days_in_inventory,
  CASE 
    WHEN v.days_in_inventory <= 30 THEN '0-30 days'
    WHEN v.days_in_inventory <= 60 THEN '31-60 days'
    WHEN v.days_in_inventory <= 90 THEN '61-90 days'
    WHEN v.days_in_inventory <= 180 THEN '91-180 days'
    ELSE 'Over 180 days'
  END as aging_bucket,
  v.total_landed_cost_ugx,
  v.target_selling_price_ugx,
  v.warehouse_location,
  v.dealership_id,
  d.name as dealership_name
FROM vehicles v
LEFT JOIN dealerships d ON v.dealership_id = d.id
WHERE v.status IN ('Available', 'In Stock', 'Reserved');

-- Triggers to auto-update days_in_inventory
-- This would normally be calculated in application code or via scheduled jobs
