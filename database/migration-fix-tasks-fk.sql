-- Fix tasks table: drop auth.users FK constraints and re-point to public.users
-- Run this if migration-add-tasks.sql was already applied with the wrong FK references.

-- Drop incorrect foreign key constraints
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;

-- Re-add pointing to the app's custom users table
ALTER TABLE tasks
  ADD CONSTRAINT tasks_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Drop any existing RLS policies (they use auth.uid() which won't work here)
DROP POLICY IF EXISTS "Users can view assigned or created tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- Disable RLS — access is enforced by the service-role API layer
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
