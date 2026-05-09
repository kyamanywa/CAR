-- Add quantity column to order_vehicles table
ALTER TABLE order_vehicles ADD COLUMN quantity INTEGER DEFAULT 1;
