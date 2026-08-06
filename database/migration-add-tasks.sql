-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'Other',
  priority VARCHAR(20) DEFAULT 'Medium',
  status VARCHAR(50) DEFAULT 'Pending',
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  related_to JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- RLS is disabled; access is controlled by the service-role API layer.
-- All inserts/updates/deletes go through server-side routes that authenticate
-- via the JWT in the auth-token cookie before touching this table.
