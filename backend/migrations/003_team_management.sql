-- Team Management System Migration

-- Add team management columns to users table
ALTER TABLE users ADD COLUMN account_type VARCHAR(20) DEFAULT 'owner';
-- account_type: 'owner', 'manager', 'viewer'

ALTER TABLE users ADD COLUMN invited_by INTEGER;
-- References users.id of who invited them

ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '{}';
-- JSON string of custom permissions

ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1;
-- Can deactivate users without deleting them

ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
-- Track last login time

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) NOT NULL DEFAULT 'manager',
  foreign_bond_id INTEGER,
  dealership_id INTEGER,
  invited_by INTEGER NOT NULL,
  invitation_token VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update existing users to be 'owner' account type
-- This sets the first user of each organization as owner
UPDATE users SET account_type = 'owner' WHERE id IN (
  SELECT MIN(id) FROM users WHERE foreign_bond_id IS NOT NULL GROUP BY foreign_bond_id
);

UPDATE users SET account_type = 'owner' WHERE id IN (
  SELECT MIN(id) FROM users WHERE dealership_id IS NOT NULL GROUP BY dealership_id
);

-- Set admin account type
UPDATE users SET account_type = 'owner' WHERE role = 'admin';
