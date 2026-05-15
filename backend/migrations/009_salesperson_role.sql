-- Sales Role Consolidation Migration
-- Consolidates legacy 'salesperson' role into 'dealership_sales'

-- This project now uses dealership_sales as the only sales role.

-- Normalize legacy users created with role = 'salesperson'
UPDATE users
SET role = 'dealership_sales'
WHERE role = 'salesperson';

-- No schema alteration is required because role is stored as text.
