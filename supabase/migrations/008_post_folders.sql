-- Add admin-only folder field to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS folder text DEFAULT NULL;

-- Add admin folders list to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin_folders text[] DEFAULT '{}';
